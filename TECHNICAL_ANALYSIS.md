# TOORA App -- Technical Analysis & Review

## 1. What the App Is

TOORA is an **offline-first bicycle tourism app** for the Campania/Sannio region of Italy. Built with **Expo (React Native) + TypeScript**, it guides cyclists along 8 curated routes, unlocking geo-locked multimedia content (text, audio, gallery, video) at points of interest ("hotspots") as the user physically arrives at each location.

---

## 2. Screen Architecture

The app uses **Expo Router** (file-based routing) with 6 screens across two navigation layers:

| Screen | File | Role |
|---|---|---|
| **Home** | `app/(tabs)/index.tsx` | Grid of 8 itinerary cards with difficulty/terrain/stats. Entry point. |
| **Explore** | `app/(tabs)/explore.tsx` | Dashboard: stats overview, how-it-works guide, language switch (IT/EN). |
| **Itinerary Detail** | `app/itinerary/[id].tsx` | Full route info, hotspot list, "Start Route" button. Requests GPS permission. |
| **Route Map** | `app/route/[id].tsx` | Core navigation screen. GPS tracking, guidance, off-route warnings, hotspot unlock. Map is currently a placeholder (MapLibre integration pending). |
| **Hotspot Content** | `app/hotspot/[hotspotId].tsx` | Tabbed multimedia viewer (text/gallery/video) with sticky audio player. Geo-locked entry. |
| **Route Complete** | `app/complete/[id].tsx` | Celebration screen with elapsed time, visited count, distance stats. |

**Navigation flow**: `Home -> Itinerary Detail -> Route Map -> (tap hotspot) -> Hotspot Content -> ... -> Route Complete`

**Grade: B+**
The screen structure is clean and well-organized. File-based routing with Expo Router is a good fit. The separation between list/detail/active-navigation/content is logical. However, the Route Map screen (`app/route/[id].tsx`) at 651 lines is doing too much -- it handles GPS tracking, guidance computation, geofence checks, off-route timers, hotspot tap logic, and all the UI. This should be decomposed into custom hooks (e.g., `useRouteTracking`, `useGeofenceMonitor`).

---

## 3. Data Storage & Persistence

The app uses a **three-tier data strategy**:

### Tier 1: Bundled Static Data (build-time)
- `src/data/itineraries.json` -- Master dataset: 8 itineraries with metadata + embedded hotspot definitions
- `src/data/routes/*.json` -- 8 GeoJSON files (200-1300+ coordinate points each)
- Loaded via `require()` at import time, zero network calls

### Tier 2: In-Memory State (Zustand stores, runtime)
| Store | Purpose | Persisted? |
|---|---|---|
| `useRouteStore` | Active itinerary, guidance state, visited/unlocked sets, entry timestamps, nav mode | No |
| `useLocationStore` | Current GPS position, accuracy, tracking flag, permission state | No |
| `useVisitStore` | Historical visits, completed routes, active route ID, last known position | **Yes** (AsyncStorage) |
| `useLanguageStore` | Language preference (it/en) | **Yes** (AsyncStorage) |

### Tier 3: AsyncStorage (local persistence)
Key schema:
- `visited:{hotspotId}` -> ISO timestamp
- `started:{itineraryId}` -> ISO timestamp
- `completed:{itineraryId}` -> ISO timestamp
- `activeRoute` -> itinerary ID (for resume)
- `lastKnownLat`, `lastKnownLng` -> floats as strings
- `app_language` -> "it" | "en"

**Grade: B-**

Strengths:
- Offline-first is the correct architectural choice for a cycling app in rural Italy
- Zustand is a good pick -- lightweight, no boilerplate, fine-grained subscriptions
- Clean separation between ephemeral state (route/location stores) and persistent state (visit store)

