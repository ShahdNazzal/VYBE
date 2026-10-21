// VYBE — Color wheel & harmony engine.
//
// Pure, dependency-free color theory used by:
//   - the AI stylist prompt (normalized color families per item)
//   - the rule-based fallback stylist (harmony-aware scoring)
//   - the interactive color wheel UI (Studio page)
//   - the outfit cards (palette strip + harmony badge)
//
// Runs on both server and client — no DOM, no Node APIs.

/* ------------------------------------------------------------------ */
/* Color families (fashion-oriented dictionary)                        */
/* ------------------------------------------------------------------ */

export interface ColorFamily {
  name: string;
  hex: string;
  hue: number; // 0-360
  sat: number; // 0-100
  light: number; // 0-100
  neutral: boolean; // pairs with everything (navy & denim included — fashion rule)
}

const FAMILIES: ColorFamily[] = [
  // Neutrals
  { name: "White", hex: "#F7F6F2", hue: 45, sat: 14, light: 96, neutral: true },
  { name: "Cream", hex: "#F2EAD9", hue: 40, sat: 33, light: 90, neutral: true },
  { name: "Beige", hex: "#DFCFB0", hue: 38, sat: 34, light: 78, neutral: true },
  { name: "Camel", hex: "#C7A172", hue: 32, sat: 44, light: 62, neutral: true },
  { name: "Khaki", hex: "#B3A06B", hue: 49, sat: 32, light: 56, neutral: true },
  { name: "Brown", hex: "#8A5E3B", hue: 27, sat: 40, light: 39, neutral: true },
  { name: "Chocolate", hex: "#4C352B", hue: 23, sat: 27, light: 23, neutral: true },
  { name: "Grey", hex: "#9C9C9C", hue: 0, sat: 0, light: 61, neutral: true },
  { name: "Charcoal", hex: "#3A3D42", hue: 217, sat: 6, light: 24, neutral: true },
  { name: "Black", hex: "#1B1B1B", hue: 0, sat: 0, light: 10, neutral: true },
  { name: "Navy", hex: "#253351", hue: 222, sat: 38, light: 23, neutral: true },
  { name: "Denim", hex: "#5C7C9E", hue: 210, sat: 26, light: 49, neutral: true },
  // Reds & warm
  { name: "Red", hex: "#C0392B", hue: 6, sat: 63, light: 46, neutral: false },
  { name: "Wine", hex: "#6E1F31", hue: 345, sat: 56, light: 28, neutral: false },
  { name: "Rust", hex: "#B15A2E", hue: 22, sat: 59, light: 44, neutral: false },
  { name: "Coral", hex: "#F0786B", hue: 8, sat: 79, light: 68, neutral: false },
  { name: "Orange", hex: "#E07F2E", hue: 28, sat: 74, light: 53, neutral: false },
  { name: "Mustard", hex: "#C7A02B", hue: 46, sat: 65, light: 48, neutral: false },
  { name: "Yellow", hex: "#E9CC4A", hue: 50, sat: 74, light: 60, neutral: false },
  { name: "Gold", hex: "#C5A24E", hue: 42, sat: 50, light: 54, neutral: false },
  // Pinks
  { name: "Blush", hex: "#EBC7C4", hue: 4, sat: 51, light: 85, neutral: false },
  { name: "Pink", hex: "#E48FBB", hue: 327, sat: 63, light: 73, neutral: false },
  // Purples
  { name: "Lavender", hex: "#B7A6D8", hue: 262, sat: 42, light: 75, neutral: false },
  { name: "Purple", hex: "#6C4A9C", hue: 269, sat: 36, light: 45, neutral: false },
  // Blues
  { name: "Sky", hex: "#9DC4E4", hue: 204, sat: 54, light: 75, neutral: false },
  { name: "Blue", hex: "#3D6FB2", hue: 213, sat: 49, light: 47, neutral: false },
  // Greens & teals
  { name: "Mint", hex: "#A8DBCB", hue: 162, sat: 41, light: 76, neutral: false },
  { name: "Emerald", hex: "#21805A", hue: 155, sat: 59, light: 32, neutral: false },
  { name: "Green", hex: "#54793F", hue: 100, sat: 31, light: 36, neutral: false },
  { name: "Olive", hex: "#6C6D3E", hue: 61, sat: 27, light: 34, neutral: false },
  { name: "Teal", hex: "#2E7E86", hue: 185, sat: 49, light: 35, neutral: false },
];

