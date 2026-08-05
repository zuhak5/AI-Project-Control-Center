import Link from "next/link";

export default function NotFound() {
  return <main className="standalone-state"><div className="brand-mark">404</div><h1>Resource not found</h1><p>The requested project or page does not exist.</p><Link className="button primary" href="/dashboard">Return to dashboard</Link></main>;
}
