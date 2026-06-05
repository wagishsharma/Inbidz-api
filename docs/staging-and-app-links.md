# Staging, share links & deep linking

Reference for INBIDZ staging environments, OG previews, and opening posts in the mobile app.

**Staging domains**

| Domain | Role |
|--------|------|
| `staging.inbidz.com` | Mobile web fallback (optional) |
| `staging-api.inbidz.com` | API, share links (`/p/{code}`), OG previews, Universal/App Links |
| `staging-login.inbidz.com` | Auth login |

Share URLs look like: `https://staging-api.inbidz.com/p/abc123`

---

## D-U-N-S number (~30 days)

Apple requires a **D-U-N-S Number** to enroll in the [Apple Developer Program](https://developer.apple.com/programs/) as an **organization** (company/LLC).

- Request free D-U-N-S: [Apple’s D-U-N-S lookup](https://developer.apple.com/enroll/duns-lookup/) or [Dun & Bradstreet](https://www.dnb.com/duns-number.html)
- Typical wait: **up to 30 business days** (sometimes faster)
- Until enrollment completes you **won’t have** `APPLE_TEAM_ID` → **iOS Universal Links** and **TestFlight/App Store** builds are blocked

**What you can do while waiting**

| Feature | Works without Apple Team ID? |
|---------|------------------------------|
| LAN dev (Expo Go / Wi‑Fi) | Yes |
| Android EAS build + App Links | Yes (need Android fingerprint only) |
| Share link OG page in browser | Yes (after API staging deploy) |
| `inbidz://p/{code}` custom scheme | Yes (dev/staging **build**, not Expo Go) |
| iOS Universal Links | No — needs Team ID + signed app |
| iOS TestFlight / App Store | No — needs Developer Program |

---

## Environment variables

### API staging (`apps/api/.env.staging.example`)

Copy to your host (Vercel, Railway, etc.) for **staging-api.inbidz.com**:

```bash
API_PUBLIC_URL=https://staging-api.inbidz.com
APP_PUBLIC_URL=https://staging.inbidz.com
AUTH_LOGIN_APP_URL=https://staging-login.inbidz.com
SHORT_URL_BASE=https://staging-api.inbidz.com/p
APP_SCHEME=inbidz
APP_BUNDLE_ID=com.inbidz.app

# After Apple Developer enrollment:
APPLE_TEAM_ID=

# After first Android EAS build:
ANDROID_SHA256_FINGERPRINT=
```

### Mobile staging (`apps/mobile/.env.staging.example`)

Used locally or via EAS `staging` profile:

```bash
APP_ENV=staging
EXPO_PUBLIC_API_URL=https://staging-api.inbidz.com
EXPO_PUBLIC_AUTH_LOGIN_URL=https://staging-login.inbidz.com/login
```

EAS staging build:

```bash
cd apps/mobile
eas build --profile staging --platform ios    # after Apple enrollment
eas build --profile staging --platform android
```

---

## How to get `APPLE_TEAM_ID`

10-character ID (e.g. `A1B2C3D4E5`). Required for iOS Universal Links.

### Option A — Apple Developer website

1. [developer.apple.com/account](https://developer.apple.com/account)
2. Sign in (after program enrollment)
3. **Membership details** → copy **Team ID**

### Option B — Xcode

1. Xcode → **Settings** → **Accounts**
2. Select Apple ID → select team → Team ID in details

### Option C — App Store Connect

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **Users and Access**
2. Team ID shown in org / account info

### Verify on API

After setting `APPLE_TEAM_ID` and redeploying:

```
https://staging-api.inbidz.com/.well-known/apple-app-site-association
```

Should include:

```json
"appID": "YOUR_TEAM_ID.com.inbidz.app"
```

Then **rebuild and reinstall** the iOS app (Universal Links are baked into the binary).

---

## How to get `ANDROID_SHA256_FINGERPRINT`

SHA-256 signing cert fingerprint for Android App Links. Must match the keystore that signs the **same build** you install (staging profile → staging keystore).

### Option A — EAS (recommended)

```bash
cd apps/mobile
eas login
eas credentials -p android
```

Select project → **Keystore** → copy **SHA-256 Fingerprint**.

Or:

```bash
eas credentials -p android --display-credentials
```

Set on API:

```bash
ANDROID_SHA256_FINGERPRINT=AA:BB:CC:DD:...
```

### Option B — Local debug keystore (debug builds only)

Not for staging/production App Links:

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android -keypass android
```

Copy the **SHA256** line under Certificate fingerprints.

### Option C — Your own release keystore

```bash
keytool -list -v -keystore /path/to/release.keystore -alias YOUR_ALIAS
```

### Verify on API

```
https://staging-api.inbidz.com/.well-known/assetlinks.json
```

On device (after install):

```bash
adb shell pm get-app-links com.inbidz.app
```

---

## Deep linking behavior

| Link type | Example | When it works |
|-----------|---------|----------------|
| Custom scheme | `inbidz://p/abc123` | Dev/staging **app build** (not Expo Go) |
| HTTPS share link | `https://staging-api.inbidz.com/p/abc123` | Browser + OG preview always; opens app directly only with Universal/App Links |
| LAN dev | `https://api.inbidz.com/p/abc123` | Same Wi‑Fi only; no WhatsApp OG |

**“App is trying to open another app”** — normal when Safari loads the OG page then redirects to `inbidz://`. Goes away once Universal Links work (HTTPS opens app without browser).

---

## Staging test checklist

### 1. Deploy API

- [ ] DNS: `staging-api.inbidz.com` → API host
- [ ] Env vars from `.env.staging.example`
- [ ] `GET https://staging-api.inbidz.com/api/health` → OK
- [ ] `GET https://staging-api.inbidz.com/p/{code}` → preview page

### 2. Staging login

- [ ] `staging-login.inbidz.com` allowlists staging API + `inbidz://` callbacks

### 3. Mobile app

- [ ] `eas build --profile staging` (Android first if no Apple Team ID yet)
- [ ] Install build on device (not Expo Go)
- [ ] Share post → URL is `https://staging-api.inbidz.com/p/...` (not localhost)
- [ ] WhatsApp / iMessage → rich preview (image, title)

### 4. Deep link tests

```bash
# Custom scheme (with app installed)
npx uri-scheme open "inbidz://p/YOUR_CODE" --ios
npx uri-scheme open "inbidz://p/YOUR_CODE" --android
```

### 5. After Apple Team ID (iOS)

- [ ] Set `APPLE_TEAM_ID` on API → redeploy
- [ ] Rebuild iOS staging app
- [ ] Paste `https://staging-api.inbidz.com/p/YOUR_CODE` in Notes → long-press → **Open in INBIDZ Staging**

### 6. After Android fingerprint

- [ ] Set `ANDROID_SHA256_FINGERPRINT` on API → redeploy
- [ ] Reinstall Android staging app
- [ ] Tap HTTPS link → opens app directly

---

## Repo files

| File | Purpose |
|------|---------|
| `apps/api/.env.staging.example` | API staging env template |
| `apps/mobile/.env.staging.example` | Mobile staging env template |
| `apps/mobile/app.config.ts` | Per-env URLs, Universal Links, App Links |
| `apps/mobile/eas.json` | `staging` / `production` build profiles |
| `apps/api/app/p/[code]/page.tsx` | OG preview + “Open in app” |
| `apps/api/app/.well-known/apple-app-site-association/route.ts` | iOS Universal Links |
| `apps/api/app/.well-known/assetlinks.json/route.ts` | Android App Links |

---

## Timeline suggestion (D-U-N-S pending)

**Week 0–4 (now)**

1. Request D-U-N-S if not done
2. Deploy **staging-api** + **staging-login**
3. `eas build --profile staging --platform android` → get SHA-256 → set on API
4. Test share links, OG previews, `inbidz://` on Android

**After Apple enrollment**

1. Copy **Team ID** → `APPLE_TEAM_ID` on API
2. `eas build --profile staging --platform ios`
3. Test Universal Links on iOS
4. TestFlight for wider staging QA

**Production**

- Same pattern with `api.inbidz.com`, `login.inbidz.com`, `APP_ENV=production`
