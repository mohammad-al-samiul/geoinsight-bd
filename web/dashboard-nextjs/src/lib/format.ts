export function formatLakh(value: number | string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `${(n / 100).toLocaleString("en-BD", { maximumFractionDigits: 0 })} L`;
}

export function formatPercent(value: number | string, unit?: string): string {
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return unit === "%" || !unit ? `${n.toFixed(1)}%` : `${n.toFixed(1)} ${unit}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-BD");
}
