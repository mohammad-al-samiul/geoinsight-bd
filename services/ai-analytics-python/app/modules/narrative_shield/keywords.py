"""Keyword dictionaries for rule-based hostile-narrative classification.

Used as a fast pre-filter before the LLM call.  All lists are intentionally
broad — final confidence is calibrated by the scoring function.
"""

from __future__ import annotations

# ── Category keyword banks ────────────────────────────────────────────────────

ANTI_GOVT_KW: list[str] = [
    # Bangla
    "সরকার পতন", "সরকার হটাও", "সরকার বিরোধী", "রাষ্ট্র উৎখাত",
    "অবৈধ সরকার", "ক্ষমতাসীন দল", "স্বৈরশাসক", "ফ্যাসিস্ট সরকার",
    "পদত্যাগ করো", "সরকারকে চ্যালেঞ্জ", "সংসদ ভেঙে দাও",
    # English
    "topple the government", "overthrow", "regime change", "oust the PM",
    "illegal government", "fascist regime", "resign now", "down with",
]

SOVEREIGNTY_KW: list[str] = [
    # Bangla
    "সার্বভৌমত্ব বিপন্ন", "দেশ বিক্রি", "ভারতের দালাল", "চীনের হাতিয়ার",
    "বাংলাদেশ বিভক্ত", "মানচিত্র পরিবর্তন", "জাতীয় নিরাপত্তা হুমকি",
    "সীমান্ত দখল", "অখণ্ডতা নষ্ট",
    # English
    "sell the country", "proxy government", "national sovereignty at risk",
    "territory grab", "border encroachment", "foreign agent",
]

ECONOMIC_DISINFO_KW: list[str] = [
    # Bangla
    "ব্যাংক লুট", "রিজার্ভ শেষ", "টাকা মূল্যহীন", "দেউলিয়া হবে",
    "অর্থনীতি ধ্বংস", "বাজেট ফাঁকি", "মুদ্রা সংকট", "আইএমএফ দখল",
    "বিদেশী ঋণ ফাঁদ", "চাল নেই", "দুর্ভিক্ষ আসছে",
    # English
    "bank looting", "reserve depleted", "currency collapse", "bankruptcy imminent",
    "economic collapse", "imf takeover", "debt trap", "famine coming",
]

SOCIAL_UNREST_KW: list[str] = [
    # Bangla
    "সাম্প্রদায়িক দাঙ্গা", "হিন্দু নির্যাতন", "মুসলিম বিরোধী",
    "জাতিগত সংঘাত", "গোষ্ঠী সংঘর্ষ", "পরিকল্পিত হামলা",
    "সংখ্যালঘু হত্যা", "বাড়ি জ্বালানো",
    # English
    "communal riot", "minority persecution", "ethnic cleansing",
    "planned attack", "burn villages", "sectarian violence",
]

RELIGIOUS_EXTREMISM_KW: list[str] = [
    # Bangla
    "জিহাদ", "ধর্মযুদ্ধ", "কাফের হত্যা", "ইসলামি রাষ্ট্র কায়েম",
    "খেলাফত", "মুরতাদ মারো", "ধর্মদ্রোহী",
    # English
    "jihad against state", "establish caliphate", "kill apostates",
    "holy war", "infidel government",
]

ELECTORAL_MANIPULATION_KW: list[str] = [
    # Bangla
    "নির্বাচন কারচুপি", "ভোট চুরি", "ব্যালট বাক্স ভরা",
    "নির্বাচন কমিশন দুর্নীতি", "ফলাফল জালিয়াতি", "ভোটার তালিকা মুছে",
    # English
    "election rigging", "ballot stuffing", "vote fraud",
    "fake election", "stolen election", "election commission corruption",
]

CATEGORY_KW_MAP: dict[str, list[str]] = {
    "ANTI_GOVT_INCITEMENT": ANTI_GOVT_KW,
    "SOVEREIGNTY_THREAT": SOVEREIGNTY_KW,
    "ECONOMIC_DISINFO": ECONOMIC_DISINFO_KW,
    "SOCIAL_UNREST": SOCIAL_UNREST_KW,
    "RELIGIOUS_EXTREMISM": RELIGIOUS_EXTREMISM_KW,
    "ELECTORAL_MANIPULATION": ELECTORAL_MANIPULATION_KW,
}

# ── Official policy references for RAG debunk ─────────────────────────────────

POLICY_REFS: dict[str, str] = {
    "ECONOMIC_DISINFO": (
        "Bangladesh Bank Monetary Policy Statement 2025-26; "
        "Bangladesh Bureau of Statistics (BBS) GDP Report Q2-2026; "
        "Ministry of Finance Annual Budget 2025-26"
    ),
    "ANTI_GOVT_INCITEMENT": (
        "Digital Security Act 2018 (DSA); "
        "Cyber Security Act 2023; "
        "Bangladesh Penal Code §505 (statements conducting to public mischief)"
    ),
    "SOVEREIGNTY_THREAT": (
        "Constitution of Bangladesh Art. 7 (sovereignty of the people); "
        "National Security Policy 2024; "
        "Ministry of Foreign Affairs Official Statement"
    ),
    "SOCIAL_UNREST": (
        "Special Powers Act 1974; "
        "Ministry of Home Affairs Circular on Communal Harmony 2025; "
        "National Human Rights Commission Guidelines"
    ),
    "RELIGIOUS_EXTREMISM": (
        "Anti-Terrorism Act 2009 (amended 2012, 2013); "
        "Counter-Terrorism and Transnational Crime (CTTC) Guidelines; "
        "Ministry of Religious Affairs Directive 2024"
    ),
    "ELECTORAL_MANIPULATION": (
        "Representation of the People Order 1972 (RPO); "
        "Bangladesh Election Commission Act 2022; "
        "Criminal Procedure Code §182 (false information)"
    ),
}
