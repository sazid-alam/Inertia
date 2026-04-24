import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models import DashboardResponse
from app.storage.store import (
    get_active_lockouts,
    get_all_statuses,
    get_authenticity_records,
    get_heatmap,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/status", response_model=DashboardResponse)
def get_status() -> DashboardResponse:
    return DashboardResponse(students=get_all_statuses())


@router.get("/lockouts")
def get_lockouts() -> dict[str, list[dict]]:
    return {"students": get_active_lockouts()}


@router.get("/authenticity")
def get_authenticity() -> dict[str, list[dict]]:
    return {"students": get_authenticity_records()}


@router.get("/stream")
async def stream_status() -> StreamingResponse:
    async def event_generator():
        while True:
            yield f"data: {json.dumps({'students': get_all_statuses()})}\n\n"
            await asyncio.sleep(30)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/heatmap")
def get_heatmap_data() -> dict:
    return {"heatmap": get_heatmap()}
