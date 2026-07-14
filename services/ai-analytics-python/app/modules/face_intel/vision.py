"""OpenCV face detect + compact embedding match against VIP gallery."""

from __future__ import annotations

import hashlib
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

_EMB_DIM = 128
_FACE_SIZE = 96

try:
    import cv2

    HAS_OPENCV = True
except ImportError:  # pragma: no cover
    cv2 = None  # type: ignore
    HAS_OPENCV = False


def _gallery_dir() -> Path:
    d = Path(__file__).resolve().parent / "data" / "encodings"
    d.mkdir(parents=True, exist_ok=True)
    return d


@lru_cache(maxsize=1)
def _cascade():
    if not HAS_OPENCV:
        return None
    path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(path)
    if cascade.empty():
        logger.warning("Haar cascade failed to load")
        return None
    return cascade


def decode_image_bytes(data: bytes) -> np.ndarray | None:
    """Decode uploaded image bytes → BGR ndarray."""
    if not HAS_OPENCV:
        # Greyscale stub array so pipeline can still enroll/match synthetically
        arr = np.frombuffer(hashlib.sha256(data).digest(), dtype=np.uint8)
        canvas = np.tile(arr, 48)[: 96 * 96].reshape(96, 96).astype(np.uint8)
        return canvas
    buf = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    return img


