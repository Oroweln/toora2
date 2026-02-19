export default {
  // ─── Tabs ──────────────────────────────────────────────────
  tabs: {
    itineraries: 'Itinerari',
    explore: 'Esplora',
  },

  // ─── Home Screen ──────────────────────────────────────────
  home: {
    completed: 'Completato',
  },

  // ─── Shared labels ────────────────────────────────────────
  difficulty: {
    easy: 'Facile',
    moderate: 'Moderato',
    hard: 'Difficile',
  },
  terrain: {
    paved: 'Asfaltato',
    gravel: 'Sterrato',
    trail: 'Sentiero',
  },

  // ─── Explore Screen ───────────────────────────────────────
  explore: {
    title: 'Campania Interna',
    subtitle: 'Itinerari cicloturistici nel cuore del Sannio',
    itineraries: 'Itinerari',
    hotspots: 'Tappe',
    totalKm: 'km totali',
    howItWorks: 'Come funziona',
    step1: 'Scegli un itinerario e raggiungi il punto di partenza',
    step2: 'Segui il percorso sulla mappa — funziona offline',
    step3: 'I contenuti si sbloccano automaticamente alle tappe',
    step4: 'Scopri testi, immagini, audio e video sui luoghi',
    offlineNotice:
      "L'app funziona completamente offline. Serve solo il segnale GPS.",
  },

  // ─── Itinerary Detail Screen ──────────────────────────────
  itinerary: {
    notFound: 'Itinerario non trovato.',
    startingPoint: 'Punto di partenza',
    hotspotCount: 'Tappe ({{count}}) · {{active}} con contenuti',
    active: 'Attivo',
    gpsPermissionTitle: 'Permesso GPS richiesto',
    gpsPermissionMessage:
      "TOORA ha bisogno dell'accesso alla posizione per guidarti lungo il percorso.",
    errorTitle: 'Errore',
    routeDataUnavailable: 'Dati del percorso non disponibili.',
    reachStartTitle: 'Raggiungi il punto di partenza',
    reachStartMessage:
      'Sei a {{distance}} km dal punto di partenza. Vuoi aprire la navigazione?',
    openMaps: 'Apri Maps',
    goToMap: 'Vai alla mappa',
    starting: 'Avvio in corso...',
    startRoute: 'INIZIA IL PERCORSO',
  },

  // ─── Route Map Screen ─────────────────────────────────────
  route: {
    notFound: 'Itinerario non trovato.',
    mapTitle: 'Mappa del percorso',
    mapSubtext: 'MapLibre GL renderizza qui con le tile raster offline',
    gpsLabel: 'GPS: {{lat}}, {{lng}}',
    accuracyLabel: 'Precisione: {{accuracy}}m',
    exitTitle: 'Esci dal percorso?',
    exitMessage: 'Il progresso verrà salvato.',
    cancel: 'Annulla',
    exit: 'Esci',
    contentLockedTitle: 'Contenuto bloccato',
    contentLockedMessage:
      'Devi essere alla tappa per accedere ai contenuti.\nDistanza: {{distance}}',
    ok: 'OK',
    navigateHere: 'Naviga qui',
    weakGps: 'GPS debole',
    offRoute: 'Sei fuori dal percorso!',
    backToRoute: 'Torna al percorso',
    reachingStart: 'Raggiungi il punto di partenza...',
    nextStop: 'Prossima tappa:',
    stopsProgress: '{{visited}}/{{total}} tappe',
    routeCompleted: 'Percorso completato!',
  },

  // ─── Hotspot Content Screen ───────────────────────────────
  hotspot: {
    notFound: 'Tappa non trovata.',
    contentLockedTitle: 'Contenuto bloccato',
    contentLockedMessage: 'Devi essere alla tappa per accedere ai contenuti.',
    distance: 'Distanza: {{distance}}',
    navigateHere: 'Naviga qui',
    waypoint: 'Tappa',
    continueNext: 'Prosegui verso la prossima tappa',
    tabText: 'Testo',
    tabGallery: 'Galleria',
    tabVideo: 'Video',
    stopOf: 'Tappa {{sequence}} di {{total}} · {{itinerary}}',
    placeholderContent:
      'Questo è il contenuto dettagliato della tappa "{{title}}". In questa posizione potrai scoprire la storia e le curiosità di questo luogo attraverso testi, immagini e contenuti multimediali.',
    audioGuide: 'Audio Guide',
  },

  // ─── Route Complete Screen ────────────────────────────────
  complete: {
    notFound: 'Itinerario non trovato.',
    congratulations: 'Complimenti!',
    routeCompleted: 'Hai completato il percorso',
    timeSpent: 'Tempo impiegato',
    stopsVisited: 'Tappe visitate',
    distance: 'Distanza',
    summary:
      'Hai scoperto {{count}} tappe con contenuti multimediali lungo il percorso. Il tuo progresso è stato salvato.',
    goHome: 'Torna alla Home',
  },

  // ─── Navigation headers ───────────────────────────────────
  nav: {
    back: 'Back',
    map: 'Map',
  },

  // ─── Language selector ────────────────────────────────────
  language: {
    title: 'Lingua',
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
    sectionTitle: 'Informazioni',
    about: 'Chi siamo',
    privacy: 'Privacy Policy',
    contact: 'Contatti',
  },
} as const;
