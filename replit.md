# Secure Decentralized Chat Application

## Overview
A hacker-grade secure chat application with password-protected rooms, client-side AES-256 encryption, and real-time WebSocket communication. Features ephemeral messaging with no persistent storage for maximum security.

## Tech Stack
- **Frontend**: React + TypeScript, Wouter (routing), TanStack Query, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, WebSocket (ws), In-memory storage
- **Encryption**: CryptoJS (AES-256 client-side encryption)
- **Design**: Terminal/hacker aesthetic with monospace fonts, green/cyan accents

## Features
- ✅ Password-protected chat rooms
- ✅ Real-time WebSocket communication
- ✅ Client-side AES-256 message encryption
- ✅ Secure room creation via API (server generates room IDs)
- ✅ Passphrase validation before joining
- ✅ Dynamic passphrase changing (admin only, clears message history)
- ✅ Active user presence indicators
- ✅ Ephemeral messages (in-memory only, cleared on passphrase change)
- ✅ Copy-to-clipboard for room ID and passphrase
- ✅ Connection status indicators
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Secure credential storage (sessionStorage, never in URLs)

## Security Model

### Threat Model & Design Decisions
This application prioritizes usability and ephemeral communication over perfect forward secrecy. Key security features:

1. **Client-Side Encryption**: All messages are encrypted with AES-256 in the browser before transmission
2. **Passphrase-Based Access**: Only users with the correct passphrase can:
   - Join the room (validated by server)
   - Decrypt messages (client-side)
3. **No Persistent Storage**: All data exists only in server memory and is lost on:
   - Server restart
   - All users leaving the room
   - Admin changing room passphrase
4. **Passphrase Rotation**: When admin changes passphrase:
   - All message history is immediately cleared from server
   - All non-admin users are disconnected
   - Users must obtain new passphrase to rejoin
   - Fresh chat session starts with no history
5. **Secure Credential Storage**:
   - Passphrases NEVER appear in URLs (no browser history exposure)
   - Stored in sessionStorage only (cleared on tab close)
   - Transmitted via encrypted WebSocket (WSS over TLS)

### Known Limitations
- WebSocket authentication sends passphrase in message payload (over WSS/TLS)
- No perfect forward secrecy - changing passphrase clears history rather than re-encrypting
- Message history visible to all users with current passphrase
- No user authentication beyond username (first-come, first-served in room)
- SessionStorage visible in browser dev tools (acceptable for ephemeral chat)

These tradeoffs favor simplicity and user experience for an MVP ephemeral chat system.

## Architecture

### Data Models
- **ChatRoom**: id (UUID), name, passphraseHash (bcrypt), createdBy, createdAt
- **Message**: id, roomId, userId, username, content (encrypted), timestamp, isSystem
- **User**: id, username, roomId, isAdmin, joinedAt

### API Endpoints
- `POST /api/rooms/create`: Create new room, returns server-generated roomId
- `POST /api/rooms/verify`: Verify passphrase for room before joining

### WebSocket Message Types
- `join_room`: User joins a room with passphrase (validated)
- `leave_room`: User leaves a room
- `send_message`: Send encrypted message to room
- `message_broadcast`: Broadcast message to all room users
- `user_joined`: Notify when user joins
- `user_left`: Notify when user leaves
- `user_list_update`: Update active users list
- `passphrase_changed`: Admin changed room passphrase (history cleared)
- `error`: Error messages (with fatal flag for disconnection)

### Security Flow

**Room Creation:**
1. Client sends roomName, passphrase, createdBy to `/api/rooms/create`
2. Server generates UUID roomId, hashes passphrase with bcrypt
3. Server stores room in memory
4. Server returns roomId to client
5. Client stores roomId + passphrase in sessionStorage
6. Client navigates to /chat and connects via WebSocket

