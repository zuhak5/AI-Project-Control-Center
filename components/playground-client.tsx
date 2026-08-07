"use client";
import { useState } from "react";

interface Result {
  text: string; model: string; latencyMs: number; inputTokens: number; outputTokens: number;
  requestId: string | null; responseId: string | null; responseStatus: string | null;
  statusCode: number; telemetryStored: boolean;
}

export function PlaygroundClient({ model, maxOutputTokens }: { model: string; maxOutputTokens: number }) {
  const [prompt, setPrompt] = useState("This request is being sent through the HomePilot gateway. Begin with exactly: Gateway request received successfully. Then summarize this fixed route in one concise paragraph: Vercel → Caddy → Nginx → CLIProxyAPI → upstream AI. Do not claim that you independently inspected the infrastructure.");
  const [system, setSystem] = useState("You are responding to an end-to-end gateway test. A successful response proves this request reached the configured upstream model through the application route. Be concise and operationally precise.");
  const [limit, setLimit] = useState(maxOutputTokens);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  return <div className="playground-grid">
    <form className="panel form-grid compact" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(null); setResult(null);
      try {
        const response = await fetch("/api/playground", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, system, maxOutputTokens: limit })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) { setError(payload?.error?.message ?? "Gateway request failed."); return; }
        setResult(payload.data);
      } catch {
        setError("The browser could not reach the console API. Check the network and retry.");
      } finally { setBusy(false); }
    }}>
      <div className="field span-2"><label>Fixed route</label><input value="Vercel → Caddy → Nginx → CLIProxyAPI → upstream AI" readOnly /></div>
      <div className="field"><label>Model</label><input value={model} readOnly /></div>
      <div className="field"><label htmlFor="limit">Maximum output tokens</label><input id="limit" type="number" min="16" max="8000" value={limit} disabled={busy} onChange={(event) => setLimit(Number(event.target.value))} /></div>
      <div className="field span-2"><label htmlFor="system">System instructions</label><textarea id="system" rows={4} value={system} disabled={busy} onChange={(event) => setSystem(event.target.value)} /></div>
      <div className="field span-2"><label htmlFor="prompt">Prompt</label><textarea id="prompt" rows={9} required value={prompt} disabled={busy} onChange={(event) => setPrompt(event.target.value)} /></div>
      {error ? <p className="form-error span-2" role="alert">{error}</p> : null}
      <div className="form-actions span-2"><button className="button primary" type="submit" disabled={busy}>{busy ? "Sending through VM…" : "Run gateway request"}</button></div>
    </form>
    <section className="panel response-panel" aria-live="polite">
      <div className="panel-heading"><div><p className="eyebrow">End-to-end response</p><h2>Gateway output</h2></div>{result ? <span className="status-badge status-healthy"><span className="status-dot" />Completed</span> : null}</div>
      {result ? <>
        {!result.telemetryStored ? <p className="alert warning">The AI request succeeded, but its sanitized telemetry could not be saved.</p> : null}
        <div className="response-text">{result.text}</div>
        <dl className="response-meta">
          <div><dt>Model</dt><dd>{result.model}</dd></div><div><dt>HTTP</dt><dd>{result.statusCode}</dd></div>
          <div><dt>Response status</dt><dd>{result.responseStatus ?? "Not reported"}</dd></div><div><dt>Latency</dt><dd>{result.latencyMs} ms</dd></div>
          <div><dt>Input tokens</dt><dd>{result.inputTokens}</dd></div><div><dt>Output tokens</dt><dd>{result.outputTokens}</dd></div>
          <div><dt>Request ID</dt><dd>{result.requestId ?? "Not reported"}</dd></div><div><dt>Response ID</dt><dd>{result.responseId ?? "Not reported"}</dd></div>
        </dl>
      </> : <div className="response-placeholder"><span>⌁</span><p>Run a request to verify the complete Google Cloud VM gateway path.</p></div>}
    </section>
  </div>;
}
