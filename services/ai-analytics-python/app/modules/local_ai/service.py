from __future__ import annotations

import json
import re
from typing import Any

from app.core.config import Settings
from app.ml.ai_policy import LlmTask
from app.ml.ollama_client import OllamaClient
from app.modules.local_ai.schemas import (
    AnomalyExplainRequest,
    AnomalyExplainResponse,
    BudgetRiskItem,
    BudgetRiskRequest,
    BudgetRiskResponse,
    ComplaintTriageRequest,
    ComplaintTriageResponse,
    DigestCompressRequest,
    DigestCompressResponse,
    FieldSummaryRequest,
    FieldSummaryResponse,
    LocalBriefBulletOut,
    LocalBriefRequest,
    LocalBriefResponse,
    LocalCitizenAssistRequest,
    LocalCitizenAssistResponse,
    PhotoQaRequest,
    PhotoQaResponse,
    PmoMultiBriefRequest,
    PmoMultiBriefResponse,
    ScorecardCommentRequest,
    ScorecardCommentResponse,
    VisitCandidateIn,
    VisitRecommendItem,
    VisitRecommendRequest,
    VisitRecommendResponse,
    WpiExplainRequest,
    WpiExplainResponse,
)

_JSON_BLOCK = re.compile(r"\{[\s\S]*\}|\[[\s\S]*\]")

_CATEGORY_HINTS: list[tuple[str, re.Pattern[str]]] = [
    ("UTILITIES", re.compile(r"gas|fuel|load.?shed|বিদ্যুৎ|গ্যাস|তেল|লোডশেড|power.?cut|electric", re.I)),
    ("CRIME", re.compile(r"murder|theft|snatch|খুন|চুরি|ছিনতাই|ডাকাতি|হত্যা", re.I)),
    ("CORRUPTION", re.compile(r"bribe|corrupt|ঘুষ|দুর্নীতি|টেন্ডার.?অনিয়ম", re.I)),
    ("EDUCATION", re.compile(r"school|college|dropout|স্কুল|কলেজ|শিক্ষক", re.I)),
    ("HEALTH", re.compile(r"hospital|dengue|clinic|হাসপাতাল|ডেঙ্গু|স্বাস্থ্য", re.I)),
    ("UNEMPLOYMENT", re.compile(r"unemploy|jobless|বেকার", re.I)),
    ("DRAINAGE", re.compile(r"drain|nala|নালা|ড্রেন|জলাবদ্ধ|waterlog", re.I)),
    ("WASTE", re.compile(r"garbage|waste|trash|ময়লা|আবর্জনা|ডাস্টবিন", re.I)),
    ("TRAFFIC", re.compile(r"traffic|jam|road.?block|যানজট|ট্রাফিক", re.I)),
    ("HILL_CUTTING", re.compile(r"hill.?cut|পাহাড়.?কাট|ভূমিধস|landslide", re.I)),
    ("HERITAGE", re.compile(r"heritage|ঐতিহ্য|মসজিদ|মন্দির|পুরাকীর্তি", re.I)),
    ("SAFETY", re.compile(r"assault|নিরাপত্তা|হামলা|eve.?teas|unsafe", re.I)),
    (
        "INFRASTRUCTURE",
        re.compile(r"road|bridge|light|pipe|রাস্তা|সেতু|street.?light", re.I),
    ),
]

_SEVERITY_CRITICAL = re.compile(
    r"collapse|fire|flood|death|killed|নিহত|অগ্নিকাণ্ড|ধস|জরুরি|emergency|critical",
    re.I,
)
_SEVERITY_HIGH = re.compile(
    r"urgent|broken|overflow|blocked|গুরুতর|জরুরি|ভাঙা|ব্লক|overflow",
    re.I,
)


def _extract_json(text: str) -> Any | None:
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass
    m = _JSON_BLOCK.search(text)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


