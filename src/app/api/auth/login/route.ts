import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { sessionCookieOptions } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return jsonError("Please enter your email and password.", 422);
    const { email, password } = parsed.data;

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return jsonError("Incorrect email or password.", 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return jsonError("Incorrect email or password.", 401);

    const token = await signSession(user.id, user.email);
    const res = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  });
}
