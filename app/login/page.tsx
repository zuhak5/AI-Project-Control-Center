import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { error } = await searchParams;
  return (
    <main className="login-page">
      <div className="login-grid-bg" />
      <section className="login-card">
        <div className="brand login-brand"><span className="brand-mark">AI</span><span><strong>Control Center</strong><small>Project operations</small></span></div>
        <div className="login-copy">
          <p className="eyebrow">Private operator console</p>
          <h1>One control plane for every AI project.</h1>
          <p>Monitor provider health, inspect telemetry, test models, and manage safe project-level controls without exposing provider credentials.</p>
        </div>
        {error ? <div className="alert error">GitHub authentication was denied or the account is not allowlisted.</div> : null}
        <a className="button primary large full" href="/api/auth/login"><span aria-hidden="true">◉</span> Continue with GitHub</a>
        <div className="login-notes"><span>HTTP-only sessions</span><span>Vercel server functions</span><span>Private Blob storage</span></div>
      </section>
    </main>
  );
}
