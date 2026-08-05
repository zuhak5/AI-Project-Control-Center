import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SparkBars } from "@/components/spark-bars";
import { EnvironmentBadge, StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDate, formatDuration, formatNumber, providerLabel } from "@/lib/format";
import { calculateOverview, latestProjectStatus } from "@/lib/metrics";
import { hasProviderSecret } from "@/lib/security";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const state = await getState();
  const metrics = calculateOverview(state);
  return (
    <div className="page-wrap">
      <PageHeader
        eyebrow="Portfolio overview"
        title="AI operations at a glance"
        description="Provider health, traffic, token consumption, and operational readiness across every registered project."
        actions={<><a className="button secondary" href="/api/export">Export data</a><Link className="button primary" href="/projects/new">Add project</Link></>}
      />
      <section className="metric-grid">
        <MetricCard label="Requests · 24h" value={formatNumber(metrics.requests24h)} detail={`${metrics.activeProjects} active projects`} />
        <MetricCard label="Success rate · 24h" value={`${metrics.successRate24h.toFixed(1)}%`} detail={`${metrics.unhealthyProjects} unhealthy projects`} tone={metrics.successRate24h >= 99 ? "good" : metrics.successRate24h >= 95 ? "warn" : "danger"} />
        <MetricCard label="Tokens · 24h" value={formatNumber(metrics.tokens24h)} detail="Reported and playground usage" />
        <MetricCard label="Average latency" value={formatDuration(metrics.avgLatency24h)} detail="Successful and failed requests" />
        <MetricCard label="Reported spend · 24h" value={formatCurrency(metrics.spend24h)} detail="Based on submitted telemetry" />
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading"><div><p className="eyebrow">Seven-day activity</p><h2>Request volume</h2></div><span className="muted">Errors are marked in red</span></div>
          <SparkBars data={metrics.daily} />
        </article>
        <article className="panel readiness-panel">
          <div className="panel-heading"><div><p className="eyebrow">Deployment readiness</p><h2>Configuration</h2></div></div>
          <ul className="readiness-list">
            <li><span className={process.env.BLOB_READ_WRITE_TOKEN ? "check good" : "check bad"}>{process.env.BLOB_READ_WRITE_TOKEN ? "✓" : "!"}</span><span><strong>Private storage</strong><small>{process.env.BLOB_READ_WRITE_TOKEN ? "Vercel Blob connected" : "BLOB_READ_WRITE_TOKEN missing"}</small></span></li>
            <li><span className={process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? "check good" : "check bad"}>{process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? "✓" : "!"}</span><span><strong>GitHub OAuth</strong><small>{process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET ? "OAuth application configured" : "OAuth variables missing"}</small></span></li>
            <li><span className={process.env.CRON_SECRET ? "check good" : "check bad"}>{process.env.CRON_SECRET ? "✓" : "!"}</span><span><strong>Scheduled monitoring</strong><small>{process.env.CRON_SECRET ? "Cron endpoint protected" : "CRON_SECRET missing"}</small></span></li>
          </ul>
        </article>
      </section>

      {state.projects.length ? (
        <section className="panel table-panel">
          <div className="panel-heading"><div><p className="eyebrow">Registered projects</p><h2>Current status</h2></div><Link className="text-link" href="/projects">View all →</Link></div>
          <div className="table-scroll"><table><thead><tr><th>Project</th><th>Environment</th><th>Provider</th><th>Health</th><th>Secret</th><th>Updated</th></tr></thead><tbody>
            {state.projects.slice(0, 8).map((project) => <tr key={project.id}><td><Link className="table-project" href={`/projects/${project.id}`}><strong>{project.name}</strong><small>{project.defaultModel}</small></Link></td><td><EnvironmentBadge environment={project.environment} /></td><td>{providerLabel(project.provider)}</td><td><StatusBadge status={project.enabled ? latestProjectStatus(state, project) : "unknown"} /></td><td><span className={`secret-state ${hasProviderSecret(project.apiKeyEnv) ? "configured" : "missing"}`}>{hasProviderSecret(project.apiKeyEnv) ? "Ready" : "Missing"}</span></td><td>{formatDate(project.updatedAt)}</td></tr>)}
          </tbody></table></div>
        </section>
      ) : <EmptyState title="No AI projects registered" description="Create the first provider connection, configure its Vercel secret reference, and start monitoring." actionHref="/projects/new" actionLabel="Create first project" />}

      <section className="panel table-panel">
        <div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent telemetry</h2></div><Link className="text-link" href="/events">Open telemetry →</Link></div>
        {state.events.length ? <div className="table-scroll"><table><thead><tr><th>Time</th><th>Project</th><th>Source</th><th>Status</th><th>Model</th><th>Latency</th><th>Tokens</th></tr></thead><tbody>{state.events.slice(0, 10).map((event) => { const project = state.projects.find((entry) => entry.id === event.projectId); return <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{project?.name ?? event.projectId}</td><td>{event.source}</td><td><span className={`event-status ${event.status}`}>{event.status}</span></td><td>{event.model}</td><td>{formatDuration(event.latencyMs)}</td><td>{formatNumber(event.inputTokens + event.outputTokens)}</td></tr>; })}</tbody></table></div> : <p className="panel-empty">No telemetry has been recorded.</p>}
      </section>
    </div>
  );
}
