import Link from "next/link";
import { GatewayChain } from "@/components/gateway-chain";
import { HealthButton } from "@/components/health-button";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { SparkBars } from "@/components/spark-bars";
import { StatusBadge } from "@/components/status-badge";
import { getAuthReadiness } from "@/lib/auth/config";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { getGatewayReadiness, INFRASTRUCTURE } from "@/lib/gateway-config";
import { calculateOverview, latestHealthStatus } from "@/lib/metrics";
import { getStateSnapshot, getStorageMode, isPersistentStorageConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const snapshot = await getStateSnapshot();
  const state = snapshot.state;
  const metrics = calculateOverview(state);
  const readiness = getGatewayReadiness();
  const auth = getAuthReadiness();
  const health = latestHealthStatus(state);
  const cronSecret = process.env.CRON_SECRET;
  const cronReady = Boolean(cronSecret && cronSecret.length >= 16 && !/[\r\n]/.test(cronSecret));
  const storageReady = isPersistentStorageConfigured() && snapshot.storageReadable;

  return <div className="page-wrap">
    <PageHeader eyebrow="Google Cloud VM gateway" title="HomePilot AI gateway operations" description="One fixed request path from Vercel through zrok, Nginx, CLIProxyAPI, and the configured upstream AI account." actions={<><a className="button secondary" href="/api/export">Export data</a><HealthButton /></>} />
    {!snapshot.storageReadable ? <p className="alert warning" role="status">Historical state is temporarily unavailable ({snapshot.storageErrorCode}). Gateway requests and health probes can still run with safe default settings, but new telemetry may not be retained.</p> : null}

    <section className="metric-grid">
      <MetricCard label="Gateway health" value={health === "unknown" ? "Unknown" : health[0].toUpperCase() + health.slice(1)} detail={metrics.latestHealth ? `Last check ${formatDate(metrics.latestHealth.timestamp)}` : "No readable completed health check"} tone={health === "healthy" ? "good" : health === "degraded" ? "warn" : health === "down" ? "danger" : "default"} />
      <MetricCard label="Requests · 24h" value={formatNumber(metrics.requests24h)} detail="Playground and health checks" />
      <MetricCard label="Success rate · 24h" value={`${metrics.successRate24h.toFixed(1)}%`} detail="Complete gateway path" tone={metrics.requests24h === 0 ? "default" : metrics.successRate24h >= 99 ? "good" : metrics.successRate24h >= 95 ? "warn" : "danger"} />
      <MetricCard label="Tokens · 24h" value={formatNumber(metrics.tokens24h)} detail="Reported by CLIProxyAPI/upstream" />
      <MetricCard label="Average latency" value={formatDuration(metrics.avgLatency24h)} detail="End-to-end Vercel latency" />
    </section>

    <section className="panel chain-panel"><div className="panel-heading"><div><p className="eyebrow">Fixed topology</p><h2>End-to-end request path</h2></div><StatusBadge status={health} /></div><GatewayChain status={health} /></section>

    <section className="dashboard-grid">
      <article className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">Seven-day activity</p><h2>Gateway requests</h2></div><span className="muted">Errors are marked in red</span></div><SparkBars data={metrics.daily} /></article>
      <article className="panel readiness-panel"><div className="panel-heading"><div><p className="eyebrow">Deployment readiness</p><h2>Vercel configuration</h2></div></div><ul className="readiness-list">
        <li><span className={storageReady ? "check good" : "check bad"}>{storageReady ? "✓" : "!"}</span><span><strong>Private storage</strong><small>{storageReady ? getStorageMode() : snapshot.storageErrorCode ?? getStorageMode()}</small></span></li>
        <li><span className={auth.appUrlValid ? "check good" : "check bad"}>{auth.appUrlValid ? "✓" : "!"}</span><span><strong>Canonical application URL</strong><small>{auth.appUrlValid ? "Valid" : "APP_BASE_URL invalid"}</small></span></li>
        <li><span className={auth.githubOAuthConfigured && auth.allowlistConfigured ? "check good" : "check bad"}>{auth.githubOAuthConfigured && auth.allowlistConfigured ? "✓" : "!"}</span><span><strong>GitHub OAuth</strong><small>{auth.githubOAuthConfigured && auth.allowlistConfigured ? "Configured and allowlisted" : "OAuth variables or allowlist missing"}</small></span></li>
        <li><span className={readiness.cliProxyKeyConfigured ? "check good" : "check bad"}>{readiness.cliProxyKeyConfigured ? "✓" : "!"}</span><span><strong>CLIProxyAPI key</strong><small>{readiness.cliProxyKeyConfigured ? "Sensitive variable available" : "CLIPROXY_API_KEY missing"}</small></span></li>
        <li><span className={readiness.gatewaySecretConfigured ? "check good" : "check bad"}>{readiness.gatewaySecretConfigured ? "✓" : "!"}</span><span><strong>Nginx gateway secret</strong><small>{readiness.gatewaySecretConfigured ? "Sensitive variable available" : "HOME_GATEWAY_SECRET missing"}</small></span></li>
        <li><span className={cronReady ? "check good" : "check bad"}>{cronReady ? "✓" : "!"}</span><span><strong>Scheduled checks</strong><small>{cronReady ? "Daily cron protected" : "CRON_SECRET missing or invalid"}</small></span></li>
      </ul></article>
    </section>

    <section className="panel config-panel"><div className="panel-heading"><div><p className="eyebrow">Verified infrastructure</p><h2>Google Cloud VM deployment</h2></div><Link className="text-link" href="/settings">Configuration →</Link></div><dl className="config-grid"><div><dt>GCP project</dt><dd>{INFRASTRUCTURE.gcpProject}</dd></div><div><dt>VM</dt><dd>{INFRASTRUCTURE.vmName}</dd></div><div><dt>Zone</dt><dd>{INFRASTRUCTURE.zone}</dd></div><div><dt>Public IP</dt><dd>{INFRASTRUCTURE.publicIp}</dd></div><div><dt>Gateway endpoint</dt><dd>{readiness.gatewayBaseUrl}/responses</dd></div><div><dt>Model</dt><dd>{readiness.model}</dd></div></dl></section>

    <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent gateway events</h2></div><Link className="text-link" href="/events">Open all events →</Link></div>{state.events.length ? <div className="table-scroll"><table><thead><tr><th>Time</th><th>Source</th><th>Status</th><th>HTTP</th><th>Model</th><th>Latency</th><th>Tokens</th><th>Category</th></tr></thead><tbody>{state.events.slice(0, 10).map((event) => <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{event.source}</td><td><span className={`event-status ${event.status}`}>{event.status}</span></td><td>{event.statusCode ?? "—"}</td><td>{event.model}</td><td>{formatDuration(event.latencyMs)}</td><td>{formatNumber(event.inputTokens + event.outputTokens)}</td><td>{event.errorCategory ?? "—"}</td></tr>)}</tbody></table></div> : <p className="panel-empty">{snapshot.storageReadable ? "No gateway events have been recorded." : "Event history is unavailable while storage is degraded."}</p>}</section>
  </div>;
}
