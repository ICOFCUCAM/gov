# CivicOS — Application

Production-grade frontend architecture for the CivicOS sovereign operational platform.

## Stack

- **Next.js 14** with the App Router
- **React 18** (Server Components by default; client components only where interactivity demands)
- **TypeScript** in strict mode (`noUncheckedIndexedAccess`, `strict`, `noImplicitOverride`)
- **Tailwind CSS** with a design-token theme that mirrors the CivicOS visual system
- **App-shell architecture** with role-scoped route groups
- **Multilingual scaffolding** ready (see `src/lib/i18n`)
- **Zero third-party tracking, no analytics, no fingerprinting**
- **Sovereign-portable** — deployable to Vercel for previews, then to sovereign cloud (Kubernetes, sovereign-licensed PaaS) for production.

## Architecture

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (HTML, locale dir, body fonts)
│   ├── page.tsx              # Landing — links to each surface
│   ├── globals.css           # Tailwind base + a few component utilities
│   ├── (citizen)/            # Citizen-facing surfaces
│   │   └── wallet/
│   │       ├── page.tsx              # Home
│   │       ├── services/page.tsx     # Services catalog
│   │       ├── records/page.tsx      # Records (with access log)
│   │       ├── assistant/page.tsx    # Civic Assistant (Class A)
│   │       ├── contest/page.tsx      # How-to overview
│   │       └── receipt/[id]/page.tsx # Receipt detail (dynamic)
│   ├── (officer)/console/page.tsx    # Officer workspace + Copilot
│   ├── (ministry)/control/page.tsx   # DG control room
│   └── (nccc)/wall/page.tsx          # NCCC operations wall
├── components/
│   ├── ui/                   # Primitives (Button, Card, Pill, ClassBanner, …)
│   └── features/             # Composed flows (ContestDialog, SignDialog, …)
├── lib/
│   ├── i18n/                 # Multilingual scaffold (locales, provider)
│   ├── audit/                # Local Audit Vault helpers (mock)
│   ├── state/                # App state primitives
│   ├── charters/             # AI charter declarations (typed)
│   ├── types.ts              # Shared types (DecisionClass, etc.)
│   └── utils.ts              # Small helpers
└── styles/                   # (reserved)
```

Route groups (`(citizen)`, `(officer)`, …) keep each role's surfaces co-located without affecting URLs. The landing page is the only un-grouped route.

## Doctrine alignment

Every component, every page, every helper aligns with:

- **Companion 152** — Civic Wallet UX
- **Companion 153** — Officer Console and AI Copilot
- **Companion 154** — Command Center (NCCC)
- **Companion 156** — Ministry Control Rooms
- **Companion 158** — Human-led governance (binding correction): humans govern, institutions govern, constitutions govern, AI assists.

The four sentences govern the codebase. No component implements autonomous decision-making. AI surfaces are labeled with Decision Class. Human signatures are the operative act for binding decisions. No tracking, no analytics, no third-party scripts.

## Getting started

```bash
cd app
pnpm install   # or npm install / yarn
pnpm dev       # http://localhost:3000
```

Type-check:

```bash
pnpm typecheck
```

Build:

```bash
pnpm build
pnpm start
```

## Deploying to Vercel (preview)

```bash
vercel deploy
```

Sovereign deployment notes:

- The app is designed to run on Node 18+ behind any reverse proxy.
- For sovereign cloud, build the Docker image with `next build` then a slim Node runtime; deploy to Kubernetes.
- Edge runtime is opt-in per route; default is Node for portability.
- No third-party CDNs are required. All fonts and assets can be self-hosted.

## i18n

The `src/lib/i18n` scaffold defines the locale type, locale catalog, dir (`ltr` / `rtl`), and message dictionaries. The default locale is `en`; ready-to-fill skeletons exist for `sw` (Kiswahili), `ar` (Arabic, RTL), `fr` (Français), `yo` (Yorùbá). Per Companion 148 (Sovereign Language Infrastructure Layer), multilingualism is structural; this scaffold is the foundation.

## What's intentionally not here

- No analytics, no tracking pixels, no third-party scripts.
- No engagement gamification.
- No autonomous AI decision components.
- No surveillance views (no individual-citizen drill, no individual-officer drill).
- No dark patterns.

## Migration target

Future migration into sovereign cloud (Kubernetes deployments, multi-region infrastructure) is the explicit goal. The architecture is portable: no Vercel-specific runtime APIs, no vendor lock-in. See Companion 76 (sovereign cloud) and Companion 137 (sovereign cloud topology and AI compute) for the substrate design.
