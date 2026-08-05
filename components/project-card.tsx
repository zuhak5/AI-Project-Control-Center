import Link from "next/link";
import { EnvironmentBadge, StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatNumber, providerLabel } from "@/lib/format";
import type { HealthStatus, ProjectConfig } from "@/lib/types";

export function ProjectCard({ project, status, usage, apiKeyConfigured }: {
  project: ProjectConfig;
  status: HealthStatus;
  usage: { requestCount: number; totalTokens: number; estimatedCostUsd: number; lastEventAt: string | null };
  apiKeyConfigured: boolean;
}) {
  return (
    <article className="project-card">
      <div className="project-card-top">
        <div>
          <div className="inline-badges"><EnvironmentBadge environment={project.environment} /><StatusBadge status={project.enabled ? status : "unknown"} /></div>
          <h2><Link href={`/projects/${project.id}`}>{project.name}</Link></h2>
          <p>{project.description || "No project description."}</p>
        </div>
        <span className={`secret-state ${apiKeyConfigured ? "configured" : "missing"}`}>{apiKeyConfigured ? "Secret ready" : "Secret missing"}</span>
      </div>
      <dl className="project-facts">
        <div><dt>Provider</dt><dd>{providerLabel(project.provider)}</dd></div>
        <div><dt>Model</dt><dd>{project.defaultModel}</dd></div>
        <div><dt>Requests this month</dt><dd>{formatNumber(usage.requestCount)}</dd></div>
        <div><dt>Tokens this month</dt><dd>{formatNumber(usage.totalTokens)}</dd></div>
        <div><dt>Reported spend</dt><dd>{formatCurrency(usage.estimatedCostUsd)}</dd></div>
        <div><dt>Last activity</dt><dd>{formatDate(usage.lastEventAt)}</dd></div>
      </dl>
      <div className="tag-row">{project.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
    </article>
  );
}
