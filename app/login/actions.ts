"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticateAdmin } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const authenticated = await authenticateAdmin(email, password);

  if (!authenticated) {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
    redirect("/login?error=invalid");
  }

  redirect("/manuals");
}
