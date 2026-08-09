"""Shared on-prem Ollama client — all generative AI routes through local Llama."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)


class OllamaClient:
    def __init__(self, settings: Settings) -> None:
        self._url = (settings.ollama_url or "").rstrip("/")
        self._model = settings.ollama_model
        self._provider = settings.llm_provider.lower()

    @property
    def enabled(self) -> bool:
        return self._provider == "ollama" and bool(self._url)

    @property
    def model(self) -> str:
        return self._model

    async def ping(self) -> bool:
        if not self._url:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self._url}/api/tags")
                return res.is_success
        except Exception:
            return False

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.35,
        timeout: float = 45.0,
    ) -> str | None:
        if not self.enabled:
            return None
        try:
            # Connect timeout short so dead Ollama does not stall ingest/pipeline
            timeout_cfg = httpx.Timeout(timeout, connect=3.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                res = await client.post(
                    f"{self._url}/api/chat",
                    json={
                        "model": self._model,
                        "messages": messages,
                        "stream": False,
                        "options": {"temperature": temperature},
                    },
                )
                res.raise_for_status()
                data: dict[str, Any] = res.json()
                content = data.get("message", {}).get("content")
                return str(content).strip() if content else None
        except Exception as exc:
            logger.warning("Ollama chat failed: %s", exc)
            return None

    async def complete(self, system: str, user: str, *, temperature: float = 0.35) -> str | None:
        return await self.chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
        )
