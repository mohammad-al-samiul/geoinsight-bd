from app.modules.anti_phishing.service import anti_phishing_service


def test_approved_domain_is_safe() -> None:
    result = anti_phishing_service.scan("https://bangladesh.gov.bd")
    assert result.verified_official is True
    assert result.risk_level == "SAFE"
    assert result.similarity_score == 100


def test_high_similarity_unverified_domain_is_red_flag() -> None:
    result = anti_phishing_service.scan("https://bangladesh-gov.bd")
    assert result.verified_official is False
    assert result.risk_level == "RED_FLAG"
    assert result.red_flag is True
    assert result.similarity_score >= 95
