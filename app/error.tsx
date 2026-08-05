"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="standalone-state"><div className="brand-mark">!</div><h1>Dashboard error</h1><p>The request could not be completed. Review Vercel function logs if the problem persists.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