Weaknesses:
- **AsyncStorage load is O(n) on keys** (`src/stores/useVisitStore.ts:104-143`). The `loadFromStorage()` method calls `getAllKeys()` then iterates with individual `getItem()` calls in a for-loop. With 100+ hotspots visited, this becomes `100+ sequential async calls` at app startup. Should use `multiGet()` instead.
- **No error boundaries around persistence**. If AsyncStorage writes fail (e.g., device full), the app silently logs a warning but the user loses their progress with no notification.
- **`getVisitedCount()` uses string parsing** (`useVisitStore.ts:98`): `id.startsWith(prefix)` with a prefix constructed via `itineraryId.split('_')[1]`. This is fragile -- it assumes a specific ID format (`hs_X_Y`) and will break if IDs change.
- **`Set` serialization issue**: `useRouteStore` uses `Set<string>` for `visitedHotspotIds` and `unlockedHotspotIds`. Zustand's `Set` won't survive JSON serialization if persistence middleware is ever added. This is fine today (not persisted), but worth noting.
- **No data migration strategy**. If `itineraries.json` structure changes between app updates, there's no versioning or migration for the AsyncStorage keys that reference old IDs.

---

## 4. Data Flow: GPS Update Cycle

This is the most critical data path in the app. Here's the complete flow for a single GPS tick:

```
[expo-location watchPositionAsync]  (every ~3s or 5m movement)
          |
          v
[GPSSmoother.update()]              Kalman filter on lat/lng independently
          |
          v
[useLocationStore.updateLocation()] Zustand store: currentLocation, accuracy, isGPSWeak
          |
          v
[RouteMapScreen useEffect]          Triggered by location store subscription
          |
          v
[computeGuidance()]                 Pure function: nearestPointOnRoute, distanceAlongRoute,
          |                         bearing, isOffRoute, isApproachingHotspot, isAtHotspot
          v
[useRouteStore.updateGuidance()]    Zustand store: guidance object
          |
          v
[Geofence loop]                     For each hotspot: isContentAccessible()?
  |                                   -> unlockHotspot() / lockHotspot()
  |                                   -> recordHotspotEntry()
  v
[UI re-renders]                     Bottom card, progress bar, off-route banner, markers
```

**Grade: B**

The pipeline is logically sound. Computation runs on the JS thread (~3s intervals) which is acceptable. But:

- **Stale closure problem** (`app/route/[id].tsx:82-148`): The GPS tracking callback captures `currentHotspotIndex`, `visitedHotspotIds`, `navigationMode`, and `hotspotEntryTimestamps` from the render closure. The `useEffect` depends on `[itinerary?.id, navigationMode]`, but `currentHotspotIndex` and `visitedHotspotIds` can change without re-registering the callback. This means guidance computations may use **stale data** -- e.g., a hotspot marked as visited might not be recognized as such until `navigationMode` changes.
- **Guidance computation iterates all route segments** on every GPS tick (`nearestPointOnRoute` is O(n) over all coordinates). With routes having 1300+ points, that's ~1300 Haversine calculations every 3 seconds. Not a problem on modern phones, but could be optimized with spatial indexing for longer routes.
- **No debounce/throttle on store updates**. Each GPS tick writes to `locationStore`, `routeStore`, and potentially multiple `unlockHotspot/lockHotspot` calls, causing multiple synchronous re-renders.

---

## 5. GPS System -- Deep Dive

