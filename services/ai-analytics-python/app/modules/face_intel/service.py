"""Face Intel service — detect, match VIP gallery, return match metadata."""

from __future__ import annotations

import base64
import logging

from app.modules.face_intel.gallery import VIP_GALLERY, find_by_nid, find_by_vip_id
from app.modules.face_intel.schemas import FaceMatchMeta, MatchResponse
from app.modules.face_intel.vision import (
    HAS_OPENCV,
    enroll_from_image,
    load_or_create_encoding,
    match_image_to_gallery,
    render_sample_face_jpeg,
)

logger = logging.getLogger(__name__)


class FaceIntelEngine:
    def __init__(self) -> None:
        self._ensure_gallery_encodings()

    def _ensure_gallery_encodings(self) -> None:
        for vip in VIP_GALLERY:
            load_or_create_encoding(vip["vip_id"], vip["nid"])
            # Ensure sample portrait + encoding from the rendered face exist
            try:
                render_sample_face_jpeg(vip["vip_id"], vip["nid"], vip["name"])
            except Exception:  # noqa: BLE001
                logger.debug("sample render skipped for %s", vip["vip_id"])

    def _gallery_vectors(self) -> list[tuple[str, object]]:
        out = []
        for vip in VIP_GALLERY:
            out.append((vip["vip_id"], load_or_create_encoding(vip["vip_id"], vip["nid"])))
        return out

    def list_gallery(self) -> list[dict]:
        return [
            {
                "vip_id": v["vip_id"],
                "nid": v["nid"],
                "name": v["name"],
                "designation": v["designation"],
                "designation_bn": v["designation_bn"],
                "representative_id": v["representative_id"],
                "party": v["party"],
                "sample_path": f"/api/v1/face-intel/sample/{v['vip_id']}",
            }
            for v in VIP_GALLERY
        ]

    def sample_jpeg(self, vip_id: str) -> bytes:
        vip = find_by_vip_id(vip_id)
        if not vip:
            raise KeyError("unknown_vip")
        return render_sample_face_jpeg(vip["vip_id"], vip["nid"], vip["name"])

    def match_bytes(
        self,
        image_bytes: bytes,
        *,
        threshold: float = 0.72,
        demo_fallback: bool = True,
    ) -> MatchResponse:
        gallery = self._gallery_vectors()
        vip_id, confidence, boxes, detected = match_image_to_gallery(
            image_bytes,
            gallery,  # type: ignore[arg-type]
            threshold=threshold,
        )

        engine = "opencv" if HAS_OPENCV else "numpy_stub"

        if vip_id is None and detected and demo_fallback and gallery:
            # Decision-support demo: face present but below threshold →
            # return nearest VIP with lowered confidence for analyst review.
            vip_id, confidence, _, _ = match_image_to_gallery(
                image_bytes,
                gallery,  # type: ignore[arg-type]
                threshold=0.0,
            )
            confidence = min(0.69, max(0.45, confidence))
            matched = vip_id is not None
            meta = FaceMatchMeta(
                matched=matched,
                confidence=round(float(confidence), 4),
                face_detected=True,
                face_boxes=[list(b) for b in boxes],
                vip_id=vip_id,
                nid=find_by_vip_id(vip_id)["nid"] if vip_id and find_by_vip_id(vip_id) else None,
                representative_id=(
                    find_by_vip_id(vip_id)["representative_id"]
                    if vip_id and find_by_vip_id(vip_id)
                    else None
                ),
                engine=f"{engine}+demo_fallback",
            )
            return MatchResponse(match=meta, gallery_size=len(gallery))

        vip = find_by_vip_id(vip_id) if vip_id else None
        meta = FaceMatchMeta(
            matched=vip is not None,
            confidence=round(float(max(0.0, confidence)), 4),
            face_detected=detected,
            face_boxes=[list(b) for b in boxes],
            vip_id=vip_id,
            nid=vip["nid"] if vip else None,
            representative_id=vip["representative_id"] if vip else None,
            engine=engine,
        )
        return MatchResponse(match=meta, gallery_size=len(gallery))

    def match_base64(
        self,
        image_b64: str,
        *,
        threshold: float = 0.72,
        demo_fallback: bool = True,
    ) -> MatchResponse:
        raw = image_b64.strip()
        if "," in raw and raw.lower().startswith("data:"):
            raw = raw.split(",", 1)[1]
        data = base64.b64decode(raw, validate=False)
        return self.match_bytes(data, threshold=threshold, demo_fallback=demo_fallback)

    def match_by_nid(self, nid: str) -> MatchResponse:
        vip = find_by_nid(nid)
        if not vip:
            return MatchResponse(
                match=FaceMatchMeta(
                    matched=False,
                    confidence=0.0,
                    face_detected=False,
                    engine="nid_lookup",
                ),
                gallery_size=len(VIP_GALLERY),
            )
        return MatchResponse(
            match=FaceMatchMeta(
                matched=True,
                confidence=1.0,
                face_detected=True,
                vip_id=vip["vip_id"],
                nid=vip["nid"],
                representative_id=vip["representative_id"],
                engine="nid_lookup",
            ),
            gallery_size=len(VIP_GALLERY),
        )

    def enroll(self, vip_id: str, image_bytes: bytes) -> dict:
        vip = find_by_vip_id(vip_id)
        if not vip:
            raise KeyError("unknown_vip")
        enroll_from_image(vip_id, image_bytes)
        return {"vip_id": vip_id, "nid": vip["nid"], "enrolled": True}
