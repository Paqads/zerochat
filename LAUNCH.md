# 🚀 How to Launch Your Python Chat Server

## ✅ Cleanup Complete

I've successfully removed all unnecessary Node.js/React files:
- ❌ Deleted: `client/` directory (React frontend)
- ❌ Deleted: `server/` directory (Express.js backend)  
- ❌ Deleted: `shared/` directory (TypeScript schemas)
- ❌ Deleted: Node.js config files (package.json, tsconfig.json, vite.config.ts, etc.)

## 📂 What's Left (Clean Python Project)

```
.
├── app/                    # Python FastAPI Backend ✓
│   ├── main.py
│   ├── models.py
│   ├── storage.py
│   ├── crypto_utils.py
│   ├── database.py
│   └── routes/
│       ├── rooms.py
│       └── websocket.py
├── templates/              # Jinja2 HTML Templates ✓
│   ├── base.html
│   ├── index.html
│   └── chat.html
├── static/                 # JavaScript & CSS ✓
│   └── js/
│       ├── crypto.js
│       └── chat.js
├── main.py                 # Server Entry Point ✓
├── start.sh               # Quick Launch Script ✓
├── README.md              # Full Documentation ✓
└── LAUNCH.md              # This File ✓
```

## 🎯 How to Launch the Python Server

### Option 1: Direct Command (Recommended)

Open the Shell and run:

```bash
export PORT=8000
python main.py
```

The server will start on **http://localhost:8000**

### Option 2: Using the Startup Script

```bash
./start.sh
```

### Option 3: Background Process

```bash
export PORT=8000
nohup python main.py > server.log 2>&1 &
```

Then check logs with:
```bash
tail -f server.log
```

## 🔧 Permanent Fix (Manual Edit Required)

To make Python the default when you click "Run":

1. Open the `.replit` file in the editor
2. Find line 2: `run = "npm run dev"`
3. Change to: `run = "python main.py"`
4. Find line 51: `args = "npm run dev"`
5. Change to: `args = "python main.py"`
6. Save the file

**Note:** The system won't let me edit `.replit` automatically for security reasons.

## 📊 Server Status

After starting, you should see:

```
🚀 Starting ZeroChat server on http://0.0.0.0:8000
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## 🌐 Access the App

Once running, visit:
- **Local**: http://localhost:8000
- **Replit**: Your Replit webview will show the app

## ✨ Features Available

- ✅ Password-protected chat rooms
- ✅ AES-256-GCM encryption (client-side)
- ✅ Ed25519 digital signatures
- ✅ Real-time WebSocket messaging
- ✅ Self-destructing messages (10s-24h)
- ✅ **NEW: Relative timestamps** ("just now", "2m ago")
- ✅ **NEW: Typing indicators** with animated dots
- ✅ File sharing (up to 10MB)
- ✅ WebRTC peer-to-peer
- ✅ Admin passphrase rotation
- ✅ Connection status indicators

## 🐛 Troubleshooting

**Server won't start?**
1. Check Python is installed: `python --version`
2. Check dependencies: `pip list | grep fastapi`
3. View errors: `cat server.log`

**Wrong port?**
- The Replit environment sets `PORT=5000` by default
- Always export `PORT=8000` before running
- Or edit `main.py` line 51 to force port 8000

**Need help?**
- Full documentation: `replit.md`
- Design guidelines: `design_guidelines.md`
- Quick start: `README.md`

## 🎉 You're All Set!

Your secure chat application is ready to launch with Python FastAPI!
