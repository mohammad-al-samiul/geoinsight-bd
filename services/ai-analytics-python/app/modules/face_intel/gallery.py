"""VIP face gallery — current BNP mandate duty-holders only (no Awami League)."""

from __future__ import annotations

from typing import TypedDict


class VipProfile(TypedDict):
    vip_id: str
    representative_id: str
    nid: str
    name: str
    designation: str
    designation_bn: str
    party: str | None


VIP_GALLERY: list[VipProfile] = [
    {
        "vip_id": "vip-kz",
        "representative_id": "d4000001-0001-4001-8001-000000000025",
        "nid": "1000000000025",
        "name": "Begum Khaleda Zia (Prime Minister)",
        "designation": "Prime Minister",
        "designation_bn": "প্রধানমন্ত্রী",
        "party": "BNP",
    },
    {
        "vip_id": "vip-tr",
        "representative_id": "d4000001-0001-4001-8001-000000000001",
        "nid": "1000000000001",
        "name": "Tarique Rahman (Senior Minister)",
        "designation": "Senior Minister",
        "designation_bn": "সিনিয়র মন্ত্রী",
        "party": "BNP",
    },
    {
        "vip_id": "vip-nik",
        "representative_id": "d4000001-0001-4001-8001-000000000010",
        "nid": "1000000000010",
        "name": "Nazrul Islam Khan (Road Transport)",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "BNP",
    },
    {
        "vip_id": "vip-rf",
        "representative_id": "d4000001-0001-4001-8001-000000000011",
        "nid": "1000000000011",
        "name": "Rumeen Farhana (Law & Justice)",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "BNP",
    },
    {
        "vip_id": "vip-nawaz-dc",
        "representative_id": "d4000001-0001-4001-8001-000000000003",
        "nid": "1000000000003",
        "name": "Dr. Ahmed Nawaz (DC, Gazipur)",
        "designation": "Deputy Commissioner",
        "designation_bn": "জেলা প্রশাসক",
        "party": "BCS (Admin)",
    },
    {
        "vip_id": "vip-finance",
        "representative_id": "d4000001-0001-4001-8001-000000000012",
        "nid": "1000000000012",
        "name": "Amir Khasru Mahmud Chowdhury (Finance)",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "BNP",
    },
]


def find_by_nid(nid: str) -> VipProfile | None:
    for v in VIP_GALLERY:
        if v["nid"] == nid:
            return v
    return None


def find_by_vip_id(vip_id: str) -> VipProfile | None:
    for v in VIP_GALLERY:
        if v["vip_id"] == vip_id:
            return v
    return None
