"""Face recognition + VIP ethical report-card intel."""

__all__ = ["FaceIntelEngine"]


def __getattr__(name: str):
    if name == "FaceIntelEngine":
        from app.modules.face_intel.service import FaceIntelEngine

        return FaceIntelEngine
    raise AttributeError(name)
