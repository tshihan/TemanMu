from fastapi import APIRouter, HTTPException, Response

from app.db import notifications as db_notifications
from app.models import MarkReadRequest, Notification, Role
from app.realtime import broadcast as realtime

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[Notification])
async def get_notifications(role: Role) -> list[Notification]:
    """One role's notifications, newest first. `role` is required."""
    return await db_notifications.list_notifications(role)


@router.post("/notifications/read", status_code=204, response_class=Response)
async def mark_notifications_read(body: MarkReadRequest) -> Response:
    """Mark every notification for the role as read. No broadcast: only the sender cares."""
    await db_notifications.mark_all_read(body.role)
    return Response(status_code=204)


@router.post("/notifications/{notification_id}/read", response_model=Notification)
async def mark_notification_read(notification_id: str, body: MarkReadRequest) -> Notification:
    notification = await db_notifications.mark_one_read(notification_id, body.role)
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    await realtime.broadcast("notification.updated", notification)
    return notification
