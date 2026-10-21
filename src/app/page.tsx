import Link from "next/link";
import { ArrowRight, BookHeart, Check, Shirt, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { OCCASIONS } from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Read an editorial image fetched at deploy time (null when unavailable). */
function editorialImage(name: string): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const raw = fs.readFileSync(
      path.join(process.cwd(), "assets", "imgsearch", `${name}.json`),
      "utf-8"
    );
    const data = JSON.parse(raw);
    const url = data?.results?.[0]?.original_url;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}

const STEPS = [
  {
    number: "01",
    icon: Shirt,
    title: "Catalogue your closet",
    copy: "Photograph the pieces you own and drop them into your digital wardrobe. Tops, bottoms, dresses, shoes, accessories — every category, filterable in a tap.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Set the scene",
    copy: "Choose the occasion — office day, date night, dinner party — and a style direction, from Minimalist to Old Money. Add constraints: skip a category, ban a piece, or anchor a must-wear.",
  },
  {
    number: "03",
    icon: BookHeart,
    title: "Receive three looks",
    copy: "The stylist composes three complete outfits from your pieces — with rationale, alternatives, and one-tap swaps. Keep the winners in your lookbook.",
  },
];

export default async function LandingPage() {
  // Resolved per-request so newly fetched editorial imagery appears immediately.
  const heroImg = editorialImage("editorial_hero");
  const wardrobeImg = editorialImage("editorial_wardrobe");
  const studioImg = editorialImage("editorial_studio");
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/register";
  const primaryLabel = user ? "Open your closet" : "Begin — it's free";

  return (
    <div className="min-h-screen bg-cream text-espresso">
      {/* Masthead */}
      <header className="sticky top-0 z-40 border-b border-sand/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="VYBE home">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-primary font-display text-xl font-bold text-primary-foreground">
              V
            </span>
            <span className="font-display text-2xl font-bold tracking-wide text-wine">VYBE</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-full px-4 py-2 text-sm font-medium text-espresso transition-colors hover:bg-secondary"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
            <Link
              href={primaryHref}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-wine-deep"
            >
              {user ? "Style me" : "Get started"}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-blush/50 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div className="relative z-10">
            <p className="eyebrow animate-fade-up text-primary">The digital wardrobe, restyled</p>
            <h1 className="mt-5 animate-fade-up font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl" style={{ animationDelay: "0.1s" }}>
              Wear what you own.
              <span className="mt-1 block italic text-wine">Beautifully.</span>
            </h1>
            <p className="mt-6 max-w-md animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: "0.2s" }}>
              VYBE turns your closet into a personal styling house. Upload your pieces, pick an
              occasion, and receive three editorial looks — composed from your wardrobe and nothing
              else.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3" style={{ animationDelay: "0.3s" }}>
              <Link
                href={primaryHref}
                className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-wine/20 transition-all hover:bg-wine-deep"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-sand bg-white/70 px-6 py-3.5 text-sm font-medium transition-colors hover:border-blush-deep"
              >
                How it works
              </Link>
            </div>
            <p className="mt-6 animate-fade-up text-xs text-muted-foreground" style={{ animationDelay: "0.4s" }}>
              No shopping links. No invented products. Only what you already love.
            </p>
          </div>

          {/* Hero image */}
          <div className="relative animate-fade-up" style={{ animationDelay: "0.25s" }}>
            <div className="grain relative overflow-hidden rounded-2xl border border-sand shadow-2xl shadow-wine/10">
              {heroImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImg}
                  alt="Fashion editorial — elegant styling in burgundy tones"
                  className="aspect-[4/5] w-full animate-kenburns object-cover"
                />
              ) : (
                <div className="grid aspect-[4/5] w-full place-items-center bg-gradient-to-br from-blush via-cream to-cream-dark">
                  <span className="font-display text-7xl italic text-wine/30">VYBE</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso/60 to-transparent p-6">
                <p className="font-display text-lg italic text-cream">Issue No. 01 — The Closet Edit</p>
              </div>
            </div>
            <div className="absolute -left-4 top-8 hidden rounded-xl border border-sand bg-card/95 px-4 py-3 shadow-xl backdrop-blur sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">This season</p>
              <p className="mt-0.5 font-display text-sm font-bold text-espresso">3 looks, one wardrobe</p>
            </div>
          </div>
        </div>
      </section>

      {/* Occasion ticker */}
      <div className="overflow-hidden border-y border-sand/70 bg-white/50 py-3.5" aria-hidden>
        <div className="flex w-max animate-marquee gap-8">
          {[...OCCASIONS, ...OCCASIONS].map((occasion, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {occasion}
              <span className="text-wine">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-primary">The ritual</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Three steps to a <span className="italic text-wine">styled</span> life
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="group relative rounded-2xl border border-sand bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-wine/5">
                <span className="font-display text-5xl font-bold text-blush-deep/50 transition-colors group-hover:text-blush-deep">
                  {step.number}
                </span>
                <div className="mt-5 grid h-11 w-11 place-items-center rounded-full bg-blush text-wine">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{step.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{step.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Feature split — honesty about the AI */}
      <section className="border-y border-sand/70 bg-white/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div className="grain relative overflow-hidden rounded-2xl border border-sand shadow-xl shadow-wine/10">
            {wardrobeImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wardrobeImg} alt="A curated wardrobe rail with elegant pieces" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] w-full place-items-center bg-gradient-to-br from-cream-dark to-blush">
                <Shirt className="h-16 w-16 text-wine/30" />
              </div>
            )}
          </div>
          <div>
            <p className="eyebrow text-primary">A stylist that only wears you</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight">
              Your wardrobe, <span className="italic text-wine">taken seriously</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Most styling apps exist to sell you something new. VYBE is the opposite: an AI stylist
              that composes looks exclusively from the clothes hanging in your closet — every item
              it suggests is verified against your actual wardrobe, by id, on the server.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Outfits reference only your real pieces — invalid items are never shown",
                "Occasion, style direction and strict constraints honoured every time",
                "Follow-up requests swap one piece while the rest of the look stays untouched",
                "Keep the hits — save looks to your lookbook for their next wear",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-wine text-cream">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="leading-relaxed text-espresso/90">{point}</span>
                </li>
              ))}
            </ul>
            {studioImg && (
              <div className="mt-8 hidden max-w-xs overflow-hidden rounded-xl border border-sand shadow-md lg:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={studioImg} alt="Choosing an outfit in front of a mirror" className="aspect-[16/10] w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:py-28">
        <p className="eyebrow text-primary">The VYBE principle</p>
        <blockquote className="mt-6 font-display text-3xl font-medium leading-snug text-espresso sm:text-4xl">
          &ldquo;Style is knowing <span className="italic text-wine">what you own</span> — and
          wearing it like it was <span className="italic text-wine">made for the moment</span>.&rdquo;
        </blockquote>
        <div className="hairline mx-auto mt-10 w-40" />
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-wine-deep py-20 text-cream lg:py-28">
        <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-wine blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-blush/20 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="eyebrow text-blush">Your closet is ready</p>
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Tonight&apos;s look is already <span className="italic text-blush">hanging in there</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-cream/80 sm:text-base">
            Create your digital wardrobe in minutes. The first three looks are on the house of your
            own closet.
          </p>
          <Link
            href={primaryHref}
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-4 text-sm font-semibold text-wine-deep shadow-xl transition-all hover:bg-blush"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand/70 bg-cream">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-lg font-bold text-primary-foreground">
              V
            </span>
            <div>
              <p className="font-display text-lg font-bold text-wine">VYBE</p>
              <p className="text-[11px] text-muted-foreground">Your wardrobe, styled by AI</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground" aria-label="Footer">
            <Link href={user ? "/closet" : "/register"} className="transition-colors hover:text-espresso">My Closet</Link>
            <Link href={user ? "/studio" : "/register"} className="transition-colors hover:text-espresso">Outfit Studio</Link>
            <Link href={user ? "/saved" : "/register"} className="transition-colors hover:text-espresso">Lookbook</Link>
            <Link href="/login" className="transition-colors hover:text-espresso">Sign in</Link>
          </nav>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} VYBE. Wear it well.</p>
        </div>
      </footer>
    </div>
  );
}
