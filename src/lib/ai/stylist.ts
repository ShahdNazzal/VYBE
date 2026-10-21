// VYBE AI Stylist engine.
//
// - Builds a structured prompt from the user's real wardrobe.
// - Calls the LLM on the SERVER ONLY, via the first available provider:
//     1. Any OpenAI-compatible API — set OPENAI_API_KEY (+ optional
//        OPENAI_BASE_URL / OPENAI_MODEL) in .env. Works with OpenAI,
//        OpenRouter, Groq, DeepSeek, Together, local Ollama, …
//     2. z-ai-web-dev-sdk (Z.ai platform credential file).
// - Validates every returned item id against the authenticated user's wardrobe.
// - Falls back to a deterministic rule-based stylist when the AI service is
//   unavailable or returns unusable output. The fallback is clearly labeled
//   (source: "fallback") and never pretends to be AI-generated.

import { CATEGORY_LABELS, SEASON_LABELS, type Category, type Season } from "@/lib/domain";
import { analyzeHarmony, harmonyPhrase, parseColorway, type ColorFamily } from "@/lib/colors";

export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  colorway: string | null;
  styleTag: string | null;
  season: string | null;
  brand: string | null;
}

export interface StylistConstraints {
  excludeCategories?: string[];
  excludeItemIds?: string[];
  mustIncludeItemId?: string | null;
}

export interface RawOutfit {
  name: string;
  itemIds: string[];
  explanation: string;
  alternatives: { itemId: string; note: string }[];
}

export interface StylistResult {
  outfits: RawOutfit[];
  source: "ai" | "fallback";
  notice?: string;
}

/* ------------------------------------------------------------------ */
/* Prompt construction                                                 */
/* ------------------------------------------------------------------ */

function compactItem(item: WardrobeItem) {
  const family = parseColorway(item.colorway);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    color: item.colorway ?? undefined,
    colorFamily: family?.name,
    colorWheelPosition: family
      ? family.neutral
        ? "neutral"
        : Math.round(family.hue)
      : undefined,
    style: item.styleTag ?? undefined,
    season: item.season ?? undefined,
    brand: item.brand ?? undefined,
  };
}

/** Chromatic families of a set of items, for harmony math. */
function itemFamilies(items: WardrobeItem[]): (ColorFamily | null)[] {
  return items.map((item) => parseColorway(item.colorway));
}

