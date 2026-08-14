import { NextResponse } from "next/server";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { authenticateAdmin } from "@/lib/auth/session";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const token = await authenticateAdmin(email, password);

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/manuals", request.url));
  response.cookies.delete(LEGACY_SESSION_COOKIE);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
