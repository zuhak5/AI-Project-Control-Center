import type { HealthStatus } from "@/lib/types";
export function StatusBadge({ status }: { status: HealthStatus }) { const label = status === "healthy" ? "Healthy" : status === "degraded" ? "Degraded" : status === "down" ? "Down" : "Unknown"; return <span className={`status-badge status-${status}`}><span className="status-dot" />{label}</span>; }
