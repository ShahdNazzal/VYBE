import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { hashPassword, validateEmail, validatePassword } from "@/lib/password";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { sessionCookieOptions } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(60).optional(),
  email: z.string().trim().toLowerCase().email("Please enter a valid email"),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const body = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first?.message ?? "Invalid input", 422);
    }
    const { email, password, name } = parsed.data;

    if (!validateEmail(email)) return jsonError("Please enter a valid email address.", 422);
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) return jsonError(pwCheck.message!, 422);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("An account with this email already exists. Try signing in instead.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, passwordHash, name: name || null },
      select: { id: true, email: true, name: true },
    });

    const token = await signSession(user.id, user.email);
    const res = NextResponse.json({ user }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