### 5.1 Permission Model
- Foreground: **Required** (app won't function without it)
- Background: **Optional** (for geofencing when backgrounded)
- Platform-specific configs in `app.json` for iOS (`infoPlist`) and Android (`permissions`)

### 5.2 Tracking Configuration
```
Foreground: BestForNavigation accuracy, 3s interval, 5m distance threshold
Background: Balanced accuracy, 10s interval, 20m distance threshold
```

### 5.3 GPS Smoothing (Kalman Filter)
Located in `src/utils/kalmanFilter.ts`. Implements a **1D Kalman filter** applied independently to latitude and longitude.

**Grade: C+**

Issues:
- **Two independent 1D filters is geometrically incorrect** for GPS. Latitude and longitude are correlated (especially at higher latitudes where longitude degrees shrink). A proper implementation would use a 2D Kalman filter with a covariance matrix. In practice, at Italian latitudes (~41N), the error from treating them independently is small but non-zero.
- **`errorScale` and `dt` are computed but never used** (`kalmanFilter.ts:75-79`). The `errorScale` (derived from reported GPS accuracy) and `dt` (time delta) are calculated but don't feed into the filter's `update()` method. The Kalman filter uses fixed `errorMeasurement` and `processNoise` values regardless of actual GPS quality. This defeats the purpose of adaptive filtering.
- **`isOutlier()` uses `require()` at runtime** (`kalmanFilter.ts:102`). Dynamic `require()` inside a function is an anti-pattern in React Native -- it works but creates a hidden dependency and is not tree-shakeable.
- The Kalman filter `processNoise` default of `0.5` is aggressive for cycling speeds -- it may over-smooth legitimate movement changes like turns.

### 5.4 Geofencing
Two geofencing mechanisms coexist:

1. **Native geofencing** via `expo-location.startGeofencingAsync()` -- registered in `src/services/geofence.ts:buildGeofenceRegions()` but **the geofence task handler is never defined**. The app registers geofences with task name `'TOORA_GEOFENCE_TASK'` but there's no corresponding `TaskManager.defineTask()` call anywhere in the codebase. This means native background geofencing is **non-functional**.

2. **Software geofencing** in the route map screen -- checks distance on every GPS update in the foreground. This is what actually works.

**Grade: C** for the native geofencing gap. The software geofencing works fine for foreground use, but the unused `registerGeofences`/`unregisterGeofences` API is dead code.

### 5.5 Content Access / Grace Period
The `isContentAccessible()` function (`src/services/geofence.ts:45-78`) implements a three-check system:

1. **Dynamic radius**: `effectiveRadius = max(hotspot.geofenceRadiusM, gpsAccuracy * 1.2)` -- scales up the geofence when GPS is imprecise. Good design.
2. **Direct distance check**: Haversine distance to hotspot center.
3. **Grace period**: 10-minute window after exiting the geofence. Prevents content from locking mid-read if the cyclist moves slightly.

**Grade: A-** for this subsystem. The grace period is thoughtful. The dynamic radius handles real-world GPS variance well.

### 5.6 Off-Route Detection
- Threshold: 50m from nearest route point (`GEOFENCE_CONFIG.offRouteThreshold`)
- Warning appears immediately, but the "Back to route" button only shows after 60 seconds off-route
- "Back to route" opens native maps (Google Maps / Apple Maps) to navigate to the nearest point on the route polyline

**Grade: B+**. Sensible thresholds. The 60-second delay before showing the navigation button prevents false positives from GPS drift.

---

## 6. Cross-Cutting Concerns

### 6.1 Internationalization
- i18next with `it` (default) and `en` locales
- 150+ translation keys covering all UI text
- Language persisted in AsyncStorage
- Grade: **A-**. Well-implemented. Minor issue: some hardcoded English strings remain in `_layout.tsx` (e.g., `headerBackTitle: 'Back'` and `headerBackTitle: 'Map'` at lines 33, 48).

### 6.2 Theming
- Light/dark mode via system preference
- Consistent design tokens in `constants/theme.ts`
- 56dp minimum touch targets (cycling glove-friendly)
- Grade: **B+**. Solid foundation. Some hardcoded colors exist in stylesheets (e.g., `#fff`, `#F0F0F0`, `#E8EDF2` in route map styles rather than theme tokens).

### 6.3 Error Handling
- Grade: **C**. Error handling is consistently `console.warn()` with no user-facing feedback. GPS failures, storage failures, and audio loading failures all silently fail. The user has no way to know if their progress isn't being saved or if GPS is malfunctioning beyond the accuracy indicator.

### 6.4 Testing
- Grade: **F**. No test files exist. No test runner configured. For an app where correctness of GPS math (Haversine, bearing, nearest-point-on-line) directly affects user experience, this is a significant gap. The pure utility functions in `geo.ts` and `kalmanFilter.ts` are ideal candidates for unit tests.

### 6.5 Performance
- Grade: **B**. The app is lightweight by design (no network calls, simple UI). The `computeGuidance()` O(n) scan is acceptable for current route sizes. `useKeepAwake()` prevents screen sleep during navigation. The main concern is the stale closure issue mentioned in Section 4 and the potential for multiple re-renders per GPS tick.

---

## 7. Architecture Scorecard

| Category | Grade | Notes |
|---|---|---|
| **Overall Architecture** | **B+** | Clean offline-first design. Good separation of concerns (services/stores/screens/utils). |
| **Screen Structure** | **B+** | Logical flow, file-based routing. Route map screen is overloaded. |
| **Data Model** | **A-** | Well-typed, clear domain modeling. GeoJSON integration is clean. |
| **State Management** | **B** | Zustand is a good fit. Stale closure bugs in the GPS callback need fixing. |
| **Persistence** | **B-** | Works but unoptimized (sequential AsyncStorage reads). No migration strategy. |
| **GPS/Location** | **B-** | Core pipeline works. Kalman filter has unused params. Native geofencing is dead code. |
| **Geofence Logic** | **A-** | Grace period, dynamic radius, and content locking are well-designed. |
| **Route Guidance** | **B** | Correct math. O(n) per tick is fine now but won't scale. Stale closure risk. |
| **Error Handling** | **C** | Silent failures everywhere. No user-facing error states. |
| **Testing** | **F** | No tests at all. |
| **i18n** | **A-** | Solid. A few hardcoded English strings remain. |
| **Code Quality** | **B+** | TypeScript throughout. Clean, readable code. Good JSDoc comments. |
| **Map Integration** | **Incomplete** | MapLibre GL is a dependency but the map view is a placeholder. |

**Overall: B**

---

## 8. Top Priority Suggestions

### Critical (fix before release)

1. **Fix the stale closure in the GPS tracking callback** (`app/route/[id].tsx:82-148`). Use `useRef` for mutable values (`currentHotspotIndex`, `visitedHotspotIds`) or move the logic into a `useCallback` with proper dependencies. Without this fix, the app can fail to recognize visited hotspots or miscalculate guidance.

2. **Define the geofence background task or remove the dead code**. Either implement `TaskManager.defineTask('TOORA_GEOFENCE_TASK', ...)` with a handler, or remove `registerGeofences`/`unregisterGeofences` to avoid confusion.

3. **Wire up the unused Kalman filter parameters**. Pass `errorScale` and `dt` into the filter's update logic. Currently, the filter operates with fixed parameters regardless of GPS quality, which reduces its effectiveness.

### High Priority

4. **Add unit tests for `geo.ts` and `routeGuidance.ts`**. These pure functions are trivial to test and GPS math errors are hard to catch visually. Install Jest (already supported by Expo) and test Haversine, bearing, nearest-point, and distance-along-route.

5. **Optimize `loadFromStorage()`**. Replace the for-loop of individual `getItem()` calls with `AsyncStorage.multiGet()`. This changes ~100 async calls into 1.

6. **Extract the GPS tracking logic** from `RouteMapScreen` into a custom hook (`useRouteTracking`). The screen component should only handle rendering.

### Medium Priority

7. **Add user-facing error states**. At minimum: a toast/banner when GPS permission is denied, when storage write fails, or when audio fails to load.

8. **Implement the MapLibre GL map**. The map placeholder is the biggest UX gap. The dependency is already installed; it needs configuration with offline tile sources (MBTiles or PMTiles for the Campania region).

9. **Fix hardcoded strings**: `headerBackTitle: 'Back'` and `headerBackTitle: 'Map'` in `app/_layout.tsx:33,48` should use `t()`.

10. **Consider route resumption**. The `activeRouteId` and `lastKnownLat/Lng` are persisted but there's no UI for resuming an interrupted route after app restart.
