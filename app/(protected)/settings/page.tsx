import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { formatDate } from "@/lib/format";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const state = await getState();
  const checks = [
    { label: "Session secret", ready: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32), detail: "SESSION_SECRET" },
    { label: "GitHub OAuth", ready: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET), detail: "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET" },
    { label: "Owner allowlist", ready: Boolean(process.env.ALLOWED_GITHUB_LOGINS), detail: "ALLOWED_GITHUB_LOGINS" },
    { label: "Private Blob store", ready: Boolean(process.env.BLOB_READ_WRITE_TOKEN), detail: "BLOB_READ_WRITE_TOKEN" },
    { label: "Cron protection", ready: Boolean(process.env.CRON_SECRET), detail: "CRON_SECRET" }
  ];
  return <div className="page-wrap narrow"><PageHeader eyebrow="Control center" title="Settings and security" description="Retention, global ingestion policy, environment readiness, and immutable audit context." />
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Runtime configuration</p><h2>Data policy</h2></div></div><SettingsForm settings={state.settings} /></section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Production checklist</p><h2>Vercel environment</h2></div></div><ul className="readiness-list">{checks.map((check) => <li key={check.label}><span className={`check ${check.ready ? "good" : "bad"}`}>{check.ready ? "✓" : "!"}</span><span><strong>{check.label}</strong><small>{check.ready ? "Configured" : `${check.detail} is missing`}</small></span></li>)}</ul></section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Change history</p><h2>Audit log</h2></div></div>{state.auditLog.length ? <ul className="audit-list">{state.auditLog.slice(0, 100).map((event) => <li key={event.id}><span className="audit-mark" /><div><strong>{event.summary}</strong><p>{event.actor} · {event.action} · {formatDate(event.timestamp)}</p></div></li>)}</ul> : <p className="panel-empty">No administrative changes recorded.</p>}</section>
  </div>;
}