class LocalAiService:
    """Wave A local DSS AI — quality/fast Ollama with rule fallbacks."""

    def __init__(self, settings: Settings) -> None:
        self._ollama = OllamaClient(settings)

    async def morning_brief(self, req: LocalBriefRequest) -> LocalBriefResponse:
        fallback = [
            LocalBriefBulletOut(en=b.en, bn=b.bn, tone=b.tone) for b in req.bullets[:5]
        ]
        if not fallback:
            fallback = [
                LocalBriefBulletOut(
                    en="No critical local pressures — maintain routine ward rounds.",
                    bn="কোনো সংকটজনক চাপ নেই — নিয়মিত ওয়ার্ড রাউন্ড চালিয়ে যান।",
                    tone="ok",
                )
            ]

        if not self._ollama.enabled:
            return LocalBriefResponse(bullets=fallback, llm_used=False)

        payload = {
            "entity": req.entity_name_bn or req.entity_name,
            "summary": req.summary,
            "rule_bullets": [b.model_dump() for b in req.bullets[:6]],
            "top_actions": [
                {
                    "kind": a.kind,
                    "title": a.title_bn if req.lang == "bn" else a.title,
                    "detail": a.detail_bn if req.lang == "bn" else a.detail,
                    "priority": a.priority,
                }
                for a in req.action_queue[:8]
            ],
        }
        system = (
            "You are a local MP/Mayor morning brief writer for Bangladesh. "
            "Return ONLY JSON: "
            '{"bullets":[{"en":"...","bn":"...","tone":"danger|warn|ok|info"}],'
            '"narrative_en":"...","narrative_bn":"..."} '
            "Max 5 bullets. Keep facts from input; do not invent wards or counts. "
            "BN and EN both required. Concise, actionable."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.25,
            timeout=120.0,
            task=LlmTask.MORNING_BRIEF,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return LocalBriefResponse(bullets=fallback, llm_used=False)

        bullets_out: list[LocalBriefBulletOut] = []
        for item in parsed.get("bullets") or []:
            if not isinstance(item, dict):
                continue
            en = str(item.get("en") or "").strip()
            bn = str(item.get("bn") or "").strip()
            tone = str(item.get("tone") or "info")
            if tone not in {"danger", "warn", "ok", "info"}:
                tone = "info"
            if en and bn:
                bullets_out.append(LocalBriefBulletOut(en=en, bn=bn, tone=tone))  # type: ignore[arg-type]
        if not bullets_out:
            bullets_out = fallback

        return LocalBriefResponse(
            bullets=bullets_out[:5],
            narrative_en=str(parsed.get("narrative_en") or "")[:800] or None,
            narrative_bn=str(parsed.get("narrative_bn") or "")[:800] or None,
            llm_used=True,
            model_tier="quality",
        )

    async def complaint_triage(self, req: ComplaintTriageRequest) -> ComplaintTriageResponse:
        rule = self._rule_triage(req)
        if not self._ollama.enabled:
            return rule

        system = (
            "Classify a Bangladesh local-government citizen complaint. "
            "Return ONLY JSON: "
            '{"category":"INFRASTRUCTURE|DRAINAGE|WASTE|SAFETY|TRAFFIC|HILL_CUTTING|HERITAGE|UTILITIES|CRIME|CORRUPTION|EDUCATION|HEALTH|UNEMPLOYMENT|OTHER",'
            '"severity":"CRITICAL|HIGH|MEDIUM|LOW","sla_hours":12|24|48|72,'
            '"is_red_alert":true|false,"rationale_en":"...","rationale_bn":"...","confidence":0.0-1.0}. '
            "CRITICAL/HIGH usually is_red_alert true. Prefer 24h SLA unless critical (12) or low (48-72)."
        )
        user = f"Title: {req.title}\nDescription: {req.description or ''}"
        raw = await self._ollama.complete(
            system, user, temperature=0.1, timeout=60.0, task=LlmTask.COMPLAINT_TRIAGE
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return rule

        cats = {
            "INFRASTRUCTURE",
            "DRAINAGE",
            "WASTE",
            "SAFETY",
            "TRAFFIC",
            "HILL_CUTTING",
            "HERITAGE",
            "UTILITIES",
            "CRIME",
            "CORRUPTION",
            "EDUCATION",
            "HEALTH",
            "UNEMPLOYMENT",
            "OTHER",
        }
        sevs = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        category = str(parsed.get("category") or rule.category)
        severity = str(parsed.get("severity") or rule.severity)
        if category not in cats:
            category = rule.category
        if severity not in sevs:
            severity = rule.severity
        try:
            sla = int(parsed.get("sla_hours") or rule.sla_hours)
        except (TypeError, ValueError):
            sla = rule.sla_hours
        sla = max(6, min(72, sla))
        is_red = bool(parsed.get("is_red_alert"))
        if severity in {"CRITICAL", "HIGH"}:
            is_red = True
        try:
            conf = float(parsed.get("confidence") or 0.75)
        except (TypeError, ValueError):
            conf = 0.75
        return ComplaintTriageResponse(
            category=category,  # type: ignore[arg-type]
            severity=severity,  # type: ignore[arg-type]
            sla_hours=sla,
            is_red_alert=is_red,
            rationale_en=str(parsed.get("rationale_en") or rule.rationale_en)[:400],
            rationale_bn=str(parsed.get("rationale_bn") or rule.rationale_bn)[:400],
            confidence=max(0.0, min(1.0, conf)),
            llm_used=True,
            model_tier="fast",
        )

    def _rule_triage(self, req: ComplaintTriageRequest) -> ComplaintTriageResponse:
        blob = f"{req.title} {req.description or ''}"
        category = "OTHER"
        for cat, pat in _CATEGORY_HINTS:
            if pat.search(blob):
                category = cat
                break
        if _SEVERITY_CRITICAL.search(blob):
            severity = "CRITICAL"
            sla = 12
            red = True
        elif _SEVERITY_HIGH.search(blob):
            severity = "HIGH"
            sla = 24
            red = True
        else:
            severity = "MEDIUM"
            sla = 24
            red = False
        return ComplaintTriageResponse(
            category=category,  # type: ignore[arg-type]
            severity=severity,  # type: ignore[arg-type]
            sla_hours=sla,
            is_red_alert=red,
            rationale_en=f"Rule triage → {category} / {severity} (SLA {sla}h).",
            rationale_bn=f"নিয়মভিত্তিক ট্রায়াজ → {category} / {severity} (SLA {sla} ঘণ্টা)।",
            confidence=0.62,
            llm_used=False,
            model_tier="fast",
        )

    async def wpi_explain(self, req: WpiExplainRequest) -> WpiExplainResponse:
        why_en = "; ".join(w.en for w in req.why[:3]) or f"Score {req.score}."
        why_bn = "; ".join(w.bn for w in req.why[:3]) or f"স্কোর {req.score}।"
        fallback = WpiExplainResponse(
            narrative_en=(
                f"{req.ward_name} WPI is {req.score}. "
                f"Service {req.service_score}, infra {req.infra_score}, "
                f"resolution {req.resolution_score}, open complaints {req.open_complaints}. "
                f"Drivers: {why_en}"
            )[:700],
            narrative_bn=(
                f"{req.ward_name_bn or req.ward_name} এর WPI {req.score}. "
                f"সেবা {req.service_score}, অবকাঠামো {req.infra_score}, "
                f"সমাধান {req.resolution_score}, খোলা অভিযোগ {req.open_complaints}। "
                f"কারণ: {why_bn}"
            )[:700],
            llm_used=False,
        )
        if not self._ollama.enabled:
            return fallback

        payload = req.model_dump()
        system = (
            "Explain a ward performance index (WPI) drop for a Bangladesh mayor/MP. "
            "Return ONLY JSON: {\"narrative_en\":\"...\",\"narrative_bn\":\"...\"}. "
            "2-4 sentences each. Cite only provided scores and why codes. Actionable."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.2,
            timeout=90.0,
            task=LlmTask.WPI_EXPLAIN,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        en = str(parsed.get("narrative_en") or "").strip()
        bn = str(parsed.get("narrative_bn") or "").strip()
        if not en or not bn:
            return fallback
        return WpiExplainResponse(
            narrative_en=en[:700],
            narrative_bn=bn[:700],
            llm_used=True,
            model_tier="quality",
        )

    async def visit_recommend(self, req: VisitRecommendRequest) -> VisitRecommendResponse:
        top_n = max(1, min(5, req.top_n))
        ranked = sorted(req.candidates, key=lambda c: c.priority, reverse=True)[:top_n]
        fallback_items = [
            VisitRecommendItem(
                reason=c.reason,
                title=c.title,
                title_bn=c.title_bn or c.title,
                ward_id=c.ward_id,
                ward_name=c.ward_name,
                priority=c.priority,
                meta=c.meta,
                rank=i + 1,
            )
            for i, c in enumerate(ranked)
        ]
        if not self._ollama.enabled or not req.candidates:
            return VisitRecommendResponse(items=fallback_items, llm_used=False)

        payload = {
            "entity": req.entity_name,
            "candidates": [c.model_dump() for c in req.candidates[:12]],
            "top_n": top_n,
        }
        system = (
            "Pick the top field visits for a local Bangladesh executive today. "
            f"Return ONLY JSON array of up to {top_n} objects: "
            '[{"reason":"WPI_DROP|RED_ALERT|OVERDUE|OUTAGE|MANUAL","title":"...","title_bn":"...",'
            '"ward_id":null|string,"ward_name":null|string,"priority":0-100,'
            '"meta":{},"rank":1}]. Prefer red alerts and lowest WPI. Keep ward_id from candidates.'
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.15,
            timeout=60.0,
            task=LlmTask.VISIT_RECOMMEND,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, list):
            return VisitRecommendResponse(items=fallback_items, llm_used=False)

        by_key = {
            f"{c.ward_id}:{c.reason}:{c.title[:40]}": c for c in req.candidates
        }
        items: list[VisitRecommendItem] = []
        for i, row in enumerate(parsed[:top_n]):
            if not isinstance(row, dict):
                continue
            reason = str(row.get("reason") or "MANUAL")
            if reason not in {"WPI_DROP", "RED_ALERT", "OVERDUE", "OUTAGE", "MANUAL"}:
                reason = "MANUAL"
            title = str(row.get("title") or "").strip()
            title_bn = str(row.get("title_bn") or title).strip()
            ward_id = row.get("ward_id")
            ward_id_s = str(ward_id) if ward_id else None
            # Prefer matching candidate meta
            match: VisitCandidateIn | None = None
            for c in req.candidates:
                if ward_id_s and c.ward_id == ward_id_s and c.reason == reason:
                    match = c
                    break
            if not match and title:
                for c in req.candidates:
                    if c.title == title:
                        match = c
                        break
            meta = match.meta if match else (row.get("meta") if isinstance(row.get("meta"), dict) else {})
            if not title and match:
                title = match.title
                title_bn = match.title_bn or match.title
            if not title:
                continue
            try:
                priority = int(row.get("priority") or (match.priority if match else 50))
            except (TypeError, ValueError):
                priority = match.priority if match else 50
            items.append(
                VisitRecommendItem(
                    reason=reason,  # type: ignore[arg-type]
                    title=title[:200],
                    title_bn=title_bn[:200],
                    ward_id=ward_id_s or (match.ward_id if match else None),
                    ward_name=str(row.get("ward_name") or (match.ward_name if match else "") or "")
                    or None,
                    priority=priority,
                    meta=meta or {},
                    rank=i + 1,
                )
            )
            _ = by_key  # keep for potential future dedupe

        if not items:
            return VisitRecommendResponse(items=fallback_items, llm_used=False)
        return VisitRecommendResponse(items=items[:top_n], llm_used=True, model_tier="fast")

    async def scorecard_comment(self, req: ScorecardCommentRequest) -> ScorecardCommentResponse:
        rows = sorted(req.rows, key=lambda r: r.wpi)[:5]
        weak = ", ".join(f"{r.name} ({r.wpi})" for r in rows[:3]) or "n/a"
        overdue = sum(r.overdue for r in req.rows)
        red = sum(r.red_alerts for r in req.rows)
        avg = req.average_wpi
        fallback = ScorecardCommentResponse(
            narrative_en=(
                f"Scorecard for {req.entity_name or 'entity'}"
                + (f" (avg WPI {avg})" if avg is not None else "")
                + f". Weakest: {weak}. Open pressure — overdue {overdue}, red alerts {red}."
            )[:700],
            narrative_bn=(
                f"{req.entity_name or 'এলাকা'} স্কোরকার্ড"
                + (f" (গড় WPI {avg})" if avg is not None else "")
                + f"। দুর্বল: {weak}। চাপ — অতিক্রান্ত {overdue}, জরুরি {red}।"
            )[:700],
            highlights=[f"{r.name}: WPI {r.wpi}" for r in rows[:3]],
            llm_used=False,
        )
        if not self._ollama.enabled or not req.rows:
            return fallback
        system = (
            "Write a comparative local governance scorecard comment for Bangladesh MP/Mayor. "
            "Return ONLY JSON: "
            '{"narrative_en":"...","narrative_bn":"...","highlights":["..."]}. '
            "2-4 sentences. Cite only provided WPI/open/overdue/red. Actionable."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.25,
            timeout=90.0,
            task=LlmTask.SCORECARD_COMMENT,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        en = str(parsed.get("narrative_en") or "").strip()
        bn = str(parsed.get("narrative_bn") or "").strip()
        if not en or not bn:
            return fallback
        highlights = [
            str(h) for h in (parsed.get("highlights") or []) if str(h).strip()
        ][:5]
        return ScorecardCommentResponse(
            narrative_en=en[:700],
            narrative_bn=bn[:700],
            highlights=highlights or fallback.highlights,
            llm_used=True,
            model_tier="quality",
        )

    async def digest_compress(self, req: DigestCompressRequest) -> DigestCompressResponse:
        bullets_en = " | ".join(b.en for b in req.bullets[:5])
        bullets_bn = " | ".join(b.bn for b in req.bullets[:5])
        actions = "; ".join(req.action_titles[:4])
        max_chars = max(120, min(600, req.max_chars))
        fallback_en = f"GeoInsight digest — {req.entity_name}: {bullets_en}. Actions: {actions}"[
            :max_chars
        ]
        fallback_bn = (
            f"জিওইনসাইট ডাইজেস্ট — {req.entity_name}: {bullets_bn}। অ্যাকশন: {actions}"
        )[:max_chars]
        if not self._ollama.enabled:
            return DigestCompressResponse(text=fallback_en, text_bn=fallback_bn, llm_used=False)
        system = (
            f"Compress a local morning brief into WhatsApp/SMS length (max {max_chars} chars each). "
            "Return ONLY JSON: {\"text\":\"...\",\"text_bn\":\"...\"}. Keep numbers. No markdown."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(
                {
                    "entity": req.entity_name,
                    "bullets": [b.model_dump() for b in req.bullets[:6]],
                    "actions": req.action_titles[:6],
                },
                ensure_ascii=False,
            ),
            temperature=0.2,
            timeout=60.0,
            task=LlmTask.DIGEST_SMS,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return DigestCompressResponse(text=fallback_en, text_bn=fallback_bn, llm_used=False)
        text = str(parsed.get("text") or fallback_en).strip()[:max_chars]
        text_bn = str(parsed.get("text_bn") or fallback_bn).strip()[:max_chars]
        return DigestCompressResponse(
            text=text, text_bn=text_bn, llm_used=True, model_tier="fast"
        )

    async def photo_qa(self, req: PhotoQaRequest) -> PhotoQaResponse:
        before = (req.before_photo_url or "").strip()
        after = (req.after_photo_url or "").strip()
        rule_status: str = "PASS"
        score = 0.85
        note_en = "Before and after photos present and distinct."
        note_bn = "আগে ও পরে ছবি আছে এবং আলাদা।"
        if not after:
            rule_status, score = "FAIL", 0.1
            note_en, note_bn = "After photo missing.", "পরের ছবি নেই।"
        elif not before:
            rule_status, score = "WARN", 0.55
            note_en, note_bn = "Before photo missing — after only.", "আগের ছবি নেই — শুধু পরের।"
        elif before == after:
            rule_status, score = "FAIL", 0.2
            note_en, note_bn = "Before and after photos are identical.", "আগে ও পরের ছবি একই।"
        elif len(after) < 80:
            rule_status, score = "WARN", 0.45
            note_en, note_bn = "After photo payload looks too small.", "পরের ছবি খুব ছোট মনে হচ্ছে।"

        fallback = PhotoQaResponse(
            status=rule_status,  # type: ignore[arg-type]
            score=score,
            note_en=note_en,
            note_bn=note_bn,
            llm_used=False,
        )
        if not self._ollama.enabled or rule_status == "FAIL":
            return fallback

        system = (
            "You are a field photo QA checker for Bangladesh local gov complaints. "
            "You cannot see pixels; judge from metadata + complaint text. "
            "Return ONLY JSON: "
            '{"status":"PASS|WARN|FAIL","score":0-1,"note_en":"...","note_bn":"..."}. '
            "FAIL only if after missing/identical; WARN if weak evidence; PASS if plausible."
        )
        payload = {
            "title": req.title,
            "description": req.description,
            "resolution_note": req.resolution_note,
            "has_before": bool(before),
            "has_after": bool(after),
            "same_url": before == after,
            "before_len": len(before),
            "after_len": len(after),
            "rule_status": rule_status,
        }
        raw = await self._ollama.complete(
            system,
            json.dumps(payload, ensure_ascii=False),
            temperature=0.1,
            timeout=45.0,
            task=LlmTask.PHOTO_QA,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        status = str(parsed.get("status") or rule_status).upper()
        if status not in {"PASS", "WARN", "FAIL"}:
            status = rule_status
        # Never upgrade FAIL from rules
        if rule_status == "FAIL":
            status = "FAIL"
        try:
            sc = float(parsed.get("score") if parsed.get("score") is not None else score)
        except (TypeError, ValueError):
            sc = score
        return PhotoQaResponse(
            status=status,  # type: ignore[arg-type]
            score=max(0.0, min(1.0, sc)),
            note_en=str(parsed.get("note_en") or note_en)[:400],
            note_bn=str(parsed.get("note_bn") or note_bn)[:400],
            llm_used=True,
            model_tier="fast",
        )

    async def anomaly_explain(self, req: AnomalyExplainRequest) -> AnomalyExplainResponse:
        mv = req.metric_value
        should = False
        severity = "WATCH"
        if mv is not None and mv >= 80:
            severity, should = "ALERT", True
        if mv is not None and mv >= 95:
            severity = "CRITICAL"
        fallback = AnomalyExplainResponse(
            severity=severity,  # type: ignore[arg-type]
            narrative_en=(
                f"{req.title}: metric {req.metric_label or 'n/a'}="
                f"{mv if mv is not None else 'n/a'} {req.metric_unit or ''}. "
                f"Status {req.status}."
            )[:500],
            narrative_bn=(
                f"{req.title_bn or req.title}: মেট্রিক {req.metric_label or 'ন/া'}="
                f"{mv if mv is not None else 'ন/া'} {req.metric_unit or ''}। "
                f"স্ট্যাটাস {req.status}।"
            )[:500],
            should_alert=should,
            llm_used=False,
        )
        if not self._ollama.enabled:
            return fallback
        system = (
            "Explain a local specialty/ops anomaly for Bangladesh mayor/MP. "
            "Return ONLY JSON: "
            '{"severity":"WATCH|ALERT|CRITICAL","narrative_en":"...","narrative_bn":"...",'
            '"should_alert":true|false}. Be concise.'
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.2,
            timeout=60.0,
            task=LlmTask.ANOMALY_EXPLAIN,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        sev = str(parsed.get("severity") or severity).upper()
        if sev not in {"WATCH", "ALERT", "CRITICAL"}:
            sev = severity
        return AnomalyExplainResponse(
            severity=sev,  # type: ignore[arg-type]
            narrative_en=str(parsed.get("narrative_en") or fallback.narrative_en)[:500],
            narrative_bn=str(parsed.get("narrative_bn") or fallback.narrative_bn)[:500],
            should_alert=bool(parsed.get("should_alert", should or sev in {"ALERT", "CRITICAL"})),
            llm_used=True,
            model_tier="fast",
        )

    async def citizen_assist(self, req: LocalCitizenAssistRequest) -> LocalCitizenAssistResponse:
        msg = req.message.strip()
        lower = msg.lower()
        intent = "general"
        if any(k in lower for k in ("status", "অবস্থা", "খোলা", "open", "sla")):
            intent = "status"
        elif any(k in lower for k in ("complaint", "অভিযোগ", "problem", "সমস্যা", "log")):
            intent = "create_draft"
        elif any(k in lower for k in ("triage", "category", "ধরন")):
            intent = "triage"

        summary = req.summary or {}
        open_n = summary.get("open", "?")
        overdue = summary.get("overdue", "?")
        red = summary.get("redAlerts", summary.get("red_alerts", "?"))
        reply_en = (
            f"{req.entity_name}: open {open_n}, overdue {overdue}, red {red}. "
            f"Recent: {'; '.join(req.open_titles[:3]) or 'none'}."
        )
        reply_bn = (
            f"{req.entity_name_bn or req.entity_name}: খোলা {open_n}, অতিক্রান্ত {overdue}, "
            f"জরুরি {red}। সাম্প্রতিক: {'; '.join(req.open_titles[:3]) or 'নেই'}।"
        )
        draft_title = msg[:120] if intent == "create_draft" else None
        fallback = LocalCitizenAssistResponse(
            reply=reply_en,
            reply_bn=reply_bn,
            intent=intent,  # type: ignore[arg-type]
            draft_title=draft_title,
            draft_category="OTHER" if draft_title else None,
            draft_severity="MEDIUM" if draft_title else None,
            llm_used=False,
        )
        if not self._ollama.enabled:
            return fallback
        system = (
            "You are a local entity DSS assistant for Bangladesh MP/Mayor staff. "
            "Help with complaint status and drafting. Return ONLY JSON: "
            '{"reply":"...","reply_bn":"...","intent":"status|create_draft|triage|general",'
            '"draft_title":null|string,"draft_category":null|string,"draft_severity":null|string}. '
            "Use only provided summary facts."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.3,
            timeout=60.0,
            task=LlmTask.CITIZEN_CHAT,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        intent_out = str(parsed.get("intent") or intent)
        if intent_out not in {"status", "create_draft", "triage", "general"}:
            intent_out = intent
        return LocalCitizenAssistResponse(
            reply=str(parsed.get("reply") or reply_en)[:800],
            reply_bn=str(parsed.get("reply_bn") or reply_bn)[:800],
            intent=intent_out,  # type: ignore[arg-type]
            draft_title=(str(parsed.get("draft_title")).strip()[:200] if parsed.get("draft_title") else draft_title),
            draft_category=(str(parsed.get("draft_category")) if parsed.get("draft_category") else None),
            draft_severity=(str(parsed.get("draft_severity")) if parsed.get("draft_severity") else None),
            llm_used=True,
            model_tier="fast",
        )

    async def pmo_multi_brief(self, req: PmoMultiBriefRequest) -> PmoMultiBriefResponse:
        ents = req.entities[:8]
        bullets: list[LocalBriefBulletOut] = []
        worst = sorted(ents, key=lambda e: (e.red_alerts, e.overdue, -e.wpi_average), reverse=True)
        if worst:
            top = worst[0]
            bullets.append(
                LocalBriefBulletOut(
                    en=f"Hottest seat: {top.name} — red {top.red_alerts}, overdue {top.overdue}, WPI {top.wpi_average}.",
                    bn=f"সবচেয়ে চাপযুক্ত: {top.name_bn or top.name} — জরুরি {top.red_alerts}, অতিক্রান্ত {top.overdue}, WPI {top.wpi_average}।",
                    tone="danger" if top.red_alerts else "warn",
                )
            )
        low_wpi = sorted(ents, key=lambda e: e.wpi_average)[:2]
        for e in low_wpi:
            bullets.append(
                LocalBriefBulletOut(
                    en=f"Low WPI: {e.name} ({e.wpi_average})"
                    + (f" — focus {e.bottom_ward}" if e.bottom_ward else ""),
                    bn=f"নিম্ন WPI: {e.name_bn or e.name} ({e.wpi_average})"
                    + (f" — ফোকাস {e.bottom_ward}" if e.bottom_ward else ""),
                    tone="warn",
                )
            )
        if req.top_actions:
            a = req.top_actions[0]
            bullets.append(
                LocalBriefBulletOut(
                    en=f"Top cross-entity action: {a.title}",
                    bn=f"শীর্ষ ক্রস‑এন্টিটি অ্যাকশন: {a.title_bn or a.title}",
                    tone="info",
                )
            )
        if not bullets:
            bullets.append(
                LocalBriefBulletOut(
                    en="All local entities within watch bands — maintain routine oversight.",
                    bn="সব লোকাল এন্টিটি নজরদারি সীমায় — নিয়মিত তদারকি চালু রাখুন।",
                    tone="ok",
                )
            )
        fallback = PmoMultiBriefResponse(bullets=bullets[:5], llm_used=False)
        if not self._ollama.enabled:
            return fallback
        system = (
            "You are writing a PMO multi-entity morning brief for Bangladesh local DSS seats/cities. "
            "Return ONLY JSON: "
            '{"bullets":[{"en":"...","bn":"...","tone":"danger|warn|ok|info"}],'
            '"narrative_en":"...","narrative_bn":"..."}. Max 5 bullets. Cite only input facts.'
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.25,
            timeout=120.0,
            task=LlmTask.PMO_MULTI_BRIEF,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        out: list[LocalBriefBulletOut] = []
        for item in parsed.get("bullets") or []:
            if not isinstance(item, dict):
                continue
            en = str(item.get("en") or "").strip()
            bn = str(item.get("bn") or "").strip()
            tone = str(item.get("tone") or "info")
            if tone not in {"danger", "warn", "ok", "info"}:
                tone = "info"
            if en and bn:
                out.append(LocalBriefBulletOut(en=en, bn=bn, tone=tone))  # type: ignore[arg-type]
        return PmoMultiBriefResponse(
            bullets=(out or bullets)[:5],
            narrative_en=str(parsed.get("narrative_en") or "")[:800] or None,
            narrative_bn=str(parsed.get("narrative_bn") or "")[:800] or None,
            llm_used=bool(out),
            model_tier="quality",
        )

    async def budget_risk(self, req: BudgetRiskRequest) -> BudgetRiskResponse:
        stalled = [p for p in req.projects if p.status == "STALLED"]
        flagged = sorted(req.projects, key=lambda p: (p.red_flags, -p.progress_pct), reverse=True)
        level = "LOW"
        if stalled or any(p.red_flags >= 2 for p in req.projects):
            level = "HIGH"
        elif any(p.red_flags >= 1 for p in req.projects) or (
            float(req.summary.get("burnPct") or req.summary.get("burn_pct") or 0) > 85
        ):
            level = "MEDIUM"
        top = [
            BudgetRiskItem(
                project_title=p.title,
                reason_en=f"{p.status}; red flags {p.red_flags}; burn {p.progress_pct}%",
                reason_bn=f"{p.status}; রেড ফ্ল্যাগ {p.red_flags}; অগ্রগতি {p.progress_pct}%",
                score=float(p.red_flags * 20 + (30 if p.status == "STALLED" else 0)),
            )
            for p in flagged[:3]
        ]
        fallback = BudgetRiskResponse(
            risk_level=level,  # type: ignore[arg-type]
            narrative_en=(
                f"ADP risk for {req.entity_name or 'entity'}: {level}. "
                f"Stalled {len(stalled)}; watch {', '.join(t.project_title for t in top) or 'none'}."
            )[:700],
            narrative_bn=(
                f"{req.entity_name or 'এলাকা'} ADP ঝুঁকি: {level}। "
                f"স্থবির {len(stalled)}; নজর {', '.join(t.project_title for t in top) or 'নেই'}।"
            )[:700],
            top_risks=top,
            llm_used=False,
        )
        if not self._ollama.enabled or not req.projects:
            return fallback
        system = (
            "Assess ADP/budget risk for a Bangladesh local entity. Return ONLY JSON: "
            '{"risk_level":"LOW|MEDIUM|HIGH","narrative_en":"...","narrative_bn":"...",'
            '"top_risks":[{"project_title":"...","reason_en":"...","reason_bn":"...","score":0-100}]}. '
            "Cite only provided projects."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.2,
            timeout=60.0,
            task=LlmTask.BUDGET_RISK,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        rl = str(parsed.get("risk_level") or level).upper()
        if rl not in {"LOW", "MEDIUM", "HIGH"}:
            rl = level
        risks: list[BudgetRiskItem] = []
        for row in parsed.get("top_risks") or []:
            if not isinstance(row, dict):
                continue
            title = str(row.get("project_title") or "").strip()
            if not title:
                continue
            try:
                score = float(row.get("score") or 0)
            except (TypeError, ValueError):
                score = 0
            risks.append(
                BudgetRiskItem(
                    project_title=title[:200],
                    reason_en=str(row.get("reason_en") or "")[:300],
                    reason_bn=str(row.get("reason_bn") or "")[:300],
                    score=score,
                )
            )
        return BudgetRiskResponse(
            risk_level=rl,  # type: ignore[arg-type]
            narrative_en=str(parsed.get("narrative_en") or fallback.narrative_en)[:700],
            narrative_bn=str(parsed.get("narrative_bn") or fallback.narrative_bn)[:700],
            top_risks=risks[:5] or top,
            llm_used=True,
            model_tier="fast",
        )

    async def field_summary(self, req: FieldSummaryRequest) -> FieldSummaryResponse:
        max_chars = max(160, min(800, req.max_chars))
        reds = [q for q in req.queue if q.is_red_alert]
        checklist = [
            f"Clear {q.title}" + (f" ({q.ward_name})" if q.ward_name else "")
            for q in req.queue[:5]
        ]
        for v in req.visits[:3]:
            checklist.append(f"Visit: {v.title}")
        for o in req.outages[:2]:
            checklist.append(f"Outage: {o}")
        fallback = FieldSummaryResponse(
            summary_en=(
                f"Field pack — {req.entity_name}: {len(req.queue)} open, "
                f"{len(reds)} red, {len(req.visits)} visits. "
                + "; ".join(checklist[:4])
            )[:max_chars],
            summary_bn=(
                f"ফিল্ড প্যাক — {req.entity_name}: খোলা {len(req.queue)}, "
                f"জরুরি {len(reds)}, ভিজিট {len(req.visits)}। "
                + "; ".join(checklist[:4])
            )[:max_chars],
            checklist=checklist[:8],
            llm_used=False,
        )
        if not self._ollama.enabled:
            return fallback
        system = (
            f"Write an offline field-officer pack for Bangladesh local gov (max {max_chars} chars each language). "
            "Return ONLY JSON: "
            '{"summary_en":"...","summary_bn":"...","checklist":["..."]}. '
            "Actionable checklist max 8. No markdown."
        )
        raw = await self._ollama.complete(
            system,
            json.dumps(req.model_dump(), ensure_ascii=False),
            temperature=0.2,
            timeout=60.0,
            task=LlmTask.FIELD_SUMMARY,
        )
        parsed = _extract_json(raw or "")
        if not isinstance(parsed, dict):
            return fallback
        cl = [str(x) for x in (parsed.get("checklist") or []) if str(x).strip()][:8]
        return FieldSummaryResponse(
            summary_en=str(parsed.get("summary_en") or fallback.summary_en)[:max_chars],
            summary_bn=str(parsed.get("summary_bn") or fallback.summary_bn)[:max_chars],
            checklist=cl or checklist[:8],
            llm_used=True,
            model_tier="fast",
        )
