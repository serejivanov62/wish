from fastapi import FastAPI, Depends, HTTPException, APIRouter, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import hmac
import hashlib
import urllib.parse
import time
from datetime import datetime, timedelta
import json
import requests # Added for Telegram Bot API interaction
import re # Added for URL pattern matching
from pydantic import BaseModel # Added to resolve NameError

from jose import JWTError, jwt

import models, schemas, crud
from database import SessionLocal, engine
from services.firecrawl import scrape_url

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- JWT Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-jwt-key") # TODO: Use a strong, random key in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/telegram")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(db: Session = Depends(SessionLocal), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

# --- Telegram InitData Validation ---
def validate_telegram_init_data(init_data: str, bot_token: str) -> Optional[dict]:
    # Data is a query string, parse it
    parsed_data = urllib.parse.parse_qs(init_data)
    
    # Extract hash and data_check_string
    hash_from_data = parsed_data.pop('hash', [None])[0]
    if not hash_from_data:
        return None

    # Reconstruct data_check_string
    data_check_string = []
    for key in sorted(parsed_data.keys()):
        # Ensure values are strings and handle lists if parse_qs returns them
        value = parsed_data[key][0] if isinstance(parsed_data[key], list) else parsed_data[key]
        data_check_string.append(f"{key}={value}")
    data_check_string = '\n'.join(data_check_string)

    # Calculate secret_key
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()

    # Calculate hash of data_check_string
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    # Compare hashes
    if calculated_hash == hash_from_data:
        # Extract user data
        user_data_str = parsed_data.get('user', [None])[0]
        if user_data_str:
            user_data = json.loads(user_data_str)
            return user_data
    return None

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

# --- Auth Router ---
auth_router = APIRouter()

@auth_router.post("/api/auth/telegram", response_model=schemas.Token)
def auth_via_telegram(auth_data: schemas.TelegramAuthData, db: Session = Depends(get_db)):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram Bot Token not configured.")

    # For development, allow mock users to bypass initData validation
    if os.getenv("APP_ENV") == "development" and auth_data.init_data.startswith("dev_user_id="):
        try:
            mock_user_id = int(auth_data.init_data.split("=")[1])
            mock_user = db.query(models.User).filter(models.User.telegram_id == mock_user_id).first()
            if not mock_user:
                # Create a basic mock user if not exists
                mock_user_data = {
                    "telegram_id": mock_user_id,
                    "name": f"Mock User {mock_user_id}",
                    "phone": f"+" + str(mock_user_id) + "0", # Ensure 10+ digits for mock phone
                    "avatar_url": None
                }
                mock_user = crud.create_user(db, schemas.UserCreate(**mock_user_data))
            
            access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            access_token = create_access_token(
                data={"sub": str(mock_user.id)},
                expires_delta=access_token_expires
            )
            return {"access_token": access_token, "token_type": "bearer"}
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid mock user data: {e}")

    # Production validation
    user_data = validate_telegram_init_data(auth_data.init_data, bot_token)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid Telegram InitData.")

    # Extract relevant user info
    user_create_data = schemas.UserCreate(
        telegram_id=user_data["id"],
        name=user_data.get("first_name", "") + " " + user_data.get("last_name", ""),
        phone=user_data.get("phone_number"), # Telegram initData might not always have phone_number
        avatar_url=user_data.get("photo_url")
    )
    db_user = crud.get_or_create_user(db, user=user_create_data)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

app.include_router(auth_router)

# --- Items Router ---
items_router = APIRouter()

class ScrapeRequest(BaseModel):
    url: str
    category_name: str = "General"

@items_router.post("/api/items/scrape", response_model=schemas.Item)
def create_item_from_scrape(request: ScrapeRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        scraped_data = scrape_url(request.url)
        llm_extraction = scraped_data.get('data', {}).get('llm_extraction', {})
        
        item_data = schemas.ItemCreate(
            title=llm_extraction.get('title', 'No title found'),
            price=float(llm_extraction.get('price', 0.0)),
            description=llm_extraction.get('description'),
            image_url=llm_extraction.get('image_url'),
            link=request.url,
            category_name=request.category_name
        )
        return crud.create_item(db=db, item=item_data, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@items_router.post("/api/items/manual", response_model=schemas.Item)
def create_item_manual(item: schemas.ItemCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.create_item(db=db, item=item, user_id=current_user.id)

@items_router.get("/api/items", response_model=List[schemas.Item])
def read_items(current_user: models.User = Depends(get_current_user), skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = crud.get_items_by_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return items

@items_router.put("/api/items/{item_id}", response_model=schemas.Item)
def update_item(item_id: int, item: schemas.ItemUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_item = crud.get_item(db, item_id)
    if not db_item or db_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    return crud.update_item(db, item_id, item)

@items_router.delete("/api/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_item = crud.get_item(db, item_id)
    if not db_item or db_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Item not found or not owned by user")
    crud.delete_item(db, item_id)
    return

app.include_router(items_router)

# --- Events Router ---
events_router = APIRouter()

@events_router.post("/api/events", response_model=schemas.Event)
def create_event_for_user(event: schemas.EventCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.create_event(db=db, event=event, user_id=current_user.id)

@events_router.get("/api/events/{event_id}", response_model=schemas.Event)
def read_event(event_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = crud.get_event_with_booking_status(db, event_id=event_id, current_user_id=current_user.id)
    if not db_event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return db_event

@events_router.get("/api/users/{user_id}/events", response_model=List[schemas.Event])
def read_user_events(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Allow user to view their own events or a friend's events
    # For a friend's events, we might want to ensure they are actually friends
    # For now, just check if the requested user_id is valid
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a real app, you'd check if current_user is friends with target_user
    # For now, we'll just return the events if the user exists
    events = crud.get_events_by_user(db=db, user_id=user_id)
    return events

@events_router.put("/api/events/{event_id}", response_model=schemas.Event)
def update_event(event_id: int, event: schemas.EventCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = crud.get_event(db, event_id)
    if not db_event or db_event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found or not owned by user")
    return crud.update_event(db, event_id, event)

@events_router.delete("/api/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = crud.get_event(db, event_id)
    if not db_event or db_event.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found or not owned by user")
    crud.delete_event(db, event_id)
    return

class EventItemRequest(BaseModel):
    item_id: int

@events_router.post("/api/events/{event_id}/items")
def add_item_to_event_route(event_id: int, request: EventItemRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = crud.add_item_to_event(db=db, event_id=event_id, item_id=request.item_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Event or Item not found")
    return {"message": "Item added to event successfully"}

app.include_router(events_router)

# --- Booking Router ---
booking_router = APIRouter()

@booking_router.post("/api/items/{item_id}/book", response_model=schemas.Booking)
def book_item(item_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = crud.create_booking(db=db, item_id=item_id, user_id=current_user.id)
    if booking is None:
        raise HTTPException(status_code=400, detail="Item is already booked or does not exist.")
    return booking

app.include_router(booking_router)

# --- Friends Router ---
friends_router = APIRouter()

@friends_router.post("/api/friends", response_model=schemas.Friend)
def add_friend(request: schemas.FriendAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    friend = crud.add_friend(db=db, user_id=current_user.id, friend_phone=request.phone)
    if friend is None:
        raise HTTPException(status_code=404, detail="User with this phone number not found, or you tried to add yourself.")
    return friend

@friends_router.get("/api/friends", response_model=List[schemas.Friend])
def get_friends(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_friends(db=db, user_id=current_user.id)

@friends_router.delete("/api/friends/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friend(friend_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    crud.delete_friend(db, user_id=current_user.id, friend_id=friend_id)
    return

app.include_router(friends_router)

# --- Shared Events Router ---
shared_events_router = APIRouter()

@shared_events_router.post("/api/events/{event_id}/collaborators", response_model=schemas.EventCollaborator)
def add_collaborator_to_event(event_id: int, collaborator_data: schemas.EventCollaboratorAdd, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    collaborator = crud.add_collaborator_to_event(db, event_id=event_id, owner_id=current_user.id, collaborator_id=collaborator_data.collaborator_id)
    if not collaborator:
        raise HTTPException(status_code=404, detail="Event or Collaborator not found, or you are not the owner.")
    return collaborator

@shared_events_router.delete("/api/events/{event_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_collaborator_from_event(event_id: int, collaborator_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = crud.remove_collaborator_from_event(db, event_id=event_id, owner_id=current_user.id, collaborator_id=collaborator_id)
    if not result:
        raise HTTPException(status_code=404, detail="Collaborator not found or you are not the owner.")
    return

@shared_events_router.get("/api/shared-events", response_model=List[schemas.Event])
def get_shared_events(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_shared_events_for_user(db, user_id=current_user.id)

app.include_router(shared_events_router)

# --- Telegram Bot Webhook ---
telegram_bot_router = APIRouter()

@telegram_bot_router.post("/telegram-webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="Telegram Bot Token not configured.")

    update = await request.json()
    print(f"Received Telegram update: {update}")

    message = update.get("message")
    if not message:
        return {"status": "ok"} # Not a message we care about

    chat_id = message["chat"]["id"]
    from_user_id = message["from"]["id"]
    text = message.get("text", "")

    # Find the user in our DB by telegram_id
    db_user = db.query(models.User).filter(models.User.telegram_id == from_user_id).first()
    if not db_user:
        send_telegram_message(bot_token, chat_id, "Please open the WishSpace Mini App first to register.")
        return {"status": "ok"}

    # Check if the message contains a URL
    url_pattern = r"https?://[^\s]+"
    match = re.search(url_pattern, text)

    if match:
        url = match.group(0)
        comment = text.replace(url, "").strip()
        category_name = comment if comment else "General"

        try:
            scraped_data = scrape_url(url)
            llm_extraction = scraped_data.get('data', {}).get('llm_extraction', {})
            
            item_data = schemas.ItemCreate(
                title=llm_extraction.get('title', 'No title found'),
                price=float(llm_extraction.get('price', 0.0)),
                description=llm_extraction.get('description'),
                image_url=llm_extraction.get('image_url'),
                link=url,
                category_name=category_name
            )
            crud.create_item(db=db, item=item_data, user_id=db_user.id)
            send_telegram_message(bot_token, chat_id, f"Wish \"{item_data.title}\" added to your {category_name} list!")
        except Exception as e:
            print(f"Error processing Telegram message: {e}")
            send_telegram_message(bot_token, chat_id, f"Failed to add wish: {e}")
    else:
        send_telegram_message(bot_token, chat_id, "Please send a link to a product you want to add.")

    return {"status": "ok"}

def send_telegram_message(bot_token: str, chat_id: int, text: str):
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    requests.post(url, json=payload)

app.include_router(telegram_bot_router)

# --- Root ---
@app.get("/")
def read_root():
    return {"message": "Welcome to WishSpace API"}
