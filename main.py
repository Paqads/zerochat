import os
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from app.database import init_db
from app.routes import rooms
from app.routes.websocket import sio
import socketio

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(lifespan=lifespan, title="ZeroChat - Secure Encrypted Chat")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    app.mount("/static", StaticFiles(directory="static"), name="static")
except:
    pass

templates = Jinja2Templates(directory="templates")

app.include_router(rooms.router, prefix="/api", tags=["rooms"])

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/chat", response_class=HTMLResponse)
async def chat(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

socket_app = socketio.ASGIApp(sio, app, socketio_path='/socket.io')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    uvicorn.run(socket_app, host="0.0.0.0", port=port, log_level="info")
