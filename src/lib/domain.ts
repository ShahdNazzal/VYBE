// Shared domain vocabulary used by the UI and the AI stylist prompts.

export const CATEGORIES = [
  "tops",
  "bottoms",
  "dresses",
  "outerwear",
  "shoes",
  "accessories",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  dresses: "Dresses",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessories: "Accessories",
};

export const OCCASIONS = [
  "Office Day",
  "Date Night",
  "Weekend Brunch",
  "Casual Errands",
  "Evening Event",
  "Travel Day",
  "Workout Session",
  "Creative Meeting",
  "Dinner Party",
  "Concert Night",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const STYLE_TAGS = [
  "Minimalist",
  "Classic",
  "Streetwear",
  "Romantic",
  "Edgy",
  "Bohemian",
  "Preppy",
  "Sporty",
  "Monochrome",
  "Old Money",
] as const;
export type StyleTag = (typeof STYLE_TAGS)[number];

export const SEASONS = ["spring", "summer", "fall", "winter", "all-season"] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
  "all-season": "All Season",
};

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export function isStyleTag(value: unknown): value is StyleTag {
  return typeof value === "string" && (STYLE_TAGS as readonly string[]).includes(value);
}

export function isSeason(value: unknown): value is Season {
  return typeof value === "string" && (SEASONS as readonly string[]).includes(value);
}
