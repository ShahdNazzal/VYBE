import Link from "next/link";
import { ArrowLeft, BookHeart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutfitCard } from "@/components/outfit-card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Outfit } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OutfitResultsPage({
  params,
}: {
  params: Promise<{ generationId: string }>;
}) {
  const { generationId } = await params;
  const user = await getCurrentUser();

  const rows = user
    ? await db.outfit.findMany({
        where: { userId: user.id, generationId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const outfits: Outfit[] = rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  if (outfits.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="eyebrow text-primary">Nothing here</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-espresso">These looks have left the rack</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This generation doesn&apos;t exist or belongs to another wardrobe. Head back to the studio
          and compose fresh ones.
        </p>
        <Button asChild className="mt-6 rounded-full bg-primary px-6 hover:bg-wine-deep">
          <Link href="/studio">
            <Sparkles className="mr-1.5 h-4 w-4" /> Open the Studio
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">Fresh off the styling desk</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-espresso">
            Three looks for <span className="italic text-wine">{outfits[0].occasion}</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Styled in <span className="font-semibold text-foreground">{outfits[0].style}</span> · from{" "}
            {outfits.length} compositions · tap any piece to swap it
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="rounded-full border-sand bg-white">
            <Link href="/studio">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> New session
            </Link>
          </Button>
          <Button asChild className="rounded-full bg-primary hover:bg-wine-deep">
            <Link href="/saved">
              <BookHeart className="mr-1.5 h-4 w-4" /> Lookbook
            </Link>
          </Button>
        </div>
      </div>

      {outfits[0].source === "fallback" && (
        <p className="mt-6 rounded-xl border border-blush-deep/50 bg-blush/30 px-4 py-3 text-sm text-wine">
          The AI stylist was unavailable, so a rule-based stylist composed these looks from your
          wardrobe instead.
        </p>
      )}

      {/* Cards */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {outfits.map((outfit, index) => (
          <OutfitCard key={outfit.id} outfit={outfit} index={index} />
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Happy with a look? Hit <span className="font-semibold text-foreground">Save</span> to keep
          it in your lookbook — or generate another round.
        </p>
        <Button asChild variant="outline" className="mt-4 rounded-full border-primary/30 text-primary hover:bg-blush/40">
          <Link href="/studio">
            <Sparkles className="mr-1.5 h-4 w-4" /> Style me again
          </Link>
        </Button>
      </div>
    </div>
  );
}
