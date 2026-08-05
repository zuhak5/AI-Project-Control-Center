import { AppError } from "@/lib/errors";

export const VERIFIED_GATEWAY_HOST = "homepilot-ai.shares.zrok.io";
export const DEFAULT_GATEWAY_BASE_URL = `https://${VERIFIED_GATEWAY_HOST}/v1`;
export const DEFAULT_GATEWAY_MODEL = "gpt-5.4-mini";

export const INFRASTRUCTURE = {
  gcpProject: "myvpn-498108",
  vmName: "my-vpn-us-east1-20260601",
  zone: "us-east1-b",
  publicIp: "35.207.5.160",
  zrokUrl: `https://${VERIFIED_GATEWAY_HOST}`,
  nginxLoopback: "127.0.0.1:8320",
  cliProxyLoopback: "127.0.0.1:8317"
} as const;

export function getGatewayBaseUrl(): URL {
  let url: URL;
  try {
    url = new URL(process.env.GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL);
  } catch {
    throw new AppError("GATEWAY_BASE_URL is not a valid URL.", 500, "gateway_url_invalid");
  }
  if (url.protocol !== "https:") throw new AppError("GATEWAY_BASE_URL must use HTTPS.", 500, "gateway_url_invalid");
  if (url.hostname.toLowerCase() !== VERIFIED_GATEWAY_HOST) throw new AppError("GATEWAY_BASE_URL must use the verified HomePilot zrok hostname.", 500, "gateway_url_invalid");
  if (url.username || url.password || url.search || url.hash) throw new AppError("GATEWAY_BASE_URL cannot contain credentials, query parameters, or fragments.", 500, "gateway_url_invalid");
  const path = url.pathname.replace(/\/$/, "") || "/";
  if (path !== "/v1") throw new AppError("GATEWAY_BASE_URL must end with /v1.", 500, "gateway_url_invalid");
  url.pathname = "/v1";
  return url;
}

export function getGatewayModel(): string {
  return (process.env.GATEWAY_MODEL || DEFAULT_GATEWAY_MODEL).trim() || DEFAULT_GATEWAY_MODEL;
}

export function getGatewayEndpoint(): URL {
  const base = getGatewayBaseUrl();
  return new URL(`${base.toString().replace(/\/$/, "")}/responses`);
}

export function getGatewayReadiness() {
  let gatewayUrlValid = true;
  let gatewayBaseUrl = process.env.GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL;
  try { gatewayBaseUrl = getGatewayBaseUrl().toString().replace(/\/$/, ""); } catch { gatewayUrlValid = false; }
  return {
    gatewayBaseUrl,
    gatewayUrlValid,
    model: getGatewayModel(),
    cliProxyKeyConfigured: Boolean(process.env.CLIPROXY_API_KEY),
    gatewaySecretConfigured: Boolean(process.env.HOME_GATEWAY_SECRET),
    gatewayConfigured: gatewayUrlValid && Boolean(process.env.CLIPROXY_API_KEY && process.env.HOME_GATEWAY_SECRET)
  };
}
