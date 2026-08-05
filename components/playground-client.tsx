"use client";

import { useMemo, useState } from "react";
import type { ProjectConfig } from "@/lib/types";

export function PlaygroundClient({ projects }: { projects: ProjectConfig[] }) {
  const enabled = projects.filter((project) => project.enabled);
  const [projectId, setProjectId] = useState(enabled[0]?.id ?? "");
  const project = useMemo(() => enabled.find((entry) => entry.id === projectId), [enabled, projectId]);
  const [model, setModel] = useState(project?.defaultModel ?? "");
  const [prompt, setPrompt] = useState("Explain the main risk in deploying an AI feature without monitoring.");
  const [system, setSystem] = useState("Be concise and operationally specific.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; model: string; latencyMs: number; inputTokens: number; outputTokens: number; requestId: string | null; raw: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!enabled.length) return <div className="empty-state"><h2>No enabled projects</h2><p>Register and enable a project before using the playground.</p></div>;

  return (
    <div className="playground-grid">
      <form className="panel form-grid compact" onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true); setError(null); setResult(null);
        const response = await fetch("/api/playground", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, model, prompt, system, maxOutputTokens: 800 })
        });
        const payload = await response.json().catch(() => null);
        setBusy(false);
        if (!response.ok) { setError(payload?.error?.message ?? "Request failed."); return; }
        setResult(payload.data);
      }}>
        <div className="field span-2"><label htmlFor="project">Project</label><select id="project" value={projectId} onChange={(event) => { const next = enabled.find((entry) => entry.id === event.target.value); setProjectId(event.target.value); setModel(next?.defaultModel ?? ""); }}>
          {enabled.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.environment}</option>)}
        </select></div>
        <div className="field span-2"><label htmlFor="model">Model</label><select id="model" value={model} onChange={(event) => setModel(event.target.value)}>{project?.allowedModels.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></div>
        <div className="field span-2"><label htmlFor="system">System instructions</label><textarea id="system" rows={4} value={system} onChange={(event) => setSystem(event.target.value)} /></div>
        <div className="field span-2"><label htmlFor="prompt">Prompt</label><textarea id="prompt" rows={9} required value={prompt} onChange={(event) => setPrompt(event.target.value)} /></div>
        {error ? <p className="form-error span-2">{error}</p> : null}
        <div className="form-actions span-2"><button className="button primary" type="submit" disabled={busy}>{busy ? "Running…" : "Run request"}</button></div>
      </form>
      <section className="panel response-panel">
        <div className="panel-heading"><div><p className="eyebrow">Provider response</p><h2>Output</h2></div>{result ? <span className="status-badge status-healthy"><span className="status-dot" />Completed</span> : null}</div>
        {result ? <>
          <div className="response-text">{result.text}</div>
          <dl className="response-meta"><div><dt>Model</dt><dd>{result.model}</dd></div><div><dt>Latency</dt><dd>{result.latencyMs} ms</dd></div><div><dt>Input tokens</dt><dd>{result.inputTokens}</dd></div><div><dt>Output tokens</dt><dd>{result.outputTokens}</dd></div><div><dt>Request ID</dt><dd>{result.requestId ?? "Not reported"}</dd></div></dl>
          <details><summary>Raw provider JSON</summary><pre>{JSON.stringify(result.raw, null, 2)}</pre></details>
        </> : <div className="response-placeholder"><span>⌁</span><p>Run a request to inspect output, latency, tokens, request IDs, and raw JSON.</p></div>}
      </section>
    </div>
  );
}
