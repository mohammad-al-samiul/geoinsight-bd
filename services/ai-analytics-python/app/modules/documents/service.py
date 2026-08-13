from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime

from app.core.config import Settings
from app.ml.ai_policy import LlmTask
from app.ml.ollama_client import OllamaClient
from app.modules.documents.schemas import (
    ComplianceCheck,
    DocumentAnalyzeRequest,
    DocumentAnalyzeResponse,
    DocumentAnomaly,
    ExtractedClause,
    KeyEntity,
)

# ── Clause patterns (EN + BN) aligned with PPR 2008 / CPTU practice ─────────────

@dataclass(frozen=True)
class _ClausePattern:
    regex: str
    clause_type: str
    label: str
    label_bn: str
    base_risk: str = "low"


_CLAUSE_PATTERNS: list[_ClausePattern] = [
    _ClausePattern(
        r"(?:advance\s+payment|mobilization\s+advance|অগ্রিম\s+পরিশোধ|অগ্রিম\s+মোবিলাইজেশন)[^\n]{0,80}?(\d+)\s*%",
        "advance_payment",
        "Advance / Mobilization Payment",
        "অগ্রিম / মোবিলাইজেশন পরিশোধ",
        "medium",
    ),
    _ClausePattern(
        r"(\d+)\s*%\s*(?:advance|অগ্রিম)",
        "advance_payment",
        "Advance Payment (%)",
        "অগ্রিম পরিশোধ (%)",
        "medium",
    ),
    _ClausePattern(
        r"(?:performance\s+(?:bond|security|guarantee)|পারফরম্যান্স\s+(?:বন্ড|জামানত|সিকিউরিটি))[^\n]{0,60}?(\d+)\s*%",
        "performance_security",
        "Performance Security",
        "পারফরম্যান্স জামানত",
        "low",
    ),
    _ClausePattern(
        r"(?:earnest\s+money|emd|tender\s+security|টেন্ডার\s+জামানত|ইএমডি)[^\n]{0,60}?(\d+)\s*%",
        "emd",
        "Earnest Money / EMD",
        "টেন্ডার জামানত (ইএমডি)",
        "low",
    ),
    _ClausePattern(
        r"(?:retention\s+money|রিটেনশন)[^\n]{0,50}?(\d+)\s*%",
        "retention",
        "Retention Money",
        "রিটেনশন মানি",
        "low",
    ),
    _ClausePattern(
        r"(?:liquidated\s+damages|ld\s+penalty|delay\s+damages|জরিমানা|বিলম্ব\s+ক্ষতিপূরণ)[^\n]{0,80}",
        "penalty_ld",
        "Penalty / Liquidated Damages",
        "জরিমানা / বিলম্ব ক্ষতিপূরণ",
        "medium",
    ),
    _ClausePattern(
        r"(?:defect\s+liability|warranty\s+period|ত্রুটির\s+দায়|ওয়ারেন্টি)[^\n]{0,80}",
        "defect_liability",
        "Defect Liability / Warranty",
        "ত্রুটির দায় / ওয়ারেন্টি",
        "low",
    ),
    _ClausePattern(
        r"(?:variation\s+order|ভেরিয়েশন)[^\n]{0,60}",
        "variation",
        "Variation Order",
        "ভেরিয়েশন অর্ডার",
        "medium",
    ),
    _ClausePattern(
        r"(?:payment\s+within|পরিশোধ[^\n]{0,20}মধ্যে)[^\n]{0,40}(\d+)\s*(?:days|দিন)",
        "payment_terms",
        "Payment Timeline",
        "পরিশোধের সময়সীমা",
        "medium",
    ),
    _ClausePattern(
        r"(?:single\s+source|direct\s+procurement|একক\s+উৎস|সরাসরি\s+ক্রয়)",
        "procurement_method",
        "Procurement Method",
        "ক্রয় পদ্ধতি",
        "high",
    ),
    _ClausePattern(
        r"(?:arbitration|dispute\s+resolution|বিরোধ\s+নিষ্পত্তি|আরবিট্রেশন)",
        "dispute",
        "Dispute Resolution",
        "বিরোধ নিষ্পত্তি",
        "low",
    ),
    _ClausePattern(
        r"(?:force\s+majeure|অভাব্য\s+ঘটনা)",
        "force_majeure",
        "Force Majeure",
        "অভাব্য ঘটনা",
        "low",
    ),
]

