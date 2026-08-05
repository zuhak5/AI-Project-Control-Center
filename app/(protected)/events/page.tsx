import { PageHeader } from "@/components/page-header";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ source?: string; status?: string }> }) {
  const state = await getState(); const filters = await searchParams;
  const events = state.events.filter((event) => (!filters.source || event.source === filters.source) && (!filters.status || event.status === filters.status));
  return <div className="page-wrap"><PageHeader eyebrow="Operational evidence" title="Gateway events" description="Sanitized metadata from playground requests and end-to-end health checks. Prompts and full responses are never stored." actions={<a className="button secondary" href="/api/export">Export JSON</a>} />
    <form className="filter-bar" method="get"><select name="source" defaultValue={filters.source ?? ""}><option value="">All sources</option><option value="playground">Playground</option><option value="health-check">Health checks</option></select><select name="status" defaultValue={filters.status ?? ""}><option value="">All statuses</option><option value="success">Success</option><option value="error">Error</option></select><button className="button secondary small" type="submit">Apply filters</button></form>
    <section className="panel table-panel"><div className="panel-heading"><div><p className="eyebrow">Retained events</p><h2>{events.length} records</h2></div><span className="muted">No prompt or response bodies</span></div>{events.length ? <div className="table-scroll"><table><thead><tr><th>Timestamp</th><th>Source</th><th>Status</th><th>HTTP</th><th>Model</th><th>Latency</th><th>Input</th><th>Output</th><th>Request ID</th><th>Category</th></tr></thead><tbody>{events.slice(0, 500).map((event) => <tr key={event.id}><td>{formatDate(event.timestamp)}</td><td>{event.source}</td><td><span className={`event-status ${event.status}`}>{event.status}</span></td><td>{event.statusCode ?? "—"}</td><td>{event.model}</td><td>{formatDuration(event.latencyMs)}</td><td>{formatNumber(event.inputTokens)}</td><td>{formatNumber(event.outputTokens)}</td><td>{event.requestId ?? "—"}</td><td>{event.errorCategory ?? "—"}</td></tr>)}</tbody></table></div> : <p className="panel-empty">No events match the selected filters.</p>}</section>
  </div>;
}
