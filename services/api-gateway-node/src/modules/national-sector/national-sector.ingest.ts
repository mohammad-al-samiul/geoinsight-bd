import { readFile } from "fs/promises";
import { LocalSector, LocalSiteStatus, Prisma } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { pressureOf } from "./national-sector.metrics";

export const CSV_ORIGIN = "csv";

const DISTRICT_ALIASES: Record<string, string> = {
  chittagong: "chattogram",
  ctg: "chattogram",
  bogra: "bogura",
  barisal: "barishal",
  comilla: "cumilla",
  jessore: "jashore",
  "cox s bazar": "cox's bazar",
  "coxs bazar": "cox's bazar",
  "cox bazar": "cox's bazar",
};

export type SectorIngestResult = {
  upserted: number;
  skipped: number;
  unknownDistricts: string[];
  path: string | null;
  observedAt: string | null;
};

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function normName(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return DISTRICT_ALIASES[key] ?? key;
}

function num(row: CsvRow, key: string): number | undefined {
  const raw = row[key];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function bool(row: CsvRow, key: string): boolean | undefined {
  const raw = row[key]?.toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "yes", "y"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return undefined;
}

function parseSector(raw: string): LocalSector | null {
  const s = raw.trim().toUpperCase();
  if (s === "EDUCATION" || s === "EDU") return LocalSector.EDUCATION;
  if (s === "HEALTH") return LocalSector.HEALTH;
  if (s === "EMPLOYMENT" || s === "JOBS" || s === "JOB") return LocalSector.EMPLOYMENT;
  return null;
}

function statusOf(sector: LocalSector, pressure: number): LocalSiteStatus {
  if (sector === LocalSector.EDUCATION) {
    if (pressure >= 52) return LocalSiteStatus.ALERT;
    if (pressure >= 28) return LocalSiteStatus.WATCH;
    return LocalSiteStatus.OK;
  }
  if (sector === LocalSector.HEALTH) {
    if (pressure >= 48) return LocalSiteStatus.ALERT;
    if (pressure >= 26) return LocalSiteStatus.WATCH;
    return LocalSiteStatus.OK;
  }
  if (pressure >= 46) return LocalSiteStatus.ALERT;
  if (pressure >= 26) return LocalSiteStatus.WATCH;
  return LocalSiteStatus.OK;
}

function severityOf(status: LocalSiteStatus): number {
  if (status === LocalSiteStatus.ALERT) return 5;
  if (status === LocalSiteStatus.WATCH) return 3;
  return 2;
}

function metricsFromRow(sector: LocalSector, row: CsvRow): Record<string, unknown> {
  const metrics: Record<string, unknown> = { origin: CSV_ORIGIN };
  if (sector === LocalSector.EDUCATION) {
    const attendance = num(row, "attendance_pct");
    const dropout = num(row, "dropout_pct");
    const gap = num(row, "teacher_gap");
    if (attendance !== undefined) metrics.attendancePct = attendance;
    if (dropout !== undefined) metrics.dropoutPct = dropout;
    if (gap !== undefined) metrics.teacherGap = gap;
  } else if (sector === LocalSector.HEALTH) {
    const dengue = num(row, "dengue_cases_7d");
    const occ = num(row, "occupancy_pct");
    const stock = bool(row, "stockout");
    const ors = num(row, "ors_stock_days");
    if (dengue !== undefined) metrics.dengueCases7d = dengue;
    if (occ !== undefined) metrics.occupancyPct = occ;
    if (stock !== undefined) metrics.stockout = stock;
    if (ors !== undefined) metrics.orsStockDays = ors;
  } else {
    const unemp = num(row, "unemployment_pct");
    const youth = num(row, "youth_unemp_pct");
    const vac = num(row, "vacancies_listed");
    const train = num(row, "training_seats");
    const fair = bool(row, "job_fair_gap");
    if (unemp !== undefined) metrics.unemploymentPct = unemp;
    if (youth !== undefined) metrics.youthUnempPct = youth;
    if (vac !== undefined) metrics.vacanciesListed = vac;
    if (train !== undefined) metrics.trainingSeats = train;
    if (fair !== undefined) metrics.jobFairGap = fair;
  }
  return metrics;
}

export async function ingestNationalSectorCsv(
  csvText?: string,
  path = env.NATIONAL_SECTOR_CSV_PATH,
): Promise<SectorIngestResult> {
  let text = csvText?.trim() ?? "";
  let usedPath: string | null = null;
  if (!text) {
    try {
      text = await readFile(path, "utf8");
      usedPath = path;
    } catch {
      return {
        upserted: 0,
        skipped: 0,
        unknownDistricts: [],
        path,
        observedAt: null,
      };
    }
  }

  const rows = parseCsv(text);
  const districts = await prismaRead.adminUnit.findMany({
    where: { type: "DISTRICT" },
    select: { id: true, name: true, code: true },
  });
  const byName = new Map(districts.map((d) => [normName(d.name), d]));
  const byCode = new Map(districts.map((d) => [d.code.toLowerCase(), d]));

  let upserted = 0;
  let skipped = 0;
  const unknown = new Set<string>();
  let latestObserved: Date | null = null;

  for (const row of rows) {
    const sector = parseSector(row.sector ?? "");
    const districtRaw = row.district || row.district_name || "";
    const codeRaw = row.district_code || row.code || "";
    const unit =
      (codeRaw ? byCode.get(codeRaw.toLowerCase()) : undefined) ??
      (districtRaw ? byName.get(normName(districtRaw)) : undefined);
    if (!sector || !unit) {
      skipped += 1;
      if (districtRaw) unknown.add(districtRaw);
      continue;
    }

    const observedAt = row.observed_at ? new Date(row.observed_at) : new Date();
    if (Number.isNaN(observedAt.getTime())) {
      skipped += 1;
      continue;
    }
    if (!latestObserved || observedAt > latestObserved) latestObserved = observedAt;

    const metrics = metricsFromRow(sector, row);
    const pressure = pressureOf(sector, metrics);
    const status = statusOf(sector, pressure);
    const json = metrics as Prisma.InputJsonValue;

    await prismaWrite.nationalSectorSnapshot.upsert({
      where: { adminUnitId_sector: { adminUnitId: unit.id, sector } },
      create: {
        sector,
        status,
        source: "OFFICIAL",
        metrics: json,
        severity: severityOf(status),
        observedAt,
        adminUnitId: unit.id,
      },
      update: {
        status,
        metrics: json,
        severity: severityOf(status),
        observedAt,
      },
    });
    upserted += 1;
  }

  return {
    upserted,
    skipped,
    unknownDistricts: [...unknown],
    path: usedPath,
    observedAt: latestObserved?.toISOString() ?? null,
  };
}
