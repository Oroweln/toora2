# TOORA v4 — Technical Specification

**Version**: 4.0.0
**Date**: 2026-02-27
**Status**: Architecture & planning document

---

## 1. What's Changing

TOORA v1 (current) is an offline-only React Native app with all data bundled at build time, no user accounts, no server, no CMS. Content changes require a developer to edit JSON files and rebuild the app.

TOORA v4 is a centralized platform: server-managed content, user accounts, CMS for editors, downloadable content packages, multi-territory expansion. The app remains offline-capable at runtime but syncs content from a central server when online.

| | v1 (Current) | v4 (This Spec) |
|---|---|---|
| Mobile | React Native / Expo | Flutter / Dart |
| Backend | None | Rust / Axum |
| Database | None (bundled JSON) | PostgreSQL + PostGIS |
| Website | None | SvelteKit |
| Content management | Edit JSON, rebuild app | Web CMS with map editor |
| User accounts | None | JWT auth, synced progress |
| Territories | Single (Sannio) | Multi-territory, expandable |
| Media | Bundled static assets | CDN-hosted, downloaded per-route |
| Rich content | Text, images, basic video | + 360° panoramas, 3D models, narrated audio, TTS |

---

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                         CLIENTS                             │
│                                                             │
│   Flutter App              SvelteKit Website                │
│   (iOS + Android)          (Public site + CMS admin)        │
│                                                             │
└──────────┬──────────────────────────┬──────────────────────┘
           │        HTTPS / JSON      │
           ▼                          ▼
┌────────────────────────────────────────────────────────────┐
│                    RUST BACKEND (Axum)                       │
│                                                             │
│   Auth ─── Content Sync ─── Media Upload ─── CMS API       │
│                                                             │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
       ▼              ▼              ▼
   PostgreSQL      Redis         S3 / R2
   + PostGIS       (cache,       (media files,
                    sessions,     tile packs)
                    rate limits)
```

Four components, one Rust binary:

1. **Flutter mobile app** — offline maps, GPS navigation, media playback, content sync
2. **Rust backend** — single binary, handles all API requests (auth, content, CMS, analytics)
3. **SvelteKit website** — public promotional site + admin CMS panel (same codebase)
4. **PostgreSQL** — all persistent data; PostGIS for geospatial queries

Supporting services: **Redis** for session/cache/rate-limit state, **S3-compatible storage** (Cloudflare R2) for media files and map tile packs, **CDN** (Cloudflare) for delivery.

---

## 3. Tech Stack & Justifications

### Mobile: Flutter / Dart

- **State management**: Riverpod (Zustand doesn't exist in Dart — Riverpod is the closest equivalent: external stores, selector pattern, testable)
- **Maps**: `maplibre_gl` Flutter plugin — same MapLibre engine as v1, same offline MBTiles approach, same base style rules (no symbol layers in base style)
- **Local DB**: Drift (SQLite ORM) — cached content for offline use, visit history, sync state
- **GPS**: `geolocator` + `flutter_compass` — same Kalman filter pipeline, ported from current TypeScript
- **Media**: `just_audio` (narration), `video_player`, `panorama_viewer` (360° images), `model_viewer_plus` (3D glTF/GLB models)
- **i18n**: Flutter's built-in `intl` package with ARB files

### Backend: Rust / Axum

- **Framework**: Axum (async, built on Tower middleware + Tokio runtime + Hyper)
- **Middleware**: `tower-http` (CORS, compression, tracing), `tower-governor` (rate limiting)
- **TLS**: `rustls` via `axum-server` feature flag (pure Rust, no OpenSSL)
- **Database**: `sqlx` (compile-time checked SQL, async, PostgreSQL native)
- **Auth**: `jsonwebtoken` (JWT), `argon2` (password hashing — Argon2id, current best practice)
- **Email**: `lettre` (SMTP transactional emails)
- **Storage**: `aws-sdk-s3` (S3-compatible — works with R2, MinIO, AWS)
- **HTTP client**: `reqwest` (for calling external APIs like DeepL translation)
- **Observability**: `tracing` + `tracing-subscriber`

### Website: SvelteKit

- **Public pages**: Landing, about, contact (Nodemailer), privacy, territory/itinerary browser
- **CMS admin**: Route map editor (MapLibre GL JS for drawing routes + placing stops), media upload, draft/publish workflow, user management
- **Auth**: Server-side session cookies, role-guarded routes
- **Styling**: Tailwind CSS
- **i18n**: `svelte-i18n`

### Database: PostgreSQL 16+ with PostGIS

- **Geospatial**: Territory bounds, activation polygons, route geometries, stop locations — all stored as PostGIS geometry types
- **Content versioning**: Integer version per itinerary, bumped on publish — drives the sync protocol
- **Media metadata**: Separate table linking media assets to stops, per-language, per-type
- **Analytics**: Append-only event table, partitioned by month
- **Users**: Email/password with Argon2id, role-based (user / editor / admin)

### 3D / Immersive Content

- **360° panoramas (mobile)**: `panorama_viewer` — renders equirectangular images on a sphere, supports gyroscope rotation
- **3D models (mobile)**: `model_viewer_plus` — renders glTF/GLB via WebView (Google's model-viewer), separate full-screen viewer triggered from hotspot screen (not overlaid on map — MapLibre Flutter doesn't support it)
- **3D on web (CMS preview)**: Threlte (Three.js for Svelte) — overlaid on MapLibre for CMS preview only
- **360° video**: Same panorama viewer with video texture — Phase 3+

---

## 4. Data Model (High Level)

```
Territory
  ├── name, description, cover image
  ├── bounds (PostGIS polygon)
  └── has many → Itinerary
                   ├── title, description, difficulty, distance, terrain
                   ├── route_geometry (PostGIS LineString)
                   ├── activation_area (PostGIS polygon — where itinerary can be started)
                   ├── starting_point (lat/lng + radius)
                   ├── status (draft / published / archived)
                   ├── version (integer, drives sync)
                   └── has many → Stop
                                   ├── title, description, sequence
                                   ├── location (PostGIS point)
                                   ├── geofence_radius
                                   ├── partner info (winery name, hours)
                                   └── has many → Media
                                                   ├── type (audio, image, hero_image, gallery,
                                                   │        panorama_360, video, video_360,
                                                   │        model_3d, text)
                                                   ├── language (it, en, ...)
                                                   ├── file (S3 key) or text_content (markdown)
                                                   └── processing_status

