import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .seed import seed_database
from .routers import meetings, participants, ws

# Initialize DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed database
    seed_database()
    yield
    # Shutdown: nothing to clean up

app = FastAPI(
    title="Zoom Clone API",
    description="Backend API and WebRTC WebSocket signaling server for Zoom Clone",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup – allow local dev, LAN access, and deployed frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(meetings.router)
app.include_router(participants.router)
app.include_router(ws.router)

@app.get("/")
def read_root():
    return {"message": "Zoom Clone API Server Running", "status": "ok"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "zoom-clone-backend"}
