# INBIDZ Social Commerce App

Post it. Share it. Sell it. — A cross-platform (iOS, Android, Web) social commerce app built as a monorepo.

## Structure

```
inbidz-app/
├── apps/
│   ├── api/          # Next.js 14 API (feed, commerce, auth, sharing)
│   └── mobile/       # Expo Router app (iOS, Android, Web)
└── packages/
    └── shared/       # Shared types & Zod schemas
```

## Features

- **Feed-first social** — photo/video posts (portrait & landscape)
- **Seller-controlled commerce** — Buy Now, auctions, DM offers per post
- **Hybrid INBIDZ stack** — central auth (login.inbidz.com JWT), Razorpay, R2 storage
- **Viral sharing** — share moments, short URLs, OG/share images, referral attribution
- **Dual-sided onboarding** — browse without signup; progressive shop setup

## Quick start

### 1. Install dependencies

```bash
npm install
npm run build --workspace=@inbidz/shared
```

### 2. Configure API

```bash
cp apps/api/.env.example apps/api/.env.local
# Edit DB, JWT_SECRET, AUTH_LOGIN_APP_URL, R2, Razorpay
```

### 3. Run migrations

```bash
npm run migrate
```

### 4. Start dev servers

```bash
# Terminal 1 — API on :3001
npm run dev:api

# Terminal 2 — Mobile/Web on :8081
npm run dev:mobile
```

## Auth flow

- **Web:** Redirects to `login.inbidz.com` → `/auth/callback` sets JWT cookies
- **Mobile:** `inbidz://auth/callback` deep link via `expo-web-browser`
- **API:** Bearer token or `access_token` cookie

## API endpoints (key)

| Route | Description |
|-------|-------------|
| `GET /api/posts` | Feed |
| `POST /api/posts` | Create post |
| `POST /api/posts/[id]/buy` | Buy Now (Razorpay) |
| `POST /api/posts/[id]/bid` | Place auction bid |
| `POST /api/posts/[id]/offers` | Make an offer |
| `PATCH /api/offers/[id]` | Accept/decline/counter offer |
| `POST /api/shop/setup` | Seller shop setup |
| `POST /api/share` | Share moments & short URLs |
| `GET /api/p/[code]` | Resolve viral short link |

## Environment variables

See [apps/api/.env.example](apps/api/.env.example) and [apps/mobile/app.json](apps/mobile/app.json) `extra` for client config.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:api` | Start Next.js API |
| `npm run dev:mobile` | Start Expo (web + native) |
| `npm run migrate` | Apply MySQL schema |
| `npm run typecheck` | Typecheck all workspaces |

## Docs

- [Deploy API (`api.inbidz.com`)](./docs/deploy-api.md) — PM2 on :3003, nginx, migrations, production env
- [Deploy web app (`app.inbidz.com`)](./docs/deploy-web-app.md) — static Expo web export, DNS, API/login/CORS
- [Staging, share links & deep linking](./docs/staging-and-app-links.md) — staging domains, `APPLE_TEAM_ID`, Android fingerprint, D-U-N-S timeline
- [Video playback & optimization](./docs/video-playback-and-optimization.md) — R2 delivery, lazy loading, compression roadmap
