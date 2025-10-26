import socketio
from passlib.hash import bcrypt
from app.storage import memory_storage
from datetime import datetime
import asyncio

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

# Store active connections
clients = {}

@sio.event
async def connect(sid, environ):
    print(f"[WS] Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"[WS] Client disconnected: {sid}")
    if sid in clients:
        user_data = clients[sid]
        room_id = user_data.get('room_id')
        user_id = user_data.get('user_id')
        username = user_data.get('username')
        
        if room_id and user_id:
            user = memory_storage.get_user(user_id)
            if user:
                await handle_user_leave(sid, user_id, room_id, username)

@sio.event
async def join_room(sid, data):
    room_id = data.get('roomId')
    username = data.get('username')
    passphrase = data.get('passphrase')
    user_id = data.get('userId')
    is_admin = data.get('isAdmin', False)
    public_key = data.get('publicKey')
    
    room = memory_storage.get_room(room_id)
    
    if not room:
        await sio.emit('error', {'message': 'Room not found', 'fatal': True}, room=sid)
        return
    
    if not bcrypt.verify(passphrase, room['passphrase_hash']):
        await sio.emit('error', {'message': 'Invalid passphrase', 'fatal': True}, room=sid)
        return
    
    existing_users = memory_storage.get_users_by_room(room_id)
    if any(u['username'] == username and u['id'] != user_id for u in existing_users):
        await sio.emit('error', {'message': 'Username already taken in this room'}, room=sid)
        return
    
    user_data = {
        'id': user_id,
        'username': username,
        'room_id': room_id,
        'is_admin': is_admin,
        'public_key': public_key,
        'joined_at': datetime.utcnow().isoformat()
    }
    memory_storage.add_user(user_id, user_data)
    
    clients[sid] = {
        'user_id': user_id,
        'username': username,
        'room_id': room_id
    }
    
    await sio.enter_room(sid, room_id)
    
    messages = memory_storage.get_messages(room_id)
    for msg in messages:
        await sio.emit('message_broadcast', msg, room=sid)
    
    await sio.emit('user_joined', {'userId': user_id, 'username': username}, room=room_id, skip_sid=sid)
    await send_user_list_update(room_id)
    
    print(f"[WS] User {username} joined room {room_id}")

@sio.event
async def send_message(sid, data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    username = data.get('username')
    content = data.get('content')
    ttl_seconds = data.get('ttl')
    signature = data.get('signature')
    public_key = data.get('publicKey')
    
    message = {
        'id': data.get('id', str(asyncio.get_event_loop().time())),
        'roomId': room_id,
        'userId': user_id,
        'username': username,
        'content': content,
        'timestamp': datetime.utcnow().timestamp() * 1000,
        'isSystem': False,
        'ttl': ttl_seconds,
        'signature': signature,
        'publicKey': public_key
    }
    
    memory_storage.add_message(room_id, message)
    
    await sio.emit('message_broadcast', message, room=room_id)
    
    if ttl_seconds:
        asyncio.create_task(auto_delete_message(room_id, message['id'], ttl_seconds))

async def auto_delete_message(room_id: str, message_id: str, ttl_seconds: int):
    await asyncio.sleep(ttl_seconds)
    memory_storage.delete_message(room_id, message_id)
    await sio.emit('message_deleted', {'messageId': message_id}, room=room_id)

@sio.event
async def change_passphrase(sid, data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    new_passphrase = data.get('newPassphrase')
    
    user = memory_storage.get_user(user_id)
    if not user or not user.get('is_admin') or user.get('room_id') != room_id:
        await sio.emit('error', {'message': 'Unauthorized - Admin only'}, room=sid)
        return
    
    passphrase_hash = bcrypt.hash(new_passphrase)
    memory_storage.update_room_passphrase(room_id, passphrase_hash)
    
    all_users = memory_storage.get_users_by_room(room_id)
    
    for u in all_users:
        user_sid = get_sid_for_user(u['id'])
        if not user_sid:
            continue
        
        await sio.emit('clear_history', {}, room=user_sid)
        
        if u['id'] != user_id:
            await sio.emit('passphrase_changed', {}, room=user_sid)
            await asyncio.sleep(0.2)
            await sio.disconnect(user_sid)
            memory_storage.remove_user(u['id'])
            if user_sid in clients:
                del clients[user_sid]
    
    await send_user_list_update(room_id)

@sio.event
async def leave_room(sid, data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    
    user = memory_storage.get_user(user_id)
    if user and user.get('room_id') == room_id:
        await handle_user_leave(sid, user_id, room_id, user['username'])

@sio.event
async def share_file(sid, data):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    username = data.get('username')
    filename = data.get('filename')
    encrypted_data = data.get('encryptedData')
    mime_type = data.get('mimeType')
    file_size = data.get('fileSize')
    signature = data.get('signature')
    
    file_share = {
        'id': str(asyncio.get_event_loop().time()),
        'roomId': room_id,
        'userId': user_id,
        'username': username,
        'filename': filename,
        'encryptedData': encrypted_data,
        'mimeType': mime_type,
        'fileSize': file_size,
        'timestamp': datetime.utcnow().timestamp() * 1000,
        'signature': signature
    }
    
    memory_storage.add_file_share(room_id, file_share)
    await sio.emit('file_shared', file_share, room=room_id)

@sio.event
async def webrtc_signal(sid, data):
    target_user_id = data.get('targetUserId')
    signal_type = data.get('type')
    signal_data = data.get('data')
    sender_id = data.get('senderId')
    
    target_sid = get_sid_for_user(target_user_id)
    if target_sid:
        await sio.emit('webrtc_signal', {
            'type': signal_type,
            'data': signal_data,
            'senderId': sender_id
        }, room=target_sid)

async def handle_user_leave(sid: str, user_id: str, room_id: str, username: str):
    memory_storage.remove_user(user_id)
    if sid in clients:
        del clients[sid]
    
    await sio.emit('user_left', {'userId': user_id, 'username': username}, room=room_id)
    await send_user_list_update(room_id)
    
    remaining_users = memory_storage.get_users_by_room(room_id)
    if len(remaining_users) == 0:
        memory_storage.delete_room(room_id)

async def send_user_list_update(room_id: str):
    users = memory_storage.get_users_by_room(room_id)
    await sio.emit('user_list_update', {'users': users}, room=room_id)

def get_sid_for_user(user_id: str):
    for sid, data in clients.items():
        if data.get('user_id') == user_id:
            return sid
    return None
