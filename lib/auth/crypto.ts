const encoder = new TextEncoder();
const ITERATIONS = 8_000;

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

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

export function createRandomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = await derivePortableHash(password, salt, ITERATIONS);

  return `sha256-v1$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, iterationsText, saltText, hashText] = passwordHash.split("$");
  if (algorithm !== "sha256-v1" && algorithm !== "pbkdf2-sha256") {
    return false;
  }

  const iterations = Number(iterationsText);
  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(hashText);
  const actual =
    algorithm === "sha256-v1"
      ? await derivePortableHash(password, salt, iterations)
      : await derivePbkdf2Hash(password, salt, iterations, expected.length);

  if (actual.length !== expected.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual[index] ^ expected[index];
  }

  return diff === 0;
}

async function derivePortableHash(
  password: string,
  salt: Uint8Array,
  iterations: number
) {
  let hash = new Uint8Array([
    ...salt,
    ...encoder.encode(password),
  ]);

  for (let index = 0; index < iterations; index += 1) {
    hash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", toArrayBuffer(hash))
    );
  }

  return hash;
}

async function derivePbkdf2Hash(
  password: string,
  salt: Uint8Array,
  iterations: number,
  byteLength: number
) {
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
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    byteLength * 8
  );
  return new Uint8Array(bits);
}

export async function hashSessionToken(token: string, secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${secret}.${token}`)
  );
  return toBase64Url(new Uint8Array(digest));
}
