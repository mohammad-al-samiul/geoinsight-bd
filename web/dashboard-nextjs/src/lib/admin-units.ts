import type { AdminUnit } from "@/types";

/**
 * Representative Bangladesh admin hierarchy (sample nodes).
 * Production: fetched from GET /api/v1/admin-units/:id/tree
 */
export const ADMIN_UNITS: AdminUnit[] = [
  { id: "div-dhaka", code: "30", name: "Dhaka", nameBn: "ঢাকা", type: "DIVISION", parentId: null },
  { id: "div-chattogram", code: "20", name: "Chattogram", nameBn: "চট্টগ্রাম", type: "DIVISION", parentId: null },
  { id: "div-rajshahi", code: "50", name: "Rajshahi", nameBn: "রাজশাহী", type: "DIVISION", parentId: null },

  { id: "dist-dhaka", code: "3026", name: "Dhaka", nameBn: "ঢাকা", type: "DISTRICT", parentId: "div-dhaka" },
  { id: "dist-gazipur", code: "3033", name: "Gazipur", nameBn: "গাজীপুর", type: "DISTRICT", parentId: "div-dhaka" },
  { id: "dist-cumilla", code: "2019", name: "Cumilla", nameBn: "কুমিল্লা", type: "DISTRICT", parentId: "div-chattogram" },

  { id: "upa-savar", code: "302604", name: "Savar", nameBn: "সাভার", type: "UPAZILA", parentId: "dist-dhaka" },
  { id: "upa-keraniganj", code: "302605", name: "Keraniganj", nameBn: "কেরানীগঞ্জ", type: "UPAZILA", parentId: "dist-dhaka" },
  { id: "upa-tongi", code: "303304", name: "Tongi", nameBn: "টঙ্গী", type: "UPAZILA", parentId: "dist-gazipur" },

  { id: "uni-ashulia", code: "30260401", name: "Ashulia", nameBn: "আশুলিয়া", type: "UNION", parentId: "upa-savar" },
  { id: "uni-birulia", code: "30260402", name: "Birulia", nameBn: "বিরুলিয়া", type: "UNION", parentId: "upa-savar" },
  { id: "uni-keraniganj-s", code: "30260501", name: "South Keraniganj", nameBn: "দক্ষিণ কেরানীগঞ্জ", type: "UNION", parentId: "upa-keraniganj" },
];

export function getChildren(parentId: string | null, type: AdminUnit["type"]): AdminUnit[] {
  return ADMIN_UNITS.filter((u) => u.parentId === parentId && u.type === type);
}

export function getUnitById(id: string | null): AdminUnit | undefined {
  if (!id) return undefined;
  return ADMIN_UNITS.find((u) => u.id === id);
}

export function getBreadcrumb(filter: {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
}): AdminUnit[] {
  return [
    filter.divisionId,
    filter.districtId,
    filter.upazilaId,
    filter.unionId,
  ]
    .map(getUnitById)
    .filter((u): u is AdminUnit => Boolean(u));
}
