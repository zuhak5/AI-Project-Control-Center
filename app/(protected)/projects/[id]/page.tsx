import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { HealthButton } from "@/components/health-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { ProjectActions } from "@/components/project-actions";
import { EnvironmentBadge, StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDuration, formatNumber, providerLabel } from "@/lib/format";
import { latestProjectStatus, projectUsage } from "@/lib/metrics";
import { hasProviderSecret } from "@/lib/security";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await getState();
  const project = state.projects.find((entry) => entry.id === id);
  if (!project) notFound();
  const usage = projectUsage(state, project.id);
  const status = project.enabled ? latestProjectStatus(state, project) : "unknown";
  const latestHealth = state.healthChecks.find((check) => check.projectId === project.id);
  const ingestUrl = `${process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://your-dashboard.vercel.app"}/api/ingest/${project.id}`;

  return <div className="page-wrap">
    <PageHeader eyebrow="Project details" title={project.name} description={project.description || "Operational configuration and activity."} actions={<><HealthButton projectId={project.id} /></>} />
    <div className="inline-badges detail-badges"><EnvironmentBadge environment={project.environment} /><StatusBadge status={status} /><span className={`secret-state ${hasProviderSecret(project.apiKeyEnv) ? "configured" : "missing"}`}>{hasProviderSecret(project.apiKeyEnv) ? "Provider secret ready" : "Provider secret missing"}</span>{project.enabled ? <span className="tag">Enabled</span> : <span className="tag">Disabled</span>}</div>
    <section className="metric-grid four"><MetricCard label="Requests this month" value={formatNumber(usage.requestCount)} detail={formatDate(usage.lastEventAt)} /><MetricCard label="Tokens this month" value={formatNumber(usage.totalTokens)} detail="Input and output" /><MetricCard label="Reported spend" value={formatCurrency(usage.estimatedCostUsd)} detail={project.monthlyBudgetUsd ? `${formatCurrency(project.monthlyBudgetUsd)} monthly budget` : "No budget set"} /><MetricCard label="Latest health" value={latestHealth ? formatDuration(latestHealth.latencyMs) : "—"} detail={latestHealth?.message ?? "No health check recorded"} tone={status === "healthy" ? "good" : status === "degraded" ? "warn" : status === "down" ? "danger" : "default"} /></section>
    <section className="detail-grid">
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Provider connection</p><h2>Configuration</h2></div></div><dl className="detail-list"><div><dt>Adapter</dt><dd>{providerLabel(project.provider)}</dd></div><div><dt>Base URL</dt><dd><code>{project.baseUrl}</code></dd></div><div><dt>Secret reference</dt><dd><code>{project.apiKeyEnv}</code></dd></div><div><dt>Default model</dt><dd>{project.defaultModel}</dd></div><div><dt>Allowed models</dt><dd>{project.allowedModels.join(", ")}</dd></div><div><dt>Health prompt</dt><dd>{project.healthCheck.prompt}</dd></div></dl></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Remote telemetry</p><h2>Ingestion endpoint</h2></div></div><p className="muted">Other projects can submit sanitized usage events using a project-scoped token. Raw prompts and responses are not accepted.</p><div className="code-copy"><code>{ingestUrl}</code><CopyButton value={ingestUrl} /></div><pre className="code-block">{`curl -X POST '${ingestUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'X-AICC-Ingest-Token: <project-token>' \\\n  -d '{"status":"success","model":"model-name","latencyMs":850,"inputTokens":120,"outputTokens":40}'`}</pre><p className="muted">Token configured: {project.telemetry.ingestTokenHash ? "yes" : "no"}. Rotate it to issue a new value.</p></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Danger zone</p><h2>Project controls</h2></div></div><ProjectActions projectId={project.id} enabled={project.enabled} /></article>
      <article className="panel"><div className="panel-heading"><div><p className="eyebrow">Audit context</p><h2>Metadata</h2></div></div><dl className="detail-list"><div><dt>Project ID</dt><dd><code>{project.id}</code></dd></div><div><dt>Created</dt><dd>{formatDate(project.createdAt)}</dd></div><div><dt>Updated</dt><dd>{formatDate(project.updatedAt)}</dd></div><div><dt>Tags</dt><dd>{project.tags.length ? project.tags.join(", ") : "None"}</dd></div></dl></article>
    </section>
  </div>;
}
