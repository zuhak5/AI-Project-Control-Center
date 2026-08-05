import Link from "next/link";
export default function NotFound() { return <main className="standalone-state"><div className="brand-mark">404</div><h1>Page not found</h1><p>This console exposes only the fixed HomePilot gateway operations pages.</p><Link className="button primary" href="/dashboard">Return to dashboard</Link></main>; }
