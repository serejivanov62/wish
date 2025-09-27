from sqlalchemy.orm import Session, aliased
from sqlalchemy import exists, or_

import models, schemas

# User CRUD
def get_user_by_telegram_id(db: Session, telegram_id: int):
    print(f"DEBUG: get_user_by_telegram_id called for telegram_id: {telegram_id}")
    return db.query(models.User).filter(models.User.telegram_id == telegram_id).first()

def get_user_by_phone(db: Session, phone: str):
    print(f"DEBUG: get_user_by_phone called for phone: {phone}")
    user = db.query(models.User).filter(models.User.phone == phone).first()
    print(f"DEBUG: get_user_by_phone result: {user}")
    return user

def create_user(db: Session, user: schemas.UserCreate):
    print(f"DEBUG: create_user called with phone: {user.phone}")
    db_user = models.User(
        telegram_id=user.telegram_id,
        name=user.name,
        phone=user.phone,
        avatar_url=user.avatar_url
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    print(f"DEBUG: User created: {db_user.id}, phone: {db_user.phone}")
    return db_user

def get_or_create_user(db: Session, user: schemas.UserCreate):
    print(f"DEBUG: get_or_create_user called for telegram_id: {user.telegram_id}")
    db_user = get_user_by_telegram_id(db, user.telegram_id)
    if db_user:
        print(f"DEBUG: User {db_user.id} found. Phone: {db_user.phone}")
        # Update phone number if it was missing
        if not db_user.phone and user.phone:
            print(f"DEBUG: Updating phone for user {db_user.id} to {user.phone}")
            db_user.phone = user.phone
            db.commit()
            db.refresh(db_user)
        return db_user
    print(f"DEBUG: User {user.telegram_id} not found, creating new.")
    return create_user(db, user)

def update_user_phone(db: Session, user_id: int, phone: str):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        return None
    db_user.phone = phone
    db.commit()
    db.refresh(db_user)
    return db_user

# Category CRUD
def get_or_create_category(db: Session, category_name: str, user_id: int):
    db_category = db.query(models.Category).filter(models.Category.name == category_name, models.Category.user_id == user_id).first()
    if db_category:
        return db_category
    db_category = models.Category(name=category_name, user_id=user_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# Item CRUD
def create_item(db: Session, item: schemas.ItemCreate, user_id: int):
    category = get_or_create_category(db, item.category_name, user_id)
    db_item = models.Item(
        **item.dict(exclude={"category_name"}), 
        user_id=user_id, 
        category_id=category.id
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def get_items_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Item).filter(models.Item.user_id == user_id).offset(skip).limit(limit).all()

def get_item(db: Session, item_id: int):
    return db.query(models.Item).filter(models.Item.id == item_id).first()

def update_item(db: Session, item_id: int, item: schemas.ItemUpdate):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        return None
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_item(db: Session, item_id: int):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        return None
    db.delete(db_item)
    db.commit()
    return db_item

# Event CRUD
def create_event(db: Session, event: schemas.EventCreate, user_id: int):
    db_event = models.Event(**event.dict(), user_id=user_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_events_by_user(db: Session, user_id: int):
    return db.query(models.Event).filter(models.Event.user_id == user_id).all()

def get_event(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()

def update_event(db: Session, event_id: int, event: schemas.EventCreate):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        return None
    for key, value in event.dict(exclude_unset=True).items():
        setattr(db_event, key, value)
    db.commit()
    db.refresh(db_event)
    return db_event

def delete_event(db: Session, event_id: int):
    db_event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not db_event:
        return None
    db.delete(db_event)
    db.commit()
    return db_event

def get_event_with_booking_status(db: Session, event_id: int, current_user_id: int):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        return None

    if event.user_id == current_user_id:
        for item in event.items:
            item.is_booked = False
    else:
        for item in event.items:
            item.is_booked = db.query(exists().where(models.Booking.item_id == item.id)).scalar()
            
    return event

def add_item_to_event(db: Session, event_id: int, item_id: int):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not item or not event:
        return None

    db_event_item = models.EventItem(event_id=event_id, item_id=item_id)
    db.add(db_event_item)
    db.commit()
    return db_event_item

# Booking CRUD
def create_booking(db: Session, item_id: int, user_id: int):
    is_booked = db.query(exists().where(models.Booking.item_id == item_id)).scalar()
    if is_booked:
        return None

    db_booking = models.Booking(item_id=item_id, booked_by_user_id=user_id)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

# Friend CRUD
def get_friends(db: Session, user_id: int):
    friend_ids = db.query(models.Friend.friend_id).filter(models.Friend.user_id == user_id).all()
    friend_ids = [f_id for f_id, in friend_ids]
    return db.query(models.User).filter(models.User.id.in_(friend_ids)).all()

def add_friend(db: Session, user_id: int, friend_phone: str):
    print(f"DEBUG: add_friend called by user {user_id} for phone: {friend_phone}")
    friend_user = db.query(models.User).filter(models.User.phone == friend_phone).first()
    if not friend_user or friend_user.id == user_id:
        print(f"DEBUG: Friend user not found or is self. friend_user: {friend_user}")
        return None

    # Check if already friends
    existing_friendship = db.query(models.Friend).filter(
        models.Friend.user_id == user_id, 
        models.Friend.friend_id == friend_user.id
    ).first()
    if existing_friendship:
        print(f"DEBUG: Friendship already exists between {user_id} and {friend_user.id}")
        return friend_user

    # Add friendship in both directions
    db.add(models.Friend(user_id=user_id, friend_id=friend_user.id))
    db.add(models.Friend(user_id=friend_user.id, friend_id=user_id))
    db.commit()
    print(f"DEBUG: Friendship created between {user_id} and {friend_user.id}")

    return friend_user

def delete_friend(db: Session, user_id: int, friend_id: int):
    # Delete friendship in both directions
    friendship1 = db.query(models.Friend).filter(
        models.Friend.user_id == user_id, 
        models.Friend.friend_id == friend_id
    ).first()
    friendship2 = db.query(models.Friend).filter(
        models.Friend.user_id == friend_id, 
        models.Friend.friend_id == user_id
    ).first()

    if friendship1:
        db.delete(friendship1)
    if friendship2:
        db.delete(friendship2)
    db.commit()
    return True

# Shared Event CRUD
def add_collaborator_to_event(db: Session, event_id: int, owner_id: int, collaborator_id: int):
    event = db.query(models.Event).filter(models.Event.id == event_id, models.Event.user_id == owner_id).first()
    collaborator = db.query(models.User).filter(models.User.id == collaborator_id).first()

    if not event or not collaborator:
        return None
    
    # Ensure the event is marked as shared
    if not event.is_shared:
        event.is_shared = True
        db.add(event)

    # Check if already a collaborator
    existing_collaborator = db.query(models.EventCollaborator).filter(
        models.EventCollaborator.event_id == event_id,
        models.EventCollaborator.user_id == collaborator_id
    ).first()
    if existing_collaborator:
        return existing_collaborator

    db_collaborator = models.EventCollaborator(event_id=event_id, user_id=collaborator_id)
    db.add(db_collaborator)
    db.commit()
    db.refresh(db_collaborator)
    return db_collaborator

def remove_collaborator_from_event(db: Session, event_id: int, owner_id: int, collaborator_id: int):
    db_collaborator = db.query(models.EventCollaborator).filter(
        models.EventCollaborator.event_id == event_id,
        models.EventCollaborator.user_id == collaborator_id
    ).first()

    if not db_collaborator:
        return None
    
    db.delete(db_collaborator)
    db.commit()
    return True

def get_shared_events_for_user(db: Session, user_id: int):
    # Events where the user is the owner AND it's shared
    owned_shared_events = db.query(models.Event).filter(
        models.Event.user_id == user_id,
        models.Event.is_shared == True
    ).all()

    # Events where the user is a collaborator
    collaborated_events = db.query(models.Event).join(models.EventCollaborator).filter(
        models.EventCollaborator.user_id == user_id
    ).all()

    # Combine and remove duplicates
    all_shared_events = {event.id: event for event in owned_shared_events + collaborated_events}.values()
    return list(all_shared_events)