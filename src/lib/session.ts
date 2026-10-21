// HMAC-signed session tokens built on Web Crypto so they verify everywhere
// (API routes, server components, and edge middleware alike).

export const SESSION_COOKIE = "vybe_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: string;
  email: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    // Fail loud in dev rather than silently signing with a weak key.
    throw new Error("AUTH_SECRET env var is missing or too short (min 16 chars)");
  }
  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

/** Create a signed session token for the given user. */
export async function signSession(userId: string, email: string): Promise<string> {
  const body: SessionPayload = {
    userId,
    email,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(body)));
  const signature = await hmacSign(data);
  return `${data}.${signature}`;
}

/** Verify a session token; returns the payload or null when invalid/expired. */
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  try {
    const expected = await hmacSign(data);
    if (expected.length !== signature.length) return null;
    // Constant-time-ish comparison to avoid trivial timing leaks.
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    if (mismatch !== 0) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(data))) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
