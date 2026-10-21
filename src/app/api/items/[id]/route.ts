import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { itemCreateSchema } from "../route";

type Params = { params: Promise<{ id: string }> };

// GET a single item (ownership enforced)
export async function GET(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;
    const item = await db.clothingItem.findFirst({ where: { id, userId: user.id } });
    if (!item) return jsonError("Item not found.", 404);
    return NextResponse.json({ item });
  });
}

// PUT update an item
export async function PUT(req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;

    const existing = await db.clothingItem.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Item not found.", 404);

    const body = await req.json().catch(() => null);
    const parsed = itemCreateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first?.message ?? "Invalid item", 422);
    }

    const data = parsed.data;
    const item = await db.clothingItem.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        category: data.category,
        colorway: data.colorway || null,
        styleTag: data.styleTag || null,
        season: data.season || null,
        brand: data.brand || null,
        imageUrl: data.imageUrl,
        notes: data.notes || null,
      },
    });
    return NextResponse.json({ item });
  });
}

// DELETE an item (outfits keep an itemsJson snapshot, so history stays intact)
export async function DELETE(_req: NextRequest, { params }: Params) {
  return handleApi(async () => {
    const user = await requireUser();
    const { id } = await params;

    const existing = await db.clothingItem.findFirst({ where: { id, userId: user.id } });
    if (!existing) return jsonError("Item not found.", 404);

    await db.clothingItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  });
}
