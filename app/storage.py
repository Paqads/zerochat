from typing import Dict, List, Optional
from datetime import datetime
import uuid
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Room, Message, FileShare

class InMemoryStorage:
    def __init__(self):
        self.rooms: Dict[str, dict] = {}
        self.messages: Dict[str, List[dict]] = {}
        self.users: Dict[str, dict] = {}
        self.file_shares: Dict[str, List[dict]] = {}
    
    def create_room(self, room_id: str, room_data: dict) -> dict:
        self.rooms[room_id] = room_data
        self.messages[room_id] = []
        self.file_shares[room_id] = []
        return room_data
    
    def get_room(self, room_id: str) -> Optional[dict]:
        return self.rooms.get(room_id)
    
    def update_room_passphrase(self, room_id: str, passphrase_hash: str):
        if room_id in self.rooms:
            self.rooms[room_id]['passphrase_hash'] = passphrase_hash
            self.messages[room_id] = []
    
    def delete_room(self, room_id: str):
        self.rooms.pop(room_id, None)
        self.messages.pop(room_id, None)
        self.file_shares.pop(room_id, None)
        users_to_remove = [uid for uid, u in self.users.items() if u.get('room_id') == room_id]
        for uid in users_to_remove:
            del self.users[uid]
    
    def add_message(self, room_id: str, message: dict) -> dict:
        if room_id not in self.messages:
            self.messages[room_id] = []
        self.messages[room_id].append(message)
        return message
    
    def get_messages(self, room_id: str) -> List[dict]:
        return self.messages.get(room_id, [])
    
    def delete_message(self, room_id: str, message_id: str):
        if room_id in self.messages:
            self.messages[room_id] = [m for m in self.messages[room_id] if m['id'] != message_id]
    
    def add_user(self, user_id: str, user_data: dict) -> dict:
        self.users[user_id] = user_data
        return user_data
    
    def get_user(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)
    
    def get_users_by_room(self, room_id: str) -> List[dict]:
        return [u for u in self.users.values() if u.get('room_id') == room_id]
    
    def remove_user(self, user_id: str):
        self.users.pop(user_id, None)
    
    def add_file_share(self, room_id: str, file_data: dict) -> dict:
        if room_id not in self.file_shares:
            self.file_shares[room_id] = []
        self.file_shares[room_id].append(file_data)
        return file_data
    
    def get_file_shares(self, room_id: str) -> List[dict]:
        return self.file_shares.get(room_id, [])


