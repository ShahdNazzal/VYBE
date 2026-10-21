import Link from "next/link";
import { ArrowUpRight, BookHeart, Plus, Shirt, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/domain";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null; // (app) layout guarantees a session

  const [itemCount, savedCount, recentItems, recentSaved, categoryGroups] = await Promise.all([
    db.clothingItem.count({ where: { userId: user.id } }),
    db.outfit.count({ where: { userId: user.id, saved: true } }),
    db.clothingItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    db.outfit.findMany({ where: { userId: user.id, saved: true }, orderBy: { updatedAt: "desc" }, take: 2 }),
    db.clothingItem.groupBy({ by: ["category"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  const countsByCategory = new Map(categoryGroups.map((group) => [group.category, group._count._all]));
  const maxCount = Math.max(1, ...countsByCategory.values());

  const firstName = (user.name ?? user.email.split("@")[0]).split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-primary">{greeting()}</p>
          <h1 className="mt-1 font-display text-4xl font-bold text-espresso">
            {firstName}
            <span className="text-wine">.</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your wardrobe at a glance — {itemCount} {itemCount === 1 ? "piece" : "pieces"}, {savedCount} saved{" "}
            {savedCount === 1 ? "look" : "looks"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full border-sand bg-white">
            <Link href="/closet">
              <Plus className="mr-1.5 h-4 w-4" /> Add item
            </Link>
          </Button>
          <Button asChild className="rounded-full bg-primary hover:bg-wine-deep">
            <Link href="/studio">
              <Sparkles className="mr-1.5 h-4 w-4" /> Style me
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link
          href="/closet"
          className="group rounded-2xl border border-sand bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-wine/5"
        >
          <div className="flex items-center justify-between">
            <Shirt className="h-5 w-5 text-wine" />
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-4 font-display text-3xl font-bold text-espresso">{itemCount}</p>
          <p className="text-xs text-muted-foreground">pieces in your closet</p>
        </Link>

        <Link
          href="/saved"
          className="group rounded-2xl border border-sand bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-wine/5"
        >
          <div className="flex items-center justify-between">
            <BookHeart className="h-5 w-5 text-wine" />
            <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-4 font-display text-3xl font-bold text-espresso">{savedCount}</p>
          <p className="text-xs text-muted-foreground">looks in your lookbook</p>
        </Link>

        <div className="rounded-2xl border border-sand bg-card p-6 shadow-sm">
          <p className="eyebrow text-muted-foreground">Wardrobe balance</p>
          <div className="mt-3 space-y-1.5">
            {CATEGORIES.map((cat) => {
              const count = countsByCategory.get(cat) ?? 0;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-dark">
                    <div
                      className="h-full rounded-full bg-wine/70 transition-all"
                      style={{ width: `${Math.max(count > 0 ? 8 : 0, (count / maxCount) * 100)}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10px] font-semibold text-espresso">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent items */}
      <section className="mt-12" aria-labelledby="recent-items">
        <div className="flex items-baseline justify-between">
          <h2 id="recent-items" className="font-display text-2xl font-bold text-espresso">
            Recently added
          </h2>
          <Link href="/closet" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
            View closet
          </Link>
        </div>

        {recentItems.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-sand bg-white/60 px-6 py-10 text-center">
            <p className="font-display text-lg text-espresso">Your closet is empty</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Add your first pieces and the stylist can start composing.
            </p>
            <Button asChild className="mt-5 rounded-full bg-primary px-6 hover:bg-wine-deep">
              <Link href="/closet">
                <Plus className="mr-1.5 h-4 w-4" /> Add your first item
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href="/closet"
                className="group overflow-hidden rounded-xl border border-sand bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-[4/5] overflow-hidden bg-cream-dark">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="truncate text-xs font-semibold" title={item.name}>{item.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.colorway ?? item.brand ?? "—"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent saved looks */}
      {recentSaved.length > 0 && (
        <section className="mt-12" aria-labelledby="recent-looks">
          <div className="flex items-baseline justify-between">
            <h2 id="recent-looks" className="font-display text-2xl font-bold text-espresso">
              Latest saved looks
            </h2>
            <Link href="/saved" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
              View lookbook
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recentSaved.map((outfit) => (
              <Link
                key={outfit.id}
                href="/saved"
                className="group rounded-2xl border border-sand bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-wine/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-display text-lg font-bold text-espresso">{outfit.name}</h3>
                  <Badge variant="outline" className="shrink-0 rounded-full border-blush-deep/60 text-[10px] text-wine">
                    {outfit.occasion}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{outfit.explanation}</p>
                <div className="mt-3 flex gap-1.5">
                  {(() => {
                    try {
                      const items = JSON.parse(outfit.itemsJson);
                      if (!Array.isArray(items)) return null;
                      return items.slice(0, 5).map((item: { id: string; imageUrl: string; name: string }) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={item.id}
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-12 w-10 rounded-md border border-sand object-cover"
                        />
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
