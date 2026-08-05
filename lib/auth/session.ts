import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { signValue, verifySignedValue } from "@/lib/crypto";
import type { SessionPayload, SessionUser } from "@/lib/types";

const SESSION_COOKIE = "aicc_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError("SESSION_SECRET must contain at least 32 characters.", 500, "session_secret_missing");
  }
  return secret;
}

export function createSessionToken(user: SessionUser, now = Date.now()): string {
  const payload: SessionPayload = {
    user,
    issuedAt: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000
  };
  return signValue(JSON.stringify(payload), sessionSecret());
}

export function parseSessionToken(token: string, now = Date.now()): SessionPayload | null {
  const payload = verifySignedValue(token, sessionSecret());
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as SessionPayload;
    if (!parsed.user?.login || !parsed.expiresAt || parsed.expiresAt <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true") {
    const now = Date.now();
    return {
      user: { login: "local-owner", name: "Local Owner", avatarUrl: "", githubId: 0 },
      issuedAt: now,
      expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000
    };
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
