"""Debug endpoint to test WebSocket emission. Remove in production."""
from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User
from app.websocket.socket_manager import sio

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.post("/emit/{project_id}")
async def emit_test_event(
    project_id: int,
    current_user: User = Depends(get_current_user),
):
    """Emit a test event to a project room."""
    room = f"project:{project_id}"
    await sio.emit("progress_update", {
        "stage": "test",
        "message": f"Test event from user {current_user.full_name}",
    }, room=room)
    return {"sent": True, "room": room}
