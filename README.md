# VYBE — Your AI Fashion Stylist

A full-stack AI fashion styling application. Users build a digital wardrobe of
their own clothing, choose an occasion and a style direction, and receive **three
editorial-quality outfit combinations composed exclusively from the pieces in
their closet** — every suggested item is validated against the authenticated
user's real wardrobe on the server.



## 📸 Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/d5ae83f8-ffef-4e62-8a54-d91cbb6315d7" width="100%" alt="Screenshot 1" />
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/3f80a91f-19dd-433f-adf5-0c367858e4f8" width="100%" alt="Screenshot 2" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/df065160-69a5-4135-ae28-a5c5c0af272c" width="100%" alt="Screenshot 3" />
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/d88ac4d1-8b90-4cbf-bc66-3dad0e6b2d10" width="100%" alt="Screenshot 4" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/866d9322-7db6-4e4c-8eac-615bc29ec08a" width="100%" alt="Screenshot 5" />
    </td>
    <td align="center" width="50%">
      <img src="https://github.com/user-attachments/assets/db16597b-c07d-447b-a503-d915f835b13e" width="100%" alt="Screenshot 6" />
    </td>
  </tr>
</table>

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

> Requires **Node.js 20 or newer** — check with `node -v` ([download](https://nodejs.org))

### macOS / Linux

```bash
npm install
cp .env.example .env      # then edit .env (see below)
npx prisma db push
npm run dev               # → http://localhost:3000
```

### Windows (cmd.exe / PowerShell)

Extract the zip, open a terminal in the project folder, then run —
**no `#` comments, Windows has no `unzip`/`cp`/`tee`**:

```bat
cd C:\Users\you\Downloads\vybe-source
npm install
copy .env.example .env
notepad .env              :: paste a random AUTH_SECRET, save & close
npx prisma db push
npm run dev               :: → http://localhost:3000
```

> If `npx prisma` asks to download prisma 8.x, press **N** — it means
> `npm install` hasn't finished. Install first, then `npx` will use the
> project's own pinned Prisma version.

The first `npm run dev` compile takes a minute. To try a production build
locally: `npm run build` then `npm run start`.

### Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string, e.g. `file:./db/custom.db` (SQLite) or a PostgreSQL URL |
| `AUTH_SECRET` | HMAC key for session cookies — use a long random string (min 16 chars) |

The LLM credentials used by `z-ai-web-dev-sdk` are managed by the platform SDK
environment — no API key belongs in client code, and none is bundled client-side.

### Enabling the real AI stylist on your machine

Outfit generation calls a large language model **only from server code** —
nothing AI-related reaches the browser. Two provider options, checked in order:

**Option 1 — your own key (recommended for self-hosting).** Add to `.env`:

```bash
OPENAI_API_KEY="sk-..."
# Optional overrides — any OpenAI-compatible service works:
OPENAI_BASE_URL="https://api.openai.com/v1"   # OpenRouter: https://openrouter.ai/api/v1
OPENAI_MODEL="gpt-4o-mini"                    # Groq free tier: llama-3.1-8b-instant
```

> **Groq model note:** Groq rotates model IDs over time. If you see
> `404 ... model_not_found`, your model ID was retired — list what your key
> can currently use with
> `curl.exe <GROQ_BASE_URL>/models -H "Authorization: Bearer gsk_YOUR_KEY"`
> (use the Groq base URL from the Groq API docs)
> and copy an id from the response.

| Provider | `OPENAI_BASE_URL` | Example model | Cost |
|----------|-------------------|---------------|------|
| OpenAI | `https://api.openai.com/v1` (default) | `gpt-4o-mini` | paid |
| OpenRouter | `https://openrouter.ai/api/v1` | any catalog id | has free models |
| Groq | your Groq base URL (see Groq API docs) | `llama-3.1-8b-instant` or `******` | free tier |
| Ollama (local) | `http://localhost:11434/v1` | e.g. `llama3.2` | free, offline |

**Option 2 — Z.ai platform config.** The bundled `z-ai-web-dev-sdk` reads a
`.z-ai-config` JSON (`{"baseUrl": "...", "apiKey": "..."}`) from project root →
`~/.z-ai-config` → `/etc/.z-ai-config`. This only exists inside the Z.ai
platform environment.

**Without any provider, everything still works**: auth, closet, uploads, the
studio, saving and swapping. Generation falls back to the built-in rule-based
stylist, and every card is explicitly labeled "Rule-based stylist"
(`source: "fallback"` in the API). AI-generated results are never fabricated.

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
