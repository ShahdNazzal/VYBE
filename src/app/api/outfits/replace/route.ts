import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { replaceOutfitItem } from "@/lib/ai/stylist";

export const maxDuration = 120;

const replaceSchema = z.object({
  outfitId: z.string().min(1),
  replaceItemId: z.string().min(1),
  // Optional: the exact piece the user wants swapped in (e.g. a stylist's
  // alternative). Must be a real wardrobe item of the same category.
  preferItemId: z.string().min(1).nullable().optional().default(null),
});

/**
 * Follow-up: swap ONE item of an existing outfit while keeping the other
 * pieces unchanged whenever possible. The replacement id is validated against
 * the user's real wardrobe; other item ids are passed as fixed context.
 */
export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = replaceSchema.safeParse(body);
    if (!parsed.success) return jsonError("Invalid request.", 422);
    const { outfitId, replaceItemId, preferItemId } = parsed.data;

    const outfit = await db.outfit.findFirst({ where: { id: outfitId, userId: user.id } });
    if (!outfit) return jsonError("Outfit not found.", 404);

    let itemIds: string[] = [];
    try {
      itemIds = JSON.parse(outfit.itemIds);
    } catch {
      return jsonError("This outfit's data is corrupted.", 500);
    }
    if (!itemIds.includes(replaceItemId)) {
      return jsonError("That item is not part of this look.", 400);
    }

    const wardrobe = await db.clothingItem.findMany({
      where: { userId: user.id },
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
    const wardrobeMap = new Map(wardrobe.map((item) => [item.id, item]));

    let result: Awaited<ReturnType<typeof replaceOutfitItem>>;

    // Direct swap with a preferred piece (validated, keeps others untouched).
    if (preferItemId) {
      const preferred = wardrobeMap.get(preferItemId);
      const targetCat = wardrobeMap.get(replaceItemId)?.category;
      if (!preferred || !targetCat) {
        return jsonError("That piece is no longer in your closet.", 404);
      }
      if (preferred.category !== targetCat) {
        return jsonError(`Pick a piece from the same category (${targetCat}) to keep the look balanced.`, 422);
      }
      if (itemIds.includes(preferItemId)) {
        return jsonError("That piece is already part of this look.", 422);
      }
      result = {
        newItemId: preferred.id,
        reason: `Brought in ${preferred.name} to refresh the ${targetCat} while keeping the rest of the look untouched.`,
        source: "fallback",
      };
    } else {
      // Every current piece except the one being replaced stays fixed.
      const outfitItems = itemIds
        .map((id) => wardrobeMap.get(id))
        .filter((item): item is (typeof wardrobe)[number] => Boolean(item));

      result = await replaceOutfitItem(
        wardrobe,
        outfitItems,
        replaceItemId,
        outfit.occasion,
        outfit.style
      );
    }

    if (!result.newItemId) {
      return jsonError(result.reason, 422, { source: result.source });
    }

    // Validate against the wardrobe once more before persisting.
    const newItem = wardrobeMap.get(result.newItemId);
    if (!newItem) return jsonError("Replacement validation failed.", 500);

    const newItemIds = itemIds.map((id) => (id === replaceItemId ? result.newItemId! : id));
    const newItems = newItemIds.map((id) => wardrobeMap.get(id)!).filter(Boolean);

    const updatedExplanation = `${outfit.explanation}\n\nSwap note: ${result.reason}`;

    const updated = await db.outfit.update({
      where: { id: outfit.id },
      data: {
        itemIds: JSON.stringify(newItemIds),
        itemsJson: JSON.stringify(newItems),
        explanation: updatedExplanation,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      outfit: updated,
      swap: {
        removedItemId: replaceItemId,
        addedItemId: result.newItemId,
        reason: result.reason,
        source: result.source,
      },
    });
  });
}
