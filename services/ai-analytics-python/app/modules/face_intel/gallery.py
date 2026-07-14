"""VIP face gallery registry — seed NIDs aligned with `deploy/scripts/seed/03-representatives-real.sql`."""

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


# Deterministic gallery keys used for encoding files under gallery/
VIP_GALLERY: list[VipProfile] = [
    {
        "vip_id": "vip-obq",
        "representative_id": "d4000001-0001-4001-8001-000000000010",
        "nid": "1000000000010",
        "name": "Obaidul Quader MP",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "Awami League",
    },
    {
        "vip_id": "vip-sh",
        "representative_id": "d4000001-0001-4001-8001-000000000001",
        "nid": "1000000000001",
        "name": "Sheikh Hasina",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "Awami League",
    },
    {
        "vip_id": "vip-dipu",
        "representative_id": "d4000001-0001-4001-8001-000000000011",
        "nid": "1000000000011",
        "name": "Dr. Dipu Moni MP",
        "designation": "Member of Parliament",
        "designation_bn": "সংসদ সদস্য",
        "party": "Awami League",
    },
    {
        "vip_id": "vip-nawaz-dc",
        "representative_id": "d4000001-0001-4001-8001-000000000003",
        "nid": "1000000000003",
        "name": "Dr. Ahmed Nawaz DC",
        "designation": "Deputy Commissioner",
        "designation_bn": "জেলা প্রশাসক",
        "party": "BCS (Admin)",
    },
    {
        "vip_id": "vip-askar",
        "representative_id": "d4000001-0001-4001-8001-000000000017",
        "nid": "1000000000017",
        "name": "Asaduzzaman Khan MP",
        "designation": "Minister",
        "designation_bn": "মন্ত্রী",
        "party": "Awami League",
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
