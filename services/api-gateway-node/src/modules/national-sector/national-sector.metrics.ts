import { LocalSector } from "@prisma/client";

export function num(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

export function isCsvOrigin(metrics: Record<string, unknown>): boolean {
  return metrics.origin === "csv";
}

export function pressureOf(sector: LocalSector, metrics: Record<string, unknown>): number {
  if (sector === LocalSector.EDUCATION) {
    return Math.min(
      100,
      num(metrics, "dropoutPct") * 3.2 +
        num(metrics, "teacherGap") * 8 +
        Math.max(0, 88 - num(metrics, "attendancePct")) * 1.1,
    );
  }
  if (sector === LocalSector.HEALTH) {
    return Math.min(
      100,
      num(metrics, "dengueCases7d") * 4.5 +
        Math.max(0, num(metrics, "occupancyPct") - 80) * 1.4 +
        (flag(metrics, "stockout") ? 22 : 0) +
        Math.max(0, 5 - num(metrics, "orsStockDays")) * 4,
    );
  }
  return Math.min(
    100,
    num(metrics, "unemploymentPct") * 2.2 +
      num(metrics, "youthUnempPct") * 0.8 +
      (flag(metrics, "jobFairGap") ? 16 : 0) +
      Math.max(0, 20 - num(metrics, "vacanciesListed")) * 1.2,
  );
}
