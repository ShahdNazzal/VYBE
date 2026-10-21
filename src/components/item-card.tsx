"use client";

import { motion } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORY_LABELS, SEASON_LABELS, type Category, type Season } from "@/lib/domain";
import { parseColorway } from "@/lib/colors";
import type { Item } from "@/lib/types";

export function ItemCard({
  item,
  onEdit,
  onDelete,
  index = 0,
}: {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  index?: number;
}) {
  const colorFamily = parseColorway(item.colorway);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.4), ease: "easeOut" }}
      className="group relative overflow-hidden rounded-xl border border-sand bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-wine/5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-cream-dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-2.5 top-2.5">
          <Badge className="rounded-full bg-espresso/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cream backdrop-blur-sm">
            {CATEGORY_LABELS[item.category as Category] ?? item.category}
          </Badge>
        </div>
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white"
                aria-label={`Options for ${item.name}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit item
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-1.5 p-4">
        <h3 className="truncate text-sm font-semibold leading-snug" title={item.name}>
          {item.name}
        </h3>
        <p className="flex items-center truncate text-xs text-muted-foreground">
          {colorFamily && (
            <span
              className="mr-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: colorFamily.hex }}
              title={colorFamily.name}
            />
          )}
          <span className="truncate">
            {[item.colorway, item.brand].filter(Boolean).join(" · ") || "—"}
          </span>
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {item.styleTag && (
            <Badge variant="outline" className="rounded-full border-blush-deep/60 px-2 py-0 text-[10px] text-wine">
              {item.styleTag}
            </Badge>
          )}
          {item.season && item.season !== "all-season" && (
            <Badge variant="outline" className="rounded-full border-sand px-2 py-0 text-[10px] text-muted-foreground">
              {SEASON_LABELS[item.season as Season] ?? item.season}
            </Badge>
          )}
        </div>
      </div>
    </motion.article>
  );
}
