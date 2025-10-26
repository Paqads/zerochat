# 🔒 Secure Decentralized Chat Application

A hacker-grade secure chat application with password-protected rooms, client-side AES-256 encryption, and real-time WebSocket communication.

## 🚀 Quick Start

### Run the Python Server

```bash
python main.py
```

The server will start on **http://localhost:8000**

Or use the startup script:
```bash
./start.sh
```

## 📂 Project Structure

```
.
├── app/                    # Python FastAPI Backend
│   ├── main.py            # Application entry point
│   ├── models.py          # Pydantic data models
│   ├── storage.py         # In-memory & PostgreSQL storage
│   ├── crypto_utils.py    # Ed25519 signature verification
│   └── routes/
│       ├── rooms.py       # Room creation/verification API
│       └── websocket.py   # Socket.IO WebSocket handlers
├── templates/              # Jinja2 HTML Templates
│   ├── base.html          # Base template with CSS
│   ├── index.html         # Landing page (create/join room)
│   └── chat.html          # Chat room interface
├── static/                 # Static Assets
│   └── js/
│       ├── crypto.js      # AES-256-GCM + Ed25519 encryption
│       └── chat.js        # Chat logic + WebSocket
├── main.py                 # Server entry point
├── start.sh               # Quick launch script
└── README.md              # This file
```

## ✨ Features

- ✅ Password-protected chat rooms
- ✅ Real-time WebSocket communication (Socket.IO)
- ✅ Client-side AES-256-GCM encryption
- ✅ Ed25519 digital signatures
- ✅ Server-side signature verification
- ✅ Self-destructing messages (10s to 24h TTL)
- ✅ **Relative timestamps** ("just now", "2m ago")
- ✅ **Typing indicators** with animated dots
- ✅ **Throttled typing events** (500ms)
- ✅ WebRTC peer-to-peer support
- ✅ Encrypted file sharing (up to 10MB)
- ✅ User fingerprint display
- ✅ Connection status indicators
- ✅ Dual storage mode (in-memory OR PostgreSQL)

## 🔐 Security Features

- **Client-Side Encryption**: AES-256-GCM before transmission
- **Digital Signatures**: Ed25519 for message authenticity
- **Server Verification**: Prevents message spoofing
- **Passphrase Protection**: Bcrypt hashing on server
- **Ephemeral Mode**: No persistent storage (optional)
- **Secure Storage**: Credentials in sessionStorage only

## 📖 Documentation

See `replit.md` for complete technical documentation including:
- Architecture and data models
- Security model and threat analysis
- API endpoints and WebSocket events
- User flows and workflows

See `design_guidelines.md` for UI/UX specifications.

## 🛠️ Tech Stack

- **Backend**: Python FastAPI + python-socketio
- **Frontend**: Vanilla JavaScript + Jinja2
- **Encryption**: Web Crypto API
- **Database**: PostgreSQL (optional)
- **Design**: Terminal/hacker aesthetic

## 📝 Usage

1. **Create a Room**: Enter room name, username, and passphrase
2. **Share Room ID**: Give Room ID + passphrase to trusted users
3. **Join Room**: Others enter your Room ID + passphrase
4. **Chat Securely**: All messages encrypted client-side
5. **Self-Destruct**: Set message timers (10s to 24h)
6. **Change Passphrase**: Admin can rotate passphrase (clears history)

## 🔧 Environment Variables

- `DATABASE_URL`: PostgreSQL connection (optional)
- `SESSION_SECRET`: JWT session secret (auto-generated)
- `STORAGE_MODE`: "memory" or "database" (default: memory)

## 🧪 Testing

The application includes comprehensive E2E test coverage with data-testid attributes for Playwright testing.

## 📄 License

MIT License - See full documentation in `replit.md`
