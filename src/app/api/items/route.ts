import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { isCategory, isSeason, isStyleTag } from "@/lib/domain";

export const itemCreateSchema = z.object({
  name: z.string().trim().min(1, "Give the item a name").max(80),
  category: z.string().refine(isCategory, "Pick a valid category"),
  colorway: z.string().trim().max(40).optional().nullable(),
  styleTag: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v == null || v === "" || isStyleTag(v), "Pick a valid style"),
  season: z
    .string()
    .optional()
    .nullable()
    .refine((v) => v == null || v === "" || isSeason(v), "Pick a valid season"),
  brand: z.string().trim().max(60).optional().nullable(),
  imageUrl: z.string().min(1, "An image is required").max(2048),
  notes: z.string().trim().max(500).optional().nullable(),
});

// GET /api/items?category=&season=&style=&q=
export async function GET(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const where: Record<string, unknown> = { userId: user.id };
    const category = searchParams.get("category");
    const season = searchParams.get("season");
    const style = searchParams.get("style");
    const q = searchParams.get("q")?.trim();

    if (category && isCategory(category)) where.category = category;
    if (season && isSeason(season)) where.season = season;
    if (style && isStyleTag(style)) where.styleTag = style;
    if (q) where.name = { contains: q };

    const items = await db.clothingItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ items });
  });
}

export async function POST(req: NextRequest) {
  return handleApi(async () => {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = itemCreateSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonError(first?.message ?? "Invalid item", 422);
    }

    const data = parsed.data;
    const item = await db.clothingItem.create({
      data: {
        userId: user.id,
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
    return NextResponse.json({ item }, { status: 201 });
  });
}
