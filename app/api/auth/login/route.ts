import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { githubAuthorizeUrl } from "@/lib/auth/github";

export async function GET(request: NextRequest) {
  const state = randomToken(24);
  const store = await cookies();
  store.set("aicc_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return NextResponse.redirect(githubAuthorizeUrl(request.nextUrl.origin, state));
}
