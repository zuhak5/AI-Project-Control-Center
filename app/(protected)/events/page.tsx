import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate, formatDuration, formatNumber } from "@/lib/format";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ project?: string; status?: string }> }) {
  const state = await getState();
  const filters = await searchParams;
  const events = state.events.filter((event) => (!filters.project || event.projectId === filters.project) && (!filters.status || event.status === filters.status));
  return <div className="page-wrap"><PageHeader eyebrow="Operational evidence" title="Telemetry" description="Sanitized request metadata from playground runs, scheduled health checks, and project ingestion tokens." actions={<a className="button secondary" href="/api/export">Export JSON</a>} />
    <form className="filter-bar" method="get"><select name="project" defaultValue={filters.project ?? ""}><option value="">All projects</option>{state.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="success">Success</option><option value="error">Error</option></select><button className="button secondary small" type="submit">Apply filters</button></form>
    <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">Retained events</p><h2>{events.length} records</h2></div><span className="muted">No prompts or full responses stored</span></div>{events.length ? <div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Project</th><th>Source</th><th>Status</th><th>Model</th><th>Latency</th><th>Tokens</th><th>Spend</th><th>Category</th></tr></thead><tbody>{events.slice(0, 500).map((event) => { const project = state.projects.find((entry) => entry.id === event.projectId); return <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{project?.name ?? event.projectId}</td><td>{event.source}</td><td><span className={`event-status ${event.status}`}>{event.status}</span></td><td>{event.model}</td><td>{formatDuration(event.latencyMs)}</td><td>{formatNumber(event.inputTokens + event.outputTokens)}</td><td>{formatCurrency(event.estimatedCostUsd)}</td><td>{event.errorCategory ?? "—"}</td></tr>; })}</tbody></table></div> : <p className="panel-empty">No events match the selected filters.</p>}</section>
  </div>;
}
