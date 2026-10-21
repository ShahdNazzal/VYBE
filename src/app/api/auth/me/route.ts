import { NextResponse } from "next/server";
import { handleApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";

export async function GET() {
  return handleApi(async () => {
    const user = await requireUser();
    return { user };
  });
}