export function buildStylistMessages(
  wardrobe: WardrobeItem[],
  occasion: string,
  style: string,
  constraints: StylistConstraints,
  extraInstruction?: string
) {
  const system = `You are VYBE's head fashion stylist — an editorial stylist with impeccable taste who writes for a premium fashion magazine.

You will receive the user's COMPLETE wardrobe as JSON, an occasion, a preferred style, and constraints. Your job: compose exactly 3 distinct, complete, wearable outfits using ONLY items from that wardrobe.

STRICT RULES:
1. Only reference item ids that exist in the provided wardrobe JSON. Never invent ids.
2. Each outfit uses 2 to 5 items and must read as a complete look: for most looks that means a top + a bottom, or a dress; shoes are strongly encouraged; outerwear and accessories refine it.
3. Respect every constraint: never use excluded categories or excluded item ids. If a must-include item id is given, it MUST appear in every outfit unless physically impossible.
4. Make the 3 outfits meaningfully different from each other (different pieces and moods, not reshuffles of the same look).
5. COLOR HARMONY — build each look around the color wheel: prefer complementary (opposite hues), analogous (neighboring hues), triadic, or a neutral base with ONE accent hue. Avoid 3+ unrelated hues in one look. Navy, denim, white, cream, beige, camel, grey and black count as neutrals that ground any hue. Each item carries a "colorWheelPosition": either "neutral" or its hue (0=red, 30=orange, 60=yellow, 120=green, 210=blue, 300=magenta). Name the color logic in the explanation (e.g. "a complementary pairing of wine and emerald"). Also weigh proportion, formality of the occasion, and the season of each item.
6. Write in an elegant, confident editorial voice. Keep each explanation to 2-3 sentences: why it works for the occasion, the color/silhouette logic, and one concrete styling note.
7. For alternatives, suggest ONE swap per outfit from wardrobe items NOT already in that outfit, with a short note.
8. Respond with STRICT JSON only. No markdown fences, no commentary. Exact shape:
{"outfits":[{"name":"<evocative editorial name>","itemIds":["<id>","..."],"explanation":"<2-3 sentences>","alternatives":[{"itemId":"<wardrobe id not used in this look>","note":"<swap rationale>"}]}]}`;

  const payload = {
    occasion,
    preferredStyle: style,
    constraints: {
      excludedCategories: constraints.excludeCategories ?? [],
      excludedItemIds: constraints.excludeItemIds ?? [],
      mustIncludeItemId: constraints.mustIncludeItemId ?? undefined,
    },
    wardrobe: wardrobe.map(compactItem),
  };

  const user = `Wardrobe, occasion and constraints (JSON):\n${JSON.stringify(payload)}${
    extraInstruction ? `\n\nAdditional instruction: ${extraInstruction}` : ""
  }\n\nCompose 3 outfits now. Remember: strict JSON only.`;

  return [
    { role: "assistant" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

/* ------------------------------------------------------------------ */
/* Response parsing + validation                                       */
/* ------------------------------------------------------------------ */

function extractJsonBlock(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Find the outermost JSON object inside a chattier response.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Validate & normalize the model output. Every id is checked against the
 * user's actual wardrobe; invalid outfits/ids are dropped, never invented.
 */
export function validateOutfits(
  raw: unknown,
  wardrobe: WardrobeItem[],
  constraints: StylistConstraints
): RawOutfit[] {
  if (!raw || typeof raw !== "object") return [];
  const outfitsRaw = (raw as { outfits?: unknown }).outfits;
  if (!Array.isArray(outfitsRaw)) return [];

  const byId = new Map(wardrobe.map((item) => [item.id, item]));
  const excluded = new Set(constraints.excludeItemIds ?? []);
  const excludedCats = new Set(constraints.excludeCategories ?? []);
  const mustInclude = constraints.mustIncludeItemId ?? null;

  const valid: RawOutfit[] = [];
  const seenSigs = new Set<string>();

  for (const entry of outfitsRaw.slice(0, 6)) {
    if (!entry || typeof entry !== "object") continue;
    const obj = entry as Record<string, unknown>;

    const idsRaw = Array.isArray(obj.itemIds) ? obj.itemIds : [];
    const itemIds: string[] = [];
    for (const id of idsRaw) {
      if (typeof id !== "string") continue;
      if (itemIds.includes(id)) continue; // dedupe within outfit
      const item = byId.get(id);
      if (!item) continue; // invalid id → drop silently
      if (excluded.has(id)) continue;
      if (excludedCats.has(item.category)) continue;
      itemIds.push(id);
    }

    if (mustInclude && !itemIds.includes(mustInclude)) {
      // Honor the must-include constraint by dropping outfits that ignore it.
      continue;
    }
    if (itemIds.length < 2 || itemIds.length > 5) continue;

    const explanation = asString(obj.explanation);
    if (explanation.length < 10) continue;

    const name = asString(obj.name) || "Untitled Look";

    // Validate alternatives the same way.
    const alternatives: { itemId: string; note: string }[] = [];
    const altsRaw = Array.isArray(obj.alternatives) ? obj.alternatives : [];
    for (const alt of altsRaw.slice(0, 3)) {
      if (!alt || typeof alt !== "object") continue;
      const a = alt as Record<string, unknown>;
      const altId = asString(a.itemId);
      const note = asString(a.note);
      if (!altId || !byId.has(altId) || itemIds.includes(altId)) continue;
      if (excluded.has(altId)) continue;
      alternatives.push({ itemId: altId, note: note || "A fresh direction for this look." });
    }

    const sig = [...itemIds].sort().join("|");
    if (seenSigs.has(sig)) continue; // dedupe identical combos across outfits
    seenSigs.add(sig);

    valid.push({ name, itemIds, explanation, alternatives });
    if (valid.length === 3) break;
  }
  return valid;
}

/* ------------------------------------------------------------------ */
/* Deterministic fallback stylist (rule-based, no AI)                  */
/* ------------------------------------------------------------------ */

function seasonAffinity(itemSeason: string | null): number {
  if (!itemSeason || itemSeason === "all-season") return 1;
  return 1.5;
}

function scoreItem(item: WardrobeItem, style: string): number {
  let score = 0;
  if (item.styleTag && item.styleTag.toLowerCase() === style.toLowerCase()) score += 3;
  score += seasonAffinity(item.season);
  if (item.colorway) score += 0.25;
  return score;
}

/** Classical color-wheel coherence of a set of items (0..1). */
function harmonyScoreOf(items: WardrobeItem[]): number {
  return analyzeHarmony(items.map((item) => parseColorway(item.colorway))).score;
}

function topK<T>(items: T[], k: number, score: (t: T) => number, salt = 0): T[] {
  return [...items]
    .map((item, index) => ({ item, key: score(item) + ((index + salt) % 3) * 0.01 }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((entry) => entry.item);
}

/** Build one rule-based look; `rotation` shifts picks to vary the 3 looks. */
function buildFallbackLook(
  wardrobe: WardrobeItem[],
  occasion: string,
  style: string,
  constraints: StylistConstraints,
  rotation: number
): RawOutfit | null {
  const excluded = new Set(constraints.excludeItemIds ?? []);
  const excludedCats = new Set(constraints.excludeCategories ?? []);
  const usable = wardrobe.filter(
    (item) => !excluded.has(item.id) && !excludedCats.has(item.category)
  );
  const byCat = (cat: Category) => usable.filter((item) => item.category === cat);
  const scorer = (item: WardrobeItem) => scoreItem(item, style);

  const picks: WardrobeItem[] = [];
  const used = new Set<string>();
  const take = (item: WardrobeItem | undefined) => {
    if (item && !used.has(item.id)) {
      used.add(item.id);
      picks.push(item);
    }
  };

  const dresses = topK(byCat("dresses"), 3 + rotation, scorer, rotation);
  const tops = topK(byCat("tops"), 3 + rotation, scorer, rotation);
  const bottoms = topK(byCat("bottoms"), 3 + rotation, scorer, rotation);
  const shoesPool = topK(byCat("shoes"), 3 + rotation, scorer, rotation);
  const outerwear = topK(byCat("outerwear"), 2 + rotation, scorer, rotation);
  const accessories = topK(byCat("accessories"), 2 + rotation, scorer, rotation);

  const mustInclude = constraints.mustIncludeItemId
    ? usable.find((item) => item.id === constraints.mustIncludeItemId)
    : null;
  if (mustInclude) take(mustInclude);

  const useDress = mustInclude
    ? mustInclude.category === "dresses"
    : dresses.length > 0 && (tops.length === 0 || bottoms.length === 0 || rotation === 1);

  /** Rotate through a pool but prefer the candidate that harmonizes with the anchor pieces. */
  const harmonizedPick = (
    pool: WardrobeItem[],
    anchor: WardrobeItem[],
    rotation: number
  ): WardrobeItem | undefined => {
    if (pool.length === 0) return undefined;
    const start = rotation % pool.length;
    const window = [pool[start], pool[(start + 1) % pool.length], pool[(start + 2) % pool.length]];
    if (anchor.length === 0) return window[0];
    let best = window[0];
    let bestKey = -Infinity;
    for (const candidate of window) {
      const key = scoreItem(candidate, style) + 1.5 * harmonyScoreOf([...anchor, candidate]);
      if (key > bestKey) {
        bestKey = key;
        best = candidate;
      }
    }
    return best;
  };

  if (useDress) {
    take(dresses[rotation % Math.max(dresses.length, 1)]);
    take(harmonizedPick(shoesPool, [...picks], rotation + 1));
  } else {
    take(tops[rotation % Math.max(tops.length, 1)]);
    take(harmonizedPick(bottoms, [...picks], rotation + 1));
    take(harmonizedPick(shoesPool, [...picks], rotation));
  }
  if (rotation !== 2) take(outerwear[rotation % Math.max(outerwear.length, 1)]);
  if (rotation === 2) take(accessories[rotation % Math.max(accessories.length, 1)]);

  if (picks.length < 2) return null;

  const colorway = picks.find((item) => item.colorway)?.colorway;
  const nameColor = colorway ? `${colorway} ` : "";
  const names = [
    `${nameColor}${occasion} Edit`,
    `The ${style} Study`,
    `${occasion}, ${style} Chapter`,
  ];
  const itemNames = picks.map((item) => item.name).join(", ");
  const seasons = [...new Set(picks.map((item) => item.season).filter(Boolean))]
    .map((season) => SEASON_LABELS[season as Season] ?? season)
    .join(" / ");
  const colorPhrase = harmonyPhrase(itemFamilies(picks));

  const explanation =
    `A ${style.toLowerCase()} leaning combination for ${occasion.toLowerCase()}: ${itemNames}. ` +
    (colorPhrase
      ? `The palette follows the color wheel — ${colorPhrase} — so the tones agree at a glance. Balanced proportions keep the silhouette intentional`
      : "Balanced proportions and a coherent palette keep the look intentional") +
    (seasons ? ` — curated for ${seasons.toLowerCase()} wear.` : ".");

  const altPool = usable.filter((item) => !used.has(item.id));
  const altSource = altPool.filter((item) => item.category === (useDress ? "outerwear" : "tops"));
  const alt = altSource[rotation % Math.max(altSource.length, 1)] ?? altPool[0];

  return {
    name: names[rotation % names.length],
    itemIds: picks.map((item) => item.id),
    explanation,
    alternatives: alt ? [{ itemId: alt.id, note: `Swap in ${alt.name} for a different mood.` }] : [],
  };
}

export function buildFallbackOutfits(
  wardrobe: WardrobeItem[],
  occasion: string,
  style: string,
  constraints: StylistConstraints
): RawOutfit[] {
  const looks: RawOutfit[] = [];
  for (let rotation = 0; rotation < 6 && looks.length < 3; rotation++) {
    const look = buildFallbackLook(wardrobe, occasion, style, constraints, rotation);
    if (!look) continue;
    const sig = [...look.itemIds].sort().join("|");
    if (looks.some((existing) => [...existing.itemIds].sort().join("|") === sig)) continue;
    looks.push(look);
  }
  return looks;
}

/* ------------------------------------------------------------------ */
/* LLM call with timeout + retry                                       */
/* ------------------------------------------------------------------ */

/**
 * Provider 1 — any OpenAI-compatible chat API, activated by OPENAI_API_KEY.
 * No extra dependency: plain fetch against ${OPENAI_BASE_URL}/chat/completions.
 */
async function callOpenAICompatible(
  messages: { role: "assistant" | "user"; content: string }[],
  apiKey: string
): Promise<string> {
  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  // OpenAI-compatible APIs expect the leading instruction as role "system".
  const mapped = messages.map((message, index) =>
    index === 0 && message.role === "assistant"
      ? { role: "system" as const, content: message.content }
      : message
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75_000);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages: mapped, temperature: 0.8 }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `AI provider returned ${response.status}: ${detail.slice(0, 300)}`
      );
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) throw new Error("Empty response from AI provider");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callLLM(messages: { role: "assistant" | "user"; content: string }[]): Promise<string> {
  // Provider 1: user-supplied OpenAI-compatible key (self-hosting friendly).
  const customKey = process.env.OPENAI_API_KEY?.trim();
  if (customKey) return callOpenAICompatible(messages, customKey);

  // Provider 2: Z.ai platform SDK.
  const { default: ZAI } = await import("z-ai-web-dev-sdk");
  const zai = await ZAI.create();

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("AI request timed out")), 75_000)
  );

  const completion = (await Promise.race([
    zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    }),
    timeout,
  ])) as { choices?: { message?: { content?: string } }[] };

  const content = completion?.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) throw new Error("Empty response from AI");
  return content;
}

