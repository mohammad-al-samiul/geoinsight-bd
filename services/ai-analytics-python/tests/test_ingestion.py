"""Ingestion module tests."""

from app.modules.ingestion.geo_matcher import match_location


def test_match_dhaka_bn() -> None:
    district, division = match_location("ঢাকায় নতুন মেট্রো রেল উদ্বোধন")
    assert district == "Dhaka"
    assert division == "Dhaka"


def test_match_chattogram_en() -> None:
    district, division = match_location("Chattogram port expansion project approved")
    assert district == "Chattogram"
    assert division == "Chattogram"


def test_match_national_keyword() -> None:
    district, division = match_location("বাংলাদেশ সরকার নতুন বাজেট ঘোষণা")
    assert district == "National"
    assert division == "National"
