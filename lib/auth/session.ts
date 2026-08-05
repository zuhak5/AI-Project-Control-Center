import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { requireAllowedGitHubLogin } from "@/lib/auth/config";
import { signValue, verifySignedValue } from "@/lib/crypto";
import type { SessionPayload, SessionUser } from "@/lib/types";

const SESSION_COOKIE = "hpgc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32 || /[\r\n]/.test(secret)) throw new AppError("SESSION_SECRET must contain at least 32 valid characters.", 500, "session_secret_missing");
  return secret;
}
function validSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const user = value as Partial<SessionUser>;
  return typeof user.login === "string" && /^[A-Za-z0-9-]{1,39}$/.test(user.login)
    && (user.name === null || typeof user.name === "string") && typeof user.avatarUrl === "string"
    && Number.isInteger(user.githubId) && (user.githubId ?? 0) >= 0;
}
export function createSessionToken(user: SessionUser, now = Date.now()): string {
  requireAllowedGitHubLogin(user.login);
  return signValue(JSON.stringify({ user, issuedAt: now, expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000 } satisfies SessionPayload), sessionSecret());
}
export function parseSessionToken(token: string, now = Date.now()): SessionPayload | null {
  if (!token || token.length > 16_000) return null;
  const payload = verifySignedValue(token, sessionSecret());
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as Partial<SessionPayload>;
    if (!validSessionUser(parsed.user) || typeof parsed.issuedAt !== "number" || typeof parsed.expiresAt !== "number"
      || !Number.isFinite(parsed.issuedAt) || !Number.isFinite(parsed.expiresAt) || parsed.issuedAt > now + CLOCK_SKEW_MS
      || parsed.expiresAt <= now || parsed.expiresAt - parsed.issuedAt > SESSION_MAX_AGE_SECONDS * 1000 + CLOCK_SKEW_MS) return null;
    requireAllowedGitHubLogin(parsed.user.login);
    return parsed as SessionPayload;
  } catch { return null; }
}
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
}
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
export async function getSession(): Promise<SessionPayload | null> {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true") {
    const now = Date.now();
    return { user: { login: "local-owner", name: "Local Owner", avatarUrl: "", githubId: 0 }, issuedAt: now, expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000 };
  }
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? parseSessionToken(token) : null;
}
export async function requirePageSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
export async function requireApiSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AppError("Authentication required.", 401, "unauthorized");
  return session;
}
