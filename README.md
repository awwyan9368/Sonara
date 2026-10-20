# SONARA — 3D Music Universe & Intelligence Platform

> **SONARA** transforms a user's musical identity into an explorable, three-dimensional universe. It unifies **SoundGalaxy** (navigable 3D universe), **TasteDNA** (mathematical music intelligence engine), and **Synesthesia** (generative audio-reactive art) into a single continuous music graph.

---

## 1. Product Overview

- **SoundGalaxy (3D Universe)**: An interactive Three.js / React Three Fiber cosmos where galaxy regions represent taste clusters, stars represent artists, planets represent tracks/albums, and constellation lines represent verified artistic relationships.
- **TasteDNA (Music Intelligence)**: A deterministic taste analytics engine that calculates library composition, Simpson's reciprocal diversity index, cross-cluster bridge artists, and affinity-based discovery suggestions.
- **Synesthesia (Generative Audio-Reactive Visuals)**: A full-screen audio-reactive environment featuring three distinct mathematical presets (*Cosmic Pulse*, *Nebula Flow*, *Stellar Geometry*), real-time Web Audio API frequency-bin and time-domain analysis, local audio playback, procedural cosmic chord synthesis, and direct in-browser `.webm` video recording.
- **Cosmic Journey (Signature Discovery Flow)**: Graph-traversal pathfinding (BFS and Dijkstra optimal affinity) connecting any two artists across relational edges, with step-by-step waypoint explanations and persistent journey saving.
- **Cosmic Library & Persistence**: Local IndexedDB persistence (via Dexie) for saved journeys, imported metadata, taste snapshots, and user preferences, featuring full JSON backup export and schema-validated restore.

---

## 2. Prerequisites

- **Node.js**: v18.0.0 or higher (v24.x LTS recommended)
- **Package Manager**: `npm` (v10+ or v11+)
- **Modern Web Browser**: Chrome, Edge, Firefox, or Safari with WebGL enabled. (Accessible 2D catalog mode is provided as an automatic or configurable fallback).

---

## 3. Installation

Clone or enter the project directory and install dependencies:

```bash
cd D:\SonaraSpotify
npm install
```

---

## 4. Development & Running

Start the Next.js development server:

```bash
npm run dev
```

Open your browser at:
```
http://localhost:3000
```

*Note: The application operates completely offline in Demo Universe mode with zero configuration or API keys required.*

---

## 5. Production Build

To build and run the production application:

```bash
npm run build
npm start
```

---

## 6. Testing

Execute the automated test suite powered by Vitest:

```bash
npm test
```

For continuous watch mode:
```bash
npm run test:watch
```

---

## 7. Architecture & Directory Layout

```
src/
├── app/                  # Next.js App Router (page, layout, globals.css, api)
├── components/
│   ├── controls/         # Global search & interactive controls
│   ├── navigation/       # Navigation rail & mode status
│   └── panels/           # Contextual artist & cluster detail panels
├── data/
│   └── demo/             # Bundled deterministic 36-artist universe dataset
├── features/
│   ├── journeys/         # Cosmic Journey graph stepper & panel
│   ├── library/          # Local IndexedDB catalog, journey manager & backup
│   ├── music/            # Music provider adapters (Demo & Spotify PKCE)
│   ├── settings/         # Visual fidelity, motion, & accessibility toggles
│   ├── synesthesia/      # Web Audio engine, 3D presets, canvas recorder
│   ├── tastedna/         # Simpson diversity, bridge artists, clustering
│   └── universe/         # Three.js starfield, nebulae, constellations, planets
├── lib/
│   ├── graph/            # Pathfinding (Dijkstra/BFS) & modular similarity
│   └── storage/          # Dexie IndexedDB schemas and backup migrations
└── types/                # Strict TypeScript entity definitions
```

---

## 8. Spotify Integration (Optional)

SONARA is completely functional in offline Demo Universe mode. To optionally connect real Spotify accounts using secure Authorization Code with PKCE (no client secret in browser):

1. Copy `.env.example` to `.env.local`.
2. Register an application in the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
3. Set your Redirect URI to: `http://localhost:3000/api/auth/spotify-callback`.
4. Enter your Client ID in `.env.local`:
   ```bash
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
5. Full instructions and scopes are documented in [`docs/SPOTIFY-SETUP.md`](docs/SPOTIFY-SETUP.md).

---

## 9. Deployment

SONARA is optimized for deployment on Vercel or any standard Node.js/static edge environment:

```bash
# Deploy to Vercel
npx vercel
```

Ensure environment variables from `.env.example` are configured in your host project settings if Spotify authorization is enabled.