// Free-text keywords → family name. Checked longest-first so "dark blue"
// beats "blue" and "tangerine" beats "tan".
const KEYWORDS: [string, string][] = [
  ["off white", "White"], ["snow", "White"], ["white", "White"],
  ["noir", "Black"], ["jet", "Black"],
  ["ivory", "Cream"], ["ecru", "Cream"], ["cream", "Cream"], ["butter", "Cream"], ["champagne", "Cream"],
  ["beige", "Beige"], ["sand", "Beige"], ["stone", "Beige"], ["oat", "Beige"], ["linen", "Beige"],
  ["camel", "Camel"], ["caramel", "Camel"], ["toffee", "Camel"], ["tan", "Camel"], ["nude", "Camel"],
  ["khaki", "Khaki"], ["olive", "Olive"], ["army green", "Olive"],
  ["chocolate", "Chocolate"], ["espresso", "Chocolate"], ["coffee", "Chocolate"], ["mocha", "Chocolate"],
  ["brown", "Brown"], ["taupe", "Brown"], ["chestnut", "Brown"], ["leopard", "Brown"], ["cognac", "Brown"],
  ["charcoal", "Charcoal"], ["graphite", "Charcoal"], ["gunmetal", "Charcoal"], ["anthracite", "Charcoal"],
  ["grey", "Grey"], ["gray", "Grey"], ["silver", "Grey"], ["heather", "Grey"],
  ["black", "Black"], ["onyx", "Black"], ["raven", "Black"],
  ["navy", "Navy"], ["midnight", "Navy"], ["dark blue", "Navy"],
  ["denim", "Denim"], ["mid wash", "Denim"], ["light wash", "Denim"], ["jeans", "Denim"], ["indigo", "Denim"],
  ["burgundy", "Wine"], ["maroon", "Wine"], ["wine", "Wine"], ["oxblood", "Wine"], ["bordeaux", "Wine"], ["plum", "Wine"], ["berry", "Wine"],
  ["rust", "Rust"], ["terracotta", "Rust"], ["brick", "Rust"], ["copper", "Rust"], ["ginger", "Rust"],
  ["tangerine", "Orange"], ["orange", "Orange"], ["amber", "Orange"], ["apricot", "Orange"],
  ["mustard", "Mustard"], ["ochre", "Mustard"], ["honey", "Mustard"],
  ["yellow", "Yellow"], ["lemon", "Yellow"], ["citron", "Yellow"],
  ["gold", "Gold"], ["bronze", "Gold"],
  ["blush", "Blush"], ["rose", "Blush"], ["dusty pink", "Blush"], ["mauve", "Blush"], ["peach", "Blush"],
  ["pink", "Pink"], ["fuchsia", "Pink"], ["magenta", "Pink"], ["hot pink", "Pink"],
  ["coral", "Coral"], ["salmon", "Coral"],
  ["lavender", "Lavender"], ["lilac", "Lavender"], ["periwinkle", "Lavender"],
  ["purple", "Purple"], ["violet", "Purple"], ["aubergine", "Purple"],
  ["blue", "Blue"], ["royal blue", "Blue"], ["cobalt", "Blue"], ["sapphire", "Blue"], ["cerulean", "Blue"],
  ["sky", "Sky"], ["powder blue", "Sky"], ["baby blue", "Sky"], ["light blue", "Sky"], ["ice blue", "Sky"],
  ["teal", "Teal"], ["turquoise", "Teal"], ["aqua", "Teal"],
  ["emerald", "Emerald"], ["forest", "Emerald"], ["bottle green", "Emerald"], ["hunter", "Emerald"],
  ["green", "Green"], ["sage", "Green"], ["mint", "Mint"], ["pistachio", "Mint"],
  ["red", "Red"], ["scarlet", "Red"], ["cherry", "Red"], ["crimson", "Red"], ["poppy", "Red"],
];

const FAMILY_BY_NAME = new Map(FAMILIES.map((family) => [family.name, family]));

export function getFamily(name: string): ColorFamily | undefined {
  return FAMILY_BY_NAME.get(name);
}