/* ------------------------------------------------------------------ */
/* Public entry point                                                  */
/* ------------------------------------------------------------------ */

export async function generateOutfits(
  wardrobe: WardrobeItem[],
  occasion: string,
  style: string,
  constraints: StylistConstraints
): Promise<StylistResult> {
  // Hard pre-checks: the wardrobe must be able to produce a look at all.
  if (wardrobe.length < 2) {
    return {
      outfits: [],
      source: "fallback",
      notice: "Add at least two clothing items to your closet before generating looks.",
    };
  }

  const buildable =
    wardrobe.some((item) => item.category === "dresses") ||
    (wardrobe.some((item) => item.category === "tops") && wardrobe.some((item) => item.category === "bottoms"));

  if (!buildable) {
    return {
      outfits: [],
      source: "fallback",
      notice:
        "Your closet needs a dress, or at least one top and one bottom, to compose a full look.",
    };
  }

  const messages = buildStylistMessages(wardrobe, occasion, style, constraints);

  // Attempt 1 + corrective retry.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const attemptMessages =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user" as const,
                content:
                  "Your previous reply was not usable (invalid JSON or item ids outside the wardrobe). Recheck the wardrobe ids carefully and respond again with STRICT JSON matching the exact schema.",
              },
            ];
      const content = await callLLM(attemptMessages);
      const outfits = validateOutfits(extractJsonBlock(content), wardrobe, constraints);
      if (outfits.length === 3) {
        return { outfits, source: "ai" };
      }
      if (outfits.length > 0) {
        // Top up with rule-based looks so the UI always shows three cards.
        const fallback = buildFallbackOutfits(wardrobe, occasion, style, constraints).filter(
          (candidate) =>
            !outfits.some(
              (existing) =>
                [...existing.itemIds].sort().join("|") === [...candidate.itemIds].sort().join("|")
            )
        );
        return {
          outfits: [...outfits, ...fallback].slice(0, 3),
          source: "ai",
          notice: "Some looks were completed by our rule-based stylist.",
        };
      }
    } catch (error) {
      console.error("[stylist] AI attempt failed:", error instanceof Error ? error.message : error);
    }
  }

  // AI unavailable → deterministic rule-based stylist.
  const fallback = buildFallbackOutfits(wardrobe, occasion, style, constraints);
  return {
    outfits: fallback,
    source: "fallback",
    notice: fallback.length
      ? "The AI stylist is unavailable right now — these looks come from our rule-based stylist instead."
      : "Could not compose looks from the current closet filters. Try relaxing the constraints.",
  };
}

