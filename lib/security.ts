import { isIP } from "node:net";
import { AppError } from "@/lib/errors";

const privateIpv4Ranges = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./
];

function isPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local")) {
    return true;
  }

  if (isIP(normalized) === 4) return privateIpv4Ranges.some((pattern) => pattern.test(normalized));
  if (isIP(normalized) === 6) {
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  }

  return false;
}

export function assertSafeOutboundUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AppError("Provider URL is invalid.", 400, "invalid_provider_url");
  }

  const allowHttp = process.env.AICC_ALLOW_HTTP_PROVIDERS === "true" && process.env.NODE_ENV !== "production";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new AppError("Provider URL must use HTTPS.", 400, "unsafe_provider_url");
  }

  if (isPrivateHostname(url.hostname) && !allowHttp) {
    throw new AppError("Private and loopback provider addresses are blocked.", 400, "unsafe_provider_url");
  }

  const allowlist = (process.env.AICC_ALLOWED_PROVIDER_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length > 0 && !allowlist.includes(url.hostname.toLowerCase())) {
    throw new AppError("Provider host is not in AICC_ALLOWED_PROVIDER_HOSTS.", 400, "provider_host_not_allowed");
  }

  return url;
}

export function readProviderSecret(envName: string): string {
  if (!/^[A-Z][A-Z0-9_]*$/.test(envName)) {
    throw new AppError("Provider secret reference is invalid.", 500, "invalid_secret_reference");
  }

  const value = process.env[envName];
  if (!value) {
    throw new AppError(`Vercel environment variable ${envName} is not configured.`, 409, "provider_secret_missing");
  }
  return value;
}

export function hasProviderSecret(envName: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(envName) && Boolean(process.env[envName]);
}
