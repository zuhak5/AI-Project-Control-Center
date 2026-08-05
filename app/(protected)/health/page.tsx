import { GatewayChain } from "@/components/gateway-chain";
import { HealthButton } from "@/components/health-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatDuration } from "@/lib/format";
import { latestHealthStatus } from "@/lib/metrics";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export default async function HealthPage() {
  const state = await getState(); const status = latestHealthStatus(state);
  return <div className="page-wrap"><PageHeader eyebrow="End-to-end monitoring" title="Gateway health" description="A successful check proves the public zrok route, Nginx authentication, CLIProxyAPI authentication, and upstream response all completed." actions={<HealthButton />} />
    <section className="panel chain-panel"><div className="panel-heading"><div><p className="eyebrow">Current status</p><h2>Complete request path</h2></div><StatusBadge status={status} /></div><GatewayChain status={status} /></section>
    <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">Retained checks</p><h2>{state.healthChecks.length} health results</h2></div><span className="muted">Daily at 05:00 UTC plus manual checks</span></div>{state.healthChecks.length ? <div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Status</th><th>HTTP</th><th>Model</th><th>Latency</th><th>Message</th></tr></thead><tbody>{state.healthChecks.slice(0, 200).map((check) => <tr key={check.id}><td>{formatDate(check.timestamp)}</td><td><StatusBadge status={check.status} /></td><td>{check.statusCode ?? "—"}</td><td>{check.model}</td><td>{formatDuration(check.latencyMs)}</td><td>{check.message}</td></tr>)}</tbody></table></div> : <p className="panel-empty">No health checks have run yet.</p>}</section>
  </div>;
}
