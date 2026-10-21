import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { isStyleTag } from "@/lib/domain";
import { generateOutfits } from "@/lib/ai/stylist";

const generateSchema = z.object({
  occasion: z.string().trim().min(1, "Pick an occasion").max(60),
  style: z
    .string()
    .trim()
    .min(1, "Pick a preferred style")
    .max(40)
    .refine(isStyleTag, "Pick one of the available styles"),
  excludeCategories: z.array(z.string()).max(6).optional().default([]),
  excludeItemIds: z.array(z.string()).max(50).optional().default([]),
  mustIncludeItemId: z.string().nullable().optional().default(null),
});

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first?.message ?? "Invalid request", 422);
    }
    const { occasion, style, excludeCategories, excludeItemIds, mustIncludeItemId } = parsed.data;

    // The user's real wardrobe — the only source the stylist may draw from.
    const wardrobe = await db.clothingItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        category: true,
        colorway: true,
        styleTag: true,
        season: true,
        brand: true,
        imageUrl: true,
      },
    });

    const result = await generateOutfits(
      wardrobe,
      occasion,
      style,
      { excludeCategories, excludeItemIds, mustIncludeItemId }
    );

    if (result.outfits.length === 0) {
      return jsonError(result.notice ?? "Could not compose any looks right now.", 422, {
        source: result.source,
      });
    }

    const itemMap = new Map(wardrobe.map((item) => [item.id, item]));
    const generationId = randomUUID();
    const now = new Date();

    const rows = result.outfits.map((outfit) => {
      const items = outfit.itemIds.map((id) => itemMap.get(id)!).filter(Boolean);
      return {
        userId: user.id,
        generationId,
        name: outfit.name,
        occasion,
        style,
        explanation: outfit.explanation,
        itemIds: JSON.stringify(outfit.itemIds),
        itemsJson: JSON.stringify(items),
        alternatives: JSON.stringify(outfit.alternatives),
        source: result.source,
        saved: false,
        createdAt: now,
        updatedAt: now,
      };
    });

    await db.outfit.createMany({ data: rows });

    return NextResponse.json({
      generationId,
      source: result.source,
      notice: result.notice ?? null,
      count: rows.length,
    });
  });
}