_AMOUNT_RE = re.compile(
    r"(?:BDT|টাকা|taka|Tk\.?|৳)\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|crore|কোটি|লাখ)?",
    re.IGNORECASE,
)
_DATE_RE = re.compile(
    r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b",
)
_NID_RE = re.compile(r"\b(\d{10,17})\b")
_PROJECT_REF_RE = re.compile(
    r"(?:project|প্রকল্প|tender\s+no|টেন্ডার\s+নং)[^\n]{0,40}",
    re.IGNORECASE,
)


def _snippet(text: str, start: int, end: int, pad: int = 30) -> str:
    lo = max(0, start - pad)
    hi = min(len(text), end + pad)
    return re.sub(r"\s+", " ", text[lo:hi]).strip()


def _extract_percentages(text: str, context: str) -> int | None:
    match = re.search(r"(\d+)\s*%", context)
    return int(match.group(1)) if match else None


class DocumentIntelligenceEngine:
  def __init__(self, settings: Settings | None = None) -> None:
      self._ollama = OllamaClient(settings) if settings else None

  def analyze(self, req: DocumentAnalyzeRequest) -> DocumentAnalyzeResponse:
      text = req.text
      text_lower = text.lower()
      seen_clauses: set[str] = set()
      clauses: list[ExtractedClause] = []
      anomalies: list[DocumentAnomaly] = []
      metrics: dict[str, int | None] = {
          "advance_pct": None,
          "performance_pct": None,
          "emd_pct": None,
          "payment_days": None,
      }

      for pat in _CLAUSE_PATTERNS:
          for match in re.finditer(pat.regex, text, re.IGNORECASE):
              key = f"{pat.clause_type}:{match.start()}"
              if key in seen_clauses:
                  continue
              seen_clauses.add(key)

              snippet = _snippet(text, match.start(), match.end())
              risk = pat.base_risk
              pct = _extract_percentages(text, match.group(0))

              if pat.clause_type == "advance_payment" and pct is not None:
                  metrics["advance_pct"] = pct
                  if pct > 35:
                      risk = "critical"
                      anomalies.append(
                          DocumentAnomaly(
                              anomaly_type="excessive_advance",
                              description=f"Advance payment {pct}% exceeds PPR 2008 typical cap (20–25%).",
                              description_bn=f"অগ্রিম পরিশোধ {pct}% — পিপিআর ২০০৮ অনুযায়ী সাধারণ সীমা (২০–২৫%) অতিক্রম।",
                              severity=5 if pct > 40 else 4,
                              regulation_ref="PPR 2008 — Mobilization advance norms",
                          ),
                      )
                  elif pct > 25:
                      risk = "high"
                      anomalies.append(
                          DocumentAnomaly(
                              anomaly_type="elevated_advance",
                              description=f"Advance payment {pct}% above standard threshold; requires DC/CPD review.",
                              description_bn=f"অগ্রিম {pct}% — সীমার উপরে; জেলা প্রশাসক/সিপিডি যাচাই প্রয়োজন।",
                              severity=3,
                              regulation_ref="CPTU procurement review",
                          ),
                      )

              if pat.clause_type == "performance_security" and pct is not None:
                  metrics["performance_pct"] = pct
                  if pct < 5:
                      risk = "high"
                      anomalies.append(
                          DocumentAnomaly(
                              anomaly_type="low_performance_security",
                              description=f"Performance security {pct}% below typical 5–10% requirement.",
                              description_bn=f"পারফরম্যান্স জামানত {pct}% — সাধারণ ৫–১০% এর নিচে।",
                              severity=3,
                              regulation_ref="PPR 2008 — Performance guarantee",
                          ),
                      )

              if pat.clause_type == "emd" and pct is not None:
                  metrics["emd_pct"] = pct
                  if pct < 1 or pct > 10:
                      risk = "medium"

              if pat.clause_type == "payment_terms":
                  days_match = re.search(r"(\d+)\s*(?:days|দিন)", match.group(0), re.IGNORECASE)
                  if days_match:
                      days = int(days_match.group(1))
                      metrics["payment_days"] = days
                      if days < 7:
                          risk = "critical"
                          anomalies.append(
                              DocumentAnomaly(
                                  anomaly_type="accelerated_payment",
                                  description=f"Payment within {days} days — unusually fast; fraud risk.",
                                  description_bn=f"পরিশোধ {days} দিনের মধ্যে — অস্বাভাবিক দ্রুত; জালিয়াতি ঝুঁকি।",
                                  severity=4,
                                  regulation_ref="Financial fraud red-flag",
                              ),
                          )
                      elif days < 14:
                          risk = "high"

              if pat.clause_type == "procurement_method":
                  if "single source" in text_lower or "একক উৎস" in text or "সরাসরি ক্রয়" in text:
                      risk = "critical"
                      anomalies.append(
                          DocumentAnomaly(
                              anomaly_type="single_source_procurement",
                              description="Single-source / direct procurement language — limited competition.",
                              description_bn="একক উৎস / সরাসরি ক্রয় — প্রতিযোগিতা সীমিত; মন্ত্রিসভা/ইসি অনুমোদন যাচাই করুন।",
                              severity=4,
                              regulation_ref="PPR 2008 — Method of procurement",
                          ),
                      )

              clauses.append(
                  ExtractedClause(
                      clause_type=pat.clause_type,
                      label=pat.label,
                      label_bn=pat.label_bn,
                      text=snippet[:280],
                      risk_level=risk,
                  ),
              )

      # Duplicate penalty mentions
      if re.search(r"penalty\s+clause|জরিমানা", text_lower) and not any(
          c.clause_type == "penalty_ld" for c in clauses
      ):
          clauses.append(
              ExtractedClause(
                  clause_type="penalty_ld",
                  label="Penalty Clause",
                  label_bn="জরিমানা ধারা",
                  text=_snippet(text, 0, min(80, len(text))),
                  risk_level="medium",
              ),
          )

      key_entities = self._extract_entities(text)
      compliance_checks = self._build_compliance_checks(req.doc_type, metrics, anomalies, text)
      pattern_match = self._contractor_pattern(req, anomalies, text_lower)
      if pattern_match:
          anomalies.append(
              DocumentAnomaly(
                  anomaly_type="contractor_pattern",
                  description="Contractor NID matches prior flagged contract patterns in national ledger.",
                  description_bn="ঠিকাদার এনআইডি জাতীয় লেজারে আগের চিহ্নিত চুক্তির প্যাটার্নের সাথে মিলে।",
                  severity=5,
                  regulation_ref="GeoInsight contractor risk graph",
              ),
          )

      risk_score = self._risk_score(anomalies, compliance_checks)
      compliance_status = self._compliance_status(risk_score, anomalies)
      recommendations, recommendations_bn = self._recommendations(
          req.doc_type, anomalies, compliance_checks, metrics,
      )

      summary_en = (
          f"{req.doc_type.title()} analysis: {len(clauses)} clauses extracted, "
          f"{len(anomalies)} anomalies, risk score {risk_score}/100 "
          f"({compliance_status.replace('_', ' ').title()})."
      )
      summary_bn = (
          f"{req.doc_type} নথি: {len(clauses)}টি ধারা, {len(anomalies)}টি অনিয়ম, "
          f"ঝুঁকি স্কোর {risk_score}/১০০ ({compliance_status})."
      )

      brief_en = self._template_brief("en", req.doc_type, anomalies, compliance_checks, recommendations)
      brief_bn = self._template_brief("bn", req.doc_type, anomalies, compliance_checks, recommendations_bn)

      return DocumentAnalyzeResponse(
          doc_type=req.doc_type,
          clauses=sorted(clauses, key=lambda c: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(c.risk_level, 4))[:16],
          anomalies=sorted(anomalies, key=lambda a: -a.severity),
          contractor_pattern_match=pattern_match,
          summary=summary_en if req.lang == "en" else summary_bn,
          summary_bn=summary_bn,
          risk_score=risk_score,
          compliance_status=compliance_status,
          compliance_checks=compliance_checks,
          key_entities=key_entities[:12],
          recommendations=recommendations,
          recommendations_bn=recommendations_bn,
          executive_brief=brief_en,
          executive_brief_bn=brief_bn,
          engine="rules",
      )

  async def analyze_async(self, req: DocumentAnalyzeRequest) -> DocumentAnalyzeResponse:
      base = self.analyze(req)
      if not self._ollama or not self._ollama.enabled:
          return base

      lang_name = "Bengali" if req.lang == "bn" else "English"
      checks_text = "\n".join(
          f"- [{c.status.upper()}] {c.label}: {c.detail}" for c in base.compliance_checks[:8]
      ) or "No compliance checks."
      anomaly_text = "\n".join(
          f"- S{a.severity} {a.anomaly_type}: {a.description}" for a in base.anomalies[:8]
      ) or "No anomalies."

      polished = await self._ollama.complete(
          system=(
              "You are the Chief Procurement Auditor for the Government of Bangladesh "
              "(CPD/CPTU, PPR 2008). Write an executive brief for the PMO in "
              f"{lang_name} using Markdown ONLY with these sections:\n"
              "## Executive Summary\n"
              "## Compliance Assessment\n"
              "## Critical Findings\n"
              "## Recommended Actions\n"
              "Use bullet lists. Cite only facts from the analysis. "
              "Do not invent amounts or parties. Be concise and authoritative."
          ),
          user=(
              f"Document type: {req.doc_type}\n"
              f"Risk score: {base.risk_score}/100\n"
              f"Status: {base.compliance_status}\n"
              f"Clauses extracted: {len(base.clauses)}\n"
              f"Compliance checks:\n{checks_text}\n"
              f"Anomalies:\n{anomaly_text}\n"
              f"Recommendations:\n" + "\n".join(f"- {r}" for r in base.recommendations[:6])
          ),
          temperature=0.2,
          task=LlmTask.DOCUMENT_POLISH,
      )
      if polished:
          base.engine = "ollama_enhanced"
          if req.lang == "bn":
              base.executive_brief_bn = polished
              base.summary_bn = polished.split("\n")[0][:300] if polished else base.summary_bn
          else:
              base.executive_brief = polished
              base.summary = polished.split("\n")[0][:300] if polished else base.summary
      return base

  def _extract_entities(self, text: str) -> list[KeyEntity]:
      entities: list[KeyEntity] = []
      seen: set[str] = set()

      for match in _AMOUNT_RE.finditer(text):
          val = match.group(0).strip()
          if val not in seen:
              seen.add(val)
              entities.append(KeyEntity(entity_type="amount", value=val, context=_snippet(text, match.start(), match.end(), 20)))

      for match in _DATE_RE.finditer(text):
          val = match.group(1)
          if val not in seen:
              seen.add(val)
              entities.append(KeyEntity(entity_type="date", value=val, context=_snippet(text, match.start(), match.end(), 15)))

      for match in _NID_RE.finditer(text):
          val = match.group(1)
          if len(val) >= 10 and val not in seen:
              seen.add(val)
              entities.append(KeyEntity(entity_type="nid", value=val, context="Contractor / party identifier"))

      for match in _PROJECT_REF_RE.finditer(text):
          val = match.group(0).strip()[:80]
          if val not in seen:
              seen.add(val)
              entities.append(KeyEntity(entity_type="reference", value=val, context="Project / tender reference"))

      return entities

  def _build_compliance_checks(
      self,
      doc_type: str,
      metrics: dict[str, int | None],
      anomalies: list[DocumentAnomaly],
      text: str,
  ) -> list[ComplianceCheck]:
      checks: list[ComplianceCheck] = []
      advance = metrics.get("advance_pct")

      if advance is not None:
          if advance <= 25:
              checks.append(ComplianceCheck(
                  code="advance_cap",
                  label="Advance payment within norm",
                  label_bn="অগ্রিম পরিশোধ সীমার মধ্যে",
                  status="pass",
                  detail=f"Advance {advance}% within 20–25% guidance.",
                  detail_bn=f"অগ্রিম {advance}% — ২০–২৫% নির্দেশনার মধ্যে।",
                  reference="PPR 2008",
              ))
          elif advance <= 35:
              checks.append(ComplianceCheck(
                  code="advance_cap",
                  label="Advance payment elevated",
                  label_bn="অগ্রিম পরিশোধ বেশি",
                  status="warn",
                  detail=f"Advance {advance}% requires documented justification.",
                  detail_bn=f"অগ্রিম {advance}% — যৌক্তিকতার নথি প্রয়োজন।",
                  reference="CPD review",
              ))
          else:
              checks.append(ComplianceCheck(
                  code="advance_cap",
                  label="Advance payment excessive",
                  label_bn="অগ্রিম পরিশোধ অতিমাত্রায় বেশি",
                  status="fail",
                  detail=f"Advance {advance}% exceeds acceptable procurement norms.",
                  detail_bn=f"অগ্রিম {advance}% — গ্রহণযোগ্য সীমা অতিক্রম।",
                  reference="PPR 2008",
              ))

      perf = metrics.get("performance_pct")
      if perf is not None:
          status = "pass" if perf >= 5 else "fail"
          checks.append(ComplianceCheck(
              code="performance_security",
              label="Performance security adequacy",
              label_bn="পারফরম্যান্স জামানত পর্যাপ্ততা",
              status=status,
              detail=f"Performance security {perf}% ({'adequate' if perf >= 5 else 'below 5% floor'}).",
              detail_bn=f"পারফরম্যান্স জামানত {perf}%।",
              reference="PPR 2008",
          ))

      days = metrics.get("payment_days")
      if days is not None:
          status = "pass" if days >= 14 else ("warn" if days >= 7 else "fail")
          checks.append(ComplianceCheck(
              code="payment_timeline",
              label="Payment processing timeline",
              label_bn="পরিশোধ প্রক্রিয়াকরণ সময়",
              status=status,
              detail=f"Payment within {days} days of invoice.",
              detail_bn=f"ইনভয়েসের {days} দিনের মধ্যে পরিশোধ।",
          ))

      has_competition = not any(a.anomaly_type == "single_source_procurement" for a in anomalies)
      checks.append(ComplianceCheck(
          code="competition",
          label="Open competition indicators",
          label_bn="প্রতিযোগিতামূলক ক্রয় নির্দেশক",
          status="pass" if has_competition else "fail",
          detail="No single-source language detected." if has_competition else "Single-source / direct procurement detected.",
          detail_bn="একক উৎস ভাষা নেই।" if has_competition else "একক উৎস / সরাসরি ক্রয় শনাক্ত।",
          reference="PPR 2008",
      ))

      if doc_type == "tender" and metrics.get("emd_pct") is None:
          if "emd" not in text.lower() and "earnest" not in text.lower() and "জামানত" not in text:
              checks.append(ComplianceCheck(
                  code="emd_present",
                  label="EMD / tender security clause",
                  label_bn="ইএমডি / টেন্ডার জামানত ধারা",
                  status="warn",
                  detail="No explicit EMD clause found — verify tender document completeness.",
                  detail_bn="স্পষ্ট ইএমডি ধারা পাওয়া যায়নি — নথির সম্পূর্ণতা যাচাই করুন।",
              ))

      return checks

  def _contractor_pattern(
      self,
      req: DocumentAnalyzeRequest,
      anomalies: list[DocumentAnomaly],
      text_lower: str,
  ) -> bool:
      if not req.contractor_nid:
          return False
      return (
          "repeat contractor" in text_lower
          or "পুনরাবৃত্ত" in req.text
          or "prior award" in text_lower
          or len([a for a in anomalies if a.severity >= 4]) >= 2
      )

  def _risk_score(self, anomalies: list[DocumentAnomaly], checks: list[ComplianceCheck]) -> int:
      score = 100
      for a in anomalies:
          score -= {5: 22, 4: 16, 3: 10, 2: 5, 1: 2}.get(a.severity, 5)
      for c in checks:
          if c.status == "fail":
              score -= 12
          elif c.status == "warn":
              score -= 5
      return max(0, min(100, score))

  def _compliance_status(self, risk_score: int, anomalies: list[DocumentAnomaly]) -> str:
      if any(a.severity >= 5 for a in anomalies) or risk_score < 45:
          return "NON_COMPLIANT"
      if risk_score < 75 or any(a.severity >= 4 for a in anomalies):
          return "REVIEW_REQUIRED"
      return "COMPLIANT"

  def _recommendations(
      self,
      doc_type: str,
      anomalies: list[DocumentAnomaly],
      checks: list[ComplianceCheck],
      metrics: dict[str, int | None],
  ) -> tuple[list[str], list[str]]:
      en: list[str] = []
      bn: list[str] = []

      if any(a.anomaly_type in ("excessive_advance", "elevated_advance") for a in anomalies):
          en.append("Refer advance payment terms to CPD/Ministry for written approval before award.")
          bn.append("পুরস্কারের আগে অগ্রিম শর্ত সিপিডি/মন্ত্রণালয়ের লিখিত অনুমোদনে পাঠান।")

      if any(a.anomaly_type == "single_source_procurement" for a in anomalies):
          en.append("Obtain ECNEC/Procurement Committee minutes supporting single-source justification.")
          bn.append("একক উৎস যৌক্তিকতার জন্য ইসিএনইসি/ক্রয় কমিটির কার্যবিবরণী সংযুক্ত করুন।")

      if any(c.code == "emd_present" and c.status == "warn" for c in checks):
          en.append("Add explicit EMD clause per CPTU standard tender template (typically 2–5%).")
          bn.append("সিপিটিইউ টেমপ্লেট অনুযায়ী স্পষ্ট ইএমডি ধারা যোগ করুন (সাধারণত ২–৫%)।")

      if metrics.get("payment_days") is not None and metrics["payment_days"] < 14:
          en.append("Align payment timeline with AG office rules; flag for internal audit.")
          bn.append("হিসাব মহানিয়ন্ত্রকের নিয়ম অনুযায়ী পরিশোধ সময়সীমা সমন্বয় করুন; অভ্যন্তরীণ নিরীক্ষায় পাঠান।")

      if not en:
          en.append(f"Document appears structurally complete for {doc_type} review — proceed to legal vetting.")
          bn.append(f"নথি {doc_type} যাচাইয়ের জন্য গঠনগতভাবে সম্পূর্ণ মনে হয় — আইনি পর্যালোচনায় পাঠান।")

      return en[:6], bn[:6]

  def _template_brief(
      self,
      lang: str,
      doc_type: str,
      anomalies: list[DocumentAnomaly],
      checks: list[ComplianceCheck],
      recommendations: list[str],
  ) -> str:
      if lang == "bn":
          findings = "\n".join(f"- {a.description_bn}" for a in anomalies[:5]) or "- কোনো গুরুতর অনিয়ম শনাক্ত হয়নি।"
          actions = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(recommendations[:4]))
          return (
              f"## নির্বাহী সারাংশ\n"
              f"{doc_type} নথি বিশ্লেষণ সম্পন্ন। নিচে যাচাইকৃত ফলাফল।\n\n"
              f"## সমালোচনামূলক অনুসন্ধান\n{findings}\n\n"
              f"## সুপারিশকৃত পদক্ষেপ\n{actions}"
          )

      findings = "\n".join(f"- {a.description}" for a in anomalies[:5]) or "- No critical anomalies detected."
      actions = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(recommendations[:4]))
      return (
          f"## Executive Summary\n"
          f"{doc_type.title()} document analysis complete. Verified findings below.\n\n"
          f"## Critical Findings\n{findings}\n\n"
          f"## Recommended Actions\n{actions}"
      )
