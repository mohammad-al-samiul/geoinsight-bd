#!/usr/bin/env python3
"""
Generate GeoInsight BD SQL seeds from public Bangladesh geo reference data.

Sources (MIT / community-maintained):
  - ifahimreza/bangladesh-geojson (divisions, districts, upazilas)
  - BBS / bangladesh.gov.bd administrative names

Run: python deploy/scripts/generate-seeds.py
Output: deploy/scripts/seed/*.sql
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUT = ROOT / "seed"

# Existing stable UUIDs (do not change — referenced by operational seeds)
DIVISION_UUID = {
    "3": ("a1000001-0001-4001-8001-000000000001", "30"),   # Dhaka
    "2": ("a1000001-0001-4001-8001-000000000002", "20"),   # Chattogram
    "4": ("a1000001-0001-4001-8001-000000000003", "40"),   # Khulna
    "5": ("a1000001-0001-4001-8001-000000000004", "50"),   # Rajshahi
    "7": ("a1000001-0001-4001-8001-000000000005", "60"),   # Sylhet
    "6": ("a1000001-0001-4001-8001-000000000006", "70"),   # Rangpur
    "1": ("a1000001-0001-4001-8001-000000000007", "80"),   # Barishal
    "8": ("a1000001-0001-4001-8001-000000000008", "90"),   # Mymensingh
}

DISTRICT_UUID_OVERRIDE = {
    "Dhaka": "b2000001-0001-4001-8001-000000000001",
    "Gazipur": "b2000001-0001-4001-8001-000000000002",
    "Faridpur": "b2000001-0001-4001-8001-000000000003",
    "Chattogram": "b2000001-0001-4001-8001-000000000004",
    "Cumilla": "b2000001-0001-4001-8001-000000000005",
}

DISTRICT_CODE_OVERRIDE = {
    "Dhaka": "3026",
    "Gazipur": "3033",
    "Faridpur": "3029",
    "Chattogram": "2015",
    "Cumilla": "2019",
}


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def district_uuid(json_id: str, name: str) -> str:
    if name in DISTRICT_UUID_OVERRIDE:
        return DISTRICT_UUID_OVERRIDE[name]
    n = int(json_id)
    return f"b2000001-0001-4001-8001-{100 + n:012d}"


def district_uuid_by_name(name: str) -> str:
    districts = json.loads((DATA / "bd-districts.json").read_text(encoding="utf-8"))["districts"]
    for d in districts:
        if d["name"] == name:
            return district_uuid(d["id"], d["name"])
    raise KeyError(f"District not found: {name}")


def upazila_uuid(json_id: str) -> str:
    n = int(json_id)
    return f"f8000001-0001-4001-8001-{1000 + n:012d}"


def upazila_uuid_by_name(name: str) -> str:
    upazilas = json.loads((DATA / "bd-upazilas.json").read_text(encoding="utf-8"))["upazilas"]
    for u in upazilas:
        if u["name"] == name:
            return upazila_uuid(u["id"])
    raise KeyError(f"Upazila not found: {name}")


def geo_point(lng: float, lat: float) -> str:
    return f"'{{\"type\":\"Point\",\"coordinates\":[{lng},{lat}]}}'"


def generate_admin_districts() -> str:
    districts = json.loads((DATA / "bd-districts.json").read_text(encoding="utf-8"))["districts"]
    div_seq: dict[str, int] = {}

    lines = [
        "-- Auto-generated: all 64 Bangladesh districts (real names + coordinates)",
        "-- Source: ifahimreza/bangladesh-geojson (MIT)",
        "",
        "INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)",
        "VALUES",
    ]
    rows = []
    district_id_map: dict[str, str] = {}

    for d in districts:
        div_json_id = d["division_id"]
        div_uuid, div_code = DIVISION_UUID[div_json_id]
        seq = div_seq.get(div_json_id, 0) + 1
        div_seq[div_json_id] = seq

        uid = district_uuid(d["id"], d["name"])
        district_id_map[d["id"]] = uid
        code = DISTRICT_CODE_OVERRIDE.get(d["name"], str(int(d["id"])).zfill(4))
        lng, lat = float(d["long"]), float(d["lat"])
        path = f"/{div_uuid}/{uid}"
        rows.append(
            f"  ({sql_str(uid)}, {sql_str(code)}, {sql_str(d['name'])}, {sql_str(d['bn_name'])}, "
            f"'DISTRICT', {sql_str(div_uuid)}, {sql_str(path)}, {geo_point(lng, lat)}, NOW(), NOW())"
        )

    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (type, code) DO UPDATE SET")
    lines.append("  name = EXCLUDED.name,")
    lines.append("  name_bn = EXCLUDED.name_bn,")
    lines.append("  geo_json = EXCLUDED.geo_json,")
    lines.append("  updated_at = NOW();")
    lines.append("")
    return "\n".join(lines)


def generate_admin_upazilas() -> str:
    upazilas = json.loads((DATA / "bd-upazilas.json").read_text(encoding="utf-8"))["upazilas"]
    districts = json.loads((DATA / "bd-districts.json").read_text(encoding="utf-8"))["districts"]
    district_by_id = {d["id"]: d for d in districts}
    district_uuid_map = {}
    for d in districts:
        district_uuid_map[d["id"]] = district_uuid(d["id"], d["name"])

    lines = [
        "-- Auto-generated: 494 Bangladesh upazilas (real names; coords from district HQ)",
        "-- Source: ifahimreza/bangladesh-geojson (MIT)",
        "",
        "INSERT INTO admin_units (id, code, name, name_bn, type, parent_id, path, geo_json, created_at, updated_at)",
        "VALUES",
    ]
    rows = []
    upz_seq: dict[str, int] = {}

    for u in upazilas:
        dist = district_by_id.get(u["district_id"])
        if not dist:
            continue
        div_uuid, div_code = DIVISION_UUID[dist["division_id"]]
        dist_uuid = district_uuid_map[u["district_id"]]
        seq = upz_seq.get(u["district_id"], 0) + 1
        upz_seq[u["district_id"]] = seq
        uid = upazila_uuid(u["id"])
        dist_code = DISTRICT_CODE_OVERRIDE.get(dist["name"], str(int(dist["id"])).zfill(4))
        code = f"{dist_code}{seq:02d}"
        base_lng, base_lat = float(dist["long"]), float(dist["lat"])
        # Spread upazilas slightly around district HQ
        offset = (seq % 7) * 0.04 - 0.12
        lng = round(base_lng + offset, 6)
        lat = round(base_lat + offset * 0.8, 6)
        path = f"/{div_uuid}/{dist_uuid}/{uid}"
        rows.append(
            f"  ({sql_str(uid)}, {sql_str(code)}, {sql_str(u['name'])}, {sql_str(u['bn_name'])}, "
            f"'UPAZILA', {sql_str(dist_uuid)}, {sql_str(path)}, {geo_point(lng, lat)}, NOW(), NOW())"
        )

    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (type, code) DO UPDATE SET")
    lines.append("  name = EXCLUDED.name,")
    lines.append("  name_bn = EXCLUDED.name_bn,")
    lines.append("  geo_json = EXCLUDED.geo_json,")
    lines.append("  updated_at = NOW();")
    return "\n".join(lines)


def generate_representatives() -> str:
    """Current-mandate officials (BNP government from Feb 2026 election — demo roster)."""
    d = district_uuid_by_name
    reps = [
        ("d4000001-0001-4001-8001-000000000001", "Tarique Rahman (Senior Minister)", "1000000000001", "MINISTER", "BNP", "2026-02-15", "a1000001-0001-4001-8001-000000000001"),
        ("d4000001-0001-4001-8001-000000000002", "Mirza Fakhrul Islam Alamgir (Foreign Affairs)", "1000000000002", "MP", "BNP", "2026-02-15", d("Dhaka")),
        ("d4000001-0001-4001-8001-000000000003", "Dr. Ahmed Nawaz (DC, Gazipur)", "1000000000003", "DC", "BCS (Admin)", "2023-02-01", d("Gazipur")),
        ("d4000001-0001-4001-8001-000000000004", "Dr. Abdul Moyeen Khan (Education)", "1000000000004", "MP", "BNP", "2026-02-15", d("Chattogram")),
        ("d4000001-0001-4001-8001-000000000005", "Dr. Shahadat Hossain (DC, Cumilla)", "1000000000005", "DC", "BCS (Admin)", "2022-06-15", d("Cumilla")),
        ("d4000001-0001-4001-8001-000000000010", "Nazrul Islam Khan (Road Transport)", "1000000000010", "MINISTER", "BNP", "2026-02-15", d("Chattogram")),
        ("d4000001-0001-4001-8001-000000000011", "Rumeen Farhana (Law & Justice)", "1000000000011", "MP", "BNP", "2026-02-15", d("Faridpur")),
        ("d4000001-0001-4001-8001-000000000012", "Amir Khasru Mahmud Chowdhury (Finance)", "1000000000012", "MINISTER", "BNP", "2026-02-15", d("Dhaka")),
        ("d4000001-0001-4001-8001-000000000013", "Muhammad Imran (DC, Khulna)", "1000000000013", "DC", "BCS (Admin)", "2021-11-01", d("Khulna")),
        ("d4000001-0001-4001-8001-000000000014", "Gayeshwar Chandra Roy (Local Govt)", "1000000000014", "MP", "BNP", "2026-02-15", d("Rajshahi")),
        ("d4000001-0001-4001-8001-000000000015", "Shahjahan Omar (Home Affairs)", "1000000000015", "MP", "BNP", "2026-02-15", d("Sylhet")),
        ("d4000001-0001-4001-8001-000000000016", "Hafiz Uddin Ahmed (Agriculture)", "1000000000016", "MP", "BNP", "2026-02-15", d("Barishal")),
        ("d4000001-0001-4001-8001-000000000017", "Barrister Moudud Ahmed (Law Minister)", "1000000000017", "MINISTER", "BNP", "2026-02-15", d("Dhaka")),
        ("d4000001-0001-4001-8001-000000000018", "Md. Tofazzel Hossain (DC, Rangpur)", "1000000000018", "DC", "BCS (Admin)", "2020-09-01", d("Rangpur")),
        ("d4000001-0001-4001-8001-000000000019", "Md. Shafiul Alam (DC, Mymensingh)", "1000000000019", "DC", "BCS (Admin)", "2022-01-15", d("Mymensingh")),
        ("d4000001-0001-4001-8001-000000000020", "Md. Anwar Hossain (Union Chairman, Savar)", "1000000000020", "UNION_CHAIRMAN", "Local Govt", "2022-01-01", upazila_uuid_by_name("Savar")),
    ]
    lines = [
        "-- Representatives under current government mandate (BNP, Feb 2026–)",
        "",
        "INSERT INTO representatives (id, name, nid, role, party, tenure_start, admin_unit_id, created_at, updated_at)",
        "VALUES",
    ]
    rows = [
        f"  ({sql_str(r[0])}, {sql_str(r[1])}, {sql_str(r[2])}, '{r[3]}', {sql_str(r[4])}, '{r[5]}', {sql_str(r[6])}, NOW(), NOW())"
        for r in reps
    ]
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (nid) DO UPDATE SET name = EXCLUDED.name, party = EXCLUDED.party, updated_at = NOW();")
    return "\n".join(lines)


def generate_projects() -> str:
    """Real Bangladesh development projects (ADP / mega infrastructure — public domain)."""
    d = district_uuid_by_name
    projects = [
        ("e5000001-0001-4001-8001-000000000001", "Padma Multipurpose Bridge (Mawa-Janjira)", 30193, 29850, "COMPLETED", "2000000000001", "2014-12-01", d("Faridpur")),
        ("e5000001-0001-4001-8001-000000000002", "Dhaka Metro Rail Line-6 (Uttara-Motijheel)", 22000, 23500, "ONGOING", "2000000000002", "2016-06-26", d("Dhaka")),
        ("e5000001-0001-4001-8001-000000000003", "Rooppur Nuclear Power Plant (Unit-1 & 2)", 113092, 89000, "ONGOING", "2000000000003", "2017-11-30", d("Pabna")),
        ("e5000001-0001-4001-8001-000000000004", "Karnaphuli Tunnel (Bangabandhu Tunnel)", 9890, 9840, "COMPLETED", "2000000000004", "2017-10-14", d("Chattogram")),
        ("e5000001-0001-4001-8001-000000000005", "Matarbari Deep Sea Port (Phase-1)", 17700, 6200, "ONGOING", "2000000000005", "2020-11-01", d("Cox's Bazar")),
        ("e5000001-0001-4001-8001-000000000006", "Dhaka Elevated Expressway", 8900, 9100, "ONGOING", "2000000000006", "2019-07-01", d("Dhaka")),
        ("e5000001-0001-4001-8001-000000000007", "Payra Deep Sea Port Development", 15400, 4800, "ONGOING", "2000000000007", "2018-03-01", d("Patuakhali")),
        ("e5000001-0001-4001-8001-000000000008", "Bangladesh Rural Electrification (REB) Expansion", 12500, 11800, "ONGOING", "2000000000008", "2021-01-01", d("Gazipur")),
        ("e5000001-0001-4001-8001-000000000009", "Ashrayan-2 (Homeless-Free Village)", 4800, 4650, "ONGOING", "2000000000009", "2020-07-01", d("Habiganj")),
        ("e5000001-0001-4001-8001-000000000010", "Chattogram-Cox's Bazar Railway (Dohazari-Ghundhum)", 18500, 7200, "ONGOING", "2000000000010", "2018-09-01", d("Chattogram")),
        ("e5000001-0001-4001-8001-000000000011", "Sonadia Deep Sea Port Feasibility", 3200, 3100, "PLANNED", "2000000000011", "2023-06-01", d("Cox's Bazar")),
        ("e5000001-0001-4001-8001-000000000012", "100 Bridges Construction (LGED)", 8900, 8400, "ONGOING", "2000000000012", "2019-01-01", d("Cumilla")),
        ("e5000001-0001-4001-8001-000000000013", "Upazila Health Complex Upgrade (DGHS)", 5600, 5900, "ONGOING", "2000000000013", "2022-01-20", d("Faridpur")),
        ("e5000001-0001-4001-8001-000000000014", "Teesta River Comprehensive Management", 14200, 2100, "STALLED", "2000000000014", "2021-04-01", d("Lalmonirhat")),
        ("e5000001-0001-4001-8001-000000000015", "Digital Bangladesh — Union Digital Centre", 2200, 2150, "COMPLETED", "2000000000015", "2018-01-01", d("Dhaka")),
        ("e5000001-0001-4001-8001-000000000016", "Sylhet Osmani Medical College Expansion", 3800, 3600, "ONGOING", "2000000000016", "2020-05-01", d("Sylhet")),
        ("e5000001-0001-4001-8001-000000000017", "Khulna-Mongla Rail Line", 4200, 3900, "ONGOING", "2000000000017", "2019-08-01", d("Khulna")),
        ("e5000001-0001-4001-8001-000000000018", "Rajshahi City Bypass Road", 2900, 2750, "ONGOING", "2000000000018", "2021-03-01", d("Rajshahi")),
        ("e5000001-0001-4001-8001-000000000019", "Barishal-Payra Highway (4-Lane)", 6700, 5200, "ONGOING", "2000000000019", "2020-01-01", d("Barishal")),
        ("e5000001-0001-4001-8001-000000000020", "Mymensingh Agricultural Research Hub", 1800, 1750, "COMPLETED", "2000000000020", "2019-06-01", d("Mymensingh")),
    ]
    lines = [
        "-- Development projects: real ADP / mega infrastructure (public sources, demo budgets in crore BDT)",
        "",
        "INSERT INTO projects (id, title, budget_allocated, budget_spent, status, contractor_nid, start_date, admin_unit_id, created_at, updated_at)",
        "VALUES",
    ]
    rows = [
        f"  ({sql_str(p[0])}, {sql_str(p[1])}, {p[2]}, {p[3]}, '{p[4]}', {sql_str(p[5])}, '{p[6]}', {sql_str(p[7])}, NOW(), NOW())"
        for p in projects
    ]
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, budget_spent = EXCLUDED.budget_spent, status = EXCLUDED.status, updated_at = NOW();")
    return "\n".join(lines)


def generate_agro_markets() -> str:
    d = district_uuid_by_name
    markets = [
        ("a7000001-0001-4001-8001-000000000001", "Karwan Bazar Wholesale Market", 23.7504, 90.3943, "WHOLESALE", d("Dhaka")),
        ("a7000001-0001-4001-8001-000000000002", "Badamtoli Arat (Rice/Grain)", 23.7075, 90.4078, "MANDI", d("Dhaka")),
        ("a7000001-0001-4001-8001-000000000003", "Tongi Krishi Haat", 23.8987, 90.4025, "HAAT", d("Gazipur")),
        ("a7000001-0001-4001-8001-000000000004", "Khatunganj Wholesale Market", 22.3412, 91.8345, "WHOLESALE", d("Chattogram")),
        ("a7000001-0001-4001-8001-000000000005", "Reazuddin Bazar Cumilla", 23.4643, 91.1809, "RETAIL", d("Cumilla")),
        ("a7000001-0001-4001-8001-000000000006", "Khulna Rupsha Bazar", 22.8456, 89.5403, "WHOLESALE", d("Khulna")),
        ("a7000001-0001-4001-8001-000000000007", "Rajshahi Shaheb Bazar", 24.3745, 88.6042, "RETAIL", d("Rajshahi")),
        ("a7000001-0001-4001-8001-000000000008", "Sylhet Bondor Bazar", 24.8949, 91.8687, "WHOLESALE", d("Sylhet")),
        ("a7000001-0001-4001-8001-000000000009", "Barishal Bogura Bazar", 22.7010, 90.3535, "RETAIL", d("Barishal")),
        ("a7000001-0001-4001-8001-000000000010", "Rangpur Keranipara Haat", 25.7439, 89.2752, "HAAT", d("Rangpur")),
        ("a7000001-0001-4001-8001-000000000011", "Mymensingh Boro Bazar", 24.7471, 90.4203, "RETAIL", d("Mymensingh")),
        ("a7000001-0001-4001-8001-000000000012", "Faridpur Krishi Bazar", 23.6071, 89.8429, "MANDI", d("Faridpur")),
        ("a7000001-0001-4001-8001-000000000013", "Chattogram Fishery Ghat", 22.3289, 91.8210, "WHOLESALE", d("Chattogram")),
        ("a7000001-0001-4001-8001-000000000014", "Gazipur Tongi Vegetable Market", 23.8801, 90.3890, "MANDI", d("Gazipur")),
        ("a7000001-0001-4001-8001-000000000015", "Cox's Bazar Fish Landing Centre", 21.4272, 92.0058, "WHOLESALE", d("Cox's Bazar")),
    ]
    lines = [
        "-- Agro markets: real wholesale/retail haats (public market names + coordinates)",
        "",
        "INSERT INTO agro_markets (id, name, lat, lng, type, admin_unit_id, created_at)",
        "VALUES",
    ]
    rows = [
        f"  ({sql_str(m[0])}, {sql_str(m[1])}, {m[2]}, {m[3]}, '{m[4]}', {sql_str(m[5])}, NOW())"
        for m in markets
    ]
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, lat = EXCLUDED.lat, lng = EXCLUDED.lng;")
    return "\n".join(lines)


def generate_commodity_prices() -> str:
    """Approximate USD/MT prices — indicative 2024-2025 trade desk reference."""
    commodities = [
        ("RICE_BR28", "IND", "India", 438, 32, 0.05),
        ("RICE_BR28", "MMR", "Myanmar", 412, 45, 0.05),
        ("RICE_BR28", "THA", "Thailand", 455, 55, 0.05),
        ("RICE_BR28", "VNM", "Vietnam", 448, 50, 0.05),
        ("WHEAT", "IND", "India", 285, 28, 0.08),
        ("WHEAT", "PAK", "Pakistan", 268, 35, 0.08),
        ("WHEAT", "RUS", "Russia", 240, 62, 0.08),
        ("WHEAT", "UKR", "Ukraine", 252, 58, 0.08),
        ("ONION", "IND", "India", 395, 22, 0.10),
        ("ONION", "EGY", "Egypt", 360, 48, 0.10),
        ("ONION", "TUR", "Turkey", 345, 52, 0.10),
        ("LENTIL_MASUR", "IND", "India", 535, 30, 0.05),
        ("LENTIL_MASUR", "CAN", "Canada", 498, 65, 0.05),
        ("LENTIL_MASUR", "AUS", "Australia", 510, 70, 0.05),
        ("POTATO", "IND", "India", 180, 18, 0.05),
        ("POTATO", "NLD", "Netherlands", 220, 55, 0.05),
        ("SUGAR", "IND", "India", 520, 35, 0.15),
        ("SUGAR", "BRA", "Brazil", 485, 72, 0.15),
        ("SOYBEAN_OIL", "ARG", "Argentina", 890, 68, 0.12),
        ("SOYBEAN_OIL", "MYS", "Malaysia", 920, 55, 0.12),
        ("COTTON", "IND", "India", 1650, 40, 0.05),
        ("COTTON", "USA", "United States", 1580, 85, 0.05),
        ("FERTILIZER_Urea", "CHN", "China", 310, 45, 0.03),
        ("FERTILIZER_Urea", "QAT", "Qatar", 295, 52, 0.03),
        ("JUTE", "BGD", "Bangladesh", 680, 0, 0.00),
    ]
    lines = [
        "-- Commodity price logs: indicative international trade prices (USD/MT, demo)",
        "-- 6 months of weekly snapshots for arbitrage heatmap",
        "",
    ]
    for week in range(26):
        lines.append("INSERT INTO commodity_price_logs (commodity_code, country_code, country_name, unit_price_usd, shipping_cost_usd, tariff_rate, landed_cost_usd, source_rank, created_at)")
        lines.append("SELECT v.commodity, v.cc, v.cn, v.price + (random() * 20 - 10), v.ship, v.tariff, (v.price + v.ship + v.price * v.tariff) + (random() * 15 - 7), v.rank,")
        lines.append(f"  NOW() - INTERVAL '{week * 7} days'")
        lines.append("FROM (VALUES")
        vals = []
        for i, (com, cc, cn, price, ship, tariff) in enumerate(commodities):
            vals.append(f"  ({sql_str(com)}, {sql_str(cc)}, {sql_str(cn)}, {price}::numeric, {ship}::numeric, {tariff}::numeric, {i + 1})")
        lines.append(",\n".join(vals))
        lines.append(") AS v(commodity, cc, cn, price, ship, tariff, rank)")
        lines.append("WHERE NOT EXISTS (")
        lines.append(f"  SELECT 1 FROM commodity_price_logs WHERE created_at > NOW() - INTERVAL '{week * 7 + 3} days' AND created_at < NOW() - INTERVAL '{week * 7 - 3} days' LIMIT 1")
        lines.append(");")
        lines.append("")
    return "\n".join(lines)


def generate_kpi_extended() -> str:
    lines = [
        "-- Extended KPI definitions + 12-month time series per representative",
        "",
        "ALTER TABLE kpi_definitions ADD COLUMN IF NOT EXISTS name_bn VARCHAR(255);",
        "",
        "INSERT INTO kpi_definitions (id, code, name, name_bn, unit, applies_to, created_at)",
        "VALUES",
        "  ('c3000001-0001-4001-8001-000000000005', 'ROAD_COMPLETION', 'Road Infrastructure Completion', 'সড়ক অবকাঠামো সম্পন্নতা', '%', 'REPRESENTATIVE', NOW()),",
        "  ('c3000001-0001-4001-8001-000000000006', 'HEALTH_COVERAGE', 'Health Service Coverage', 'স্বাস্থ্যসেবা কভারেজ', '%', 'REPRESENTATIVE', NOW()),",
        "  ('c3000001-0001-4001-8001-000000000007', 'DIGITAL_SERVICE', 'Digital Service Delivery', 'ডিজিটাল সেবা প্রদান', '%', 'REPRESENTATIVE', NOW()),",
        "  ('c3000001-0001-4001-8001-000000000008', 'AGRI_GROWTH', 'Agricultural Output Growth', 'কৃষি উৎপাদন প্রবৃদ্ধি', '%', 'ADMIN_UNIT', NOW())",
        "ON CONFLICT (code) DO UPDATE SET name_bn = EXCLUDED.name_bn;",
        "",
    ]
    reps = [
        "d4000001-0001-4001-8001-000000000001",
        "d4000001-0001-4001-8001-000000000002",
        "d4000001-0001-4001-8001-000000000003",
        "d4000001-0001-4001-8001-000000000004",
        "d4000001-0001-4001-8001-000000000005",
        "d4000001-0001-4001-8001-000000000010",
        "d4000001-0001-4001-8001-000000000011",
        "d4000001-0001-4001-8001-000000000012",
    ]
    defs = [
        "c3000001-0001-4001-8001-000000000001",
        "c3000001-0001-4001-8001-000000000002",
        "c3000001-0001-4001-8001-000000000003",
        "c3000001-0001-4001-8001-000000000004",
    ]
    lines.append("INSERT INTO kpi_records (id, value, recorded_at, fiscal_year, status, verified, representative_id, kpi_def_id, created_at)")
    lines.append("SELECT gen_random_uuid(),")
    lines.append("  55 + (random() * 40)::numeric(18,4),")
    lines.append("  NOW() - (m.months || ' months')::interval,")
    lines.append("  '2025', 'VERIFIED', true, r.rep::uuid, d.def::uuid, NOW()")
    lines.append("FROM generate_series(0, 11) AS m(months)")
    lines.append("CROSS JOIN (VALUES")
    rep_vals = ",\n".join(f"  ({sql_str(r)})" for r in reps)
    lines.append(rep_vals)
    lines.append(") AS r(rep)")
    lines.append("CROSS JOIN (VALUES")
    def_vals = ",\n".join(f"  ({sql_str(d)})" for d in defs)
    lines.append(def_vals)
    lines.append(") AS d(def)")
    lines.append("WHERE (SELECT COUNT(*) FROM kpi_records WHERE fiscal_year = '2025') < 384;")
    return "\n".join(lines)


def generate_red_flags() -> str:
    flags = [
        ("f6000001-0001-4001-8001-000000000001", "BUDGET_OVERRUN", 4, "Metro Rail Line-6 expenditure exceeded allocation by 6.8% (IMED Q3 review)", "e5000001-0001-4001-8001-000000000002"),
        ("f6000001-0001-4001-8001-000000000002", "DELAY", 3, "Rooppur NPP Unit-2 commissioning delayed 8 months vs baseline", "e5000001-0001-4001-8001-000000000003"),
        ("f6000001-0001-4001-8001-000000000003", "BUDGET_OVERRUN", 5, "Elevated Expressway cost escalation flagged by CAG audit sample", "e5000001-0001-4001-8001-000000000006"),
        ("f6000001-0001-4001-8001-000000000004", "DELAY", 4, "Matarbari port berth-1 handover slip: 120 days", "e5000001-0001-4001-8001-000000000005"),
        ("f6000001-0001-4001-8001-000000000005", "CORRUPTION_RISK", 4, "Anomalous vendor concentration on health complex upgrade", "e5000001-0001-4001-8001-000000000013"),
        ("f6000001-0001-4001-8001-000000000006", "CONTRACTOR_FRAUD", 5, "Duplicate BOQ line items detected — 100 Bridges LGED package", "e5000001-0001-4001-8001-000000000012"),
        ("f6000001-0001-4001-8001-000000000007", "QUALITY", 3, "Concrete grade non-compliance at Khulna-Mongla rail culvert", "e5000001-0001-4001-8001-000000000017"),
        ("f6000001-0001-4001-8001-000000000008", "DELAY", 5, "Teesta project stalled — inter-ministerial clearance pending 18 months", "e5000001-0001-4001-8001-000000000014"),
        ("f6000001-0001-4001-8001-000000000009", "BUDGET_OVERRUN", 3, "Payra port dredging contract 12% above engineer estimate", "e5000001-0001-4001-8001-000000000007"),
        ("f6000001-0001-4001-8001-000000000010", "OTHER", 2, "Environmental clearance renewal pending — Sonadia feasibility", "e5000001-0001-4001-8001-000000000011"),
    ]
    lines = [
        "-- Red flag alerts linked to real project names",
        "",
        "INSERT INTO red_flag_alerts (id, flag_type, severity, ai_explanation, project_id, created_at)",
        "VALUES",
    ]
    rows = [
        f"  ({sql_str(f[0])}, '{f[1]}', {f[2]}, {sql_str(f[3])}, {sql_str(f[4])}, NOW() - INTERVAL '{i + 1} days')"
        for i, f in enumerate(flags)
    ]
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (id) DO UPDATE SET ai_explanation = EXCLUDED.ai_explanation, severity = EXCLUDED.severity;")
    return "\n".join(lines)


def generate_demo_users() -> str:
    pw = "$2b$12$VshTVUC3IBQ8rdl7JioofOGEezxO5yV9bYJGeEr0R1qYYql9ujVnW"  # ChangeMe@123
    d = district_uuid_by_name
    users = [
        ("minister@geoinsight.gov.bd", "MINISTER", "a1000001-0001-4001-8001-000000000001"),
        ("dc.dhaka@geoinsight.gov.bd", "DC", d("Dhaka")),
        ("dc.chattogram@geoinsight.gov.bd", "DC", d("Chattogram")),
        ("dc.khulna@geoinsight.gov.bd", "DC", d("Khulna")),
        ("union.savar@geoinsight.gov.bd", "UNION_CHAIRMAN", upazila_uuid_by_name("Savar")),
    ]
    lines = [
        "-- Demo RBAC users (password: ChangeMe@123 for all)",
        "",
        "INSERT INTO users (id, email, password_hash, role, is_active, admin_unit_id, created_at, updated_at)",
        "VALUES",
    ]
    rows = [
        f"  (gen_random_uuid(), {sql_str(u[0])}, {sql_str(pw)}, '{u[1]}', true, {sql_str(u[2])}, NOW(), NOW())"
        for u in users
    ]
    lines.append(",\n".join(rows))
    lines.append("ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, admin_unit_id = EXCLUDED.admin_unit_id, updated_at = NOW();")
    return "\n".join(lines)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "01-admin-all-districts.sql": generate_admin_districts(),
        "02-admin-all-upazilas.sql": generate_admin_upazilas(),
        "03-representatives-real.sql": generate_representatives(),
        "04-projects-real.sql": generate_projects(),
        "05-agro-markets-real.sql": generate_agro_markets(),
        "06-kpi-extended.sql": generate_kpi_extended(),
        "07-red-flags-extended.sql": generate_red_flags(),
        "08-commodity-prices-real.sql": generate_commodity_prices(),
        "09-demo-users.sql": generate_demo_users(),
    }
    for name, content in files.items():
        path = OUT / name
        path.write_text(content + "\n", encoding="utf-8")
        print(f"Wrote {path} ({len(content):,} bytes)")


if __name__ == "__main__":
    main()
