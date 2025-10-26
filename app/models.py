from sqlalchemy import Column, String, Boolean, Integer, Text, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class StorageMode(str, enum.Enum):
    EPHEMERAL = "ephemeral"
    PERSISTENT = "persistent"

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    passphrase_hash = Column(String(255), nullable=False)
    created_by = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    storage_mode = Column(Enum(StorageMode), default=StorageMode.EPHEMERAL)
    
    messages = relationship("Message", back_populates="room", cascade="all, delete-orphan")
    
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    username = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)  # Encrypted content
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_system = Column(Boolean, default=False)
    ttl_seconds = Column(Integer, nullable=True)  # Self-destruct timer
    signature = Column(Text, nullable=True)  # Digital signature for verification
    public_key = Column(Text, nullable=True)  # Sender's public key
    verified = Column(Boolean, default=False)  # Server-side signature verification result
    
    room = relationship("Room", back_populates="messages")

class FileShare(Base):
    __tablename__ = "file_shares"
    
    id = Column(String(36), primary_key=True)
    room_id = Column(String(36), ForeignKey("rooms.id"), nullable=False)
    user_id = Column(String(36), nullable=False)
    username = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    encrypted_data = Column(Text, nullable=False)  # Base64 encrypted file
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    signature = Column(Text, nullable=True)

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./zerochat.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
