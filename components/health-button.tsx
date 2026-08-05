"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function HealthButton() {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  return <div className="health-action">
    <button className="button secondary" type="button" disabled={state === "loading"} onClick={async () => {
      setState("loading"); setMessage(null);
      try {
        const response = await fetch("/api/gateway/health", { method: "POST" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) { setState("error"); setMessage(payload?.error?.message ?? "Health check failed."); return; }
        setState("idle");
        const completedStatus = typeof payload?.data?.status === "string" ? payload.data.status : "completed";
        setMessage(payload?.data?.telemetryStored === false
          ? `Health check ${completedStatus}, but the result could not be saved.`
          : `Health check ${completedStatus} and saved.`);
        router.refresh();
      } catch {
        setState("error"); setMessage("The browser could not reach the health-check API.");
      }
    }}>{state === "loading" ? "Checking…" : state === "error" ? "Retry health check" : "Run health check"}</button>
    {message ? <span className="save-status" role="status">{message}</span> : null}
  </div>;
}
