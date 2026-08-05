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

function configuredSecret(name: "CLIPROXY_API_KEY" | "HOME_GATEWAY_SECRET"): string | null {
  const value = process.env[name]?.trim();
  return value && !/[\r\n]/.test(value) ? value : null;
}

export function getGatewayBaseUrl(): URL {
  const configured = (process.env.GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL).trim();
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new AppError("GATEWAY_BASE_URL is not a valid URL.", 500, "gateway_url_invalid");
  }
  if (url.protocol !== "https:") {
    throw new AppError("GATEWAY_BASE_URL must use HTTPS.", 500, "gateway_url_invalid");
  }
  if (url.hostname.toLowerCase() !== VERIFIED_GATEWAY_HOST || url.port) {
    throw new AppError("GATEWAY_BASE_URL must use the verified HomePilot zrok origin on the standard HTTPS port.", 500, "gateway_url_invalid");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AppError("GATEWAY_BASE_URL cannot contain credentials, query parameters, or fragments.", 500, "gateway_url_invalid");
  }
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/v1") {
    throw new AppError("GATEWAY_BASE_URL must end with /v1.", 500, "gateway_url_invalid");
  }
  url.pathname = "/v1";
  return url;
}

export function getGatewayModel(): string {
  const model = (process.env.GATEWAY_MODEL || DEFAULT_GATEWAY_MODEL).trim() || DEFAULT_GATEWAY_MODEL;
  if (model.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(model)) {
    throw new AppError("GATEWAY_MODEL contains unsupported characters or is too long.", 500, "gateway_model_invalid");
  }
  return model;
}

export function getGatewayEndpoint(): URL {
  return new URL("responses", `${getGatewayBaseUrl().toString()}/`);
}

export function getGatewayReadiness() {
  let gatewayUrlValid = true;
  let modelValid = true;
  let gatewayBaseUrl = process.env.GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL;
  let model = process.env.GATEWAY_MODEL || DEFAULT_GATEWAY_MODEL;

  try {
    gatewayBaseUrl = getGatewayBaseUrl().toString().replace(/\/$/, "");
  } catch {
    gatewayUrlValid = false;
  }
  try {
    model = getGatewayModel();
  } catch {
    modelValid = false;
  }

  const cliProxyKeyConfigured = Boolean(configuredSecret("CLIPROXY_API_KEY"));
  const gatewaySecretConfigured = Boolean(configuredSecret("HOME_GATEWAY_SECRET"));
  return {
    gatewayBaseUrl,
    gatewayUrlValid,
    model,
    modelValid,
    cliProxyKeyConfigured,
    gatewaySecretConfigured,
    gatewayConfigured: gatewayUrlValid && modelValid && cliProxyKeyConfigured && gatewaySecretConfigured
  };
}
