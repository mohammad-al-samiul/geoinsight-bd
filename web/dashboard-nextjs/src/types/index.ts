export type UserRole = "PMO" | "MINISTER" | "DC" | "UNION_CHAIRMAN";

export type AdminUnitType = "DIVISION" | "DISTRICT" | "UPAZILA" | "UNION";

export interface AdminUnit {
  id: string;
  code: string;
  name: string;
  nameBn?: string;
  type: AdminUnitType;
  parentId: string | null;
  lng?: number;
  lat?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  adminUnitId: string | null;
  adminUnitName?: string;
}

export interface AdminFilterState {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
}

export const ADMIN_FILTER_PARAMS = {
  division: "division",
  district: "district",
  upazila: "upazila",
  union: "union",
} as const;

export const ROLE_META: Record<
  UserRole,
  { label: string; labelBn: string; tier: number; badgeClass: string }
> = {
  PMO: {
    label: "Prime Minister's Office",
    labelBn: "প্রধানমন্ত্রীর কার্যালয়",
    tier: 1,
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  MINISTER: {
    label: "Hon'ble Minister",
    labelBn: "মাননীয় মন্ত্রী",
    tier: 2,
    badgeClass: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
  DC: {
    label: "Deputy Commissioner",
    labelBn: "জেলা প্রশাসক",
    tier: 3,
    badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  UNION_CHAIRMAN: {
    label: "Union Chairman",
    labelBn: "ইউনিয়ন চেয়ারম্যান",
    tier: 4,
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};
