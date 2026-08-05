import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { getGatewayReadiness, INFRASTRUCTURE } from "@/lib/gateway-config";
import { getStateSnapshot, getStorageMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const snapshot = await getStateSnapshot();
  const gateway = getGatewayReadiness();
  return <div className="page-wrap">
    <PageHeader eyebrow="Single-gateway configuration" title="Operational settings" description="Application behavior can be tuned here. Infrastructure identity and credentials remain fixed in server-side Vercel variables." />
    {!snapshot.storageReadable ? <p className="alert warning" role="status">Stored settings could not be read ({snapshot.storageErrorCode}); safe defaults are shown. Saving remains fail-closed until durable storage is restored.</p> : null}
    <SettingsForm settings={snapshot.state.settings} />
    <section className="panel config-panel"><div className="panel-heading"><div><p className="eyebrow">Read-only deployment configuration</p><h2>Infrastructure and secrets</h2></div></div><dl className="config-grid">
      <div><dt>Gateway base URL</dt><dd>{gateway.gatewayBaseUrl}</dd></div><div><dt>Gateway model</dt><dd>{gateway.model}</dd></div>
      <div><dt>CLIProxyAPI key</dt><dd>{gateway.cliProxyKeyConfigured ? "Configured" : "Missing"}</dd></div><div><dt>Nginx gateway secret</dt><dd>{gateway.gatewaySecretConfigured ? "Configured" : "Missing"}</dd></div>
      <div><dt>Storage mode</dt><dd>{getStorageMode()} · {snapshot.storageReadable ? "readable" : "degraded"}</dd></div><div><dt>VM</dt><dd>{INFRASTRUCTURE.vmName} · {INFRASTRUCTURE.zone}</dd></div>
      <div><dt>VM public IP</dt><dd>{INFRASTRUCTURE.publicIp}</dd></div><div><dt>Loopback services</dt><dd>Nginx {INFRASTRUCTURE.nginxLoopback} · CLIProxyAPI {INFRASTRUCTURE.cliProxyLoopback}</dd></div>
    </dl></section>
  </div>;
}