User
  ├── email, password (Argon2id), role (user/editor/admin)
  ├── language preference
  ├── has many → RefreshToken (server-side, for revocation)
  ├── has many → UserProgress (stop visits, completions — synced)
  └── has many → AnalyticsEvent (append-only)

TilePack
  ├── territory_id
  ├── MBTiles file (S3 key)
  └── version
```

---

## 5. Key Flows

### Content Sync (App ↔ Server)

1. App launches, checks connectivity
2. If online: sends `{itinerary_id: local_version}` pairs to server
3. Server responds with list of itineraries that have newer versions + their package sizes
4. App downloads updated content packages (JSON with stop data + pre-signed media URLs)
5. App fetches each media file, stores locally in file system
6. App updates local SQLite with new content
7. If offline: uses whatever is in local SQLite — fully functional

### CMS Publish Flow

1. Editor creates/edits itinerary + stops + media in CMS
2. Content sits in `draft` status — invisible to app users
3. Editor clicks "Publish" → server bumps `version` integer, sets status to `published`
4. Next time any app syncs, it sees the new version and downloads the update

### Authentication

1. Register/login → server returns JWT access token (15 min) + opaque refresh token (30 days)
2. Access token sent in `Authorization: Bearer` header on every request
3. When access token expires, client uses refresh token to get new pair
4. Refresh tokens are single-use (rotation) with server-side hash storage for revocation
5. Logout revokes all refresh tokens for the user

### GPS Navigation (Same as v1, Ported to Dart)

```
geolocator stream (3s interval, 5m distance)
  → Kalman filter smoothing
  → Location state update
  → computeGuidance() (pure function: nearest point, distance, bearing)
  → Geofence check (is user within stop radius?)
  → UI update (map camera, guidance panel, hotspot popup)
