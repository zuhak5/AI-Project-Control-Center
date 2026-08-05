"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";

export function ProjectActions({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function request(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) throw new Error(payload?.error?.message ?? "Request failed.");
    return payload?.data;
  }

  return (
    <div className="action-stack">
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={async () => {
          try {
            await request(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !enabled }) });
            router.refresh();
          } catch (value) { setError(value instanceof Error ? value.message : "Request failed."); }
        }}
      >{enabled ? "Disable project" : "Enable project"}</button>
      <button
        className="button secondary"
        type="button"
        disabled={busy}
        onClick={async () => {
          try {
            const data = await request(`/api/projects/${projectId}/rotate-token`, { method: "POST" });
            setToken(data.ingestToken);
          } catch (value) { setError(value instanceof Error ? value.message : "Request failed."); }
        }}
      >Rotate ingest token</button>
      <button
        className="button danger"
        type="button"
        disabled={busy}
        onClick={async () => {
          if (!window.confirm("Delete this project and all retained telemetry? This cannot be undone.")) return;
          try {
            await request(`/api/projects/${projectId}`, { method: "DELETE" });
            router.push("/projects");
            router.refresh();
          } catch (value) { setError(value instanceof Error ? value.message : "Request failed."); }
        }}
      >Delete project</button>
      {token ? (
        <div className="secret-reveal">
          <strong>New ingest token</strong>
          <p>Copy it now. Only its SHA-256 hash is stored.</p>
          <code>{token}</code>
          <CopyButton value={token} />
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
