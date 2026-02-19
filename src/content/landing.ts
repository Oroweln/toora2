export interface LandingBullet {
  label: string;
  text: string;
}

export interface LandingSection {
  heading?: string;
  paragraphs: string[];
  bullets?: LandingBullet[];
}

export interface LandingContent {
  title: string;
  tagline: string;
  intro: string;
  sections: LandingSection[];
  cta: string;
}

export const landingContent: Record<'it' | 'en', LandingContent> = {
  it: {
    title: 'Benvenuti su Toora',
    tagline: 'La rivoluzione del turismo in autonomia',
    intro:
      "Toora nasce da un'idea di Rotolando Verso Sud, da sempre appassionata di scoperta, avventura e valorizzazione del territorio. Il nostro sogno? Creare un modo nuovo di esplorare, che unisca il piacere della scoperta all'autonomia di chi viaggia senza vincoli, ma con tutti gli strumenti giusti per vivere un'esperienza autentica e indimenticabile.",
    sections: [
      {
        heading: "L'anima di Toora: il Sannio e la Regina Viarum",
        paragraphs: [
          "In questo primo viaggio insieme, vi porteremo nel cuore del Sannio, una terra ricca di storia, natura e sapori autentici, con un focus speciale sulla Via Appia, la Regina Viarum, l'antica strada che collegava Roma a Brindisi, la storia delle Streghe di Benevento e percorsi enogastronomici. Toora vi guiderà attraverso sentieri di trekking e percorsi ciclabili, rendendo ogni tappa un'esperienza immersiva e alla portata di tutti.",
        ],
      },
      {
        heading: 'Esplora, scopri, vivi',
        paragraphs: [
          "Con Toora, ogni itinerario prende vita grazie a vere mappe integrate con Google Maps, individuando tappe spesso nascoste ai circuiti turistici tradizionali. Scoprirete angoli inesplorati, borghi incantevoli e luoghi che raccontano storie millenarie. Ma non è solo un viaggio nel passato: Toora è anche un ponte verso esperienze uniche, grazie alla collaborazione con partner locali che vi faranno assaporare il meglio dell'enogastronomia, dell'artigianato e delle tradizioni del territorio.",
        ],
      },
      {
        heading: 'Perché Toora è diverso?',
        paragraphs: [],
        bullets: [
          {
            label: 'Autonomia e libertà',
            text: "decidi tu come e quando partire, con percorsi pensati per essere seguiti senza guida ma con tutte le informazioni essenziali a portata di mano.",
          },
          {
            label: 'Esplorazione autentica',
            text: "itinerari lontani dalle mete più battute, per scoprire un'Italia nascosta e sorprendente.",
          },
          {
            label: 'Esperienze locali',
            text: 'possibilità di vivere il territorio attraverso degustazioni, attività enoturistiche e incontri con chi mantiene viva la cultura locale.',
          },
        ],
      },
    ],
    cta: "Toora è più di un'app: è un compagno di viaggio che trasforma ogni cammino in un'esperienza da ricordare. Scaricala, lasciati guidare e inizia la tua avventura.",
  },
  en: {
    title: 'Welcome to Toora',
    tagline: 'The Self-Guided Travel Revolution',
    intro:
      'Toora was born from an idea by Rotolando Verso Sud, a project driven by a long-standing passion for discovery, adventure, and the promotion of local territories. Our dream? To create a new way of exploring that combines the joy of discovery with the freedom of independent travel—without constraints, but with all the right tools to enjoy an authentic and unforgettable experience.',
    sections: [
      {
        heading: 'The Soul of Toora: Sannio and the Regina Viarum',
        paragraphs: [
          'On this first journey together, we will take you to the heart of Sannio, a land rich in history, nature, and authentic flavors, with a special focus on the Via Appia, the Regina Viarum—the ancient road that once connected Rome to Brindisi—the legends of the Witches of Benevento, and unique food and wine routes. Toora guides you along trekking trails and cycling paths, turning every stop into an immersive experience accessible to everyone.',
        ],
      },
      {
        heading: 'Explore. Discover. Experience.',
        paragraphs: [
          'With Toora, every itinerary comes to life through real maps integrated with Google Maps, highlighting stops often hidden from traditional tourist routes. You will discover unexplored corners, charming villages, and places that tell stories thousands of years old. But this is not just a journey into the past: Toora is also a bridge to unique experiences, thanks to collaborations with local partners who will let you enjoy the very best of local food and wine, craftsmanship, and traditions.',
        ],
      },
      {
        heading: 'Why Is Toora Different?',
        paragraphs: [],
        bullets: [
          {
            label: 'Freedom and independence',
            text: 'you decide when and how to travel, with routes designed to be followed independently while having all essential information at hand.',
          },
          {
            label: 'Authentic exploration',
            text: 'itineraries far from overcrowded destinations, revealing a hidden and surprising Italy.',
          },
          {
            label: 'Local experiences',
            text: 'opportunities to experience the territory through tastings, wine tourism activities, and encounters with the people who keep local culture alive.',
          },
        ],
      },
    ],
    cta: 'Toora is more than an app: it is a travel companion that turns every journey into a memorable experience. Download it, follow the route, and start your adventure.',
  },
};
