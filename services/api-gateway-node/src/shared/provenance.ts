export type DataProvenance = "LIVE" | "SEED" | "SYNTHETIC";

export function kpiProvenance(blockchainHash: string | null | undefined): DataProvenance {
  if (blockchainHash?.startsWith("pipeline:")) return "LIVE";
  return "SEED";
}

export function signalProvenance(row: {
  url?: string | null;
  sourceName?: string | null;
  articleId?: string | null;
  flagType?: string | null;
}): DataProvenance {
  if (
    row.flagType === "PULSE" ||
    row.url?.startsWith("pulse://") ||
    /geoinsight pulse/i.test(row.sourceName ?? "")
  ) {
    return "SYNTHETIC";
  }
  if (row.articleId || row.url?.startsWith("http://") || row.url?.startsWith("https://")) {
    return "LIVE";
  }
  return "SEED";
}

export function isSyntheticSignal(row: {
  url?: string | null;
  flagType?: string | null;
  sourceName?: string | null;
}): boolean {
  return signalProvenance(row) === "SYNTHETIC";
}

/** Prisma filter: drop Docker heartbeat rows from live feeds and counts. */
export const notSyntheticLiveSignalWhere = {
  NOT: {
    OR: [
      { url: { startsWith: "pulse://" } },
      { url: { startsWith: "citizen://" } },
      { flagType: "PULSE" },
      { flagType: "CITIZEN" },
    ],
  },
};
