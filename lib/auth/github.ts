import "server-only";
import { AppError } from "@/lib/errors";
import { getAppOrigin, requireAllowedGitHubLogin } from "@/lib/auth/config";
import type { SessionUser } from "@/lib/types";

const OAUTH_TIMEOUT_MS = 15_000;
interface GitHubUserResponse { id?: unknown; login?: unknown; name?: unknown; avatar_url?: unknown }

function required(name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value || /[\r\n]/.test(value)) throw new AppError(`${name} is not configured correctly.`, 500, "github_oauth_not_configured");
  return value;
}
function oauthCallbackUrl(): string { return `${getAppOrigin()}/api/auth/callback`; }
async function fetchOAuth(url: string, init: RequestInit): Promise<Response> {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(OAUTH_TIMEOUT_MS), cache: "no-store" }); }
  catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new AppError("GitHub OAuth request timed out.", 504, "github_oauth_timeout");
    throw new AppError("GitHub OAuth could not be reached.", 502, "github_oauth_unavailable");
  }
}
function sanitizedAvatarUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "avatars.githubusercontent.com" ? url.toString() : ""; }
  catch { return ""; }
}
export function githubAuthorizeUrl(state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", required("GITHUB_CLIENT_ID"));
  url.searchParams.set("redirect_uri", oauthCallbackUrl());
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  return url.toString();
}
export async function authenticateGitHubCode(code: string): Promise<SessionUser> {
  if (!code || code.length > 500) throw new AppError("GitHub OAuth code is invalid.", 400, "github_oauth_code_invalid");
  const tokenResponse = await fetchOAuth("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: required("GITHUB_CLIENT_ID"), client_secret: required("GITHUB_CLIENT_SECRET"), code, redirect_uri: oauthCallbackUrl() })
  });
  let tokenPayload: { access_token?: unknown } = {};
  try { tokenPayload = await tokenResponse.json() as typeof tokenPayload; } catch { /* handled below */ }
  if (!tokenResponse.ok || typeof tokenPayload.access_token !== "string" || !tokenPayload.access_token) throw new AppError("GitHub OAuth exchange failed.", 401, "github_oauth_failed");
  const userResponse = await fetchOAuth("https://api.github.com/user", {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${tokenPayload.access_token}`, "X-GitHub-Api-Version": "2022-11-28" }
  });
  if (!userResponse.ok) throw new AppError("GitHub user lookup failed.", 401, "github_user_lookup_failed");
  let user: GitHubUserResponse;
  try { user = await userResponse.json() as GitHubUserResponse; }
  catch { throw new AppError("GitHub returned an invalid user response.", 502, "github_user_response_invalid"); }
  if (!Number.isInteger(user.id) || (user.id as number) <= 0 || typeof user.login !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(user.login)) throw new AppError("GitHub returned an invalid user response.", 502, "github_user_response_invalid");
  requireAllowedGitHubLogin(user.login);
  return {
    githubId: user.id as number,
    login: user.login,
    name: typeof user.name === "string" && user.name.trim() ? user.name.trim().slice(0, 200) : null,
    avatarUrl: sanitizedAvatarUrl(user.avatar_url)
  };
}
