"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ban, Check, Loader2, Lock, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, CATEGORY_LABELS, OCCASIONS, STYLE_TAGS } from "@/lib/domain";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function StudioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [occasion, setOccasion] = useState<string>("Office Day");
  const [style, setStyle] = useState<string>("Minimalist");
  const [excludeCategories, setExcludeCategories] = useState<string[]>([]);
  const [excludeItemIds, setExcludeItemIds] = useState<string[]>([]);
  const [mustIncludeItemId, setMustIncludeItemId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/items");
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load closet");
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load closet");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usableItems = useMemo(
    () => items.filter((item) => !excludeCategories.includes(item.category) && !excludeItemIds.includes(item.id)),
    [items, excludeCategories, excludeItemIds]
  );

  const canCompose = useMemo(
    () =>
      usableItems.some((item) => item.category === "dresses") ||
      (usableItems.some((item) => item.category === "tops") &&
        usableItems.some((item) => item.category === "bottoms")),
    [usableItems]
  );

  function toggleExcludeCategory(cat: string) {
    setExcludeCategories((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      // Drop must-include if its category got excluded.
      const mustItem = items.find((item) => item.id === mustIncludeItemId);
      if (mustItem && next.includes(mustItem.category)) setMustIncludeItemId(null);
      return next;
    });
  }

  function toggleExcludeItem(id: string) {
    setExcludeItemIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.includes(id) && mustIncludeItemId === id) setMustIncludeItemId(null);
      return next;
    });
  }

  async function generate() {
    if (!canCompose) {
      toast({
        title: "Not enough to compose a look",
        description: "Your constraints leave no dress, or no top + bottom, to build outfits from.",
        variant: "destructive",
      });
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occasion, style, excludeCategories, excludeItemIds, mustIncludeItemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The stylist couldn't compose looks right now.");
      router.push(`/outfits/${data.generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setGenerating(false);
    }
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-sm font-medium transition-all",
      active
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-sand bg-white text-muted-foreground hover:border-blush-deep hover:text-foreground"
    );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="text-center">
        <p className="eyebrow text-primary">The AI Outfit Studio</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-espresso sm:text-5xl">
          Tell the stylist <span className="italic text-wine">where</span> you&apos;re going
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          VYBE composes three complete looks using <span className="font-semibold text-foreground">only the pieces in your closet</span> —
          validated against your wardrobe, never invented.
        </p>
      </div>

      {/* Wardrobe guard */}
      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-2xl border border-dashed border-sand bg-white/70 px-6 py-14 text-center"
        >
          <Lock className="mx-auto h-8 w-8 text-wine" />
          <h2 className="mt-4 font-display text-2xl font-bold text-espresso">Your closet is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            The stylist works exclusively with your own pieces. Add a few items first — then come
            back and watch the looks appear.
          </p>
          <Button
            onClick={() => router.push("/closet")}
            className="mt-6 rounded-full bg-primary px-6 hover:bg-wine-deep"
          >
            <Sparkles className="mr-1.5 h-4 w-4" /> Go to My Closet
          </Button>
        </motion.div>
      ) : (
        <div className="mt-10 space-y-8">
          {/* Occasion */}
          <section aria-labelledby="occasion-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="occasion-heading" className="font-display text-xl font-bold text-espresso">
                1 · The occasion
              </h2>
              <p className="text-xs text-muted-foreground">sets formality &amp; mood</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((occ) => (
                <button key={occ} onClick={() => setOccasion(occ)} className={chip(occasion === occ)} aria-pressed={occasion === occ}>
                  {occ}
                </button>
              ))}
            </div>
          </section>

          {/* Style */}
          <section aria-labelledby="style-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="style-heading" className="font-display text-xl font-bold text-espresso">
                2 · Your style direction
              </h2>
              <p className="text-xs text-muted-foreground">one look, one vibe</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => (
                <button key={tag} onClick={() => setStyle(tag)} className={chip(style === tag)} aria-pressed={style === tag}>
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Constraints */}
          <section aria-labelledby="constraints-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="constraints-heading" className="font-display text-xl font-bold text-espresso">
                3 · Constraints <span className="text-sm font-normal italic text-muted-foreground">(optional)</span>
              </h2>
              <p className="text-xs text-muted-foreground">the stylist obeys these strictly</p>
            </div>

            <div className="space-y-5 rounded-2xl border border-sand bg-white/70 p-5">
              {/* Exclude categories */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Ban className="h-3.5 w-3.5" /> Skip categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const excluded = excludeCategories.includes(cat);
                    const count = items.filter((item) => item.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleExcludeCategory(cat)}
                        aria-pressed={excluded}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                          excluded
                            ? "border-destructive/40 bg-destructive/10 text-destructive line-through"
                            : "border-sand bg-cream text-muted-foreground hover:border-blush-deep hover:text-foreground"
                        )}
                      >
                        {CATEGORY_LABELS[cat]} · {count}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Must include + exclude items */}
              {items.length > 0 && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Check className="h-3.5 w-3.5" /> Must include
                    </p>
                    <div className="max-h-44 space-y-1.5 overflow-y-auto scroll-slim pr-1">
                      {items.map((item) => {
                        const disabled = excludeItemIds.includes(item.id) || excludeCategories.includes(item.category);
                        const selected = mustIncludeItemId === item.id;
                        return (
                          <button
                            key={item.id}
                            disabled={disabled}
                            onClick={() => setMustIncludeItemId(selected ? null : item.id)}
                            aria-pressed={selected}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40",
                              selected ? "border-primary bg-blush/50" : "border-sand bg-cream hover:border-blush-deep"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.name}</span>
                            {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Ban className="h-3.5 w-3.5" /> Don&apos;t use these pieces
                    </p>
                    <div className="max-h-44 space-y-1.5 overflow-y-auto scroll-slim pr-1">
                      {items.map((item) => {
                        const excluded = excludeItemIds.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleExcludeItem(item.id)}
                            aria-pressed={excluded}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-all",
                              excluded ? "border-destructive/40 bg-destructive/5" : "border-sand bg-cream hover:border-blush-deep"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.imageUrl} alt="" className={cn("h-9 w-9 rounded-md object-cover", excluded && "grayscale")} />
                            <span className={cn("min-w-0 flex-1 truncate text-xs font-medium", excluded && "line-through text-muted-foreground")}>
                              {item.name}
                            </span>
                            {excluded && <Ban className="h-3.5 w-3.5 shrink-0 text-destructive" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Generate */}
          <div className="pb-4 text-center">
            {error && (
              <p className="mx-auto mb-4 max-w-lg rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {!canCompose && items.length > 0 && (
              <p className="mx-auto mb-4 max-w-lg rounded-xl border border-blush-deep/50 bg-blush/30 px-4 py-3 text-sm text-wine">
                Your current constraints leave nothing to compose with — you need at least a dress,
                or a top + bottom available.
              </p>
            )}
            <Button
              onClick={generate}
              disabled={generating || !canCompose}
              size="lg"
              className="rounded-full bg-primary px-10 py-6 text-base font-semibold shadow-lg shadow-wine/20 hover:bg-wine-deep"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2.5 h-5 w-5 animate-spin" />
                  Styling you…
                </>
              ) : (
                <>
                  <Wand2 className="mr-2.5 h-5 w-5" />
                  Generate three looks
                </>
              )}
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              {usableItems.length} pieces available · {occasion} · {style} · takes a moment, worth it
            </p>

            {generating && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-auto mt-6 max-w-md text-sm italic text-wine"
              >
                &ldquo;Pairing the cream knit with…&rdquo; — the stylist is reviewing your wardrobe.
              </motion.p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
