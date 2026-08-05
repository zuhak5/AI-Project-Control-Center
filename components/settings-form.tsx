"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ControlCenterSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: ControlCenterSettings }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  return (
    <form className="panel form-grid" onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      setStatus("Saving…");
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retentionDays: Number(form.get("retentionDays")),
          defaultTimeoutMs: Number(form.get("defaultTimeoutMs")),
          telemetryEnabled: form.get("telemetryEnabled") === "on"
        })
      });
      const payload = await response.json().catch(() => null);
      setStatus(response.ok ? "Saved" : payload?.error?.message ?? "Save failed");
      if (response.ok) router.refresh();
    }}>
      <div className="field"><label htmlFor="retentionDays">Telemetry retention (days)</label><input id="retentionDays" name="retentionDays" type="number" min="7" max="3650" defaultValue={settings.retentionDays} /></div>
      <div className="field"><label htmlFor="defaultTimeoutMs">Default timeout (ms)</label><input id="defaultTimeoutMs" name="defaultTimeoutMs" type="number" min="1000" max="120000" defaultValue={settings.defaultTimeoutMs} /></div>
      <label className="check-row span-2"><input type="checkbox" name="telemetryEnabled" defaultChecked={settings.telemetryEnabled} /><span><strong>Accept project telemetry</strong><small>This global switch overrides per-project ingestion settings.</small></span></label>
      <div className="form-actions span-2"><span className="save-status">{status}</span><button className="button primary" type="submit">Save settings</button></div>
    </form>
  );
}
