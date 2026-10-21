// Small helpers for consistent JSON API responses and error handling.

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth";

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function jsonOk<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ...data }, { status });
}

/**
 * Wraps an API handler: converts UnauthorizedError / ZodError / unexpected
 * errors into proper JSON responses so every route behaves consistently.
 */
export async function handleApi<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const result = await fn();
    if (result instanceof NextResponse) return result;
    return NextResponse.json(result as Record<string, unknown>);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError("You need to sign in to do that.", 401);
    }
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return jsonError(first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", 422);
    }
    console.error("[api] unhandled error:", error);
    return jsonError("Something went wrong on our end. Please try again.", 500);
  }
}
