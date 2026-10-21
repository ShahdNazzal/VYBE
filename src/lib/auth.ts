// Server-side auth helpers shared by API routes and server components.

import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS, verifySession, type SessionPayload } from "@/lib/session";

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

/** Read + verify the session cookie, then load the matching user from DB. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload: SessionPayload | null = await verifySession(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return user;
}

/** Same as getCurrentUser but throws a 401-style marker for API routes. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Build the Set-Cookie attributes for a fresh session. */
export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
