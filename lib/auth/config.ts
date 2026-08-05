import { AppError } from "@/lib/errors";

export const DEFAULT_APP_BASE_URL = "https://ai-project-control-center.vercel.app";

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

export function getAppBaseUrl(): URL {
  const configured = (process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL).trim();
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new AppError("APP_BASE_URL is not a valid URL.", 500, "app_url_invalid");
  }

  const localHttp = process.env.NODE_ENV !== "production" && url.protocol === "http:" && isLocalHostname(url.hostname);
  if (url.protocol !== "https:" && !localHttp) {
    throw new AppError("APP_BASE_URL must use HTTPS outside local development.", 500, "app_url_invalid");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new AppError("APP_BASE_URL cannot contain credentials, query parameters, or fragments.", 500, "app_url_invalid");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new AppError("APP_BASE_URL must not contain a path.", 500, "app_url_invalid");
  }
  if (process.env.NODE_ENV === "production" && url.port) {
    throw new AppError("APP_BASE_URL must use the standard HTTPS port.", 500, "app_url_invalid");
  }

  url.pathname = "/";
  return url;
}

export function getAppOrigin(): string {
  return getAppBaseUrl().origin;
}

export function getAllowedGitHubLogins(): string[] {
  return Array.from(new Set((process.env.ALLOWED_GITHUB_LOGINS ?? "")
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean)));
}

export function isGitHubLoginAllowed(login: string): boolean {
  const allowed = getAllowedGitHubLogins();
  return allowed.length > 0 && allowed.includes(login.trim().toLowerCase());
}

export function requireAllowedGitHubLogin(login: string): void {
  if (!isGitHubLoginAllowed(login)) {
    throw new AppError("This GitHub account is not authorized.", 403, "github_account_not_allowed");
  }
}

export function getAuthReadiness() {
  let appUrlValid = true;
  let appOrigin = process.env.APP_BASE_URL || DEFAULT_APP_BASE_URL;
  try {
    appOrigin = getAppOrigin();
  } catch {
    appUrlValid = false;
  }
  return {
    appOrigin,
    appUrlValid,
    githubOAuthConfigured: Boolean(process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()),
    allowlistConfigured: getAllowedGitHubLogins().length > 0
  };
}
