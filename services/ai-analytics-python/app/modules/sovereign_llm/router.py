from fastapi import APIRouter, Request

from app.core.config import Settings
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
    return {
        "llm_provider": settings.llm_provider,
        "ollama_url": settings.ollama_url,
        "ollama_model": settings.ollama_model,
        "ollama_reachable": reachable,
        "sovereign_mode": settings.sovereign_mode,
        "active_provider": "ollama" if reachable else "sovereign_template",
    }


@router.get("/status")
async def sovereign_status(req: Request) -> dict[str, object]:
    return await _llm_status(req.app.state.settings)


# Back-compat alias — some docs/tools use /sovereign/status
compat_router = APIRouter(prefix="/sovereign", tags=["Sovereign LLM"])


@compat_router.get("/status")
async def sovereign_status_compat(req: Request) -> dict[str, object]:
    return await _llm_status(req.app.state.settings)
