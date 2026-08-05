export function formatNumber(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-US", { notation: Math.abs(safe) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(safe);
}
export function formatDuration(value: number): string {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  if (safe < 1000) return `${Math.round(safe)} ms`;
  return `${(safe / 1000).toFixed(safe >= 10000 ? 0 : 1)} s`;
}
export function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
