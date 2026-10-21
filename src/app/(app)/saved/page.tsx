"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BookHeart, Sparkles } from "lucide-react";
import Link from "next/link";
import { OutfitCard } from "@/components/outfit-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Outfit } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SavedPage() {
  const { toast } = useToast();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [occasionFilter, setOccasionFilter] = useState<string>("all");

  const fetchSaved = useCallback(async () => {
    try {
      const res = await fetch("/api/outfits?saved=1");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load lookbook");
      setOutfits(data.outfits);
    } catch (error) {
      toast({
        title: "Couldn't load your lookbook",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchSaved();
  }, [fetchSaved]);

  const occasions = useMemo(
    () => [...new Set(outfits.map((outfit) => outfit.occasion))],
    [outfits]
  );

  const filtered = useMemo(
    () => (occasionFilter === "all" ? outfits : outfits.filter((outfit) => outfit.occasion === occasionFilter)),
    [outfits, occasionFilter]
  );

  function handleSavedChange(updated: Outfit) {
    if (!updated.saved) {
      // Unsaved from the lookbook → remove it from this view.
      setOutfits((prev) => prev.filter((outfit) => outfit.id !== updated.id));
    } else {
      setOutfits((prev) => prev.map((outfit) => (outfit.id === updated.id ? updated : outfit)));
    }
  }

  function handleDeleted(removed: Outfit) {
    setOutfits((prev) => prev.filter((outfit) => outfit.id !== removed.id));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Your keepsakes</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-espresso">The Lookbook</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {loading ? "Flipping the pages…" : `${outfits.length} saved ${outfits.length === 1 ? "look" : "looks"} — swap pieces, revisit, rewear.`}
          </p>
        </div>
        <Button asChild className="rounded-full bg-primary px-5 hover:bg-wine-deep">
          <Link href="/studio">
            <Sparkles className="mr-1.5 h-4 w-4" /> New looks
          </Link>
        </Button>
      </div>

      {/* Occasion filter */}
      {!loading && occasions.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          <button
            onClick={() => setOccasionFilter("all")}
            aria-pressed={occasionFilter === "all"}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              occasionFilter === "all"
                ? "bg-espresso text-cream"
                : "border border-sand bg-white text-muted-foreground hover:text-foreground"
            )}
          >
            All · {outfits.length}
          </button>
          {occasions.map((occasion) => (
            <button
              key={occasion}
              onClick={() => setOccasionFilter(occasion)}
              aria-pressed={occasionFilter === occasion}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                occasionFilter === occasion
                  ? "bg-espresso text-cream"
                  : "border border-sand bg-white text-muted-foreground hover:text-foreground"
              )}
            >
              {occasion}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
          {filtered.map((outfit, index) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              index={index}
              onSavedChange={handleSavedChange}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-sand bg-white/60 px-6 py-16 text-center"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-blush">
            <BookHeart className="h-7 w-7 text-wine" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-espresso">No saved looks yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            When the stylist nails it, tap <span className="font-semibold text-foreground">Save</span> on
            any look and it will live here — ready for its next wear.
          </p>
          <Button asChild className="mt-6 rounded-full bg-primary px-6 hover:bg-wine-deep">
            <Link href="/studio">
              <Sparkles className="mr-1.5 h-4 w-4" /> Open the Studio
            </Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
}