**Room Joining:**
1. Client sends roomId + passphrase to `/api/rooms/verify`
2. Server validates passphrase against stored hash
3. If valid, client stores credentials in sessionStorage
4. Client navigates to /chat and connects via WebSocket
5. WebSocket join_room message sent with credentials
6. Server validates again and adds user to room
7. Historical messages replayed (encrypted with room passphrase)

**Passphrase Change:**
1. Admin clicks "CHANGE PASSPHRASE" (with warning about history clearing)
2. Server updates passphrase hash
3. Server **clears all message history** for security
4. Server disconnects all non-admin users
5. Admin reconnects with new passphrase
6. Fresh chat session begins with no message history

## Project Structure
```
client/
├── src/
│   ├── components/
│   │   ├── connection-status.tsx    # Connection indicator
│   │   ├── encryption-badge.tsx     # AES-256 badge
│   │   ├── message-input.tsx        # Message input area
│   │   ├── message-list.tsx         # Message display
│   │   ├── passphrase-modal.tsx     # Change passphrase modal
│   │   └── user-list.tsx            # Active users sidebar
│   ├── hooks/
│   │   └── use-websocket.ts         # WebSocket connection hook
│   ├── lib/
│   │   ├── crypto.ts                # AES-256 encryption utilities
│   │   └── queryClient.ts           # API request utilities
│   ├── pages/
│   │   ├── room-selector.tsx        # Landing page (create/join room)
│   │   └── chat-room.tsx            # Main chat interface
│   └── App.tsx                      # Main app with routing
server/
├── routes.ts                        # API + WebSocket server
└── storage.ts                       # In-memory storage
shared/
└── schema.ts                        # TypeScript schemas and types
```

## Running the Application
The app automatically starts with `npm run dev` which runs both Express backend and Vite frontend on the same port.

## Design Guidelines
See `design_guidelines.md` for comprehensive UI/UX specifications including:
- Terminal/hacker aesthetic with dark theme
- Monospace typography (JetBrains Mono, Fira Code)
- Green/cyan color accents for status indicators
- Pulsing connection status animations
- Three-column responsive layout
- Message bubbles with border-left accents
- Encryption and security badges

## User Flows

### Creating a Room
1. Enter room name, username, and passphrase (min 6 characters)
2. Click "CREATE SECURE ROOM"
3. Server generates unique room ID
4. User becomes admin with passphrase change privileges
5. Share Room ID and passphrase with trusted users

### Joining a Room
1. Obtain Room ID and passphrase from room creator
2. Enter Room ID, username, and passphrase
3. Click "JOIN ROOM"
4. Server validates passphrase
5. If correct, join room and see encrypted chat history

### Sending Messages
1. Type message in input area
2. Press Enter or click SEND
3. Message encrypted with room passphrase (client-side)
4. Encrypted message sent via WebSocket
5. Other users decrypt with their passphrase copy

### Changing Passphrase (Admin Only)
1. Click "CHANGE PASSPHRASE" button in sidebar
2. Read warning about message history being cleared
3. Enter new passphrase (min 6 characters)
4. Confirm new passphrase
5. **All message history immediately cleared**
6. All other users immediately disconnected
7. Admin reconnects with new passphrase
8. Share new passphrase with trusted users

## Recent Changes
- Initial implementation (Oct 26, 2025)
  - Complete schema definition with secure types
  - All frontend components with terminal aesthetic
  - WebSocket hook and AES-256 crypto utilities
  - Room selector and chat room pages
  - Design tokens and animations
  - **Security improvements:**
    - Passphrases removed from URLs (use sessionStorage)
    - Server-side room ID generation (UUID)
    - API endpoints for room creation/verification
    - Message history cleared on passphrase change
    - Secure credential storage and transmission

## Testing
- Run e2e tests with playwright to verify:
  - Room creation and joining flows
  - Message encryption/decryption
  - User presence indicators
  - Passphrase change and history clearing
  - Connection status and reconnection logic
