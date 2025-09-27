from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base

class StatusEnum(str, enum.Enum):
    favorite = "favorite"
    in_event = "in_event"
    booked = "booked"
    received = "received"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    name = Column(String)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    categories = relationship("Category", back_populates="owner")
    items = relationship("Item", back_populates="owner")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="categories")
    items = relationship("Item", back_populates="category")

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    link = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    note = Column(String, nullable=True)
    status = Column(Enum(StatusEnum), default=StatusEnum.favorite)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id"))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    owner = relationship("User", back_populates="items")
    category = relationship("Category", back_populates="items")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    date = Column(DateTime, nullable=True)
    description = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    is_shared = Column(Boolean, default=False) # New field for shared events

    owner = relationship("User")
    items = relationship("Item", secondary="event_items")
    collaborators = relationship("EventCollaborator", back_populates="event")

class EventItem(Base):
    __tablename__ = "event_items"
    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), primary_key=True)

class EventCollaborator(Base):
    __tablename__ = "event_collaborators"
    event_id = Column(Integer, ForeignKey("events.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)

    event = relationship("Event", back_populates="collaborators")
    user = relationship("User")

class Friend(Base):
    __tablename__ = "friends"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    friend_id = Column(Integer, ForeignKey("users.id"), primary_key=True)

class Booking(Base):
    __tablename__ = "bookings"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    booked_by_user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    item = relationship("Item")
    booked_by = relationship("User")
