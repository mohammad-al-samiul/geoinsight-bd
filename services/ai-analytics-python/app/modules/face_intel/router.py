"""Face Intel HTTP API — `/api/v1/face-intel/...`."""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.modules.face_intel.schemas import IdentifyByNidRequest, MatchResponse
from app.modules.face_intel.service import FaceIntelEngine

router = APIRouter(prefix="/face-intel", tags=["Face Intel"])
_engine = FaceIntelEngine()


class Base64MatchRequest(BaseModel):
    image_base64: str = Field(min_length=32, description="Raw or data-URL base64 image")
    threshold: float = Field(default=0.72, ge=0.4, le=0.99)
    demo_fallback: bool = True


@router.get("/gallery")
async def list_vip_gallery() -> dict:
    return {"vips": _engine.list_gallery(), "count": len(_engine.list_gallery())}


@router.get("/sample/{vip_id}")
async def vip_sample_portrait(vip_id: str) -> Response:
    try:
        jpeg = _engine.sample_jpeg(vip_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="unknown_vip") from exc
    return Response(content=jpeg, media_type="image/jpeg")


@router.post("/match", response_model=MatchResponse)
async def match_face_base64(body: Base64MatchRequest) -> MatchResponse:
    """Match an uploaded / webcam still (base64) against the VIP face gallery."""
    try:
        return _engine.match_base64(
            body.image_base64,
            threshold=body.threshold,
            demo_fallback=body.demo_fallback,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"match_failed:{exc}") from exc


@router.post("/match/upload", response_model=MatchResponse)
async def match_face_upload(
    file: UploadFile = File(...),
    threshold: float = Query(default=0.72, ge=0.4, le=0.99),
    demo_fallback: bool = Query(default=True),
) -> MatchResponse:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="empty_file")
    return _engine.match_bytes(data, threshold=threshold, demo_fallback=demo_fallback)


@router.post("/match/nid", response_model=MatchResponse)
async def match_by_nid(body: IdentifyByNidRequest) -> MatchResponse:
    """Lookup gallery VIP by national ID (DSS / lab mode without camera)."""
    return _engine.match_by_nid(body.nid)


@router.post("/enroll/{vip_id}")
async def enroll_vip_face(vip_id: str, file: UploadFile = File(...)) -> dict:
    data = await file.read()
    try:
        return _engine.enroll(vip_id, data)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="unknown_vip") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
