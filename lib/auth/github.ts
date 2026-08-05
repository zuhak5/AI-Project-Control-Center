import "server-only";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/types";

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

function required(name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new AppError(`${name} is not configured.`, 500, "github_oauth_not_configured");
  return value;
}

export function githubAuthorizeUrl(origin: string, state: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", required("GITHUB_CLIENT_ID"));
  url.searchParams.set("redirect_uri", `${origin}/api/auth/callback`);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function authenticateGitHubCode(code: string, origin: string): Promise<SessionUser> {
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: required("GITHUB_CLIENT_ID"),
      client_secret: required("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: `${origin}/api/auth/callback`
    }),
    cache: "no-store"
  });

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new AppError("GitHub OAuth exchange failed.", 401, tokenPayload.error ?? "github_oauth_failed");
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    },
    cache: "no-store"
  });

  if (!userResponse.ok) throw new AppError("GitHub user lookup failed.", 401, "github_user_lookup_failed");
  const user = (await userResponse.json()) as GitHubUserResponse;

  const allowed = (process.env.ALLOWED_GITHUB_LOGINS ?? "")
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);

  if (allowed.length === 0 || !allowed.includes(user.login.toLowerCase())) {
    throw new AppError("This GitHub account is not authorized.", 403, "github_account_not_allowed");
  }

  return {
    githubId: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url
  };
}
