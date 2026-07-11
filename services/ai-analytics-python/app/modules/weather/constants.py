"""Bangladesh division centroids + population estimates (BBS 2022 approx)."""

from __future__ import annotations

from typing import TypedDict


class BdLocation(TypedDict):
    division: str
    name_bn: str
    lat: float
    lng: float
    population_m: float
    coastal: bool
    district: str | None


class BdHotspot(TypedDict):
    district: str
    name_bn: str
    division: str
    lat: float
    lng: float
    population_m: float
    coastal: bool
    flood_prone: bool


BD_DIVISIONS: list[BdLocation] = [
    {"division": "Dhaka", "name_bn": "ঢাকা", "lat": 23.81, "lng": 90.41, "population_m": 40.2, "coastal": False, "district": None},
    {"division": "Chattogram", "name_bn": "চট্টগ্রাম", "lat": 22.35, "lng": 91.78, "population_m": 35.0, "coastal": True, "district": None},
    {"division": "Barishal", "name_bn": "বরিশাল", "lat": 22.70, "lng": 90.35, "population_m": 9.0, "coastal": True, "district": None},
    {"division": "Khulna", "name_bn": "খুলনা", "lat": 22.81, "lng": 89.56, "population_m": 16.0, "coastal": True, "district": None},
    {"division": "Rajshahi", "name_bn": "রাজশাহী", "lat": 24.37, "lng": 88.60, "population_m": 20.0, "coastal": False, "district": None},
    {"division": "Rangpur", "name_bn": "রংপুর", "lat": 25.75, "lng": 89.24, "population_m": 17.0, "coastal": False, "district": None},
    {"division": "Mymensingh", "name_bn": "ময়মনসিংহ", "lat": 24.75, "lng": 90.40, "population_m": 12.0, "coastal": False, "district": None},
    {"division": "Sylhet", "name_bn": "সিলেট", "lat": 24.90, "lng": 91.87, "population_m": 11.0, "coastal": False, "district": None},
]

# Flood-prone districts — localized rain/flood signal (Chattogram division heavy)
BD_FLOOD_HOTSPOTS: list[BdHotspot] = [
    {"district": "Chattogram", "name_bn": "চট্টগ্রাম", "division": "Chattogram", "lat": 22.335, "lng": 91.834, "population_m": 5.2, "coastal": True, "flood_prone": True},
    {"district": "Cox's Bazar", "name_bn": "কক্সবাজার", "division": "Chattogram", "lat": 21.427, "lng": 92.006, "population_m": 2.5, "coastal": True, "flood_prone": True},
    {"district": "Sandwip", "name_bn": "সন্দ্বীপ", "division": "Chattogram", "lat": 22.467, "lng": 91.467, "population_m": 0.4, "coastal": True, "flood_prone": True},
    {"district": "Feni", "name_bn": "ফেনী", "division": "Chattogram", "lat": 23.016, "lng": 91.398, "population_m": 1.6, "coastal": True, "flood_prone": True},
    {"district": "Noakhali", "name_bn": "নোয়াখালী", "division": "Chattogram", "lat": 22.870, "lng": 91.098, "population_m": 3.5, "coastal": True, "flood_prone": True},
    {"district": "Cumilla", "name_bn": "কুমিল্লা", "division": "Chattogram", "lat": 23.468, "lng": 91.178, "population_m": 4.2, "coastal": False, "flood_prone": True},
    {"district": "Chandpur", "name_bn": "চাঁদপুর", "division": "Chattogram", "lat": 23.233, "lng": 90.671, "population_m": 2.4, "coastal": False, "flood_prone": True},
    {"district": "Lakshmipur", "name_bn": "লক্ষ্মীপুর", "division": "Chattogram", "lat": 22.944, "lng": 90.828, "population_m": 1.7, "coastal": True, "flood_prone": True},
    {"district": "Sylhet", "name_bn": "সিলেট", "division": "Sylhet", "lat": 24.890, "lng": 91.870, "population_m": 3.4, "coastal": False, "flood_prone": True},
    {"district": "Sunamganj", "name_bn": "সুনামগঞ্জ", "division": "Sylhet", "lat": 25.065, "lng": 91.395, "population_m": 2.5, "coastal": False, "flood_prone": True},
    {"district": "Barishal", "name_bn": "বরিশাল", "division": "Barishal", "lat": 22.701, "lng": 90.353, "population_m": 2.3, "coastal": True, "flood_prone": True},
    {"district": "Satkhira", "name_bn": "সাতক্ষীরা", "division": "Khulna", "lat": 22.714, "lng": 89.071, "population_m": 2.0, "coastal": True, "flood_prone": True},
]

DIVISION_ALIASES: dict[str, str] = {
    "chittagong": "Chattogram",
    "chattogram": "Chattogram",
    "ctg": "Chattogram",
    "chattagram": "Chattogram",
    "cox's bazar": "Chattogram",
    "coxs bazar": "Chattogram",
    "cox bazar": "Chattogram",
}

# WMO weather code → short label (en / bn)
WEATHER_LABELS: dict[int, tuple[str, str]] = {
    0: ("Clear", "পরিষ্কার"),
    1: ("Mainly clear", "প্রধানত পরিষ্কার"),
    2: ("Partly cloudy", "আংশিক মেঘলা"),
    3: ("Overcast", "মেঘাচ্ছন্ন"),
    45: ("Fog", "কুয়াশা"),
    48: ("Depositing rime fog", "তুষার কুয়াশা"),
    51: ("Light drizzle", "হালকা গুঁড়ি গুঁড়ি বৃষ্টি"),
    53: ("Drizzle", "গুঁড়ি গুঁড়ি বৃষ্টি"),
    55: ("Dense drizzle", "ঘন গুঁড়ি গুঁড়ি বৃষ্টি"),
    61: ("Slight rain", "হালকা বৃষ্টি"),
    63: ("Moderate rain", "মাঝারি বৃষ্টি"),
    65: ("Heavy rain", "ভারী বৃষ্টি"),
    66: ("Freezing rain", "জমাট বৃষ্টি"),
    67: ("Heavy freezing rain", "ভারী জমাট বৃষ্টি"),
    71: ("Slight snow", "হালকা তুষার"),
    73: ("Moderate snow", "মাঝারি তুষার"),
    75: ("Heavy snow", "ভারী তুষার"),
    77: ("Snow grains", "তুষার কণা"),
    80: ("Rain showers", "বৃষ্টি"),
    81: ("Moderate showers", "মাঝারি ঝরঝরে বৃষ্টি"),
    82: ("Violent showers", "প্রবল ঝরঝরে বৃষ্টি"),
    85: ("Snow showers", "তুষার ঝরঝরে"),
    86: ("Heavy snow showers", "ভারী তুষার ঝরঝরে"),
    95: ("Thunderstorm", "বজ্রবৃষ্টি"),
    96: ("Thunderstorm with hail", "শিলাবৃষ্টি"),
    99: ("Thunderstorm with heavy hail", "ভারী শিলাবৃষ্টি"),
}

MONSOON_MONTHS = {6, 7, 8, 9, 10}
