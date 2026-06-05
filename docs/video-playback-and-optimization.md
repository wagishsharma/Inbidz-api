# Video playback & optimization

How INBIDZ stores and plays video today, what’s optimized, and what to improve next.

---

## Current behavior

### Upload

1. User picks video in **Create** (max 60s, up to 50 MB on server).
2. File uploads **as-is** to **Cloudflare R2** via `POST /api/upload/r2` (or dev fallback to API disk).
3. Stored at `posts/{userId}/{uuid}-{filename}.mp4` (or `.mov` / `.webm`).
4. DB stores `r2_key`, `public_url`, and optional `hls_url` (unused today).

### Playback URL

The API returns media on each post:

| Field | Source |
|-------|--------|
| `url` | R2 public URL (`R2_PUBLIC_URL` + key), e.g. `https://pub-….r2.dev/posts/…/file.mp4` |
| `hlsUrl` | From DB `hls_url` — **never set** in current code |

Mobile player (`expo-av`):

```ts
source={{ uri: item.hlsUrl || item.url }}
```

So playback is **progressive download of the full original MP4** from R2 (or `/api/media/dev/…` in dev).

### Dev vs R2

| Storage | Playback URL | Cache |
|---------|--------------|-------|
| **R2** | Direct `R2_PUBLIC_URL` | Public r2.dev; Cloudflare may edge-cache |
| **Dev fallback** | `API_PUBLIC_URL/api/media/dev/…` | `Cache-Control: public, max-age=86400` |

### What is *not* optimized

| Feature | Status |
|---------|--------|
| HLS / adaptive bitrate | ❌ Schema only; no pipeline |
| Transcoding / compression on server | ❌ |
| Video poster / thumbnail in DB | ✅ New uploads (first frame JPEG on R2) |
| Custom CDN in front of R2 | ❌ Not configured in app |
| App-level video cache | ❌ Native player may buffer only |
| Signed / expiring playback URLs | ❌ Public stable URLs |

### What *is* optimized (playback control)

- Feed: only **first post** auto-plays when Home tab is focused.
- Tab switch / immersive swipe: **pause** off-screen videos.
- **Lazy video mount**: feed cards that aren’t playing don’t load the video file (show play placeholder).

### Upload note

Mobile uploads use **`expo-file-system` `uploadAsync`** (native multipart) — not `fetch(uri).blob()` or RN `FormData`, which send **0-byte files** for videos on iOS. Picker URIs are copied to cache when needed. The API rejects empty uploads with `400`.

---

## Impact ranking (what to do next)

| Priority | Improvement | Effect | Effort |
|----------|-------------|--------|--------|
| **1 — Done** | **Lazy video loading in feed** | Stops N videos from downloading when scrolling; only the playing card hits R2 | Low |
| **2 — Done** | **Compress on pick (720p H.264)** | Smaller files uploaded once → every view uses less data | Low |
| **3** | **Server transcode on upload (FFmpeg → 720p MP4)** | Same benefit for all uploads; works even if client skips compression | Medium |
| **4** | **Poster thumbnail (first frame)** | ✅ Shipped — `expo-video-thumbnails` on upload | Medium |
| **5** | **HLS adaptive streaming** | Best on slow networks; multiple quality levels | High (Cloudflare Stream, Mux, or custom worker) |
| **6** | **Custom domain + CDN on R2 bucket** | Better edge caching globally | Low (infra config) |

### Best single long-term win

**HLS + transcoding** (e.g. Cloudflare Stream, or upload → FFmpeg → `.m3u8` + segments in R2) gives the largest improvement for playback quality and bandwidth on variable networks. That’s a dedicated project.

### Best first step (shipped)

**Lazy video loading** + **compress on pick** — no new infra, immediate savings on feed scroll and new uploads.

---

## Implemented: poster thumbnail (first frame)

On **video upload** (Create flow):

1. `expo-video-thumbnails` extracts frame at `t=0`
2. JPEG uploaded to R2 next to the video (`posts/{userId}/thumb-….jpg`)
3. Stored in `post_media.thumbnail_r2_key` / `thumbnail_url`
4. Feed shows poster when video isn’t loaded; `expo-av` `usePoster` while video buffers

**Existing videos** have no poster until re-uploaded.

Migration: `002_media_thumbnails.sql` (run `npm run migrate --workspace=@inbidz/api`).

---

## Implemented: lazy video loading

`AdaptiveMedia` accepts `loadVideo` (default `true`).

- `loadVideo={false}` → video posts show a **placeholder** (play icon), no `Video` component, **no network request**.
- `PostCard` sets `loadVideo={Boolean(autoPlay)}` — only the auto-playing feed card loads video.

Immersive mode and post detail keep default `loadVideo={true}`.

---

## Implemented: compress on pick

Create flow uses expo-image-picker presets for new uploads:

- iOS: `videoExportPreset: H264_1280x720`, `videoQuality: Medium`
- Photos: `quality: 0.85`

Existing posts in R2 are unchanged; re-upload to get smaller files.

---

## Future: HLS pipeline (sketch)

1. On upload complete, enqueue transcode job.
2. Output `master.m3u8` + segments to R2 under `posts/{id}/hls/`.
3. Set `post_media.hls_url` in DB.
4. Player already prefers `hlsUrl || url`.

Options:

- **Cloudflare Stream** — managed, fits R2/Cloudflare stack
- **FFmpeg on worker/VPS** — self-hosted after upload webhook
- **Mux / AWS MediaConvert** — managed, paid

---

## Related files

| File | Role |
|------|------|
| `apps/mobile/components/AdaptiveMedia.tsx` | Player + lazy load |
| `apps/mobile/components/PostCard.tsx` | Passes `loadVideo` from `autoPlay` |
| `apps/mobile/app/(tabs)/create.tsx` | Pick + upload compression |
| `apps/api/lib/post-mapper.ts` | Resolves `url` / `hlsUrl` |
| `apps/api/lib/r2.ts` | R2 upload + public URL |
| `apps/api/app/api/upload/r2/route.ts` | Server upload (50 MB cap) |
