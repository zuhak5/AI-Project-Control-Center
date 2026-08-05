import { NextResponse } from "next/server";
import { assertSameOrigin, jsonError } from "@/lib/api";
import { getAppOrigin } from "@/lib/auth/config";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/login", `${getAppOrigin()}/`), { status: 303 });
  } catch (error) {
    return jsonError(error);
  }
}
