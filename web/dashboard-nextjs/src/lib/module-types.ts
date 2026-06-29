export interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  unit: string;
  appliesTo: string;
}

export interface AdminUnitRef {
  id: string;
  name: string;
  nameBn?: string | null;
  type: string;
}

export interface RepresentativeRef {
  id: string;
  name: string;
  role: string;
  party?: string | null;
  adminUnitId: string;
  adminUnit?: AdminUnitRef;
}

export interface KpiRecord {
  id: string;
  value: string | number;
  recordedAt: string;
  fiscalYear: string;
  status: string;
  verified: boolean;
  blockchainHash?: string | null;
  kpiDef: { code: string; name: string; unit: string };
  representative: RepresentativeRef;
}

export interface ProjectRow {
  id: string;
  title: string;
  budgetAllocated: string | number;
  budgetSpent: string | number;
  status: string;
  contractorNid?: string | null;
  startDate: string;
  blockchainTx?: string | null;
  adminUnitId: string;
  _count?: { redFlagAlerts: number };
}

export interface ProjectDetail extends ProjectRow {
  adminUnit?: AdminUnitRef;
  redFlagAlerts?: Array<{
    id: string;
    flagType: string;
    severity: number;
    aiExplanation?: string | null;
    createdAt: string;
  }>;
}

export interface RepresentativeRow {
  id: string;
  name: string;
  nid: string;
  role: string;
  party?: string | null;
  tenureStart: string;
  tenureEnd?: string | null;
  adminUnitId: string;
}

export interface AgroMarketRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  adminUnitId: string;
}
