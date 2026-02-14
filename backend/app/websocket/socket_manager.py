"""Socket.IO server for real-time WebSocket communication.

Handles JWT auth on connect, project room management, and event emission.
"""

import logging
from typing import Any

import socketio

from app.config import settings
from app.services.auth_service import decode_access_token

logger = logging.getLogger(__name__)

# Create Socket.IO async server (ASGI mode for FastAPI)
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=False,
    engineio_logger=False,
)

# ASGI app to mount on FastAPI
socket_app = socketio.ASGIApp(sio, socketio_path="/ws/socket.io")

# Track authenticated users: sid → user_id
_authenticated_sids: dict[str, int] = {}


# ─── Connection lifecycle ────────────────────────────────────────

@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None):
    """Authenticate on connect using JWT from auth payload."""
    token = None

    # Client sends auth: { token: "..." }
    if auth and isinstance(auth, dict):
        token = auth.get("token")

    # Fallback: check query string (?token=...)
    if not token:
        query = environ.get("QUERY_STRING", "")
        for param in query.split("&"):
            if param.startswith("token="):
                token = param.split("=", 1)[1]
                break

    if not token:
        logger.warning("Socket connect rejected: no token (sid=%s)", sid)
        raise socketio.exceptions.ConnectionRefusedError("Authentication required")

    payload = decode_access_token(token)
    if payload is None:
        logger.warning("Socket connect rejected: invalid token (sid=%s)", sid)
        raise socketio.exceptions.ConnectionRefusedError("Invalid or expired token")

    user_id = int(payload["sub"])
    _authenticated_sids[sid] = user_id
    logger.info("Socket connected: user=%d sid=%s", user_id, sid)


@sio.event
async def disconnect(sid: str):
    user_id = _authenticated_sids.pop(sid, None)
    logger.info("Socket disconnected: user=%s sid=%s", user_id, sid)


# ─── Room management ────────────────────────────────────────────

@sio.event
async def join_project(sid: str, data: dict):
    """Client joins a project room to receive updates."""
    user_id = _authenticated_sids.get(sid)
    if user_id is None:
        await sio.emit("error", {"message": "Not authenticated"}, to=sid)
        return

    project_id = data.get("project_id")
    if project_id is None:
        await sio.emit("error", {"message": "project_id required"}, to=sid)
        return

    room = f"project:{project_id}"
    await sio.enter_room(sid, room)
    logger.info("User %d joined room %s (sid=%s)", user_id, room, sid)
    await sio.emit("joined_project", {"project_id": project_id}, to=sid)


@sio.event
async def leave_project(sid: str, data: dict):
    """Client leaves a project room."""
    project_id = data.get("project_id")
    if project_id:
        room = f"project:{project_id}"
        await sio.leave_room(sid, room)
        logger.info("sid=%s left room %s", sid, room)


# ─── Emit helpers (called from tasks/orchestrator) ───────────────

async def emit_to_project(project_id: int, event: str, data: dict) -> None:
    """Emit an event to all clients in a project room."""
    room = f"project:{project_id}"
    await sio.emit(event, data, room=room)


async def emit_progress(project_id: int, stage: str, message: str) -> None:
    """Convenience: emit a progress_update event."""
    await emit_to_project(project_id, "progress_update", {
        "stage": stage,
        "message": message,
    })


# ─── Sync wrappers (for use from Celery/sync code) ──────────────

def emit_to_project_sync(project_id: int, event: str, data: dict) -> None:
    """Sync wrapper — emit via Socket.IO's external event emitter through Redis."""
    import redis as redis_lib
    mgr = socketio.RedisManager(settings.REDIS_URL, write_only=True)
    room = f"project:{project_id}"
    mgr.emit(event, data, room=room)


def emit_progress_sync(project_id: int, stage: str, message: str) -> None:
    """Sync convenience wrapper for progress events."""
    emit_to_project_sync(project_id, "progress_update", {
        "stage": stage,
        "message": message,
    })
