"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookmarkCheck,
  BookmarkPlus,
  Loader2,
  RefreshCcw,
  Repeat,
  Trash2,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { analyzeHarmony, parseColorway, type ColorFamily } from "@/lib/colors";
import { CATEGORY_LABELS, type Category } from "@/lib/domain";
import { parseOutfitAlternatives, parseOutfitItems, type Item, type Outfit } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SwapInfo {
  reason: string;
  source: "ai" | "fallback";
  removedName: string;
  addedName: string;
}

export function OutfitCard({
  outfit,
  index = 0,
  onSavedChange,
  onDeleted,
}: {
  outfit: Outfit;
  index?: number;
  onSavedChange?: (outfit: Outfit) => void;
  onDeleted?: (outfit: Outfit) => void;
}) {
  const { toast } = useToast();
  const [current, setCurrent] = useState<Outfit>(outfit);
  const [saving, setSaving] = useState(false);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [lastSwap, setLastSwap] = useState<SwapInfo | null>(null);

  const items = parseOutfitItems(current);
  const alternatives = parseOutfitAlternatives(current);
  const itemMap = new Map<string, Item>(items.map((item) => [item.id, item]));

  // Color palette of the look, parsed from each piece's colorway.
  const paletteFamilies: (ColorFamily | null)[] = items.map((item) => parseColorway(item.colorway));
  const paletteDots: { name: string; hex: string }[] = [];
  for (const family of paletteFamilies) {
    if (family && !paletteDots.some((dot) => dot.name === family.name)) {
      paletteDots.push({ name: family.name, hex: family.hex });
    }
  }
  const harmony = analyzeHarmony(paletteFamilies);

  async function toggleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/outfits/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: !current.saved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setCurrent(data.outfit);
      onSavedChange?.(data.outfit);
      toast({
        title: data.outfit.saved ? "Saved to your lookbook" : "Removed from lookbook",
        description: data.outfit.saved
          ? `“${current.name}” is now in your Lookbook.`
          : `“${current.name}” was removed.`,
      });
    } catch (error) {
      toast({
        title: "Couldn't update the look",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteOutfit() {
    try {
      const res = await fetch(`/api/outfits/${current.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast({ title: "Look deleted", description: `“${current.name}” is gone.` });
      onDeleted?.(current);
    } catch (error) {
      toast({
        title: "Couldn't delete the look",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  /** Follow-up request: replace ONE item, keep the rest unchanged. */
  async function swapItem(replaceItemId: string, preferItemId?: string) {
    setSwappingId(replaceItemId);
    try {
      const res = await fetch("/api/outfits/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfitId: current.id, replaceItemId, preferItemId: preferItemId ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Swap failed");

      const updated: Outfit = data.outfit;
      setCurrent(updated);
      onSavedChange?.(updated);
      setLastSwap({
        reason: data.swap.reason,
        source: data.swap.source,
        removedName: itemMap.get(replaceItemId)?.name ?? "the piece",
        addedName: parseOutfitItems(updated).find((i) => i.id === data.swap.addedItemId)?.name ?? "a new piece",
      });
      toast({
        title: "Piece swapped",
        description: data.swap.reason,
      });
    } catch (error) {
      toast({
        title: "Couldn't swap that piece",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSwappingId(null);
    }
  }

  /** Bring a stylist's alternative into the look (replaces the same category). */
  async function applyAlternative(altItemId: string) {
    const altItem = itemMap.get(altItemId);
    if (!altItem) return;
    const target = items.find((item) => item.category === altItem.category);
    if (!target) {
      toast({
        title: "No matching piece to replace",
        description: `This look has no ${altItem.category} to swap out.`,
      });
      return;
    }
    await swapItem(target.id, altItemId);
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-card shadow-sm transition-shadow hover:shadow-xl hover:shadow-wine/5"
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 border-b border-sand/70 px-5 py-4">
        <div className="min-w-0">
          <p className="eyebrow text-primary">Look {index + 1}</p>
          <h3 className="mt-0.5 truncate font-display text-xl font-bold text-espresso" title={current.name}>
            {current.name}
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="rounded-full border-blush-deep/60 text-[10px] text-wine">
              {current.occasion}
            </Badge>
            <Badge variant="outline" className="rounded-full border-sand text-[10px] text-muted-foreground">
              {current.style}
            </Badge>
            {current.source === "fallback" && (
              <Badge variant="outline" className="rounded-full border-sand bg-cream text-[10px] text-muted-foreground">
                Rule-based stylist
              </Badge>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={toggleSave}
          disabled={saving}
          className={cn(
            "shrink-0 rounded-full",
            current.saved
              ? "bg-espresso hover:bg-wine-deep"
              : "bg-primary hover:bg-wine-deep"
          )}
          aria-label={current.saved ? "Remove from lookbook" : "Save to lookbook"}
        >
          {saving ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : current.saved ? (
            <BookmarkCheck className="mr-1.5 h-4 w-4" />
          ) : (
            <BookmarkPlus className="mr-1.5 h-4 w-4" />
          )}
          {current.saved ? "Saved" : "Save"}
        </Button>
      </div>

      {/* Item images */}
      <div className="grid flex-1 grid-cols-3 gap-2.5 p-5 sm:grid-cols-3">
        {items.map((item) => {
          const isSwapping = swappingId === item.id;
          return (
            <div key={item.id} className="group/item relative overflow-hidden rounded-xl border border-sand/70 bg-cream-dark">
              <div className="aspect-[3/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  loading="lazy"
                  className={cn(
                    "h-full w-full object-cover transition-all duration-300",
                    isSwapping && "opacity-30 blur-sm",
                    !isSwapping && "group-hover/item:scale-105"
                  )}
                />
              </div>
              {isSwapping ? (
                <div className="absolute inset-0 grid place-items-center bg-cream/60">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <button
                  onClick={() => swapItem(item.id)}
                  disabled={!!swappingId}
                  className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-espresso/70 via-transparent to-transparent p-2 opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 disabled:cursor-wait"
                  aria-label={`Swap ${item.name} for another piece`}
                >
                  <span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-wine shadow">
                    <Repeat className="h-3 w-3" /> Swap
                  </span>
                </button>
              )}
              <div className="pointer-events-none absolute left-1.5 top-1.5">
                <Badge className="rounded-full bg-espresso/75 px-2 py-0 text-[9px] font-semibold uppercase tracking-wider text-cream backdrop-blur-sm">
                  {CATEGORY_LABELS[item.category as Category] ?? item.category}
                </Badge>
              </div>
              <p className="truncate border-t border-sand/60 bg-white px-2 py-1.5 text-[11px] font-medium text-espresso" title={item.name}>
                {item.name}
              </p>
            </div>
          );
        })}
      </div>

      {/* Styling rationale */}
      <div className="space-y-3 border-t border-sand/70 bg-cream/40 px-5 py-4">
        {paletteDots.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" title={harmony.note}>
            <span className="eyebrow text-muted-foreground">Palette</span>
            <span className="flex items-center gap-1">
              {paletteDots.map((dot) => (
                <span
                  key={dot.name}
                  title={dot.name}
                  className="h-3.5 w-3.5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: dot.hex }}
                />
              ))}
            </span>
            <span className="text-[11px] italic text-wine">{harmony.label}</span>
          </div>
        )}
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {current.explanation}
        </p>

        {lastSwap && (
          <p className="flex items-start gap-1.5 text-xs italic text-wine">
            <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Swapped {lastSwap.removedName} → {lastSwap.addedName}
          </p>
        )}

        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div className="space-y-1.5">
            <p className="eyebrow text-muted-foreground">Stylist&apos;s alternatives</p>
            {alternatives.map((alt) => {
              const altItem = itemMap.get(alt.itemId);
              if (!altItem) return null;
              return (
                <div key={alt.itemId} className="flex items-center gap-2 rounded-lg border border-sand/70 bg-white px-2.5 py-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={altItem.imageUrl} alt={altItem.name} className="h-8 w-8 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-espresso">{altItem.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{alt.note}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 rounded-full px-2 text-[11px] text-primary hover:bg-blush/50"
                    disabled={!!swappingId}
                    onClick={() => applyAlternative(alt.itemId)}
                    title={`Swap ${altItem.name} into the look`}
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {onDeleted && (
          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteOutfit}
              className="rounded-full text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete look
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
