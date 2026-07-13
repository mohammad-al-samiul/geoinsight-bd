/**
 * Current elected government mandate — politics / economy / unrest
 * analysis is scoped from this date forward (not prior interim eras).
 */

export interface CurrentMandate {
  /** ISO date YYYY-MM-DD — national election / new cabinet from this day */
  termStartedOn: string;
  termStartedAt: Date;
  rulingParty: string;
  labelBn: string;
  labelEn: string;
  electionLabelBn: string;
  electionLabelEn: string;
}

const DEFAULT_SINCE = "2026-02-15";
const DEFAULT_PARTY = "BNP";

function parseDateOnly(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return new Date(`${DEFAULT_SINCE}T00:00:00+06:00`);
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00+06:00`);
}

export function getCurrentMandate(env?: {
  CURRENT_GOVERNMENT_SINCE?: string;
  CURRENT_GOVERNMENT_PARTY?: string;
}): CurrentMandate {
  const since = env?.CURRENT_GOVERNMENT_SINCE?.trim() || DEFAULT_SINCE;
  const party = env?.CURRENT_GOVERNMENT_PARTY?.trim() || DEFAULT_PARTY;
  const termStartedAt = parseDateOnly(since);
  return {
    termStartedOn: since,
    termStartedAt,
    rulingParty: party,
    labelBn: `বর্তমান সরকার (${party}, জাতীয় নির্বাচন ফেব্রুয়ারি ২০২৬–)`,
    labelEn: `Current government (${party}, national election Feb 2026–)`,
    electionLabelBn: "জাতীয় নির্বাচন ফেব্রুয়ারি ২০২৬",
    electionLabelEn: "National election February 2026",
  };
}

/** Earliest date for news analysis: never before the current mandate. */
export function mandateAnalysisSince(
  rollingDays?: number,
  mandate = getCurrentMandate(),
): Date {
  const term = mandate.termStartedAt;
  if (rollingDays == null || rollingDays <= 0) return term;
  const rolling = new Date(Date.now() - rollingDays * 86_400_000);
  return rolling.getTime() > term.getTime() ? rolling : term;
}

export function mandatePublicMeta(mandate = getCurrentMandate()) {
  return {
    term_started_on: mandate.termStartedOn,
    ruling_party: mandate.rulingParty,
    label_bn: mandate.labelBn,
    label_en: mandate.labelEn,
    election_bn: mandate.electionLabelBn,
    election_en: mandate.electionLabelEn,
  };
}
