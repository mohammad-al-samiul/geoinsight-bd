"""LLM / classifier policy for GeoInsight BD.

Rules (Phase 0):
- Generative narrative / structured JSON assist → Ollama (quality or fast tier)
- Sentiment / propaganda / grievance *classification* → BanglaBERT (never Ollama)
- Do not default to llama3.1:70b in production
- gemma4:31b is optional A/B only — not wired as default
"""

from __future__ import annotations

from enum import Enum
from typing import Literal

ClassifyBackend = Literal["bangla_bert", "rules", "mock"]
GenerateBackend = Literal["ollama_quality", "ollama_fast", "template"]


class LlmTask(str, Enum):
    """Maps product features → model tier."""

    # Quality tier → OLLAMA_MODEL (default gpt-oss:20b)
    MORNING_BRIEF = "morning_brief"
    WPI_EXPLAIN = "wpi_explain"
    NATIONAL_BRIEFING = "national_briefing"
    OUTLOOK = "outlook"
    NARRATIVE_DEBUNK = "narrative_debunk"
    PROCUREMENT_NARRATIVE = "procurement_narrative"
    DOCUMENT_POLISH = "document_polish"
    SOVEREIGN_CHAT = "sovereign_chat"
    SCORECARD_COMMENT = "scorecard_comment"
    PMO_MULTI_BRIEF = "pmo_multi_brief"

    # Fast tier → OLLAMA_MODEL_FAST (default llama3.1:8b)
    COMPLAINT_TRIAGE = "complaint_triage"
    VISIT_RECOMMEND = "visit_recommend"
    CITIZEN_CHAT = "citizen_chat"
    FIELD_SUMMARY = "field_summary"
    PHOTO_QA = "photo_qa"
    ANOMALY_EXPLAIN = "anomaly_explain"
    DIGEST_SMS = "digest_sms"
    BUDGET_RISK = "budget_risk"


class ClassifyTask(str, Enum):
    SENTIMENT = "sentiment"
    PROPAGANDA = "propaganda"
    GRIEVANCE_CATEGORY = "grievance_category"


QUALITY_TASKS: frozenset[LlmTask] = frozenset(
    {
        LlmTask.MORNING_BRIEF,
        LlmTask.WPI_EXPLAIN,
        LlmTask.NATIONAL_BRIEFING,
        LlmTask.OUTLOOK,
        LlmTask.NARRATIVE_DEBUNK,
        LlmTask.PROCUREMENT_NARRATIVE,
        LlmTask.DOCUMENT_POLISH,
        LlmTask.SOVEREIGN_CHAT,
        LlmTask.SCORECARD_COMMENT,
        LlmTask.PMO_MULTI_BRIEF,
    }
)

FAST_TASKS: frozenset[LlmTask] = frozenset(
    {
        LlmTask.COMPLAINT_TRIAGE,
        LlmTask.VISIT_RECOMMEND,
        LlmTask.CITIZEN_CHAT,
        LlmTask.FIELD_SUMMARY,
        LlmTask.PHOTO_QA,
        LlmTask.ANOMALY_EXPLAIN,
        LlmTask.DIGEST_SMS,
        LlmTask.BUDGET_RISK,
    }
)


def llm_tier_for(task: LlmTask) -> Literal["quality", "fast"]:
    if task in FAST_TASKS:
        return "fast"
    return "quality"


def classify_backend_for(task: ClassifyTask, *, sentiment_use_mock: bool) -> ClassifyBackend:
    """Classification must stay on BanglaBERT (or mock/rules) — not Ollama."""
    if task == ClassifyTask.SENTIMENT and sentiment_use_mock:
        return "mock"
    if task in (ClassifyTask.SENTIMENT, ClassifyTask.PROPAGANDA, ClassifyTask.GRIEVANCE_CATEGORY):
        return "bangla_bert"
    return "rules"


def policy_snapshot(
    *,
    ollama_model: str,
    ollama_model_fast: str,
    bangla_bert_model_id: str,
    sentiment_use_mock: bool,
) -> dict[str, object]:
    return {
        "version": "phase0-v1",
        "defaults": {
            "quality_model": ollama_model,
            "fast_model": ollama_model_fast,
            "never_default": ["llama3.1:70b"],
            "optional_ab": ["gemma4:31b"],
        },
        "classify": {
            "backend": "bangla_bert" if not sentiment_use_mock else "mock",
            "model_id": bangla_bert_model_id,
            "tasks": [t.value for t in ClassifyTask],
            "rule": "Do not use Ollama for classification",
        },
        "generate": {
            "quality_tasks": sorted(t.value for t in QUALITY_TASKS),
            "fast_tasks": sorted(t.value for t in FAST_TASKS),
        },
        "production": {
            "app_vps_runs_ollama": False,
            "dedicated_ai_server_min_ram_gb": 16,
            "recommended_max_loaded_models": 2,
            "recommended_num_parallel": 1,
            "fallback_when_ollama_down": "template",
        },
    }
