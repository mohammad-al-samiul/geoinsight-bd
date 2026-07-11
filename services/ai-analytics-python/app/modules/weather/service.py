from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta

import feedparser
import httpx

from app.modules.weather.constants import (
    BD_DIVISIONS,
    BD_FLOOD_HOTSPOTS,
    DIVISION_ALIASES,
    MONSOON_MONTHS,
    WEATHER_LABELS,
)
from app.modules.weather.schemas import (
    DisasterAlertOut,
    WeatherFetchResponse,
    WeatherObservationOut,
)

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml"
RELIEFWEB_FLOOD_URL = "https://reliefweb.int/topics/flood/rss.xml?country=BGD"

# Bangladesh bounding box (approx)
BD_LAT_MIN, BD_LAT_MAX = 20.0, 26.8
BD_LNG_MIN, BD_LNG_MAX = 88.0, 92.7

ALERT_TYPE_BN: dict[str, str] = {
    "flood": "বন্যা",
    "cyclone": "ঘূর্ণিঝড়",
    "storm": "ঝড়",
    "drought": "খরা",
    "earthquake": "ভূমিকম্প",
    "other": "দুর্যোগ",
}

SEVERITY_BN: dict[int, str] = {
    1: "স্বাভাবিক",
    2: "সতর্ক",
    3: "উচ্চ সতর্ক",
    4: "জরুরি",
    5: "চরম বিপদ",
}


def _heat_index_c(temp_c: float, humidity_pct: int) -> float:
    """Approximate heat index (°C) from temperature and relative humidity."""
    if temp_c < 27:
        return temp_c
    t_f = temp_c * 9 / 5 + 32
    rh = humidity_pct
    hi_f = (
        -42.379
        + 2.04901523 * t_f
        + 10.14333127 * rh
        - 0.22475541 * t_f * rh
        - 0.00683783 * t_f * t_f
        - 0.05481717 * rh * rh
        + 0.00122874 * t_f * t_f * rh
        + 0.00085282 * t_f * rh * rh
        - 0.00000199 * t_f * t_f * rh * rh
    )
    return (hi_f - 32) * 5 / 9


def _compute_flood_risk(
    precip_mm: float,
    rain_24h_mm: float,
    humidity_pct: int,
    weather_code: int,
    month: int,
    flood_prone: bool = False,
) -> int:
    effective_rain = max(precip_mm, rain_24h_mm)
    risk = 1
    if effective_rain >= 1:
        risk = 2
    if effective_rain >= 5:
        risk = 3
    if effective_rain >= 15:
        risk = 4
    if effective_rain >= 40:
        risk = 5
    if humidity_pct >= 80 and month in MONSOON_MONTHS:
        risk = min(5, risk + 1)
    if flood_prone and month in MONSOON_MONTHS and effective_rain >= 0.5:
        risk = min(5, max(risk, 3))
    if weather_code in (65, 80, 81, 82, 95, 96, 99):
        risk = min(5, max(risk, 3))
    if weather_code in (65, 82, 95, 96, 99):
        risk = min(5, max(risk, 4))
    return risk


def _compute_cyclone_risk(
    wind_kmh: float,
    coastal: bool,
    weather_code: int,
) -> int:
    risk = 1
    if wind_kmh >= 30:
        risk = 2
    if wind_kmh >= 50:
        risk = 3
    if wind_kmh >= 75:
        risk = 4
    if wind_kmh >= 100:
        risk = 5
    if coastal:
        risk = min(5, risk + 1)
    if weather_code in (95, 96, 99) and coastal:
        risk = min(5, max(risk, 4))
    return risk


def _compute_heat_stress(temp_c: float, humidity_pct: int) -> int:
    hi = _heat_index_c(temp_c, humidity_pct)
    if hi >= 32:
        return 2
    if hi >= 35:
        return 3
    if hi >= 38:
        return 4
    if hi >= 41:
        return 5
    return 1


def _population_at_risk(population_m: float, flood: int, cyclone: int, heat: int) -> int:
    max_risk = max(flood, cyclone, heat)
    if max_risk <= 1:
        return 0
    exposure_factor = 0.08 + (max_risk - 1) * 0.07
    return int(population_m * 1_000_000 * exposure_factor)


