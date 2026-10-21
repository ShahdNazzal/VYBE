"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, CATEGORY_LABELS, SEASONS, SEASON_LABELS, STYLE_TAGS } from "@/lib/domain";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ItemFormValues {
  name: string;
  category: string;
  colorway: string;
  styleTag: string;
  season: string;
  brand: string;
  notes: string;
  imageUrl: string;
}

const EMPTY: ItemFormValues = {
  name: "",
  category: "",
  colorway: "",
  styleTag: "",
  season: "",
  brand: "",
  notes: "",
  imageUrl: "",
};

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-sand bg-white text-muted-foreground hover:border-blush-deep hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function ItemForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  submitLabel,
}: {
  initial?: Partial<ItemFormValues>;
  onSubmit: (values: ItemFormValues) => Promise<string | null>;
  onCancel: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [values, setValues] = useState<ItemFormValues>({ ...EMPTY, ...initial });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function handleFile(file: File) {
    setUploadError(null);
    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Image must be under 8 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      set("imageUrl", data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) return setError("Give the item a name.");
    if (!values.category) return setError("Pick a category.");
    if (!values.imageUrl) return setError("Add a photo of the item.");
    const err = await onSubmit(values);
    if (err) setError(err);
  }

  const inputClass =
    "w-full rounded-lg border border-sand bg-white px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image uploader */}
      <div>
        <label className="eyebrow mb-2 block text-muted-foreground">Photo</label>
        {values.imageUrl ? (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={values.imageUrl}
              alt="Selected item preview"
              className="h-40 w-40 rounded-xl border border-sand object-cover"
            />
            <button
              type="button"
              onClick={() => set("imageUrl", "")}
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-espresso text-white shadow-md hover:bg-wine"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sand bg-cream/60 text-muted-foreground transition-colors hover:border-primary hover:bg-blush/40 hover:text-primary disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-xs">Uploading…</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-medium">Upload a photo (JPG, PNG, WebP · max 8 MB)</span>
              </>
            )}
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        {uploadError && <p className="mt-2 text-xs text-destructive">{uploadError}</p>}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="item-name" className="eyebrow mb-2 block text-muted-foreground">
          Name
        </label>
        <input
          id="item-name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Oversized Linen Shirt"
          maxLength={80}
          className={inputClass}
        />
      </div>

      {/* Category */}
      <div>
        <span className="eyebrow mb-2 block text-muted-foreground">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Chip key={cat} active={values.category === cat} onClick={() => set("category", cat)}>
              {CATEGORY_LABELS[cat]}
            </Chip>
          ))}
        </div>
      </div>

      {/* Style + season */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="eyebrow mb-2 block text-muted-foreground">Style</span>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_TAGS.slice(0, 8).map((tag) => (
              <Chip
                key={tag}
                active={values.styleTag === tag}
                onClick={() => set("styleTag", values.styleTag === tag ? "" : tag)}
              >
                {tag}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <span className="eyebrow mb-2 block text-muted-foreground">Season</span>
          <div className="flex flex-wrap gap-1.5">
            {SEASONS.map((season) => (
              <Chip
                key={season}
                active={values.season === season}
                onClick={() => set("season", values.season === season ? "" : season)}
              >
                {SEASON_LABELS[season]}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Colorway + brand */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="item-colorway" className="eyebrow mb-2 block text-muted-foreground">
            Colorway
          </label>
          <input
            id="item-colorway"
            value={values.colorway}
            onChange={(e) => set("colorway", e.target.value)}
            placeholder="e.g. Cream"
            maxLength={40}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="item-brand" className="eyebrow mb-2 block text-muted-foreground">
            Brand <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="item-brand"
            value={values.brand}
            onChange={(e) => set("brand", e.target.value)}
            placeholder="e.g. Zara"
            maxLength={60}
            className={inputClass}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="item-notes" className="eyebrow mb-2 block text-muted-foreground">
          Notes <span className="normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id="item-notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything the stylist should know — fit, fabric, occasion fit…"
          rows={2}
          maxLength={500}
          className={cn(inputClass, "resize-none")}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-full bg-primary px-6 hover:bg-wine-deep"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function itemToFormValues(item: Item): ItemFormValues {
  return {
    name: item.name,
    category: item.category,
    colorway: item.colorway ?? "",
    styleTag: item.styleTag ?? "",
    season: item.season ?? "",
    brand: item.brand ?? "",
    notes: item.notes ?? "",
    imageUrl: item.imageUrl,
  };
}
