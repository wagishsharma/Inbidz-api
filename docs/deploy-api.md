# Deploy API (`api.inbidz.com`)

Production API runs as **Next.js on port 3003** behind nginx/Caddy, managed by **PM2**.

**Related:** [Deploy web app](./deploy-web-app.md) · [Staging & app links](./staging-and-app-links.md)

---

## What runs where

| Domain | Port | Process |
|--------|------|---------|
| `api.inbidz.com` | 3003 | `@inbidz/api` (PM2 `inbidz-api`) |
| `app.inbidz.com` | static | Expo web export |
| `id.inbidz.com` | 3004 | Central auth (`inbidz-login`) |

---

## First-time server setup

```bash
# Example path (adjust to your host)
cd /home/inbidz-api/htdocs/api.inbidz.com

git clone <repo-url> .
# or: git pull if already cloned

cp apps/api/.env.production.example apps/api/.env.local
# Edit: DB, JWT_SECRET (same as login), R2, Razorpay, APPLE_TEAM_ID, etc.

chmod +x apps/api/deploy.sh
```

### Required `apps/api/.env.local` (production)

```bash
APP_PUBLIC_URL=https://app.inbidz.com
API_PUBLIC_URL=https://api.inbidz.com
AUTH_LOGIN_APP_URL=https://id.inbidz.com
SHORT_URL_BASE=https://api.inbidz.com/p
JWT_SECRET=<same as id.inbidz.com>
# + DB_*, R2_*, RAZORPAY_*
```

### Reverse proxy (nginx snippet)

```nginx
server {
  listen 443 ssl http2;
  server_name api.inbidz.com;

  location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## Deploy

From the repo root on the server:

```bash
cd /home/inbidz-api/htdocs/api.inbidz.com

DEPLOY_DIR=/home/inbidz-api/htdocs/api.inbidz.com \
SITE_URL=https://api.inbidz.com \
WEB_ORIGIN=https://app.inbidz.com \
GIT_BRANCH=main \
RUN_MIGRATE=1 \
./apps/api/deploy.sh
```

First deploy (no PM2 process yet) — same command; script runs `pm2 start` automatically.

Subsequent deploys use zero-downtime `pm2 reload`.

**Note:** The monorepo also contains the mobile app (React 19). `deploy.sh` installs only API + shared workspaces and pins **React 18.3.1** at the root — required for Next.js 14 production builds.

---

## Post-deploy checklist

- [ ] `curl -s https://api.inbidz.com/api/health` → OK
- [ ] CORS from web app:
  ```bash
  curl -sI -X OPTIONS \
    -H "Origin: https://app.inbidz.com" \
    -H "Access-Control-Request-Method: POST" \
    https://api.inbidz.com/api/posts
  ```
  Expect `Access-Control-Allow-Origin: https://app.inbidz.com`
- [ ] `APP_PUBLIC_URL` on API is `https://app.inbidz.com` (not staging)
- [ ] Share link: `https://api.inbidz.com/p/{code}` loads OG page
- [ ] Razorpay webhook URL points at `https://api.inbidz.com/api/webhooks/razorpay`
- [ ] `RAZORPAY_WEBHOOK_SECRET` is set (webhook rejects unsigned requests)
- [ ] `pm2 status` shows `inbidz-api` online

---

## PM2 commands

From `apps/api`:

```bash
npm run pm2:status
npm run pm2:logs
npm run pm2:restart
```

---

## Staging

For `staging-api.inbidz.com`, use the same script with:

```bash
SITE_URL=https://staging-api.inbidz.com \
WEB_ORIGIN=https://staging.inbidz.com \
./apps/api/deploy.sh
```

Copy `apps/api/.env.staging.example` → `.env.local` instead.
