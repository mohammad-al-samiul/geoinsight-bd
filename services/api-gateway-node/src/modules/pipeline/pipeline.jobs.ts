export const PIPELINE_JOB_IDS = [
  "news",
  "commodity",
  "kpi",
  "alerts",
  "agro",
  "hazard",
  "weather",
  "unrest",
  "narrative",
  "outlook",
  "briefing",
  "signals",
  "national-sectors",
  "continuous-pulse",
  "alert-retry",
  "maintenance",
] as const;

export type PipelineJobId = (typeof PIPELINE_JOB_IDS)[number];
