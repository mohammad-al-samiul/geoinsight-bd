from fastapi import APIRouter, Request

from app.core.config import Settings
from app.ml.ai_policy import LlmTask, policy_snapshot
from app.ml.ollama_client import OllamaClient
from app.modules.sovereign_llm.schemas import LlmChatRequest, LlmChatResponse
from app.modules.sovereign_llm.service import SovereignLlmService

router = APIRouter(prefix="/sovereign-llm", tags=["Sovereign LLM"])


@router.post("/chat", response_model=LlmChatResponse)
async def sovereign_chat(body: LlmChatRequest, req: Request) -> LlmChatResponse:
    settings: Settings = req.app.state.settings
    service = SovereignLlmService(settings)
    return await service.chat(body)


async def _llm_status(settings: Settings) -> dict[str, object]:
    ollama = OllamaClient(settings)
    reachable = await ollama.ping() if ollama.enabled else False
    installed: list[str] = []
    if reachable:
        installed = await ollama.list_models()
    quality = settings.ollama_model
    fast = settings.ollama_model_fast
    return {
        "llm_provider": settings.llm_provider,
        "ollama_url": settings.ollama_url,
        "ollama_model": quality,
        "ollama_model_fast": fast,
        "ollama_reachable": reachable,
        "models_installed": installed,
        "quality_ready": any(quality in m or m.startswith(quality.split(":")[0]) for m in installed) if installed else False,
        "fast_ready": any(fast in m or m.startswith(fast.split(":")[0]) for m in installed) if installed else False,
        "sovereign_mode": settings.sovereign_mode,
        "active_provider": "ollama" if reachable else "sovereign_template",
        "policy": policy_snapshot(
            ollama_model=quality,
            ollama_model_fast=fast,
            bangla_bert_model_id=settings.bangla_bert_model_id,
            sentiment_use_mock=settings.sentiment_use_mock,
        ),
    }


@router.get("/status")
async def sovereign_status(req: Request) -> dict[str, object]:
    return await _llm_status(req.app.state.settings)


# Back-compat alias — some docs/tools use /sovereign/status
compat_router = APIRouter(prefix="/sovereign", tags=["Sovereign LLM"])


@compat_router.get("/status")
async def sovereign_status_compat(req: Request) -> dict[str, object]:
    return await _llm_status(req.app.state.settings)