def _normalize_division(raw: str | None) -> str:
    if not raw:
        return "National"
    key = raw.strip().lower()
    return DIVISION_ALIASES.get(key, raw.strip())


def _sum_last_24h(hourly: dict) -> float:
    times = hourly.get("time") or []
    precips = hourly.get("precipitation") or []
    if not times or not precips:
        return 0.0
    now = datetime.now(UTC)
    total = 0.0
    for t, p in zip(times, precips):
        try:
            ts = datetime.fromisoformat(str(t).replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=UTC)
            if (now - ts).total_seconds() <= 86400:
                total += float(p or 0)
        except (TypeError, ValueError):
            continue
    return round(total, 1)


def _nearest_division(lat: float, lng: float) -> str:
    best = BD_DIVISIONS[0]["division"]
    best_dist = float("inf")
    for loc in BD_DIVISIONS:
        dlat = loc["lat"] - lat
        dlng = loc["lng"] - lng
        dist = dlat * dlat + dlng * dlng
        if dist < best_dist:
            best_dist = dist
            best = loc["division"]
    return best


def _parse_gdacs_alert_type(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if "cyclone" in text or "tropical" in text or "hurricane" in text or "typhoon" in text:
        return "cyclone"
    if "flood" in text or "inundation" in text:
        return "flood"
    if "storm" in text:
        return "storm"
    if "drought" in text:
        return "drought"
    if "earthquake" in text:
        return "earthquake"
    return "other"


def _gdacs_severity(title: str, alert_level: str | None) -> int:
    text = title.lower()
    if alert_level:
        lvl = alert_level.lower()
        if "red" in lvl:
            return 5
        if "orange" in lvl:
            return 4
        if "green" in lvl:
            return 2
    if "red" in text:
        return 5
    if "orange" in text:
        return 4
    if "green" in text:
        return 2
    return 3


class WeatherService:
    async def fetch_open_meteo(self) -> list[WeatherObservationOut]:
        locations: list[dict] = []
        for loc in BD_DIVISIONS:
            locations.append(
                {
                    "division": loc["division"],
                    "district": loc.get("district"),
                    "name_bn": loc["name_bn"],
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "population_m": loc["population_m"],
                    "coastal": loc["coastal"],
                    "flood_prone": False,
                }
            )
        for spot in BD_FLOOD_HOTSPOTS:
            locations.append(
                {
                    "division": spot["division"],
                    "district": spot["district"],
                    "name_bn": spot["name_bn"],
                    "lat": spot["lat"],
                    "lng": spot["lng"],
                    "population_m": spot["population_m"],
                    "coastal": spot["coastal"],
                    "flood_prone": spot["flood_prone"],
                }
            )

        lats = ",".join(str(loc["lat"]) for loc in locations)
        lngs = ",".join(str(loc["lng"]) for loc in locations)
        params = {
            "latitude": lats,
            "longitude": lngs,
            "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
            "hourly": "precipitation",
            "timezone": "Asia/Dhaka",
            "forecast_days": 2,
        }

        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            raw_payload = resp.json()

        if isinstance(raw_payload, list):
            entries = raw_payload
        elif isinstance(raw_payload, dict) and isinstance(raw_payload.get("latitude"), list):
            entries = [
                {
                    "current": raw_payload.get("current") or {},
                    "hourly": raw_payload.get("hourly") or {},
                }
                for _i in range(len(raw_payload["latitude"]))
            ]
        else:
            entries = [raw_payload if isinstance(raw_payload, dict) else {}]

        now = datetime.now(UTC)
        month = now.month
        observations: list[WeatherObservationOut] = []

        for i, loc in enumerate(locations):
            entry = entries[i] if i < len(entries) else entries[0]
            current = entry.get("current") or {}
            hourly = entry.get("hourly") or {}
            temp = float(current.get("temperature_2m") or 28)
            humidity = int(current.get("relative_humidity_2m") or 70)
            precip = float(current.get("precipitation") or 0)
            rain_24h = _sum_last_24h(hourly)
            wind = float(current.get("wind_speed_10m") or 0)
            code = int(current.get("weather_code") or 0)
            labels = WEATHER_LABELS.get(code, ("Variable", "পরিবর্তনশীল"))

            flood = _compute_flood_risk(
                precip,
                rain_24h,
                humidity,
                code,
                month,
                loc["flood_prone"],
            )
            cyclone = _compute_cyclone_risk(wind, loc["coastal"], code)
            heat = _compute_heat_stress(temp, humidity)
            pop_risk = _population_at_risk(loc["population_m"], flood, cyclone, heat)

            recorded_raw = current.get("time")
            recorded_at = (
                datetime.fromisoformat(str(recorded_raw).replace("Z", "+00:00"))
                if recorded_raw
                else now
            )

            observations.append(
                WeatherObservationOut(
                    division=loc["division"],
                    district=loc.get("district"),
                    name_bn=loc["name_bn"],
                    lat=loc["lat"],
                    lng=loc["lng"],
                    temp_c=round(temp, 1),
                    humidity_pct=humidity,
                    precipitation_mm=round(precip, 1),
                    rain_24h_mm=rain_24h,
                    wind_speed_kmh=round(wind, 1),
                    weather_code=code,
                    weather_label=labels[0],
                    weather_label_bn=labels[1],
                    flood_risk=flood,
                    cyclone_risk=cyclone,
                    heat_stress=heat,
                    population_at_risk=pop_risk,
                    recorded_at=recorded_at,
                )
            )

        return observations

    def _is_bd_relevant(self, text: str) -> bool:
        t = text.lower()
        keywords = (
            "bangladesh",
            "bay of bengal",
            "chittagong",
            "chattogram",
            "cox's bazar",
            "coxs bazar",
            "sandwip",
            "noakhali",
            "feni",
            "cumilla",
            "comilla",
            "sylhet",
            "barishal",
            "khulna",
        )
        return any(k in t for k in keywords)

    async def fetch_reliefweb_flood_alerts(self) -> list[DisasterAlertOut]:
        alerts: list[DisasterAlertOut] = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(RELIEFWEB_FLOOD_URL)
                resp.raise_for_status()
                feed = feedparser.parse(resp.text)
        except Exception as exc:
            logger.warning("ReliefWeb flood fetch failed: %s", exc)
            return alerts

        for entry in feed.entries[:30]:
            title = str(getattr(entry, "title", ""))
            summary = str(getattr(entry, "summary", "") or getattr(entry, "description", ""))
            text = f"{title} {summary}"
            if not self._is_bd_relevant(text):
                continue

            link = str(getattr(entry, "link", ""))
            division = None
            district = None
            tl = text.lower()
            if "chittagong" in tl or "chattogram" in tl:
                division = "Chattogram"
                district = "Chattogram"
            elif "cox" in tl:
                division = "Chattogram"
                district = "Cox's Bazar"
            elif "sandwip" in tl:
                division = "Chattogram"
                district = "Sandwip"
            elif "noakhali" in tl:
                division = "Chattogram"
                district = "Noakhali"
            elif "sylhet" in tl:
                division = "Sylhet"
            elif "barishal" in tl or "barisal" in tl:
                division = "Barishal"

            published = getattr(entry, "published_parsed", None)
            valid_from = (
                datetime(*published[:6], tzinfo=UTC) if published else datetime.now(UTC)
            )
            external_id = link or f"reliefweb-{hash(title) & 0xFFFFFFFF:08x}"
            lat = 22.35 if division == "Chattogram" else 23.81
            lng = 91.78 if division == "Chattogram" else 90.41

            alerts.append(
                DisasterAlertOut(
                    external_id=external_id[:500],
                    alert_type="flood",
                    severity=4 if "severe" in tl or "major" in tl else 3,
                    title=title[:500],
                    title_bn=self._alert_title_bn("flood", division or district, 4),
                    description=summary[:2000] if summary else None,
                    division=division,
                    lat=lat,
                    lng=lng,
                    population_at_risk=500_000 if district else 2_000_000,
                    valid_from=valid_from,
                    valid_to=valid_from + timedelta(days=5),
                    source="reliefweb",
                )
            )

        return alerts

    async def fetch_gdacs_alerts(self) -> list[DisasterAlertOut]:
        alerts: list[DisasterAlertOut] = []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(GDACS_RSS_URL)
                resp.raise_for_status()
                feed = feedparser.parse(resp.text)
        except Exception as exc:
            logger.warning("GDACS fetch failed: %s", exc)
            return alerts

        for entry in feed.entries[:50]:
            title = str(getattr(entry, "title", ""))
            summary = str(getattr(entry, "summary", "") or getattr(entry, "description", ""))
            link = str(getattr(entry, "link", ""))
            text = f"{title} {summary}".lower()

            if not self._is_bd_relevant(text):
                lat, lng = self._extract_coords(entry, summary)
                if lat is None or lng is None:
                    continue
                if not (BD_LAT_MIN <= lat <= BD_LAT_MAX and BD_LNG_MIN <= lng <= BD_LNG_MAX):
                    continue
            else:
                lat, lng = self._extract_coords(entry, summary)

            alert_type = _parse_gdacs_alert_type(title, summary)
            severity = _gdacs_severity(title, getattr(entry, "gdacs_alertlevel", None))
            division = _normalize_division(
                _nearest_division(lat or 23.0, lng or 90.4) if lat else None
            )

            published = getattr(entry, "published_parsed", None)
            valid_from = (
                datetime(*published[:6], tzinfo=UTC)
                if published
                else datetime.now(UTC)
            )

            external_id = link or f"gdacs-{hash(title) & 0xFFFFFFFF:08x}"
            title_bn = self._alert_title_bn(alert_type, division, severity)

            pop = None
            if division:
                loc = next((d for d in BD_DIVISIONS if d["division"] == division), None)
                if loc:
                    pop = _population_at_risk(loc["population_m"], severity, severity, 1)

            alerts.append(
                DisasterAlertOut(
                    external_id=external_id[:500],
                    alert_type=alert_type,
                    severity=severity,
                    title=title[:500],
                    title_bn=title_bn,
                    description=summary[:2000] if summary else None,
                    division=division,
                    lat=lat,
                    lng=lng,
                    population_at_risk=pop,
                    valid_from=valid_from,
                    valid_to=valid_from + timedelta(days=3),
                    source="gdacs",
                )
            )

        return alerts

    def _extract_coords(self, entry: object, summary: str) -> tuple[float | None, float | None]:
        lat = getattr(entry, "geo_lat", None) or getattr(entry, "gdacs_lat", None)
        lng = getattr(entry, "geo_long", None) or getattr(entry, "gdacs_lon", None)
        if lat is not None and lng is not None:
            return float(lat), float(lng)

        for pattern in (
            r"lat[itude]*[:\s]+(-?\d+\.?\d*)",
            r"lon[gitude]*[:\s]+(-?\d+\.?\d*)",
        ):
            pass

        lat_m = re.search(r"(\d{1,2}\.\d+)\s*[°]?\s*N", summary, re.I)
        lng_m = re.search(r"(\d{1,2}\.\d+)\s*[°]?\s*E", summary, re.I)
        if lat_m and lng_m:
            return float(lat_m.group(1)), float(lng_m.group(1))

        # GDACS geo RSS namespace
        if hasattr(entry, "gdacs_lat") and hasattr(entry, "gdacs_lon"):
            try:
                return float(entry.gdacs_lat), float(entry.gdacs_lon)
            except (TypeError, ValueError):
                pass

        return None, None

    def _alert_title_bn(self, alert_type: str, division: str | None, severity: int) -> str:
        type_bn = ALERT_TYPE_BN.get(alert_type, "দুর্যোগ")
        sev_bn = SEVERITY_BN.get(severity, "সতর্ক")
        div = division or "বাংলাদেশ"
        return f"{div} — {type_bn} সতর্কতা ({sev_bn})"

    async def fetch_all(self) -> WeatherFetchResponse:
        observations = await self.fetch_open_meteo()
        gdacs = await self.fetch_gdacs_alerts()
        relief = await self.fetch_reliefweb_flood_alerts()
        seen: set[str] = set()
        alerts: list[DisasterAlertOut] = []
        for a in gdacs + relief:
            if a.external_id in seen:
                continue
            seen.add(a.external_id)
            alerts.append(a)
        return WeatherFetchResponse(
            observations=observations,
            alerts=alerts,
            fetched_at=datetime.now(UTC),
            sources=["open-meteo", "gdacs", "reliefweb"],
        )


weather_service = WeatherService()
