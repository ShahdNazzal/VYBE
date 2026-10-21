import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApi } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";

// GET /api/outfits?saved=1  → saved lookbook
// GET /api/outfits?generation=<id> → the 2-3 cards from one generation run
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const generation = searchParams.get("generation");
    const saved = searchParams.get("saved");

    const where: Record<string, unknown> = { userId: user.id };
    if (generation) where.generationId = generation;
    if (saved === "1" || saved === "true") where.saved = true;

    const outfits = await db.outfit.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ outfits });
  });
}
