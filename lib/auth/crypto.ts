const encoder = new TextEncoder();
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;

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

export function createRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    key,
    KEY_LENGTH * 8
  );

  return `pbkdf2-sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(
    new Uint8Array(bits)
  )}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, iterationsText, saltText, hashText] = passwordHash.split("$");
  if (algorithm !== "pbkdf2-sha256") {
    return false;
  }

  const iterations = Number(iterationsText);
  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(hashText);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    },
    key,
    expected.length * 8
  );
  const actual = new Uint8Array(bits);

  if (actual.length !== expected.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual[index] ^ expected[index];
  }

  return diff === 0;
}

export async function hashSessionToken(token: string, secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${secret}.${token}`)
  );
  return toBase64Url(new Uint8Array(digest));
}
