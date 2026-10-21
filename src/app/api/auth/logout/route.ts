import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { handleApi } from "@/lib/api-helpers";

export async function POST() {
  return handleApi(async () => {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  });
}
