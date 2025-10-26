from typing import Dict, List, Optional
from datetime import datetime
import uuid

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

memory_storage = InMemoryStorage()
