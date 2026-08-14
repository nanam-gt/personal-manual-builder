import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareEnv } from "@/lib/cloudflare";
import { createRandomToken, hashSessionToken, verifyPassword } from "./crypto";
import {
  LEGACY_SESSION_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "../auth";

type AdminRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: number;
};

type SignedSessionPayload = {
  email: string;
  displayName: string;
  expiresAt: string;
};

const encoder = new TextEncoder();

function getSessionSecret(env: CloudflareEnv) {
  const secret = env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return secret || "local-development-session-secret";
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signPayload(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function createSignedSessionToken(
  payload: SignedSessionPayload,
  secret: string
) {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await signPayload(body, secret);
  return `v2.${body}.${signature}`;
}

async function verifySignedSessionToken(token: string, secret: string) {
  if (!token.startsWith("v2.")) {
    return null;
  }

  const [, body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = await signPayload(body, secret);
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as SignedSessionPayload;
    if (new Date(payload.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
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
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);

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

  return createSignedSessionToken(
    {
      email: admin.email,
      displayName: admin.display_name,
      expiresAt: expiresAt.toISOString(),
    },
    getSessionSecret(env)
  );
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const env = await getCloudflareEnv();
  const secret = getSessionSecret(env);
  const signedSession = await verifySignedSessionToken(token, secret);
  if (signedSession) {
    return {
      email: signedSession.email,
      displayName: signedSession.displayName,
    };
  }

  const tokenHash = await hashSessionToken(token, secret);
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
    return null;
  }

  const now = new Date();
  const nextExpiresAt = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  await env.DB.prepare(
    "UPDATE admin_sessions SET last_used_at = ?, expires_at = ? WHERE id = ?"
  )
    .bind(now.toISOString(), nextExpiresAt.toISOString(), session.id)
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
    cookieStore.delete(LEGACY_SESSION_COOKIE);
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
  cookieStore.delete(LEGACY_SESSION_COOKIE);
}
