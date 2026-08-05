import { PageHeader } from "@/components/page-header";
import { PlaygroundClient } from "@/components/playground-client";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  const state = await getState();
  return <div className="page-wrap"><PageHeader eyebrow="Provider testing" title="AI playground" description="Run controlled, server-side tests through any registered provider adapter. Credentials never enter browser JavaScript." /><PlaygroundClient projects={state.projects} /></div>;
}
