import { PageHeader } from "@/components/page-header";
import { PlaygroundClient } from "@/components/playground-client";
import { getGatewayReadiness } from "@/lib/gateway-config";
import { getOperationalSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage() {
  const settings = await getOperationalSettings();
  const gateway = getGatewayReadiness();
  return <div className="page-wrap">
    <PageHeader eyebrow="Authenticated request" title="Gateway playground" description="Send a prompt through the exact Vercel → zrok → Nginx → CLIProxyAPI → upstream path. The prompt and response are not persisted." />
    <PlaygroundClient model={gateway.model} maxOutputTokens={settings.maxOutputTokens} />
  </div>;
}
