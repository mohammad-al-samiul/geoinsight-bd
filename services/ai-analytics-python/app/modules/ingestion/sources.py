"""RSS and Google News source catalog for Bangladesh public intelligence."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class FeedSource:
    name: str
    url: str
    source_type: str  # rss_newspaper | google_news
    language: str = "bn"


# Direct RSS — verified working (2026-07)
RSS_NEWSPAPER_FEEDS: tuple[FeedSource, ...] = (
    FeedSource("Prothom Alo", "https://www.prothomalo.com/feed", "rss_newspaper", "bn"),
    FeedSource("BBC Bangla", "https://feeds.bbci.co.uk/bengali/rss.xml", "rss_newspaper", "bn"),
    FeedSource("The Daily Star", "https://www.thedailystar.net/frontpage/rss.xml", "rss_newspaper", "en"),
    FeedSource(
        "Daily Star — Bangladesh",
        "https://www.thedailystar.net/news/bangladesh/rss.xml",
        "rss_newspaper",
        "en",
    ),
    FeedSource(
        "Daily Star — Business",
        "https://www.thedailystar.net/business/economy/rss.xml",
        "rss_newspaper",
        "en",
    ),
    FeedSource(
        "Daily Star — Sports",
        "https://www.thedailystar.net/sports/rss.xml",
        "rss_newspaper",
        "en",
    ),
    FeedSource(
        "Daily Star — Opinion",
        "https://www.thedailystar.net/opinion/rss.xml",
        "rss_newspaper",
        "en",
    ),
    FeedSource("Jago News", "https://www.jagonews24.com/rss/rss.xml", "rss_newspaper", "bn"),
    FeedSource("Rising BD", "https://www.risingbd.com/rss/rss.xml", "rss_newspaper", "bn"),
    FeedSource("Channel i Online", "https://www.channelionline.com/feed", "rss_newspaper", "bn"),
)

# Google News site feeds — for papers that block direct RSS or return empty
GOOGLE_NEWS_SITE_FEEDS: tuple[FeedSource, ...] = (
    FeedSource(
        "BDNews24",
        "https://news.google.com/rss/search?q=site:bdnews24.com&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "The Daily Star",
        "https://news.google.com/rss/search?q=site:thedailystar.net&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Prothom Alo",
        "https://news.google.com/rss/search?q=site:prothomalo.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "BBC Bangla",
        "https://news.google.com/rss/search?q=site:bbc.com/bengali&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Jugantor",
        "https://news.google.com/rss/search?q=site:jugantor.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Samakal",
        "https://news.google.com/rss/search?q=site:samakal.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Ittefaq",
        "https://news.google.com/rss/search?q=site:ittefaq.com.bd&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Kaler Kantho",
        "https://news.google.com/rss/search?q=site:kalerkantho.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Manab Zamin",
        "https://news.google.com/rss/search?q=site:mzamin.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Dhaka Tribune",
        "https://news.google.com/rss/search?q=site:dhakatribune.com&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Bangla Tribune",
        "https://news.google.com/rss/search?q=site:banglatribune.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Somoy News",
        "https://news.google.com/rss/search?q=site:somoynews.tv&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Jago News",
        "https://news.google.com/rss/search?q=site:jagonews24.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Rising BD",
        "https://news.google.com/rss/search?q=site:risingbd.com&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Independent",
        "https://news.google.com/rss/search?q=site:theindependentbd.com&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Financial Express",
        "https://news.google.com/rss/search?q=site:thefinancialexpress.com.bd&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "New Age",
        "https://news.google.com/rss/search?q=site:newagebd.net&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Bonik Barta",
        "https://news.google.com/rss/search?q=site:bonikbarta.net&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
)

# Thematic Google News queries — governance, economy, agriculture, disasters
GOOGLE_NEWS_TOPIC_FEEDS: tuple[FeedSource, ...] = (
    FeedSource(
        "Google News — BD Government",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%B8%E0%A6%B0%E0%A6%95%E0%A6%BE%E0%A6%B0+%E0%A6%89%E0%A6%A8%E0%A7%8D%E0%A6%A8%E0%A6%AF%E0%A6%BC%E0%A6%A8&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Development",
        "https://news.google.com/rss/search?q=bangladesh+development+project+infrastructure&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD Agriculture",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%95%E0%A7%83%E0%A6%B7%E0%A6%BF+%E0%A6%AC%E0%A6%BE%E0%A6%9C%E0%A6%BE%E0%A6%B0&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Corruption Probe",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%A6%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%A8%E0%7%80%E0%A6%A4%E0%A6%BF&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Economy",
        "https://news.google.com/rss/search?q=bangladesh+economy+remittance+RMG&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD Flood Cyclone",
        "https://news.google.com/rss/search?q=bangladesh+flood+cyclone&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Protest Andolon",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%86%E0%A6%A8%E0%A7%8D%E0%A6%A6%E0%A7%8B%E0%A6%B2%E0%A6%A8+%E0%A6%AC%E0%A6%BF%E0%A6%95%E0%A7%8D%E0%A6%B7%E0%A7%8B%E0%A6%AD&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Protest EN",
        # Parentheses required: bare OR ignores "bangladesh" on later branches.
        "https://news.google.com/rss/search?q=bangladesh+(protest+OR+demonstration+OR+strike+OR+hartal)&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD New Law Bill",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%86%E0%A6%87%E0%A6%A8+%E0%A6%AC%E0%A6%BF%E0%A6%B2+%E0%A6%86%E0%A6%A6%E0%A7%87%E0%A6%B6&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Law Protest EN",
        "https://news.google.com/rss/search?q=bangladesh+(law+OR+bill+OR+ordinance)+protest&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD Govt Discontent",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%28%E0%A6%B8%E0%A6%B0%E0%A6%95%E0%A6%BE%E0%A6%B0+%E0%A6%AC%E0%A6%BF%E0%A6%B0%E0%A7%81%E0%A6%A6%E0%A7%8D%E0%A6%A7%E0%A7%87+%E0%A6%85%E0%A6%B8%E0%A6%A8%E0%A7%8D%E0%A6%A4%E0%A7%8B%E0%A6%B7+OR+anti-government+OR+public+outrage%29&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Social Viral",
        "https://news.google.com/rss/search?q=bangladesh+%28%28facebook+OR+viral%29+protest+OR+%E0%A6%AD%E0%A6%BE%E0%A6%87%E0%A6%B0%E0%A6%BE%E0%A6%B2%29&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — BD Politics Analysis",
        "https://news.google.com/rss/search?q=bangladesh+(politics+OR+BNP+OR+cabinet+OR+parliament+OR+manifesto+OR+opposition)+analysis+after:2026-02-01&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD Economy IMF",
        "https://news.google.com/rss/search?q=bangladesh+(IMF+OR+reserves+OR+inflation+OR+RMG+OR+remittance+OR+banking)+economy&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — BD Economy BN",
        "https://news.google.com/rss/search?q=%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6+%E0%A6%85%E0%A6%B0%E0%A7%8D%E0%A6%A5%E0%A6%A8%E0%A7%80%E0%A6%A4%E0%A6%BF+%E0%A6%AE%E0%A7%82%E0%A6%B2%E0%A7%8D%E0%A6%AF%E0%A6%B8%E0%A7%8D%E0%A6%AB%E0%A7%80%E0%A6%A4%E0%A6%BF+%E0%A6%B0%E0%A7%87%E0%A6%AE%E0%A6%BF%E0%A6%9F%E0%A7%87%E0%A6%A8%E0%A7%8D%E0%A6%B8&hl=bn&gl=BD&ceid=BD:bn",
        "google_news",
        "bn",
    ),
    FeedSource(
        "Google News — Think Tank BD",
        "https://news.google.com/rss/search?q=bangladesh+(site:crisisgroup.org+OR+site:orfonline.org+OR+site:csis.org+OR+site:thediplomat.com+OR+site:brookings.edu)&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
    FeedSource(
        "Google News — World Bank ADB BD",
        "https://news.google.com/rss/search?q=bangladesh+(World+Bank+OR+ADB+OR+%22Asian+Development%22)+economy&hl=en&gl=BD&ceid=BD:en",
        "google_news",
        "en",
    ),
)

GOOGLE_NEWS_FEEDS: tuple[FeedSource, ...] = GOOGLE_NEWS_SITE_FEEDS + GOOGLE_NEWS_TOPIC_FEEDS

ALL_FEEDS: tuple[FeedSource, ...] = RSS_NEWSPAPER_FEEDS + GOOGLE_NEWS_FEEDS
