# VYBE — Your AI Fashion Stylist

A full-stack AI fashion styling application. Users build a digital wardrobe of
their own clothing, choose an occasion and a style direction, and receive **three
editorial-quality outfit combinations composed exclusively from the pieces in
their closet** — every suggested item is validated against the authenticated
user's real wardrobe on the server.

![Stack](https://img.shields.io/badge/Next.js%2016-App%20Router-6b2130) ![TS](https://img.shields.io/badge/TypeScript-strict-6b2130) ![Prisma](https://img.shields.io/badge/Prisma-SQLite-6b2130)

## Feature map

| Page | Route | What it does |
|------|-------|--------------|
| Landing | `/` | Fashion-editorial marketing page (burgundy / cream / blush design system) |
| Sign up / Sign in | `/register`, `/login` | Session-cookie authentication (scrypt password hashing, HMAC-signed tokens) |
| Dashboard | `/dashboard` | Wardrobe stats, category balance, recent pieces & looks, quick actions |
| My Closet | `/closet` | Add / edit / delete clothing items, image uploads, search + category/style/season filters |
| AI Outfit Studio | `/studio` | Pick occasion, style direction, and constraints (skip categories, ban pieces, must-include) |
| Outfit Results | `/outfits/[generationId]` | Three AI-composed look cards with images, stylist rationale, save buttons, one-tap piece swaps |
| Lookbook | `/saved` | Saved outfits — revisit, swap pieces, delete |

## AI requirements — how they are enforced

- **Own-wardrobe-only generation** — the prompt embeds the user's wardrobe as
  JSON; the response parser (`src/lib/ai/stylist.ts`) drops any outfit whose
  item ids do not exist in the authenticated user's closet. Invalid ids are
  never shown, never invented.
- **Structured JSON output** — the model must answer with a strict JSON schema
  (`outfits[].name / itemIds / explanation / alternatives[]`). Fenced or chatty
  output is tolerated by a robust extractor, then schema-validated.
- **Server-side id validation** — every returned id is checked against the DB
  (`userId`-scoped) before persistence; alternatives get the same treatment.
- **Follow-up swaps** — `POST /api/outfits/replace` swaps ONE item while passing
  all other pieces as fixed context ("keep unchanged whenever possible"), and
  validates the replacement against the same category + wardrobe.
- **No exposed keys** — `z-ai-web-dev-sdk` is imported only inside server code
  (`src/lib/ai/stylist.ts` + API routes). Nothing AI-related reaches the client.
- **Honest fallback** — if the AI service is unavailable or repeatedly invalid,
  a deterministic rule-based stylist composes looks instead; cards are labeled
  "Rule-based stylist" and responses carry `source: "fallback"`. AI results are
  never fabricated.

## Tech stack

- **Next.js 16** (App Router, Server Components) + **TypeScript**
- **Tailwind CSS 4** + shadcn/ui + **Framer Motion** animations
- **Prisma ORM** with SQLite (drop-in swappable to PostgreSQL/Supabase — see below)
- **z-ai-web-dev-sdk** (LLM chat completions) — server-side only
- Cookie sessions: HMAC-SHA256 signed tokens via Web Crypto, scrypt password
  hashing via Node crypto (no external auth dependency)

## Getting started

```bash
# 1. Install dependencies
bun install        # or npm install

# 2. Configure environment
cp .env.example .env   # then edit values (see below)

# 3. Create the database schema
bun run db:push

# 4. Run the dev server
bun run dev        # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string, e.g. `file:./db/custom.db` (SQLite) or a PostgreSQL URL |
| `AUTH_SECRET` | HMAC key for session cookies — use a long random string (min 16 chars) |

The LLM credentials used by `z-ai-web-dev-sdk` are managed by the platform SDK
environment — no API key belongs in client code, and none is bundled client-side.

### Running AI generation on your own machine

Outfit generation calls a large language model through `z-ai-web-dev-sdk`,
which is imported **only inside server code** — nothing AI-related reaches the
browser. The SDK locates its credentials in a `.z-ai-config` JSON file, searched
in this order: project root → `~/.z-ai-config` → `/etc/.z-ai-config`:

```json
{
  "baseUrl": "YOUR_API_BASE_URL",
  "apiKey": "YOUR_API_KEY"
}
```

Without a configured key, **everything else still works**: auth, closet
management, uploads, the studio, saving and swapping all function normally.
Outfit generation then falls back to the built-in rule-based stylist, which
composes looks deterministically from your own wardrobe — every card is
explicitly labeled "Rule-based stylist" (`source: "fallback"` in the API).
AI-generated results are never fabricated or passed off as real AI output.

## Database schema

`prisma/schema.prisma` — three models with cascade deletes and ownership
indexes (the application enforces row-level ownership by scoping **every**
query to the authenticated `userId`):

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  passwordHash String         // scrypt "salt:hash"
  name         String?
  items        ClothingItem[] // cascade
  outfits      Outfit[]       // cascade
}

model ClothingItem {
  id       String @id @default(cuid())
  userId   String            // owner — every query is scoped by this
  name     String
  category String            // tops | bottoms | dresses | outerwear | shoes | accessories
  colorway String?
  styleTag String?           // e.g. Minimalist, Streetwear, Old Money
  season   String?           // spring | summer | fall | winter | all-season
  brand    String?
  imageUrl String            // /api/uploads/<userId>/<file> (auth-checked) or external URL
  notes    String?
  @@index([userId, category])
}

model Outfit {
  id           String  @id @default(cuid())
  userId       String        // owner — every query is scoped by this
  generationId String        // groups the 2–3 results of one generation run
  name         String        // editorial look name
  occasion     String
  style        String
  explanation  String        // stylist rationale (+ swap notes)
  itemIds      String        // JSON string[] of clothing item ids
  itemsJson    String        // JSON snapshot of item details at generation time
  alternatives String?       // JSON [{ itemId, note }] stylist's swaps
  source       String        // "ai" | "fallback"
  saved        Boolean       // lookbook membership
  @@index([userId, generationId])
}
```

> **Using Supabase/PostgreSQL instead:** change the Prisma datasource provider
> to `"postgresql"` and point `DATABASE_URL` at your Supabase connection string
> (`bun run db:push`). Enable RLS policies matching `userId = auth.uid()` if you
> also move auth to Supabase; this build keeps auth in the Next.js layer and
> enforces ownership in a single, auditable data-access path.

## API surface

| Method | Route | Notes |
|--------|-------|-------|
| POST | `/api/auth/register` · `/login` · `/logout` | Sets/ clears httpOnly session cookie |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/items` | List (query filters: `category, season, style, q`) / create |
| GET/PUT/DELETE | `/api/items/[id]` | Ownership-checked |
| POST | `/api/upload` | Multipart image upload (≤ 8 MB, JPG/PNG/WebP/GIF) |
| GET | `/api/uploads/[...path]` | Serves images to the owning user only |
| POST | `/api/outfits/generate` | AI stylist run → 3 outfits under a `generationId` |
| GET | `/api/outfits?saved=1` · `?generation=<id>` | Lookbook / result set |
| GET/PATCH/DELETE | `/api/outfits/[id]` | Read / save-unsave / delete |
| POST | `/api/outfits/replace` | Swap one item, keep the rest fixed |
| POST | `/api/sample-wardrobe` | One-time starter closet for empty accounts (empty-closet enforced) |

## Project layout

```
src/
  app/
    page.tsx                  # editorial landing
    (auth)/login|register/    # auth pages (redirect when signed in)
    (app)/                    # session-gated group: dashboard, closet,
                              # studio, outfits/[generationId], saved
    api/                      # REST surface (see table above)
  components/                 # app shell, item/outfit cards, item form
  lib/
    ai/stylist.ts             # prompt builder, validator, fallback stylist, swaps
    auth.ts session.ts password.ts
    db.ts domain.ts types.ts
prisma/schema.prisma
assets/imgsearch/             # starter-wardrobe + editorial imagery manifests
uploads/<userId>/             # user-uploaded images (served via auth-checked route)
```

## Design system

Burgundy (`#6b2130`), deep wine (`#4a1622`), cream (`#faf6ef`), blush
(`#f3e1db`), espresso ink (`#221a17`). Playfair Display for editorial headlines,
Inter for UI. Subtle Framer Motion transitions, Ken-Burns hero, occasion
marquee, grain-textured imagery. Fully responsive — dedicated mobile bottom
navigation, 44px touch targets, safe-area insets.