/* ------------------------------------------------------------------ */
/* Replace-a-single-item follow-up                                     */
/* ------------------------------------------------------------------ */

export interface ReplaceResult {
  newItemId: string | null;
  reason: string;
  source: "ai" | "fallback";
}

export async function replaceOutfitItem(
  wardrobe: WardrobeItem[],
  outfitItems: WardrobeItem[],
  replaceItemId: string,
  occasion: string,
  style: string
): Promise<ReplaceResult> {
  const target = outfitItems.find((item) => item.id === replaceItemId);
  if (!target) return { newItemId: null, reason: "That item is not part of this look.", source: "fallback" };

  const keepIds = outfitItems.filter((item) => item.id !== replaceItemId).map((item) => item.id);
  const candidates = wardrobe.filter(
    (item) => item.id !== replaceItemId && !keepIds.includes(item.id) && item.category === target.category
  );

  if (candidates.length === 0) {
    return {
      newItemId: null,
      reason: `No other ${CATEGORY_LABELS[target.category as Category] ?? target.category} in your closet to swap into this look.`,
      source: "fallback",
    };
  }

  const system = `You are VYBE's head fashion stylist. A user has an outfit and wants to replace exactly ONE item while keeping every other item unchanged.

Respond with STRICT JSON only, no markdown: {"itemId":"<id from candidates>","reason":"<1-2 sentences in an elegant editorial voice explaining why the swap works>"}

Rules:
- The replacement MUST come from the candidates JSON only (same category as the replaced item).
- Keep the rest of the outfit's character, palette and formality intact.
- Consider the occasion and preferred style.`;

  const user = JSON.stringify({
    occasion,
    preferredStyle: style,
    outfitItemIdsToKeep: keepIds,
    replacedItem: compactItem(target),
    candidates: candidates.map(compactItem),
  });

  try {
    const content = await callLLM([
      { role: "assistant" as const, content: system },
      { role: "user" as const, content: user },
    ]);
    const parsed = extractJsonBlock(content) as { itemId?: unknown; reason?: unknown } | null;
    const itemId = typeof parsed?.itemId === "string" ? parsed.itemId : null;
    if (itemId && candidates.some((candidate) => candidate.id === itemId)) {
      return {
        newItemId: itemId,
        reason: asString(parsed?.reason) || "A fresh piece for a fresh direction.",
        source: "ai",
      };
    }
  } catch (error) {
    console.error("[stylist] replace attempt failed:", error instanceof Error ? error.message : error);
  }

  // Deterministic fallback: style affinity + color harmony with the kept pieces.
  const kept = outfitItems.filter((item) => item.id !== replaceItemId);
  const pick = topK(
    candidates,
    candidates.length,
    (item) => scoreItem(item, style) + 1.5 * harmonyScoreOf([...kept, item])
  )[0];
  return {
    newItemId: pick.id,
    reason: `Swapped in ${pick.name} to keep the ${style.toLowerCase()} direction while refreshing the ${CATEGORY_LABELS[target.category as Category] ?? target.category}.`,
    source: "fallback",
  };
}
