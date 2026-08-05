import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { githubAuthorizeUrl } from "@/lib/auth/github";

export async function GET() {
  const state = randomToken(24);
  const store = await cookies();
  store.set("hpgc_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600
  });
  return NextResponse.redirect(githubAuthorizeUrl(state));
}