class DualStorage(InMemoryStorage):
    """Storage that combines in-memory cache with PostgreSQL persistence."""
    
    def __init__(self):
        super().__init__()
        self.load_from_database()
    
    def load_from_database(self):
        """Load all persistent rooms and messages from database on startup."""
        db = SessionLocal()
        try:
            # Load all persistent rooms (convert enum to string)
            from app.models import StorageMode
            db_rooms = db.query(Room).filter(Room.storage_mode == StorageMode.PERSISTENT).all()
            for room in db_rooms:
                self.rooms[room.id] = {
                    'id': room.id,
                    'name': room.name,
                    'passphrase_hash': room.passphrase_hash,
                    'created_at': room.created_at,
                    'storage_mode': room.storage_mode.value if hasattr(room.storage_mode, 'value') else room.storage_mode,  # Convert enum to string
                    'created_by': room.created_by
                }
                self.messages[room.id] = []
                self.file_shares[room.id] = []
            
            # Load all messages for persistent rooms (convert to camelCase for frontend)
            for room_id in self.rooms.keys():
                db_messages = db.query(Message).filter(Message.room_id == room_id).all()
                for msg in db_messages:
                    self.messages[room_id].append({
                        'id': msg.id,
                        'roomId': msg.room_id,
                        'userId': msg.user_id,
                        'username': msg.username,
                        'content': msg.content,  # Correct field name
                        'timestamp': msg.timestamp.timestamp() * 1000 if hasattr(msg.timestamp, 'timestamp') else msg.timestamp,
                        'ttl': msg.ttl_seconds,  # Correct field name
                        'signature': msg.signature,
                        'publicKey': msg.public_key,
                        'verified': msg.verified if hasattr(msg, 'verified') else False,
                        'isSystem': msg.is_system  # Correct field name
                    })
            
                # Load file shares (convert to camelCase for frontend)
                db_files = db.query(FileShare).filter(FileShare.room_id == room_id).all()
                for file in db_files:
                    self.file_shares[room_id].append({
                        'id': file.id,
                        'roomId': file.room_id,
                        'userId': file.user_id,
                        'username': file.username,
                        'filename': file.filename,
                        'encryptedData': file.encrypted_data,
                        'mimeType': file.mime_type,
                        'fileSize': file.file_size,
                        'signature': file.signature,
                        'timestamp': file.timestamp.timestamp() * 1000 if hasattr(file.timestamp, 'timestamp') else file.timestamp
                    })
        finally:
            db.close()
    
    def create_room(self, room_id: str, room_data: dict) -> dict:
        # Create in memory
        result = super().create_room(room_id, room_data)
        
        # If persistent mode, also save to database
        if room_data.get('storage_mode') == 'persistent':
            db = SessionLocal()
            try:
                db_room = Room(
                    id=room_id,
                    name=room_data['name'],
                    passphrase_hash=room_data['passphrase_hash'],
                    created_by=room_data.get('created_by'),
                    storage_mode='persistent'
                )
                db.add(db_room)
                db.commit()
            finally:
                db.close()
        
        return result
    
    def get_room(self, room_id: str) -> Optional[dict]:
        # Try memory first
        room = super().get_room(room_id)
        if room:
            return room
        
        # Fall back to database
        db = SessionLocal()
        try:
            db_room = db.query(Room).filter(Room.id == room_id).first()
            if db_room:
                room_data = {
                    'id': db_room.id,
                    'name': db_room.name,
                    'passphrase_hash': db_room.passphrase_hash,
                    'created_at': db_room.created_at,
                    'storage_mode': db_room.storage_mode,
                    'created_by': db_room.created_by
                }
                # Cache in memory
                self.rooms[room_id] = room_data
                return room_data
        finally:
            db.close()
        
        return None
    
    def add_message(self, room_id: str, message: dict) -> dict:
        # Add to memory
        result = super().add_message(room_id, message)
        
        # If room is persistent, save to database
        room = self.get_room(room_id)
        if room and room.get('storage_mode') == 'persistent':
            db = SessionLocal()
            try:
                db_message = Message(
                    id=message['id'],
                    room_id=room_id,
                    user_id=message['userId'],
                    username=message['username'],
                    content=message['content'],  # Correct field name
                    ttl_seconds=message.get('ttl'),  # Correct field name
                    signature=message.get('signature'),
                    public_key=message.get('publicKey'),
                    verified=message.get('verified', False),
                    is_system=message.get('isSystem', False)  # Correct field name
                )
                db.add(db_message)
                db.commit()
            finally:
                db.close()
        
        return result
    
    def update_room_passphrase(self, room_id: str, passphrase_hash: str):
        # Update in memory
        super().update_room_passphrase(room_id, passphrase_hash)
        
        # Update in database if persistent
        room = self.get_room(room_id)
        if room and room.get('storage_mode') == 'persistent':
            db = SessionLocal()
            try:
                db_room = db.query(Room).filter(Room.id == room_id).first()
                if db_room:
                    db_room.passphrase_hash = passphrase_hash
                    db.commit()
                
                # Clear messages from database
                db.query(Message).filter(Message.room_id == room_id).delete()
                db.commit()
            finally:
                db.close()
    
    def add_file_share(self, room_id: str, file_data: dict) -> dict:
        # Add to memory
        result = super().add_file_share(room_id, file_data)
        
        # If room is persistent, save to database
        room = self.get_room(room_id)
        if room and room.get('storage_mode') == 'persistent':
            db = SessionLocal()
            try:
                db_file = FileShare(
                    id=file_data['id'],
                    room_id=room_id,
                    user_id=file_data['userId'],
                    username=file_data['username'],
                    filename=file_data['filename'],
                    encrypted_data=file_data['encryptedData'],
                    mime_type=file_data['mimeType'],
                    file_size=file_data['fileSize'],
                    signature=file_data.get('signature')
                )
                db.add(db_file)
                db.commit()
            finally:
                db.close()
        
        return result


# Use DualStorage by default (supports both ephemeral and persistent modes)
memory_storage = DualStorage()
