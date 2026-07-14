"""Anti-Phishing Shield — Digital signatures & lookalike gov-domain detection."""

__all__ = ["AntiPhishingShield", "get_signature_store"]


def __getattr__(name: str):
    if name in __all__:
        from app.modules.phishing.service import AntiPhishingShield, get_signature_store

        mapping = {
            "AntiPhishingShield": AntiPhishingShield,
            "get_signature_store": get_signature_store,
        }
        return mapping[name]
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
