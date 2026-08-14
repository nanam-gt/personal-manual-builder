import { randomBytes, randomUUID, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";

const ITERATIONS = 8_000;

function parseArgs() {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }

  return {
    email: args.get("--email") || process.env.ADMIN_EMAIL,
    password: args.get("--password") || process.env.ADMIN_PASSWORD,
    name: args.get("--name") || process.env.ADMIN_NAME || "Admin",
    remote: process.argv.includes("--remote"),
  };
}

function toBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  let hash = new Uint8Array([
    ...salt,
    ...new TextEncoder().encode(password),
  ]);

  for (let index = 0; index < ITERATIONS; index += 1) {
    hash = new Uint8Array(await webcrypto.subtle.digest("SHA-256", hash));
  }

  return `sha256-v1$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const { email, password, name, remote } = parseArgs();

if (!email || !password) {
  console.error(
    "Usage: node scripts/seed-admin.mjs --email admin@example.com --password 'secret' [--name Admin] [--remote]"
  );
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const timestamp = new Date().toISOString();
const command = `
INSERT INTO administrators (
  id,
  email,
  display_name,
  password_hash,
  is_active,
  created_at,
  updated_at
)
VALUES (
  ${sqlString(randomUUID())},
  ${sqlString(email)},
  ${sqlString(name)},
  ${sqlString(passwordHash)},
  1,
  ${sqlString(timestamp)},
  ${sqlString(timestamp)}
)
ON CONFLICT(email) DO UPDATE SET
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  is_active = 1,
  updated_at = excluded.updated_at;
`;

const result = spawnSync(
  "npx",
  [
    "wrangler",
    "d1",
    "execute",
    "personal-manual-builder-db",
    remote ? "--remote" : "--local",
    "--command",
    command,
  ],
  {
    stdio: "inherit",
  }
);

process.exit(result.status ?? 1);
