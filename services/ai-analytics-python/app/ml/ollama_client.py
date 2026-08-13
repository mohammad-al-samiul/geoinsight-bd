"""Shared on-prem Ollama client — quality (gpt-oss:20b) + fast (llama3.1:8b) tiers."""

from __future__ import annotations

import logging
from typing import Any, Literal

import httpx

from app.core.config import Settings
from app.ml.ai_policy import LlmTask, llm_tier_for

logger = logging.getLogger(__name__)

LlmTier = Literal["quality", "fast"]


class OllamaClient:
    def __init__(self, settings: Settings) -> None:
        self._url = (settings.ollama_url or "").rstrip("/")
        self._quality_model = settings.ollama_model
        self._fast_model = settings.ollama_model_fast or settings.ollama_model
        self._provider = settings.llm_provider.lower()

    @property
    def enabled(self) -> bool:
        return self._provider == "ollama" and bool(self._url)

    @property
    def model(self) -> str:
        """Backward-compatible: default quality model."""
        return self._quality_model

    @property
    def quality_model(self) -> str:
        return self._quality_model

    @property
    def fast_model(self) -> str:
        return self._fast_model

    def resolve_model(
        self,
        *,
        tier: LlmTier | None = None,
        task: LlmTask | None = None,
        model: str | None = None,
    ) -> str:
        if model:
            return model
        resolved_tier: LlmTier = tier or (llm_tier_for(task) if task else "quality")
        if resolved_tier == "fast":
            return self._fast_model
        return self._quality_model

    async def ping(self) -> bool:
        if not self._url:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self._url}/api/tags")
                return res.is_success
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        if not self._url:
            return []
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self._url}/api/tags")
                res.raise_for_status()
                data = res.json()
                return [str(m.get("name", "")) for m in data.get("models", []) if m.get("name")]
        except Exception as exc:
            logger.warning("Ollama list models failed: %s", exc)
            return []

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float = 0.35,
        timeout: float = 45.0,
        tier: LlmTier | None = None,
        task: LlmTask | None = None,
        model: str | None = None,
    ) -> str | None:
        if not self.enabled:
            return None
        use_model = self.resolve_model(tier=tier, task=task, model=model)
        try:
            timeout_cfg = httpx.Timeout(timeout, connect=3.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                res = await client.post(
                    f"{self._url}/api/chat",
                    json={
                        "model": use_model,
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
            logger.warning("Ollama chat failed (%s): %s", use_model, exc)
            return None

    async def complete(
        self,
        system: str,
        user: str,
        *,
        temperature: float = 0.35,
        timeout: float = 45.0,
        tier: LlmTier | None = None,
        task: LlmTask | None = None,
        model: str | None = None,
    ) -> str | None:
        return await self.chat(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            timeout=timeout,
            tier=tier,
            task=task,
            model=model,
        )
