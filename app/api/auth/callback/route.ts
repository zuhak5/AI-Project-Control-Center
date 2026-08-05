import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { authenticateGitHubCode } from "@/lib/auth/github";
import { setSessionCookie } from "@/lib/auth/session";
import { safeEqual } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("aicc_oauth_state")?.value;
  store.set("aicc_oauth_state", "", { path: "/", maxAge: 0 });

  if (!code || !state || !expectedState || !safeEqual(state, expectedState)) {
    return NextResponse.redirect(new URL("/login?error=invalid_oauth_state", request.url));
  }

  try {
    const user = await authenticateGitHubCode(code, request.nextUrl.origin);
    await setSessionCookie(user);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("GitHub OAuth callback failed", error);
    return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
  }
}
