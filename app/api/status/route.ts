import packageJson from "@/package.json";
import { getAuthReadiness } from "@/lib/auth/config";
import { getGatewayReadiness } from "@/lib/gateway-config";
import { isPersistentStorageConfigured } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const gateway = getGatewayReadiness();
  const auth = getAuthReadiness();
  return Response.json({
    ok: true,
    service: "HomePilot AI Gateway Console",
    version: packageJson.version,
    storageConfigured: isPersistentStorageConfigured(),
    appUrlValid: auth.appUrlValid,
    githubOAuthConfigured: auth.githubOAuthConfigured,
    allowlistConfigured: auth.allowlistConfigured,
    cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    gatewayConfigured: gateway.gatewayConfigured,
    gatewayUrlValid: gateway.gatewayUrlValid,
    gatewayModelValid: gateway.modelValid,
    timestamp: new Date().toISOString()
  }, { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
}
