from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.api.routes.auth import router as auth_router

# Import models so Base.metadata knows about all tables
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes.debug_ws import router as debug_router  # noqa: E402
from app.api.routes.projects import router as projects_router  # noqa: E402
from app.api.routes.users import router as users_router  # noqa: E402

app.include_router(auth_router)
app.include_router(debug_router)
app.include_router(projects_router)
app.include_router(users_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}


# ─── Mount Socket.IO ────────────────────────────────────────────
from app.websocket.socket_manager import socket_app  # noqa: E402

app.mount("/ws", socket_app)
