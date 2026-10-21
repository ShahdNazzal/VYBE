"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Search, SlidersHorizontal, Shirt, Sparkles } from "lucide-react";
import { ItemCard } from "@/components/item-card";
import { ItemForm, itemToFormValues, type ItemFormValues } from "@/components/item-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/domain";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function ClosetPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [seeding, setSeeding] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/items");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load closet");
      setItems(data.items);
    } catch (error) {
      toast({
        title: "Couldn't load your closet",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const availableStyles = useMemo(
    () =>
      [...new Set(items.map((item) => item.styleTag).filter((style): style is string => !!style))].sort(),
    [items]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (styleFilter !== "all" && item.styleTag !== styleFilter) return false;
      if (seasonFilter !== "all" && item.season !== seasonFilter) return false;
      if (q) {
        const haystack = [item.name, item.brand, item.colorway, item.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, category, styleFilter, seasonFilter]);

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [items]);

  async function handleSave(values: ItemFormValues) {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        category: values.category,
        colorway: values.colorway || null,
        styleTag: values.styleTag || null,
        season: values.season || null,
        brand: values.brand || null,
        notes: values.notes || null,
        imageUrl: values.imageUrl,
      };
      const res = await fetch(editingItem ? `/api/items/${editingItem.id}` : "/api/items", {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      await fetchItems();
      setFormOpen(false);
      setEditingItem(null);
      toast({
        title: editingItem ? "Item updated" : "Added to your closet",
        description: `“${values.name}” is ready for styling.`,
      });
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Something went wrong.";
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingItem) return;
    try {
      const res = await fetch(`/api/items/${deletingItem.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setItems((prev) => prev.filter((item) => item.id !== deletingItem.id));
      toast({ title: "Item removed", description: `“${deletingItem.name}” left your closet.` });
    } catch (error) {
      toast({
        title: "Couldn't delete item",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingItem(null);
    }
  }

  async function seedStarterWardrobe() {
    setSeeding(true);
    try {
      const res = await fetch("/api/sample-wardrobe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seeding failed");
      toast({
        title: "Starter wardrobe added",
        description: `${data.added} curated pieces were added to your closet.`,
      });
      await fetchItems();
    } catch (error) {
      toast({
        title: "Couldn't add the starter wardrobe",
        description: error instanceof Error ? error.message : "Please add items manually.",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  }

  const hasFilters = query || category !== "all" || styleFilter !== "all" || seasonFilter !== "all";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Your wardrobe</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-espresso">My Closet</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {loading ? "Opening the doors…" : `${items.length} ${items.length === 1 ? "piece" : "pieces"} catalogued — the stylist only works with what you own.`}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setFormOpen(true);
          }}
          className="rounded-full bg-primary px-5 hover:bg-wine-deep"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add item
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, color, brand…"
              className="rounded-full border-sand bg-white pl-9"
              aria-label="Search items"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters((prev) => !prev)}
            className={cn(
              "rounded-full",
              showFilters ? "bg-primary hover:bg-wine-deep" : "border-sand bg-white"
            )}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Category filter">
          <button
            role="tab"
            aria-selected={category === "all"}
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              category === "all"
                ? "bg-espresso text-cream"
                : "bg-white text-muted-foreground hover:text-foreground border border-sand"
            )}
          >
            All · {items.length}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                category === cat
                  ? "bg-espresso text-cream"
                  : "bg-white text-muted-foreground hover:text-foreground border border-sand"
              )}
            >
              {CATEGORY_LABELS[cat]} · {countByCategory.get(cat) ?? 0}
            </button>
          ))}
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-sand bg-white p-3"
          >
            <label className="text-xs font-medium text-muted-foreground">Style</label>
            <select
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              className="rounded-full border border-sand bg-cream px-3 py-1.5 text-xs"
              aria-label="Filter by style"
            >
              <option value="all">Any style</option>
              {availableStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            <label className="ml-2 text-xs font-medium text-muted-foreground">Season</label>
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="rounded-full border border-sand bg-cream px-3 py-1.5 text-xs"
              aria-label="Filter by season"
            >
              <option value="all">Any season</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
              <option value="all-season">All season</option>
            </select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto rounded-full text-primary hover:text-wine-deep"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setStyleFilter("all");
                  setSeasonFilter("all");
                }}
              >
                Clear all
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-[4/5] rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item, index) => (
            <ItemCard
              key={item.id}
              item={item}
              index={index}
              onEdit={(it) => {
                setEditingItem(it);
                setFormOpen(true);
              }}
              onDelete={(it) => setDeletingItem(it)}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Empty closet */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-sand bg-white/60 px-6 py-16 text-center"
        >
          <div className="grid h-14 w-14 place-items-center rounded-full bg-blush">
            <Shirt className="h-7 w-7 text-wine" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-espresso">Your closet awaits</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Add the pieces you own and VYBE will compose editorial looks from them. Start with a
            few favourites — tops, bottoms and shoes are the essentials.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                setEditingItem(null);
                setFormOpen(true);
              }}
              className="rounded-full bg-primary px-6 hover:bg-wine-deep"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add your first item
            </Button>
            <Button
              variant="outline"
              onClick={seedStarterWardrobe}
              disabled={seeding}
              className="rounded-full border-primary/30 text-primary hover:bg-blush/50"
            >
              {seeding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Add starter wardrobe
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-sand bg-white/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-espresso">Nothing matches those filters</p>
          <p className="mt-1.5 text-sm text-muted-foreground">Try clearing a filter or two.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full border-sand"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setStyleFilter("all");
              setSeasonFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditingItem(null); } }}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto scroll-slim sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-espresso">
              {editingItem ? "Edit piece" : "New piece"}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? "Update the details of this piece." : "Add a photo and a few details — the stylist handles the rest."}
            </DialogDescription>
          </DialogHeader>
          <ItemForm
            key={editingItem?.id ?? "new"}
            initial={editingItem ? itemToFormValues(editingItem) : undefined}
            onSubmit={handleSave}
            onCancel={() => {
              setFormOpen(false);
              setEditingItem(null);
            }}
            submitting={submitting}
            submitLabel={editingItem ? "Save changes" : "Add to closet"}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="max-w-sm sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-espresso">Remove this piece?</DialogTitle>
            <DialogDescription>
              “{deletingItem?.name}” will be removed from your closet. Outfits you already saved keep
              their own record of it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeletingItem(null)}>
              Keep it
            </Button>
            <Button variant="destructive" className="rounded-full" onClick={handleDelete}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tiny footer note */}
      {!loading && items.length > 0 && (
        <p className="mt-10 text-center text-xs text-muted-foreground">
          <Badge variant="outline" className="mr-1.5 rounded-full border-sand px-2 py-0 text-[10px]">
            Tip
          </Badge>
          The more complete your closet (tops, bottoms, shoes…), the sharper the stylist&apos;s looks.
        </p>
      )}
    </div>
  );
}
