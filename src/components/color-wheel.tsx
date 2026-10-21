"use client";

// VYBE — Interactive color wheel.
//
// A decorative-but-useful wheel built from classical color theory:
//  - the 12 classical hue segments drawn as an SVG ring
//  - the user's real wardrobe colors plotted on the wheel (by parsed colorway)
//  - clicking a color highlights its harmony relationships: complementary
//    line, analogous wedge, and which of HER pieces pair with it
//  - neutral families (cream, camel, navy, denim…) sit beneath the wheel,
//    because neutrals ground every hue
//
// Pure SVG + framer-motion — no chart library, no extra dependency.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { buildPalette, hueDistance, suggestPartners, WHEEL_STOPS, type PaletteEntry } from "@/lib/colors";
import { cn } from "@/lib/utils";

const SIZE = 320;
const CENTER = SIZE / 2;
const RING_OUTER = 148;
const RING_INNER = 108;
const GAP_DEG = 1.6;

const RELATION_LABELS: Record<string, string> = {
  complementary: "opposite on the wheel",
  neutral: "grounds it",
  analogous: "beside it",
  tonal: "same family",
};

/** SVG coords for a hue/radius. Hue 0 (red) points up, increasing clockwise. */
function pointAt(hue: number, radius: number): { x: number; y: number } {
  const angle = ((hue - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/** Annular sector path between two hues (clockwise) and two radii. */
function sectorPath(hueStart: number, hueEnd: number, rInner: number, rOuter: number): string {
  const largeArc = hueEnd - hueStart > 180 ? 1 : 0;
  const o1 = pointAt(hueStart, rOuter);
  const o2 = pointAt(hueEnd, rOuter);
  const i2 = pointAt(hueEnd, rInner);
  const i1 = pointAt(hueStart, rInner);
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function ColorWheel({ items }: { items: { id: string; colorway?: string | null }[] }) {
  const palette = useMemo(() => buildPalette(items), [items]);
  const [selected, setSelected] = useState<PaletteEntry | null>(null);

  const chromatic = palette.filter((entry) => !entry.family.neutral);
  const neutrals = palette.filter((entry) => entry.family.neutral);

  // Stagger dots that share a similar hue so they never overlap.
  const placed = useMemo(() => {
    const sorted = [...chromatic].sort((a, b) => a.family.hue - b.family.hue);
    return sorted
      .reduce<{
        result: { entry: PaletteEntry; radius: number }[];
        lastHue: number | null;
        tier: number;
      }>(
        (acc, entry) => {
          const tier =
            acc.lastHue !== null && hueDistance(entry.family.hue, acc.lastHue) < 16
              ? (acc.tier + 1) % 3
              : 0;
          acc.result.push({ entry, radius: 88 + tier * 11 });
          return { result: acc.result, lastHue: entry.family.hue, tier };
        },
        { result: [], lastHue: null, tier: 0 }
      )
      .result;
  }, [chromatic]);

  const selectedFamily = selected?.family ?? null;
  const partners = useMemo(
    () =>
      selectedFamily
        ? suggestPartners(selectedFamily, palette.map((entry) => entry.family))
        : [],
    [selectedFamily, palette]
  );

  if (palette.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-sand bg-white/60 px-6 py-10 text-center text-sm text-muted-foreground">
        Add colorways to your pieces — <span className="italic">Cream, Wine, Mid Wash Denim…</span>{" "}
        — and your palette blooms on the wheel here.
      </p>
    );
  }

  const complementHue = selectedFamily && !selectedFamily.neutral ? selectedFamily.hue + 180 : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-[264px] sm:w-[320px]"
          role="img"
          aria-label="Color wheel with your wardrobe colors plotted on it"
        >
          <defs>
            <radialGradient id="vybe-wheel-glow" cx="50%" cy="42%" r="65%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F5EFE2" stopOpacity="0.35" />
            </radialGradient>
          </defs>

          {/* Analogous wedge behind the ring */}
          {selectedFamily && !selectedFamily.neutral && (
            <path
              d={sectorPath(selectedFamily.hue - 40, selectedFamily.hue + 40, RING_INNER - 4, RING_OUTER + 8)}
              className="fill-wine/10"
            />
          )}

          {/* Center glow */}
          <circle cx={CENTER} cy={CENTER} r={RING_INNER - 2} fill="url(#vybe-wheel-glow)" />

          {/* 12 classical segments */}
          {WHEEL_STOPS.map((stop, index) => (
            <motion.path
              key={stop.label}
              d={sectorPath(stop.hue - 15 + GAP_DEG / 2, stop.hue + 15 - GAP_DEG / 2, RING_INNER, RING_OUTER)}
              fill={stop.hex}
              stroke="#FFFFFF"
              strokeWidth="1"
              opacity={selectedFamily && !selectedFamily.neutral ? 0.88 : 1}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: selectedFamily && !selectedFamily.neutral ? 0.88 : 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.03 }}
              style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
            />
          ))}

          {/* Complementary line + target */}
          {complementHue !== null && (
            <g>
              {(() => {
                const from = pointAt(selectedFamily!.hue, 96);
                const to = pointAt(complementHue, 96);
                const target = pointAt(complementHue, 128);
                return (
                  <>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <motion.circle
                      cx={target.x}
                      cy={target.y}
                      r="9"
                      fill="none"
                      stroke="#6E1F31"
                      strokeWidth="1.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      style={{ transformOrigin: `${target.x}px ${target.y}px` }}
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* Wardrobe dots */}
          {placed.map(({ entry, radius }) => {
            const position = pointAt(entry.family.hue, radius);
            const isSelected = selected?.name === entry.name;
            const isPartner =
              !!selectedFamily &&
              partners.some((partner) => partner.family.name === entry.family.name);
            return (
              <g
                key={entry.name}
                role="button"
                tabIndex={0}
                aria-label={`${entry.name}, ${entry.count} piece${entry.count > 1 ? "s" : ""} — show color partners`}
                onClick={() => setSelected(isSelected ? null : entry)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(isSelected ? null : entry);
                  }
                }}
                className="cursor-pointer outline-none"
              >
                <circle cx={position.x} cy={position.y} r="14" fill="transparent" />
                <motion.circle
                  cx={position.x}
                  cy={position.y}
                  r={isSelected ? 9 : 6.5 + Math.min(entry.count * 0.8, 2.5)}
                  fill={entry.family.hex}
                  stroke={isSelected ? "#6E1F31" : "#FFFFFF"}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.25 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  style={{ transformOrigin: `${position.x}px ${position.y}px` }}
                />
                {isPartner && (
                  <circle
                    cx={position.x}
                    cy={position.y}
                    r="11.5"
                    fill="none"
                    stroke="#6E1F31"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}
              </g>
            );
          })}
        </svg>

        {selectedFamily && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-x-0 bottom-1 text-center text-[11px] font-medium uppercase tracking-widest text-wine"
          >
            {selectedFamily.name}
          </motion.p>
        )}
      </div>

      {/* Neutrals row */}
      {neutrals.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Neutrals
          </span>
          {neutrals.map((entry) => (
            <button
              key={entry.name}
              onClick={() => setSelected(selected?.name === entry.name ? null : entry)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                selected?.name === entry.name
                  ? "border-wine bg-blush/60 text-wine"
                  : "border-sand bg-white text-muted-foreground hover:border-blush-deep hover:text-foreground"
              )}
              aria-pressed={selected?.name === entry.name}
            >
              <span
                className="h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: entry.family.hex }}
              />
              {entry.name} · {entry.count}
            </button>
          ))}
        </div>
      )}

      {/* Selected color's partners */}
      <div className="min-h-[52px] w-full">
        {selectedFamily ? (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            {partners.length > 0 ? (
              <>
                <p className="text-center text-xs text-muted-foreground">
                  From your closet, <span className="font-semibold text-foreground">{selectedFamily.name}</span> pairs with:
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {partners.map((partner) => (
                    <span
                      key={partner.family.name}
                      className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-2.5 py-1 text-[11px] font-medium text-espresso"
                      title={RELATION_LABELS[partner.relation]}
                    >
                      <span
                        className="h-3 w-3 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: partner.family.hex }}
                      />
                      {partner.family.name}
                      <span className="text-[10px] font-normal italic text-muted-foreground">
                        {RELATION_LABELS[partner.relation]}
                      </span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                {selectedFamily.name} is a statement hue — your neutrals (below) are its best company.
              </p>
            )}
          </motion.div>
        ) : (
          <p className="pt-2 text-center text-xs italic text-muted-foreground">
            Tap a color on the wheel to see which of your pieces harmonize.
          </p>
        )}
      </div>
    </div>
  );
}
