"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export async function login() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, "phase-2-local-session", sessionCookieOptions);
  redirect("/manuals");
}
