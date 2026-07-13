from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from difflib import SequenceMatcher
from urllib.parse import urlparse

from app.modules.anti_phishing.schemas import DomainScanResponse


# This is the initial trusted registry. It is deliberately local and auditable;
# production deployments should manage it through an approved registry workflow.
TRUSTED_DOMAINS = (
    ("bangladesh.gov.bd", "Bangladesh National Portal", "বাংলাদেশ জাতীয় তথ্য বাতায়ন"),
    ("pmo.gov.bd", "Prime Minister's Office", "প্রধানমন্ত্রীর কার্যালয়"),
    ("cabinet.gov.bd", "Cabinet Division", "মন্ত্রিপরিষদ বিভাগ"),
    ("lgd.gov.bd", "Local Government Division", "স্থানীয় সরকার বিভাগ"),
    ("moedu.gov.bd", "Ministry of Education", "শিক্ষা মন্ত্রণালয়"),
    ("bcc.gov.bd", "Bangladesh Computer Council", "বাংলাদেশ কম্পিউটার কাউন্সিল"),
)


def _domain(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().rstrip(".")
    return host[4:] if host.startswith("www.") else host


def _skeleton(domain: str) -> str:
    replacements = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t"})
    return domain.translate(replacements).replace("-", "").replace(".", "")


def _similarity(candidate: str, official: str) -> float:
    direct = SequenceMatcher(None, candidate, official).ratio()
    skeleton = SequenceMatcher(None, _skeleton(candidate), _skeleton(official)).ratio()
    candidate_labels = set(candidate.replace("-", ".").split("."))
    official_labels = set(official.replace("-", ".").split("."))
    overlap = len(candidate_labels & official_labels) / max(len(official_labels), 1)
    return round(min(100, (direct * 0.45 + skeleton * 0.45 + overlap * 0.10) * 100), 1)


class AntiPhishingService:
    def scan(self, url: str) -> DomainScanResponse:
        domain = _domain(url)
        best_domain, best_name, best_name_bn = TRUSTED_DOMAINS[0]
        best_score = -1.0
        for official_domain, official_name, official_name_bn in TRUSTED_DOMAINS:
            score = _similarity(domain, official_domain)
            if score > best_score:
                best_domain, best_name, best_name_bn, best_score = (
                    official_domain,
                    official_name,
                    official_name_bn,
                    score,
                )

        verified = domain in {item[0] for item in TRUSTED_DOMAINS}
        signature = hashlib.sha256(f"domain:{domain}".encode("utf-8")).hexdigest()
        reasons: list[str] = []
        reasons_bn: list[str] = []

        if verified:
            best_score = 100.0
            risk_level = "SAFE"
            reasons.append("The domain is present in the approved government registry.")
            reasons_bn.append("ডোমেইনটি অনুমোদিত সরকারি রেজিস্ট্রিতে রয়েছে।")
        elif best_score >= 95:
            risk_level = "RED_FLAG"
            reasons.extend([
                f"The domain is {best_score:.1f}% similar to {best_domain}.",
                "It is not present in the approved government registry.",
            ])
            reasons_bn.extend([
                f"ডোমেইনটি {best_domain}-এর সাথে {best_score:.1f}% মিল রয়েছে।",
                "এটি অনুমোদিত সরকারি রেজিস্ট্রিতে নেই।",
            ])
        elif best_score >= 80:
            risk_level = "REVIEW"
            reasons.append(f"The domain resembles {best_domain} and needs analyst review.")
            reasons_bn.append(f"ডোমেইনটি {best_domain}-এর মতো; বিশ্লেষকের পর্যালোচনা প্রয়োজন।")
        else:
            risk_level = "SAFE"
            reasons.append("No high-confidence match was found in the current trusted registry.")
            reasons_bn.append("বর্তমান বিশ্বস্ত রেজিস্ট্রিতে উচ্চ-মিল পাওয়া যায়নি।")

        return DomainScanResponse(
            scanned_url=url,
            scanned_domain=domain,
            official_domain=best_domain,
            official_name=best_name,
            official_name_bn=best_name_bn,
            similarity_score=best_score,
            digital_signature=signature,
            verified_official=verified,
            risk_level=risk_level,
            red_flag=risk_level == "RED_FLAG",
            reasons=reasons,
            reasons_bn=reasons_bn,
            scanned_at=datetime.now(UTC).isoformat(),
        )


anti_phishing_service = AntiPhishingService()
