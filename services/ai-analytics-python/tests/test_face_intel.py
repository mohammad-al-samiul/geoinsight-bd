"""Face Intel — encoding / NID match tests (OpenCV optional)."""

from __future__ import annotations

from app.modules.face_intel.gallery import VIP_GALLERY
from app.modules.face_intel.service import FaceIntelEngine
from app.modules.face_intel.vision import (
    cosine_similarity,
    load_or_create_encoding,
    match_image_to_gallery,
    render_sample_face_jpeg,
    synthetic_vip_encoding,
)


def test_synthetic_encoding_stable() -> None:
    a = synthetic_vip_encoding("vip-obq", "1000000000010")
    b = synthetic_vip_encoding("vip-obq", "1000000000010")
    assert cosine_similarity(a, b) > 0.99


def test_sample_portrait_matches_gallery() -> None:
    vip = VIP_GALLERY[0]
    jpeg = render_sample_face_jpeg(vip["vip_id"], vip["nid"], vip["name"])
    gallery = [(v["vip_id"], load_or_create_encoding(v["vip_id"], v["nid"])) for v in VIP_GALLERY]
    vip_id, score, boxes, detected = match_image_to_gallery(jpeg, gallery, threshold=0.55)
    assert detected is True
    assert vip_id == vip["vip_id"]
    assert score >= 0.55


def test_engine_nid_lookup() -> None:
    engine = FaceIntelEngine()
    res = engine.match_by_nid("1000000000010")
    assert res.match.matched is True
    assert res.match.nid == "1000000000010"
    assert res.match.representative_id


def test_engine_unknown_nid() -> None:
    engine = FaceIntelEngine()
    res = engine.match_by_nid("0000000000999")
    assert res.match.matched is False
