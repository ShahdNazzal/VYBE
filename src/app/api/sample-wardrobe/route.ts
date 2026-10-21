import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleApi, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/auth";
import { isCategory } from "@/lib/domain";

/**
 * One-time seeding of a curated "starter closet" so new users can explore the
 * AI stylist immediately. Images are real product/editorial photos re-hosted
 * on OSS (fetched via image search at build time, resolved at runtime).
 */
const SAMPLE_ITEMS: {
  key: string;
  name: string;
  category: string;
  colorway: string;
  styleTag: string;
  season: string;
  brand: string;
}[] = [
  { key: "w_white_tee", name: "The Perfect White Tee", category: "tops", colorway: "Crisp White", styleTag: "Minimalist", season: "all-season", brand: "VYBE Basics" },
  { key: "w_white_shirt", name: "Poplin Button-Down", category: "tops", colorway: "Optic White", styleTag: "Classic", season: "all-season", brand: "The Tailor's Son" },
  { key: "w_silk_blouse", name: "Champagne Silk Blouse", category: "tops", colorway: "Champagne", styleTag: "Romantic", season: "spring", brand: "Maison VYBE" },
  { key: "w_knit_sweater", name: "Cashmere Crewneck", category: "tops", colorway: "Cream", styleTag: "Minimalist", season: "winter", brand: "Loft & Loom" },
  { key: "w_denim_jeans", name: "Straight-Leg Denim", category: "bottoms", colorway: "Mid Wash Indigo", styleTag: "Streetwear", season: "all-season", brand: "Denim Atelier" },
  { key: "w_navy_chinos", name: "Tailored Navy Chinos", category: "bottoms", colorway: "Deep Navy", styleTag: "Preppy", season: "all-season", brand: "The Tailor's Son" },
  { key: "w_mini_skirt", name: "Pleated Mini Skirt", category: "bottoms", colorway: "Onyx", styleTag: "Edgy", season: "all-season", brand: "Rivet & Co" },
  { key: "w_lbd", name: "Little Black Dress", category: "dresses", colorway: "Noir", styleTag: "Romantic", season: "all-season", brand: "Maison VYBE" },
  { key: "w_black_blazer", name: "Sculpted Wool Blazer", category: "outerwear", colorway: "Midnight Black", styleTag: "Classic", season: "fall", brand: "Atelier Noir" },
  { key: "w_trench", name: "Heritage Trench Coat", category: "outerwear", colorway: "Warm Beige", styleTag: "Classic", season: "fall", brand: "Atelier Noir" },
  { key: "w_biker_jacket", name: "Leather Biker Jacket", category: "outerwear", colorway: "Jet Black", styleTag: "Edgy", season: "fall", brand: "Rivet & Co" },
  { key: "w_burgundy_cardigan", name: "Ribbed Burgundy Cardigan", category: "outerwear", colorway: "Bordeaux", styleTag: "Romantic", season: "fall", brand: "Loft & Loom" },
  { key: "w_denim_jacket", name: "Classic Denim Jacket", category: "outerwear", colorway: "Light Wash Blue", styleTag: "Streetwear", season: "spring", brand: "Denim Atelier" },
  { key: "w_sneakers", name: "Court Leather Sneakers", category: "shoes", colorway: "Pure White", styleTag: "Sporty", season: "all-season", brand: "Studio 78" },
  { key: "w_heels", name: "Sculpted Pump Heels", category: "shoes", colorway: "Glossy Black", styleTag: "Classic", season: "all-season", brand: "Maison VYBE" },
  { key: "w_ankle_boots", name: "Leather Ankle Boots", category: "shoes", colorway: "Chestnut Brown", styleTag: "Edgy", season: "fall", brand: "Rivet & Co" },
  { key: "w_handbag", name: "Structured Leather Tote", category: "accessories", colorway: "Tan", styleTag: "Classic", season: "all-season", brand: "Maison VYBE" },
  { key: "w_sunglasses", name: "Cat-Eye Sunglasses", category: "accessories", colorway: "Glossy Black", styleTag: "Edgy", season: "summer", brand: "Rivet & Co" },
  { key: "w_scarf", name: "Oversized Wool Scarf", category: "accessories", colorway: "Heather Grey", styleTag: "Minimalist", season: "winter", brand: "Loft & Loom" },
  { key: "w_gold_earrings", name: "Gold Hoop Earrings", category: "accessories", colorway: "18k Gold", styleTag: "Minimalist", season: "all-season", brand: "Maison VYBE" },
];

async function firstImageUrl(key: string): Promise<string | null> {
  try {
    const file = path.join(process.cwd(), "assets", "imgsearch", `${key}.json`);
    const raw = await readFile(file, "utf-8");
    const data = JSON.parse(raw);
    if (data?.success && Array.isArray(data.results) && data.results.length > 0) {
      const url = data.results[0]?.original_url;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
  } catch {
    // file missing or malformed — fall through
  }
  return null;
}

const seedSchema = z.object({}).optional();

export async function POST() {
  return handleApi(async () => {
    const user = await requireUser();

    const existingCount = await db.clothingItem.count({ where: { userId: user.id } });
    if (existingCount > 0) {
      return jsonError("Your closet already has items — the starter wardrobe is only for empty closets.", 409);
    }

    const created: { name: string; ok: boolean }[] = [];
    for (const sample of SAMPLE_ITEMS) {
      if (!isCategory(sample.category)) continue;
      const imageUrl = await firstImageUrl(sample.key);
      if (!imageUrl) continue; // skip items whose image never resolved
      await db.clothingItem.create({
        data: {
          userId: user.id,
          name: sample.name,
          category: sample.category,
          colorway: sample.colorway,
          styleTag: sample.styleTag,
          season: sample.season,
          brand: sample.brand,
          imageUrl,
          notes: "Added from the VYBE starter wardrobe.",
        },
      });
      created.push({ name: sample.name, ok: true });
    }

    if (created.length === 0) {
      return jsonError("Starter wardrobe images are not available right now. Please add items manually.", 503);
    }

    return NextResponse.json({ added: created.length }, { status: 201 });
  });
}