```

---

## 6. Authentication & Security

| Concern | Approach |
|---------|----------|
| Passwords | Argon2id (memory-hard KDF), no max length, min 8 chars |
| Access tokens | JWT, 15 min TTL, contains user_id + role |
| Refresh tokens | Opaque UUID, 30 day TTL, SHA-256 hash stored server-side, single-use rotation |
| Rate limiting | tower-governor backed by Redis — 5/min on login, 60/min general |
| RBAC | Three roles: `user` (browse + download), `editor` (+ CMS write), `admin` (+ delete + user management) |
| Transport | TLS everywhere via rustls |
| Headers | HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy |
| Password reset | Email-based, tokenized, always returns 202 (no email enumeration) |

---

## 7. Media Pipeline

When an editor uploads media via CMS:

1. Raw file uploaded to S3 (`original/` prefix)
2. Media row created with `processing_status = 'pending'`
3. Background job processes the file:
   - **Images**: Resize to thumbnail (200px), medium (800px), full (2048px)
   - **Audio**: Transcode to AAC 128kbps, normalize to -16 LUFS, extract duration
   - **Video**: Transcode to H.264 720p + 1080p, extract duration
   - **360° images**: Validate 2:1 equirectangular ratio, generate preview thumbnail
   - **3D models**: Validate glTF/GLB structure
   - **Text**: Store markdown directly in database column
4. Processed files uploaded to S3 (`processed/` prefix)
5. Media row updated to `processing_status = 'ready'`

When the app downloads a content package, media files are referenced as pre-signed S3 URLs (24h TTL). The app downloads each file and caches locally.

### Auto-Translation (Optional, Editor-Reviewed)

- Editor writes Italian content → clicks "Auto-translate to English"
- Server calls DeepL API, saves result as a **draft** English media row
- Editor reviews, edits, then publishes — never auto-published

### TTS (Phase 3)

- Server-side generation via Google Cloud TTS or Azure Cognitive Services
- Generates audio file from text content, stored as a regular `audio` media row
- Fallback: Flutter's `flutter_tts` for on-device TTS (lower quality, works offline)

---

## 8. Infrastructure & Hosting

| Service | Provider | Est. Cost |
|---------|----------|-----------|
| Rust backend + PostgreSQL + Redis | Hetzner VPS (CX22, 4GB RAM) | ~€14/mo |
| Object storage (media, tiles) | Cloudflare R2 (free egress) | ~€5/mo |
| CDN | Cloudflare (free tier) | €0 |
| Website hosting | Cloudflare Pages (free) or same VPS | €0 |
| **Total** | | **~€20/mo** |

This is not a high-traffic app. A single VPS handles thousands of concurrent users. Cloudflare R2 has zero egress fees, which matters for multi-megabyte content packages.

**Environments**: Development (Docker Compose locally) → Staging → Production

**CI/CD**: GitHub Actions — run `cargo test` + `cargo clippy`, build Docker image, deploy.

---

## 9. Phase Roadmap

### Phase 1 — Foundation (8-10 weeks)

**Goal**: Full feature parity with the current React Native app. If Phase 1 ships without this, the entire migration is pointless. The Flutter app must be at minimum as good as what exists today before anything else is added.

#### Non-negotiable Phase 1 deliverables:

**GPS Navigation — must be identical to v1**
- Kalman filter GPS smoothing (same parameters)
- `computeGuidance()` pure function ported to Dart: nearest point on polyline, distance/bearing to next hotspot, off-route detection
- Software geofencing: 25m hotspot radius, 50m off-route threshold, 10-minute grace period after leaving geofence
- Red ahead-path line: spawns immediately on entering a hotspot geofence, points to the next stop (not the current one) — the fix from v1 must be carried over
- GPS accuracy warning when accuracy > 30m
- Off-route warning banner after sustained off-route detection

**Follow Mode (navigation camera) — must be identical to v1**
- Tap button → map zooms in (zoom 17), tilts to 45° pitch (3D driving view)
- Map rotates to match magnetometer compass heading (same sensor as the GPS dot arrow) — `flutter_compass` package
- GPS dot + compass arrow always visible in follow mode
- Hotspot circles shown as flat red dots in follow mode (no tapping)
- When exiting follow mode: heading resets to north, pitch resets to 0°, smooth animation
- Two-key camera pattern (follow camera vs normal camera are separate instances) to avoid native animation conflicts — same architectural decision as v1

**Hotspot Arrival Popup — must match v1**
- Fires automatically on geofence entry, no manual tap required
- Stays in follow mode — does not interrupt navigation
- Shows stop title, sequence number, short description
- Two buttons: "Continue" (dismiss, keep riding) and "View Content" (navigate to content screen)
- `shownPopupIdsRef` equivalent — popup shows once per stop per session, repeated GPS ticks don't retrigger

**Offline Maps**
- MBTiles via `maplibre_gl` Flutter plugin
- Same base style rules as v1: ONLY fill/line/background layers in base style. NO symbol layers, NO filters in base style. Breaking this causes a blank map with no error.
- Route polyline, direction dots, start/end markers, hotspot markers
- Map labels from pre-extracted GeoJSON + SymbolLayer (not in base style)

**Content**
- Text content (markdown) rendered in hotspot screen
- Image gallery viewer
- Session persistence: resume a route after closing the app (SQLite equivalent of AsyncStorage persist in v1)
- Clear saved session button on itinerary detail screen

**Server (minimum viable)**
- Auth (register/login/JWT/refresh/logout)
- Territory + itinerary + stop CRUD
- Media upload (images + text only)
- Content sync endpoint (version check + package download)
- Rate limiting

**Website (minimum viable)**
- Public pages (landing, about, contact with Nodemailer, privacy)
- Basic CMS: CRUD forms for territories, itineraries, stops; image + text media upload; publish button

**Infra**
- Docker Compose local dev environment
- CI pipeline (test + lint + build)

**Not in Phase 1**: Audio narration, video, 360°, 3D models, map route editor in CMS, activation polygons, analytics, TTS, auto-translation.

### Phase 2 — Rich Media + CMS Polish (6-8 weeks)

- **Backend**: Audio/video transcoding pipeline, media processing queue, draft→publish with version bumps, activation polygon support, analytics ingestion
- **Flutter**: Audio narration player (background playback, lock screen), video player, gallery viewer, follow mode (3D camera + compass heading), hotspot arrival popup, progress sync
- **Website CMS**: MapLibre route editor (draw routes, place stops, set geofence radii), activation polygon editor, media library, publish workflow, basic analytics dashboard

### Phase 3 — Immersive Content (6-8 weeks)

- **Backend**: 360° image/video validation + processing, 3D model validation, DeepL auto-translation integration, TTS audio generation
- **Flutter**: 360° panorama viewer (gyroscope), 3D model viewer (glTF/GLB), TTS fallback, multi-language content switching
- **Website CMS**: 360° upload + preview, 3D upload + preview (Threlte), auto-translate button, TTS generation

### Phase 4 — Scale + Polish (4-6 weeks)

- Multi-territory tile pack generation
- Partner portal (view-only for wineries)
- Push notifications
- GDPR account deletion flow
- App Store + Play Store deployment
- Production infrastructure (monitoring, backups, error tracking)

### Phase 5+ (Future)

- AR hotspots (ARCore/ARKit)
- Premium/paid itineraries (in-app purchase)
- Additional territories
- Smartwatch companion

---

## 10. Migration from v1

The current React Native codebase contains validated business logic that should be ported, not rewritten from scratch:

| v1 (TypeScript) | v4 (Dart) | Notes |
|---|---|---|
| `src/utils/geo.ts` | `lib/shared/utils/geo_math.dart` | Pure math, direct port |
| `src/utils/kalmanFilter.ts` | `lib/shared/utils/kalman_filter.dart` | Pure math, direct port |
| `src/services/routeGuidance.ts` | `lib/features/navigation/data/guidance_engine.dart` | Pure function, direct port |
| `src/services/geofence.ts` | `lib/features/navigation/data/geofence_service.dart` | Direct port |
| `src/data/itineraries.json` | PostgreSQL seed data | Import via migration script |
| `components/RouteMap.tsx` | `lib/features/navigation/presentation/route_map_widget.dart` | Rewrite for Flutter MapLibre, same layer rules |
| `app/route/[id].tsx` | `lib/features/navigation/presentation/route_map_screen.dart` | Decompose into smaller widgets |

**Critical**: The MapLibre base style rules (no symbol layers, no filters in base style) apply equally to the Flutter plugin. Same native bridge, same limitations.

---

## 11. Investor Doc Gap Analysis

| Investor Requirement | Covered | Phase |
|---|---|---|
| Multi-territory architecture | Yes | 1 |
| User accounts + registration | Yes | 1 |
| CMS for content management | Yes | 1-2 |
| Activation polygon (on-site only) | Yes | 2 |
| Audio narration (ritual model) | Yes | 2 |
| Video (evocative scenes) | Yes | 2 |
| 360° panoramic content | Yes | 3 |
| 3D objects | Yes (viewer, not AR overlay on map) | 3 |
| Auto-translation | Yes (editor-reviewed) | 3 |
| AR hotspots | Deferred (immature Flutter support) | 5+ |
| Partner integration (wineries) | Yes | 4 |
| Analytics | Yes | 2 |
| API versioning (/api/v1/) | Yes | 1 |
| Offline capability | Yes | 1 |
| GDPR compliance | Yes | 4 |
| Premium/monetization | Schema ready, implementation deferred | 5+ |
| CI/CD + environments | Yes | 1 |

The investor doc's "AR Module" (2 hotspots per itinerary, 90s timeout) is deferred to Phase 5+ because AR on Flutter is immature and adds massive scope for minimal user value at launch. The schema and architecture support adding it later without restructuring.
