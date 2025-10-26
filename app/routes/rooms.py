from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from passlib.hash import bcrypt
import uuid
from app.storage import memory_storage
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Room, StorageMode

router = APIRouter()

class CreateRoomRequest(BaseModel):
    roomName: str = Field(..., min_length=1)
    passphrase: str = Field(..., min_length=6)
    createdBy: str
    storageMode: str = "ephemeral"

class VerifyRoomRequest(BaseModel):
    roomId: str
    passphrase: str

@router.post("/rooms/create")
async def create_room(request: CreateRoomRequest, db: Session = Depends(get_db)):
    room_id = str(uuid.uuid4())
    passphrase_hash = bcrypt.hash(request.passphrase)
    
    # DualStorage handles both memory and database storage
    room_data = {
        "id": room_id,
        "name": request.roomName,
        "passphrase_hash": passphrase_hash,
        "created_by": request.createdBy,
        "storage_mode": request.storageMode
    }
    memory_storage.create_room(room_id, room_data)
    
    return {"roomId": room_id, "roomName": request.roomName}

@router.post("/rooms/verify")
async def verify_room(request: VerifyRoomRequest):
    room = memory_storage.get_room(request.roomId)
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if not bcrypt.verify(request.passphrase, room['passphrase_hash']):
        return {"valid": False, "roomName": room['name']}
    
    return {"valid": True, "roomName": room['name']}
