Tech Stack

  ┌──────────────────┬───────────────────────────────────┬────────────────────────────────────────────┐
  │      Layer       │              Choice               │                 Assessment                 │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Framework        │ Expo SDK 54 + React Native 0.81.5 │ Current stable, good choice                │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Language         │ TypeScript 5.9.2 strict mode      │ Correct call for a GPS-heavy app           │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ React            │ 19.1.0                            │ Cutting edge — React 19 just shipped       │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Compiler         │ React Compiler enabled            │ Forward-thinking, reduces memo boilerplate │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ New Architecture │ Enabled (JSI/Fabric)              │ Right choice for MapLibre native bridge    │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Routing          │ Expo Router v6 (file-based)       │ Clean, typed routes, appropriate           │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Maps             │ MapLibre GL React Native 10.4.2   │ Only credible offline-capable option       │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ State            │ Zustand 5.0.11                    │ Lightweight, correct fit for this scale    │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Persistence      │ AsyncStorage                      │ Fine for the data volume here              │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ i18n             │ i18next 25.x + react-i18next      │ Industry standard, well-integrated         │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ Audio/Video      │ expo-av + expo-video              │ Standard                                   │
  ├──────────────────┼───────────────────────────────────┼────────────────────────────────────────────┤
  │ GPS              │ expo-location                     │ Correct, well-abstracted                   │
  └──────────────────┴───────────────────────────────────┴────────────────────────────────────────────┘

  The stack is genuinely modern — React 19, New Architecture, and React Compiler together is ahead of most production RN
   apps. No dead weight.

  ---
  Architecture

  What's done well

  Offline-first is real, not fake. 66MB MBTiles bundled as a Metro asset, glyph PBFs bundled and copied via a custom
  Expo config plugin (withIOSGlyphs.js), all content in itineraries.json, zero network calls at runtime. This is rare
  and difficult to execute correctly — most "offline" apps cheat. This one doesn't.

  GPS pipeline is sophisticated. expo-location → GPSSmoother (Kalman filter) → useLocationStore → computeGuidance() →
  geofence check. The Kalman filter is a real 1D implementation with process noise and measurement noise, not just a
  moving average. The ref pattern in the GPS callback (navigationModeRef, currentHotspotIndexRef) correctly avoids stale
   closure bugs without re-registering the subscription on every state change — that's a non-obvious React Native
  pattern most devs get wrong.

  computeGuidance is a pure function. Takes position + data, returns guidance state, no side effects. Ideal for unit
  testing, easy to reason about.

  Separation of concerns is real. services/ for business logic, stores/ for state, utils/ for pure math, components/ for
   UI. The geofence service, guidance engine, and location service are all independently replaceable.

  Three-tier data model is correct. Static JSON at build time → Zustand for runtime → AsyncStorage for persistence. Each
   layer has a clear responsibility.

  Custom validation tooling. scripts/validate.js and scripts/convert-kml.js show the data pipeline was designed
  deliberately.

  Touch targets at 56dp for cycling gloves — accessibility consideration that most devs ignore entirely.

  ---
  Problems

  app/route/[id].tsx is a 651-line god component. It owns GPS tracking setup, Kalman filter, geofence polling, hotspot
  unlock logic, follow mode state, compass heading subscription, guidance display, off-route timer, navigation handlers,
   highlight computation, and all UI. A useNavigation or useGpsTracking hook extracting the GPS/geofence logic would cut
   it in half and make the render return readable.

  Manual persistence is fragile. persistSession() is called manually in 8 different action functions in useRouteStore.
  Zustand's built-in persist middleware with a custom serializer (Sets → Arrays) would handle this automatically and be
  impossible to forget. As-is, if someone adds a new action and forgets persistSession, data silently doesn't save.

  advanceToNextHotspot is a dead action. Defined in the store, never called anywhere. Suggests a design that was
  partially refactored.

  No tests. src/utils/geo.ts — Haversine, bearing, nearest point on polyline — are pure math functions that are perfect
  for unit tests and have zero. A single GPS coordinate off by a rounding error would silently break navigation and
  there's nothing to catch it. This is the biggest structural gap.

  devMode = false TODO left in production code. A boolean flag with a TODO: set to false for production release comment
  directly above it that is already set to false. Should be removed entirely.

  Test routes bundled in production data. test-belgrade.json, test-belgrade2.json are in src/data/routes/ and referenced
   in the data index. They'll ship to users.

  cameraRef typed as any. MapLibre's camera ref type is available (MapLibreGL.CameraRef). Small but sloppy given strict
  mode everywhere else.

  Magic numbers in camera control. zoomLevel: 16, pitch: 45, animationDuration: 500, animationDuration: 300 are
  scattered inline. Should be named constants in theme.ts or a mapConfig object.

  backgroundTasks.ts registers a geofence task but its actual behavior when backgrounded is a black box with minimal
  logging — hard to debug failures in production.

  ---
  Grades

  ┌─────────────────────────┬───────┬─────────────────────────────────────────────────────────────────────┐
  │          Area           │ Grade │                               Reason                                │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ Offline-first execution │ A     │ Genuinely complete — MBTiles, glyphs, data, all bundled             │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ GPS / navigation engine │ A-    │ Kalman filter, pure guidance function, ref pattern, solid           │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ Tech stack modernity    │ A-    │ React 19, New Architecture, React Compiler, correct tools           │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ TypeScript discipline   │ B+    │ Strict mode throughout, but any leaks and magic numbers             │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ State management        │ B+    │ Right tool, right shape, but manual persistence is fragile          │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ Component design        │ B-    │ Good small components, but route/[id].tsx is a god component        │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ Testing                 │ F     │ Zero tests. Pure math functions exist that are ideal candidates     │
  ├─────────────────────────┼───────┼─────────────────────────────────────────────────────────────────────┤
  │ Data hygiene            │ C+    │ Dead action, test routes in prod, TODO left in, null content fields │
  └─────────────────────────┴───────┴─────────────────────────────────────────────────────────────────────┘

  ---
  Overall: B+ (78/100)

  This is a well-above-average codebase. The offline-first architecture and GPS pipeline show real engineering thought —
   most developers would have just used Google Maps with an internet connection. The tech stack is more current than
  most shipping production apps.

  What drops it from an A: zero tests on safety-critical navigation math, a god component at the core of the app, manual
   persistence that will eventually have a bug when someone adds a store action and forgets one call, and test artifacts
   shipped to production. None of these are hard to fix — they're just not done.