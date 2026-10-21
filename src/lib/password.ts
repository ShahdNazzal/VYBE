// Password hashing with Node's built-in scrypt (no external dependency).
// Server-side only — used by the register / login API routes.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hash a plaintext password into `salt:hash` hex format. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

/** Verify a plaintext password against a stored `salt:hash` string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH);
    const storedBytes = Buffer.from(hash, "hex");
    if (storedBytes.length !== derived.length) return false;
    return timingSafeEqual(derived, storedBytes);
  } catch {
    return false;
  }
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validatePassword(password: string): { ok: boolean; message?: string } {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  if (password.length > 128) {
    return { ok: false, message: "Password must be at most 128 characters." };
  }
  return { ok: true };
}
