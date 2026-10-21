// Client-side shapes mirroring the Prisma models.

export interface Item {
  id: string;
  userId: string;
  name: string;
  category: string;
  colorway: string | null;
  styleTag: string | null;
  season: string | null;
  brand: string | null;
  imageUrl: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutfitAlternative {
  itemId: string;
  note: string;
}

export interface Outfit {
  id: string;
  userId: string;
  generationId: string;
  name: string;
  occasion: string;
  style: string;
  explanation: string;
  itemIds: string; // JSON string[]
  itemsJson: string; // JSON Item snapshot
  alternatives: string | null; // JSON OutfitAlternative[]
  source: "ai" | "fallback";
  saved: boolean;
  createdAt: string;
  updatedAt: string;
}

export function parseOutfitItems(outfit: Outfit): Item[] {
  try {
    const parsed = JSON.parse(outfit.itemsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseOutfitItemIds(outfit: Outfit): string[] {
  try {
    const parsed = JSON.parse(outfit.itemIds);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseOutfitAlternatives(outfit: Outfit): OutfitAlternative[] {
  if (!outfit.alternatives) return [];
  try {
    const parsed = JSON.parse(outfit.alternatives);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
