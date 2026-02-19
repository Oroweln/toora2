export default {
  // ─── Tabs ──────────────────────────────────────────────────
  tabs: {
    itineraries: 'Itineraries',
    explore: 'Explore',
  },

  // ─── Home Screen ──────────────────────────────────────────
  home: {
    completed: 'Completed',
  },

  // ─── Shared labels ────────────────────────────────────────
  difficulty: {
    easy: 'Easy',
    moderate: 'Moderate',
    hard: 'Hard',
  },
  terrain: {
    paved: 'Paved',
    gravel: 'Gravel',
    trail: 'Trail',
  },

  // ─── Explore Screen ───────────────────────────────────────
  explore: {
    title: 'Inner Campania',
    subtitle: 'Bicycle touring itineraries in the heart of Sannio',
    itineraries: 'Itineraries',
    hotspots: 'Stops',
    totalKm: 'total km',
    howItWorks: 'How it works',
    step1: 'Choose an itinerary and reach the starting point',
    step2: 'Follow the route on the map — works offline',
    step3: 'Content unlocks automatically at the stops',
    step4: 'Discover texts, images, audio and video about the places',
    offlineNotice:
      'The app works completely offline. Only GPS signal is needed.',
  },

  // ─── Itinerary Detail Screen ──────────────────────────────
  itinerary: {
    notFound: 'Itinerary not found.',
    startingPoint: 'Starting point',
    hotspotCount: 'Stops ({{count}}) · {{active}} with content',
    active: 'Active',
    gpsPermissionTitle: 'GPS permission required',
    gpsPermissionMessage:
      'TOORA needs location access to guide you along the route.',
    errorTitle: 'Error',
    routeDataUnavailable: 'Route data unavailable.',
    reachStartTitle: 'Reach the starting point',
    reachStartMessage:
      'You are {{distance}} km from the starting point. Do you want to open navigation?',
    openMaps: 'Open Maps',
    goToMap: 'Go to map',
    starting: 'Starting...',
    startRoute: 'START ROUTE',
  },

  // ─── Route Map Screen ─────────────────────────────────────
  route: {
    notFound: 'Itinerary not found.',
    mapTitle: 'Route map',
    mapSubtext: 'MapLibre GL renders here with offline raster tiles',
    gpsLabel: 'GPS: {{lat}}, {{lng}}',
    accuracyLabel: 'Accuracy: {{accuracy}}m',
    exitTitle: 'Exit route?',
    exitMessage: 'Your progress will be saved.',
    cancel: 'Cancel',
    exit: 'Exit',
    contentLockedTitle: 'Content locked',
    contentLockedMessage:
      'You must be at the stop to access the content.\nDistance: {{distance}}',
    ok: 'OK',
    navigateHere: 'Navigate here',
    weakGps: 'Weak GPS',
    offRoute: 'You are off route!',
    backToRoute: 'Back to route',
    reachingStart: 'Reaching the starting point...',
    nextStop: 'Next stop:',
    stopsProgress: '{{visited}}/{{total}} stops',
    routeCompleted: 'Route completed!',
  },

  // ─── Hotspot Content Screen ───────────────────────────────
  hotspot: {
    notFound: 'Stop not found.',
    contentLockedTitle: 'Content locked',
    contentLockedMessage: 'You must be at the stop to access the content.',
    distance: 'Distance: {{distance}}',
    navigateHere: 'Navigate here',
    waypoint: 'Stop',
    continueNext: 'Continue to the next stop',
    tabText: 'Text',
    tabGallery: 'Gallery',
    tabVideo: 'Video',
    stopOf: 'Stop {{sequence}} of {{total}} · {{itinerary}}',
    placeholderContent:
      'This is the detailed content for the stop "{{title}}". At this location you can discover the history and curiosities of this place through texts, images and multimedia content.',
    audioGuide: 'Audio Guide',
  },

  // ─── Route Complete Screen ────────────────────────────────
  complete: {
    notFound: 'Itinerary not found.',
    congratulations: 'Congratulations!',
    routeCompleted: 'You have completed the route',
    timeSpent: 'Time spent',
    stopsVisited: 'Stops visited',
    distance: 'Distance',
    summary:
      'You discovered {{count}} stops with multimedia content along the route. Your progress has been saved.',
    goHome: 'Back to Home',
  },

  // ─── Navigation headers ───────────────────────────────────
  nav: {
    back: 'Back',
    map: 'Map',
  },

  // ─── Language selector ────────────────────────────────────
  language: {
    title: 'Language',
    italian: 'Italiano',
    english: 'English',
  },

  // ─── Units ────────────────────────────────────────────────
  units: {
    min: 'min',
    elev: 'elev.',
  },

  // ─── Info / Legal ─────────────────────────────────────────
  info: {
    sectionTitle: 'Information',
    about: 'About',
    privacy: 'Privacy Policy',
    contact: 'Contacts',
  },
} as const;