/* ------------------------------------------------------------------ */
/* HSL / hex utilities                                                 */
/* ------------------------------------------------------------------ */

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let r = 0, g = 0, b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Circular distance between two hues: 0..180. */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Nearest family to an arbitrary hex (used by photo color extraction). */
export function nearestFamily(hex: string): ColorFamily {
  const { h, s, l } = hexToHsl(hex);
  let best = FAMILIES[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const family of FAMILIES) {
    const huePenalty = family.neutral ? hueDistance(h, family.hue) * 0.35 : hueDistance(h, family.hue);
    const satPenalty = Math.abs(s - family.sat) * 0.6;
    const lightPenalty = Math.abs(l - family.light) * 0.8;
    const score = huePenalty + satPenalty + lightPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = family;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Colorway text parsing                                               */
/* ------------------------------------------------------------------ */

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse a free-text colorway ("Mid Wash Denim", "Cream", "#6E1F31") into a
 * concrete color family. Returns null when nothing recognizable is found.
 */
export function parseColorway(colorway?: string | null): ColorFamily | null {
  if (!colorway) return null;
  const text = colorway.trim();
  if (!text) return null;

  if (HEX_RE.test(text)) return nearestFamily(text);

  const lower = text.toLowerCase();
  const matches = KEYWORDS.filter(([keyword]) => lower.includes(keyword)).sort(
    (a, b) => b[0].length - a[0].length
  );
  if (matches.length === 0) return null;
  return FAMILY_BY_NAME.get(matches[0][1]) ?? null;
}

/* ------------------------------------------------------------------ */
/* Harmony analysis                                                    */
/* ------------------------------------------------------------------ */

export type HarmonyType =
  | "neutral"
  | "accent"
  | "monochrome"
  | "analogous"
  | "complementary"
  | "triadic"
  | "eclectic";

export interface HarmonyResult {
  type: HarmonyType;
  label: string;
  score: number; // 0..1 — higher = more classically coherent
  note: string; // one editorial sentence
  families: ColorFamily[]; // chromatic families involved
}

export const HARMONY_LABELS: Record<HarmonyType, string> = {
  neutral: "Quiet neutrals",
  accent: "Neutral + accent",
  monochrome: "Tonal",
  analogous: "Analogous",
  complementary: "Complementary",
  triadic: "Triadic",
  eclectic: "Eclectic mix",
};

const listNames = (families: ColorFamily[]) =>
  families.map((family) => family.name.toLowerCase()).join(" and ");

/**
 * Analyze the classical color-wheel relationship of a set of colors.
 * Neutrals are excluded from hue geometry but counted for balance.
 */
export function analyzeHarmony(colors: (ColorFamily | null)[]): HarmonyResult {
  const chromatic = colors.filter(
    (color): color is ColorFamily => !!color && !color.neutral
  );
  const neutralCount = colors.filter((color) => color?.neutral).length;
  // Deduplicate by family name.
  const unique: ColorFamily[] = [];
  for (const color of chromatic) {
    if (!unique.some((existing) => existing.name === color.name)) unique.push(color);
  }

  const cap = (score: number) => Math.min(0.95, Math.max(0.2, score));
  const neutralBonus = neutralCount >= 1 && unique.length <= 2 ? 0.05 : 0;

  if (unique.length === 0) {
    return {
      type: "neutral",
      label: HARMONY_LABELS.neutral,
      score: cap(0.82 + neutralBonus),
      note: "A quiet palette of neutrals — the pieces carry the silhouette while the tones stay effortless.",
      families: [],
    };
  }

  if (unique.length === 1) {
    const family = unique[0];
    return {
      type: "accent",
      label: HARMONY_LABELS.accent,
      score: cap(0.9 + neutralBonus),
      note: `${family.name.toLowerCase()} pops against a calm neutral base — one accent is all a look needs.`,
      families: [family],
    };
  }

  const hues = unique.map((family) => family.hue);
  const maxDist = Math.max(...hues.map((a) => Math.max(...hues.map((b) => hueDistance(a, b)))));
  const minDist = Math.min(...hues.map((a, i) => Math.min(...hues.filter((_, j) => j !== i).map((b) => hueDistance(a, b)))));

  if (unique.length === 2) {
    const [a, b] = unique;
    if (maxDist <= 30) {
      return {
        type: "monochrome",
        label: HARMONY_LABELS.monochrome,
        score: cap(0.88 + neutralBonus),
        note: `${listNames(unique)} live in the same slice of the color wheel — a tonal, elongating combination.`,
        families: unique,
      };
    }
    if (maxDist <= 60) {
      return {
        type: "analogous",
        label: HARMONY_LABELS.analogous,
        score: cap(0.84 + neutralBonus),
        note: `${listNames(unique)} sit side by side on the color wheel — neighbors that never argue.`,
        families: unique,
      };
    }
    if (maxDist >= 140) {
      return {
        type: "complementary",
        label: HARMONY_LABELS.complementary,
        score: cap(0.86 + neutralBonus),
        note: `${listNames(unique)} sit opposite each other on the color wheel — the classic high-contrast pairing.`,
        families: unique,
      };
    }
    const soft = a.sat < 40 || b.sat < 40;
    return {
      type: "eclectic",
      label: HARMONY_LABELS.eclectic,
      score: cap((soft ? 0.68 : 0.52) + neutralBonus),
      note: `${listNames(unique)} make a bolder, more personal mix — confident, if less classical.`,
      families: unique,
    };
  }

  // 3+ chromatic colors
  if (unique.length === 3 && maxDist >= 95 && maxDist <= 145 && minDist >= 85) {
    return {
      type: "triadic",
      label: HARMONY_LABELS.triadic,
      score: cap(0.8 + neutralBonus),
      note: `${listNames(unique)} form a triad on the color wheel — playful and balanced when the tones stay even.`,
      families: unique,
    };
  }
  if (maxDist <= 40) {
    return {
      type: "analogous",
      label: HARMONY_LABELS.analogous,
      score: cap(unique.length === 3 ? 0.82 : 0.68),
      note: `Every hue stays within one family of the wheel — a graded, editorial ${unique.length === 3 ? "blend" : "study"}.`,
      families: unique,
    };
  }
  const pairsFar = hues.flatMap((a, i) =>
    hues.slice(i + 1).map((b) => hueDistance(a, b))
  );
  if (pairsFar.filter((distance) => distance >= 140).length === 1 && minDist <= 35) {
    return {
      type: "complementary",
      label: HARMONY_LABELS.complementary,
      score: cap(0.74 + neutralBonus),
      note: "One complementary contrast anchors the look while the supporting pieces stay in family.",
      families: unique,
    };
  }
  return {
    type: "eclectic",
    label: HARMONY_LABELS.eclectic,
    score: cap(0.45),
    note: "Several unrelated hues share the frame — expressive, but a calmer wheel pairing would streamline it.",
    families: unique,
  };
}

/** Short phrase for stylist explanations, e.g. "a complementary pairing of wine and camel". */
export function harmonyPhrase(colors: (ColorFamily | null)[]): string | null {
  const harmony = analyzeHarmony(colors);
  const chromatic = harmony.families;
  if (harmony.type === "neutral") return "a quiet all-neutral palette";
  if (harmony.type === "accent") return `a neutral base lifted by one ${chromatic[0].name.toLowerCase()} accent`;
  if (harmony.type === "eclectic") return null; // don't praise it
  if (chromatic.length === 0) return null;
  return `a ${harmony.label.toLowerCase()} pairing of ${listNames(chromatic)}`;
}

/* ------------------------------------------------------------------ */
/* Pairing suggestions (color wheel UI)                                */
/* ------------------------------------------------------------------ */

export interface PartnerSuggestion {
  family: ColorFamily;
  relation: "complementary" | "analogous" | "neutral" | "tonal";
}

/** Suggest wheel partners for a family, filtered to what's actually in the wardrobe. */
export function suggestPartners(
  family: ColorFamily,
  available: ColorFamily[]
): PartnerSuggestion[] {
  const suggestions: PartnerSuggestion[] = [];
  for (const candidate of available) {
    if (!family || !candidate || candidate.name === family.name) continue;
    let relation: PartnerSuggestion["relation"];
    if (family.neutral || candidate.neutral) {
      relation = "neutral";
    } else {
      const distance = hueDistance(family.hue, candidate.hue);
      if (distance >= 140) relation = "complementary";
      else if (distance <= 40) relation = "analogous";
      else continue;
    }
    suggestions.push({ family: candidate, relation });
  }
  const order: Record<PartnerSuggestion["relation"], number> = {
    complementary: 0,
    neutral: 1,
    analogous: 2,
    tonal: 3,
  };
  return suggestions
    .sort((a, b) => order[a.relation] - order[b.relation])
    .slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* Wardrobe palette helpers                                            */
/* ------------------------------------------------------------------ */

export interface PaletteEntry {
  id: string;
  name: string;
  family: ColorFamily;
  count: number;
}

/** Build the wardrobe's color-family inventory (for the wheel + prompts). */
export function buildPalette(
  items: { id: string; name?: string; colorway?: string | null }[]
): PaletteEntry[] {
  const map = new Map<string, PaletteEntry>();
  for (const item of items) {
    const family = parseColorway(item.colorway);
    if (!family) continue;
    const existing = map.get(family.name);
    if (existing) existing.count += 1;
    else map.set(family.name, { id: item.id, name: family.name, family, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** The 12 classical wheel stops, clockwise from red at the top. */
export const WHEEL_STOPS: { hue: number; label: string; hex: string }[] = [
  { hue: 0, label: "Red", hex: "" },
  { hue: 30, label: "Orange", hex: "" },
  { hue: 60, label: "Yellow", hex: "" },
  { hue: 90, label: "Lime", hex: "" },
  { hue: 120, label: "Green", hex: "" },
  { hue: 150, label: "Spring", hex: "" },
  { hue: 180, label: "Teal", hex: "" },
  { hue: 210, label: "Azure", hex: "" },
  { hue: 240, label: "Blue", hex: "" },
  { hue: 270, label: "Violet", hex: "" },
  { hue: 300, label: "Magenta", hex: "" },
  { hue: 330, label: "Rose", hex: "" },
].map((stop) => ({ ...stop, hex: hslToHex(stop.hue, 68, 52) }));
