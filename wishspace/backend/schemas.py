from pydantic import BaseModel, Field, HttpUrl, constr
from typing import Optional, List
from datetime import datetime

# Auth Schemas
class TelegramAuthData(BaseModel):
    init_data: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Booking Schemas
class Booking(BaseModel):
    id: int
    item_id: int
    booked_by_user_id: int

    class Config:
        from_attributes = True

# Item Schemas
class ItemBase(BaseModel):
    title: constr(min_length=1, max_length=255)
    description: Optional[constr(max_length=1000)] = None
    image_url: Optional[str] = None
    link: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    note: Optional[constr(max_length=500)] = None

class ItemCreate(ItemBase):
    category_name: constr(min_length=1, max_length=50) = "General"

class ItemUpdate(ItemBase):
    category_id: Optional[int] = None

class Item(ItemBase):
    id: int
    user_id: int
    category_id: Optional[int] = None
    is_booked: Optional[bool] = Field(False, alias='is_booked')

    class Config:
        from_attributes = True

# Event Schemas
class EventBase(BaseModel):
    title: constr(min_length=1, max_length=255)
    description: Optional[constr(max_length=1000)] = None
    date: Optional[datetime] = None
    is_shared: bool = False # New field

class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    user_id: int
    items: List[Item] = []
    collaborators: List["User"] = [] # Forward reference

    class Config:
        from_attributes = True

# Friend Schemas
class FriendAdd(BaseModel):
    phone: constr(pattern=r"^\+\d{10,15}$") # E.g., +1234567890

class Friend(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True

# User Schemas
class UserCreate(BaseModel):
    telegram_id: int
    name: str
    phone: Optional[constr(pattern=r"^\+\d{10,15}$")] = None
    avatar_url: Optional[str] = None

class User(BaseModel):
    id: int
    telegram_id: int
    name: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Shared Event Schemas
class EventCollaboratorAdd(BaseModel):
    collaborator_id: int

class EventCollaborator(BaseModel):
    event_id: int
    user_id: int

    class Config:
        from_attributes = True

# Update forward references
Event.update_forward_refs()
