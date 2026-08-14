import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { createRandomToken, hashSessionToken, verifyPassword } from "./crypto";
import { SESSION_COOKIE } from "../auth";

type AdminRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: number;
};

const SESSION_HOURS = 8;

function getSessionSecret(env: CloudflareEnv) {
  const secret = env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return secret || "local-development-session-secret";
}

export async function authenticateAdmin(email: string, password: string) {
  const env = await getCloudflareEnv();
  const admin = await env.DB.prepare(
    `
    SELECT id, email, display_name, password_hash, is_active
    FROM administrators
    WHERE lower(email) = lower(?) AND is_active = 1
    `
  )
    .bind(email)
    .first<AdminRow>();

  if (!admin) {
    return null;
  }

  const isValid = await verifyPassword(password, admin.password_hash);
  if (!isValid) {
    return null;
  }

  const token = createRandomToken();
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60 * 1000);

  await env.DB.prepare(
    `
    INSERT INTO admin_sessions (
      id,
      administrator_id,
      token_hash,
      expires_at,
      created_at,
      last_used_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `
  )
    .bind(
      crypto.randomUUID(),
      admin.id,
      tokenHash,
      expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString()
    )
    .run();

  return token;
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const env = await getCloudflareEnv();
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  const session = await env.DB.prepare(
    `
    SELECT
      admin_sessions.id,
      administrators.email,
      administrators.display_name
    FROM admin_sessions
    INNER JOIN administrators
      ON administrators.id = admin_sessions.administrator_id
    WHERE admin_sessions.token_hash = ?
      AND admin_sessions.revoked_at IS NULL
      AND admin_sessions.expires_at > ?
      AND administrators.is_active = 1
    `
  )
    .bind(tokenHash, new Date().toISOString())
    .first<{ id: string; email: string; display_name: string }>();

  if (!session) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  await env.DB.prepare(
    "UPDATE admin_sessions SET last_used_at = ? WHERE id = ?"
  )
    .bind(new Date().toISOString(), session.id)
    .run();

  return {
    email: session.email,
    displayName: session.display_name,
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    cookieStore.delete(SESSION_COOKIE);
    return;
  }

  const env = await getCloudflareEnv();
  const tokenHash = await hashSessionToken(token, getSessionSecret(env));
  await env.DB.prepare(
    "UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?"
  )
    .bind(new Date().toISOString(), tokenHash)
    .run();
  cookieStore.delete(SESSION_COOKIE);
}
