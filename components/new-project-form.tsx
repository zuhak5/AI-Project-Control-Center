"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

const defaults: Record<string, { baseUrl: string; model: string; key: string }> = {
  "openai-responses": { baseUrl: "https://api.openai.com/v1", model: "gpt-5-mini", key: "OPENAI_API_KEY" },
  "anthropic-messages": { baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5", key: "ANTHROPIC_API_KEY" },
  "gemini-generate": { baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-3.5-flash", key: "GEMINI_API_KEY" },
  "custom-json": { baseUrl: "https://example.com/v1/generate", model: "default", key: "CUSTOM_AI_API_KEY" }
};

export function NewProjectForm() {
  const [provider, setProvider] = useState("openai-responses");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; name: string; ingestToken: string | null } | null>(null);
  const preset = useMemo(() => defaults[provider], [provider]);

  if (created) {
    return (
      <section className="panel success-panel">
        <p className="eyebrow">Project created</p>
        <h2>{created.name} is registered</h2>
        <p>Add the referenced provider environment variable in Vercel before running a health check or playground request.</p>
        {created.ingestToken ? (
          <div className="secret-reveal wide">
            <strong>Telemetry ingest token</strong>
            <p>This value is displayed once. Store it in the sending project&apos;s secret manager.</p>
            <code>{created.ingestToken}</code>
            <CopyButton value={created.ingestToken} />
          </div>
        ) : null}
        <div className="button-row"><Link className="button primary" href={`/projects/${created.id}`}>Open project</Link><Link className="button secondary" href="/projects">All projects</Link></div>
      </section>
    );
  }

  return (
    <form
      className="panel form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const body = {
          name: form.get("name"),
          description: form.get("description"),
          environment: form.get("environment"),
          provider: form.get("provider"),
          enabled: true,
          baseUrl: form.get("baseUrl"),
          apiKeyEnv: form.get("apiKeyEnv"),
          defaultModel: form.get("defaultModel"),
          allowedModels: String(form.get("allowedModels") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
          tags: String(form.get("tags") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
          monthlyBudgetUsd: form.get("monthlyBudgetUsd") ? Number(form.get("monthlyBudgetUsd")) : null,
          healthCheck: {
            enabled: form.get("healthEnabled") === "on",
            prompt: form.get("healthPrompt"),
            expectedText: form.get("expectedText"),
            timeoutMs: Number(form.get("timeoutMs"))
          },
          telemetryEnabled: form.get("telemetryEnabled") === "on"
        };
        const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const payload = await response.json().catch(() => null);
        setBusy(false);
        if (!response.ok) {
          setError(payload?.error?.message ?? "Project creation failed.");
          return;
        }
        setCreated({ id: payload.data.project.id, name: payload.data.project.name, ingestToken: payload.data.ingestToken });
      }}
    >
      <div className="field span-2"><label htmlFor="name">Project name</label><input id="name" name="name" required minLength={2} maxLength={80} placeholder="Customer support assistant" /></div>
      <div className="field span-2"><label htmlFor="description">Description</label><textarea id="description" name="description" rows={3} maxLength={500} placeholder="What this project does and who owns it." /></div>
      <div className="field"><label htmlFor="environment">Environment</label><select id="environment" name="environment" defaultValue="production"><option value="development">Development</option><option value="staging">Staging</option><option value="production">Production</option><option value="other">Other</option></select></div>
      <div className="field"><label htmlFor="provider">Provider adapter</label><select id="provider" name="provider" value={provider} onChange={(event) => setProvider(event.target.value)}><option value="openai-responses">OpenAI Responses</option><option value="anthropic-messages">Anthropic Messages</option><option value="gemini-generate">Gemini Generate</option><option value="custom-json">Custom JSON</option></select></div>
      <div className="field span-2"><label htmlFor="baseUrl">Provider base URL</label><input key={`${provider}-url`} id="baseUrl" name="baseUrl" type="url" required defaultValue={preset.baseUrl} /><small>HTTPS only. Optional host allowlisting is controlled by AICC_ALLOWED_PROVIDER_HOSTS.</small></div>
      <div className="field"><label htmlFor="apiKeyEnv">Vercel secret variable name</label><input key={`${provider}-key`} id="apiKeyEnv" name="apiKeyEnv" required pattern="[A-Z][A-Z0-9_]*" defaultValue={preset.key} /><small>The secret value is never stored here.</small></div>
      <div className="field"><label htmlFor="defaultModel">Default model</label><input key={`${provider}-model`} id="defaultModel" name="defaultModel" required defaultValue={preset.model} /></div>
      <div className="field span-2"><label htmlFor="allowedModels">Allowed models</label><input key={`${provider}-models`} id="allowedModels" name="allowedModels" required defaultValue={preset.model} /><small>Comma-separated. The default model is added automatically.</small></div>
      <div className="field"><label htmlFor="monthlyBudgetUsd">Monthly budget (USD)</label><input id="monthlyBudgetUsd" name="monthlyBudgetUsd" type="number" min="0" step="0.01" placeholder="50" /></div>
      <div className="field"><label htmlFor="tags">Tags</label><input id="tags" name="tags" placeholder="customer-facing, critical" /></div>
      <div className="form-section span-2"><h3>Health monitoring</h3><p>Vercel Cron runs this check daily on Hobby and can run more frequently on paid plans.</p></div>
      <label className="check-row span-2"><input type="checkbox" name="healthEnabled" defaultChecked /><span><strong>Enable scheduled health checks</strong><small>Checks use the default model and provider secret.</small></span></label>
      <div className="field span-2"><label htmlFor="healthPrompt">Health prompt</label><input id="healthPrompt" name="healthPrompt" defaultValue="Reply with exactly: OK" required /></div>
      <div className="field"><label htmlFor="expectedText">Expected text</label><input id="expectedText" name="expectedText" defaultValue="OK" /></div>
      <div className="field"><label htmlFor="timeoutMs">Timeout (milliseconds)</label><input id="timeoutMs" name="timeoutMs" type="number" min="1000" max="120000" defaultValue="30000" required /></div>
      <label className="check-row span-2"><input type="checkbox" name="telemetryEnabled" defaultChecked /><span><strong>Enable telemetry ingestion</strong><small>A project-scoped token will be generated once.</small></span></label>
      {error ? <p className="form-error span-2">{error}</p> : null}
      <div className="form-actions span-2"><Link href="/projects" className="button ghost">Cancel</Link><button className="button primary" type="submit" disabled={busy}>{busy ? "Creating…" : "Create project"}</button></div>
    </form>
  );
}
