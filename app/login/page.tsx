import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return <main className="login-page"><div className="login-grid-bg" /><section className="login-card">
    <div className="brand login-brand"><span className="brand-mark">HP</span><span><strong>Gateway Console</strong><small>Google Cloud VM</small></span></div>
    <div className="login-copy"><p className="eyebrow">Private operator console</p><h1>One console for the complete HomePilot AI gateway.</h1><p>Test the fixed zrok endpoint, monitor end-to-end health, inspect sanitized request metadata, and verify Vercel configuration without exposing either gateway credential.</p></div>
    {error ? <div className="alert error">GitHub authentication was denied or the account is not allowlisted.</div> : null}
    <a className="button primary large full" href="/api/auth/login"><span aria-hidden="true">◉</span> Continue with GitHub</a>
    <div className="login-notes"><span>Google Cloud VM</span><span>zrok + Nginx</span><span>CLIProxyAPI</span></div>
  </section></main>;
}
