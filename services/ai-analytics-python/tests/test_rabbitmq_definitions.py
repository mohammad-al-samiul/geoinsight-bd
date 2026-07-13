import base64
import binascii
import json
from pathlib import Path

import pytest


def test_rabbitmq_definitions_user_password_hashes_are_valid_base64() -> None:
    definitions_path = (
        Path(__file__).resolve().parents[3]
        / "deploy"
        / "init"
        / "rabbitmq"
        / "definitions.json"
    )
    definitions = json.loads(definitions_path.read_text(encoding="utf-8"))

    for user in definitions.get("users", []):
        password_hash = user.get("password_hash")
        if not password_hash:
            continue
        try:
            base64.b64decode(password_hash.encode("ascii"), validate=True)
        except (ValueError, binascii.Error) as exc:  # pragma: no cover - exercised by the test
            pytest.fail(f"Invalid RabbitMQ password hash for user {user.get('name')}: {exc}")
