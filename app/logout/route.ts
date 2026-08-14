import { NextResponse } from "next/server";
import { revokeCurrentSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  await revokeCurrentSession();
  const response = NextResponse.redirect(new URL("/login", request.url));
  return response;
}
