"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GatewaySettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: GatewaySettings }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <form className="panel form-grid" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setStatus("Saving…");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthPrompt: form.get("healthPrompt"), expectedText: form.get("expectedText"),
          timeoutMs: Number(form.get("timeoutMs")), maxOutputTokens: Number(form.get("maxOutputTokens")),
          retentionDays: Number(form.get("retentionDays"))
        })
      });
      const payload = await response.json().catch(() => null);
      setStatus(response.ok ? "Saved" : payload?.error?.message ?? "Save failed");
      if (response.ok) router.refresh();
    } catch { setStatus("The browser could not reach the settings API."); }
    finally { setBusy(false); }
  }}>
    <div className="field span-2"><label htmlFor="healthPrompt">Health-check prompt</label><input id="healthPrompt" name="healthPrompt" defaultValue={settings.healthPrompt} required disabled={busy} /></div>
    <div className="field"><label htmlFor="expectedText">Expected response text</label><input id="expectedText" name="expectedText" defaultValue={settings.expectedText} disabled={busy} /></div>
    <div className="field"><label htmlFor="timeoutMs">Gateway timeout (ms)</label><input id="timeoutMs" name="timeoutMs" type="number" min="1000" max="120000" defaultValue={settings.timeoutMs} required disabled={busy} /></div>
    <div className="field"><label htmlFor="maxOutputTokens">Default output-token limit</label><input id="maxOutputTokens" name="maxOutputTokens" type="number" min="16" max="8000" defaultValue={settings.maxOutputTokens} required disabled={busy} /></div>
    <div className="field"><label htmlFor="retentionDays">Event retention (days)</label><input id="retentionDays" name="retentionDays" type="number" min="7" max="3650" defaultValue={settings.retentionDays} required disabled={busy} /></div>
    <div className="form-actions span-2"><span className="save-status" role="status">{status}</span><button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save operational settings"}</button></div>
  </form>;
}
