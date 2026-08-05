"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HealthButton({ projectId }: { projectId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const router = useRouter();
  return (
    <button
      className="button secondary"
      type="button"
      disabled={state === "loading"}
      onClick={async () => {
        setState("loading");
        const response = await fetch(`/api/projects/${projectId}/health`, { method: "POST" });
        if (!response.ok) {
          setState("error");
          return;
        }
        setState("idle");
        router.refresh();
      }}
    >
      {state === "loading" ? "Checking…" : state === "error" ? "Check failed" : "Run health check"}
    </button>
  );
}