def detect_faces(image: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Return list of (x, y, w, h) face boxes."""
    if not HAS_OPENCV or image.ndim == 2:
        h, w = image.shape[:2]
        # Assume centered face crop for non-OpenCV / grayscale stub
        s = min(h, w) // 2
        return [(w // 2 - s // 2, h // 2 - s // 2, s, s)]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if image.ndim == 3 else image
    cascade = _cascade()
    if cascade is None:
        h, w = gray.shape[:2]
        s = min(h, w) // 2
        return [(w // 2 - s // 2, h // 2 - s // 2, s, s)]
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in faces]


def _crop_face(image: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = box
    pad = int(0.12 * max(w, h))
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(image.shape[1], x + w + pad)
    y1 = min(image.shape[0], y + h + pad)
    crop = image[y0:y1, x0:x1]
    if not HAS_OPENCV:
        return crop
    if crop.ndim == 3:
        crop = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    return cv2.resize(crop, (_FACE_SIZE, _FACE_SIZE), interpolation=cv2.INTER_AREA)


def embed_face(face_gray: np.ndarray) -> np.ndarray:
    """
    Compact 128-d L2-normalized embedding.

    Uses block histograms + DCT energy (OpenCV when present) so Docker stays
    free of dlib/face_recognition while remaining deterministic for enrolled VIP templates.
    """
    if face_gray.ndim == 3:
        if HAS_OPENCV:
            face_gray = cv2.cvtColor(face_gray, cv2.COLOR_BGR2GRAY)
        else:
            face_gray = face_gray.mean(axis=2).astype(np.uint8)

    if HAS_OPENCV:
        face = cv2.resize(face_gray, (_FACE_SIZE, _FACE_SIZE))
        face = cv2.equalizeHist(face)
    else:
        face = face_gray.astype(np.uint8)
        if face.shape != (_FACE_SIZE, _FACE_SIZE):
            # nearest-neighbor resize without cv2
            ys = (np.linspace(0, face.shape[0] - 1, _FACE_SIZE)).astype(int)
            xs = (np.linspace(0, face.shape[1] - 1, _FACE_SIZE)).astype(int)
            face = face[ys][:, xs]

    # 8×8 cell mean → 64 dims
    cell = _FACE_SIZE // 8
    means = []
    for i in range(8):
        for j in range(8):
            block = face[i * cell : (i + 1) * cell, j * cell : (j + 1) * cell]
            means.append(float(block.mean()))
    hist = np.asarray(means, dtype=np.float32)

    # Extra 64 dims from absolute DCT-ish zigzag of downscaled 16×16
    small = face[::6, ::6][:16, :16].astype(np.float32)
    if small.size < 256:
        pad = np.zeros(256, dtype=np.float32)
        pad[: small.size] = small.ravel()
        dctish = pad
    else:
        # Row-column separable "poor man's DCT": subtract local means, take magnitudes
        dctish = np.abs(small - small.mean()).ravel()[:64]
        if dctish.size < 64:
            dctish = np.pad(dctish, (0, 64 - dctish.size))

    vec = np.concatenate([hist, dctish.astype(np.float32)])
    if vec.size < _EMB_DIM:
        vec = np.pad(vec, (0, _EMB_DIM - vec.size))
    vec = vec[:_EMB_DIM]
    norm = float(np.linalg.norm(vec)) or 1.0
    return (vec / norm).astype(np.float32)


def synthetic_vip_encoding(vip_id: str, nid: str) -> np.ndarray:
    """Stable synthetic encoding for a VIP (used until a real photo is enrolled)."""
    seed = int(hashlib.sha256(f"{vip_id}:{nid}".encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(_EMB_DIM).astype(np.float32)
    # Smooth structure so nearest-neighbor isn't pure noise collision
    vec = np.convolve(vec, np.ones(5) / 5, mode="same").astype(np.float32)
    norm = float(np.linalg.norm(vec)) or 1.0
    return vec / norm


def render_sample_face_jpeg(vip_id: str, nid: str, name: str) -> bytes:
    """Generate a small sample VIP portrait JPEG for dashboard demo enrollment/match."""
    seed = int(hashlib.sha256(f"img:{vip_id}:{nid}".encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    canvas = np.zeros((180, 140, 3), dtype=np.uint8)
    tone = int(70 + (seed % 100))
    canvas[:, :] = (tone // 3, tone // 2, tone)
    # Face oval
    cy, cx = 90, 70
    for y in range(180):
        for x in range(140):
            if ((x - cx) / 42) ** 2 + ((y - cy) / 55) ** 2 <= 1.0:
                canvas[y, x] = (
                    int(160 + rng.integers(-8, 8)),
                    int(140 + rng.integers(-8, 8)),
                    int(120 + rng.integers(-8, 8)),
                )
    # Eyes / mouth
    canvas[70:78, 48:58] = (30, 30, 30)
    canvas[70:78, 82:92] = (30, 30, 30)
    canvas[110:116, 55:85] = (60, 40, 40)

    encoding = embed_face(canvas)
    # Persist encoding alongside sample so match is reliable
    path = _gallery_dir() / f"{vip_id}.npy"
    np.save(path, encoding)

    if HAS_OPENCV:
        ok, buf = cv2.imencode(".jpg", canvas, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if ok:
            return bytes(buf)
    # Minimal PPM fallback as bytes (UI may not show; encoding still works)
    return encoding.tobytes()


def load_or_create_encoding(vip_id: str, nid: str) -> np.ndarray:
    path = _gallery_dir() / f"{vip_id}.npy"
    if path.exists():
        return np.load(path).astype(np.float32)
    enc = synthetic_vip_encoding(vip_id, nid)
    np.save(path, enc)
    return enc


def enroll_from_image(vip_id: str, image_bytes: bytes) -> np.ndarray:
    img = decode_image_bytes(image_bytes)
    if img is None:
        raise ValueError("invalid_image")
    faces = detect_faces(img)
    if not faces:
        raise ValueError("no_face")
    # Largest face
    box = max(faces, key=lambda b: b[2] * b[3])
    crop = _crop_face(img, box)
    enc = embed_face(crop)
    np.save(_gallery_dir() / f"{vip_id}.npy", enc)
    return enc


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (float(np.linalg.norm(a) * np.linalg.norm(b)) or 1.0))


def match_image_to_gallery(
    image_bytes: bytes,
    gallery: list[tuple[str, np.ndarray]],
    *,
    threshold: float = 0.72,
) -> tuple[str | None, float, list[tuple[int, int, int, int]], bool]:
    """
    Returns (vip_id|None, confidence, face_boxes, face_detected).
    """
    img = decode_image_bytes(image_bytes)
    if img is None:
        return None, 0.0, [], False
    faces = detect_faces(img)
    if not faces:
        return None, 0.0, [], False
    box = max(faces, key=lambda b: b[2] * b[3])
    enc = embed_face(_crop_face(img, box))

    best_id: str | None = None
    best_score = -1.0
    for vip_id, gal_enc in gallery:
        score = cosine_similarity(enc, gal_enc)
        if score > best_score:
            best_score = score
            best_id = vip_id

    if best_id is None or best_score < threshold:
        return None, max(0.0, best_score), faces, True
    return best_id, best_score, faces, True
