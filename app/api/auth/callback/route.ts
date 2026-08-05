import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authenticateGitHubCode } from "@/lib/auth/github";
import { getAppOrigin } from "@/lib/auth/config";
import { setSessionCookie } from "@/lib/auth/session";
import { safeEqual } from "@/lib/crypto";

function redirectTo(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, `${getAppOrigin()}/`));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("hpgc_oauth_state")?.value;
  store.set("hpgc_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) return redirectTo("/login?error=invalid_oauth_state");
  try {
    const user = await authenticateGitHubCode(code);
    await setSessionCookie(user);
    return redirectTo("/dashboard");
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return redirectTo("/login?error=access_denied");
  }
}
