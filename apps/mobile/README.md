# SafeSafar — Mobile Map & Safe Navigation (React Native & Expo)

This module implements the complete Maps, Safe Route Evaluation, Landmarks, Offline Caching, Dead-Zone Warning, and Incident Heatmap system for SafeSafar built using **React Native, Expo, and TypeScript**.

---

## 🌟 Delivered Features (Dhruv Raval Plan Checklist)

| Milestone | Deliverable | Status | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Day 1** | **Interactive Map Screen** | ✅ Completed | React Native Map with OpenStreetMap data, destination search with quick chips for Surat spots (SVNIT, Adajan, VR Mall, Station), user GPS location marker with accuracy aura, zoom/pan controls. |
| **Days 2-3** | **Safe Routes (`POST /routes/safe`)** | ✅ Completed | Evaluates and renders 2-3 alternative routes colored **Green** (Safest, e.g. 93/100), **Yellow** (Moderate, 72/100), and **Red** (Risky, 41/100). Tap route to inspect Safety Score, Lighting %, Police Proximity %, Incident Decay %, active hazards, and plain-language explanation string. |
| **Day 4** | **Landmark Data & Nearest Safe Haven** | ✅ Completed | Overpass OSM extraction script in `scripts/landmarks/` + mobile landmark layers (Police chowkis, 24/7 hospitals, schools, pharmacies). **"Nearest Safe Place"** SOS feature finds closest guarded facility in 1 tap with direct emergency call. |
| **Days 5-6** | **Offline Mode & Dead-Zone Detection** | ✅ Completed | Offline route & tile cache service. Proximity engine tracking hardcoded cellular blind spots in Surat (e.g. Dumas Silent Zone, Singanpore Causeway underpass). Triggers immediate visual alert banner: *"Entering Low Mobile Coverage Zone! Offline routing active, SMS standby"*. |
| **Day 7** | **Heatmap & 1-Tap Demo Mode** | ✅ Completed | Density overlay of community safety reports (harassment, broken lighting, deserted paths). Hackathon **Demo Controller modal** loads seeded Surat scenarios and resets with 1 tap. |

---

## 📁 Project Structure

```text
apps/mobile/
├── assets/
│   └── data/
│       ├── surat_landmarks.json      # 22 verified Surat safety landmarks (Police, Hospitals, Schools)
│       ├── surat_dead_zones.json     # Known cellular blind spots with geofence radiuses
│       ├── surat_demo_routes.json    # Pre-calculated multi-route polylines for Surat
│       └── surat_reports.json        # Community incident reports for heatmap layer
├── src/
│   ├── types/
│   │   └── index.ts                  # LatLng, RouteOption, DeadZone, Landmark, IncidentReport
│   ├── utils/
│   │   └── geo.ts                    # Haversine distance math, distance & duration formatters
│   ├── models/
│   │   ├── SafetyFactors.ts          # Street lighting, police proximity & decay parser
│   │   ├── DeadZone.ts               # Dead zone proximity math & color helpers
│   │   ├── IncidentReport.ts         # Community incident types, badges & colors
│   │   ├── Landmark.ts               # Police, hospital, pharmacy models & icons
│   │   └── RouteOption.ts            # Route tiers, scores, colors & polyline parsers
│   ├── services/
│   │   ├── apiService.ts             # POST /routes/safe & GET /reports with smart mock fallback
│   │   ├── landmarksService.ts       # Nearest safe place algorithm (distance & filter)
│   │   ├── deadZoneService.ts        # Real-time cellular blind-spot proximity detector
│   │   ├── offlineCacheService.ts    # Persistent cache for offline mode
│   │   └── demoService.ts            # Hackathon demo scenarios & reset management
│   ├── context/
│   │   └── MapContext.tsx            # Unified reactive React state coordinator
│   ├── components/
│   │   ├── SafetyBadge.tsx           # Glowing visual score badge
│   │   ├── DeadZoneWarningBanner.tsx # Prominent RF blind-spot warning banner
│   │   ├── DestinationSearchBar.tsx  # Destination input + quick Surat landmark chips
│   │   ├── RouteSelectionPanel.tsx   # Bottom carousel showing green/yellow/red routes
│   │   ├── RouteDetailModal.tsx      # In-depth breakdown (Lighting %, Police %, Explanations)
│   │   ├── NearestSafeModal.tsx      # 1-tap nearest police station & hospital navigator
│   │   ├── DemoControlModal.tsx      # Presentation switch & 1-tap reset
│   │   ├── MapLayerControls.tsx      # Floating layer & emergency control cluster
│   │   └── MapViewComponent.tsx      # Interactive map with markers, polylines & HUD
│   ├── screens/
│   │   └── MapScreen.tsx             # Interactive screen assembling map & HUD overlays
│   └── features/
│       └── map/
│           └── index.ts              # Public exports for Harshil and team members
├── __tests__/
│   ├── deadZoneService.test.ts       # Unit tests for cellular blind-spot detection
│   ├── landmarksService.test.ts      # Unit tests for closest safe haven search
│   └── routeScoring.test.ts          # Unit tests for route tiers & distance/duration
├── App.tsx                           # Root React Native application entry point
├── app.json                          # Expo application configuration
├── package.json                      # React Native dependencies and test runner
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## 🚀 Running the App

### Prerequisites
- Node.js (>= 18)
- Expo CLI (`npx expo`) or React Native development environment

### 1. Install Dependencies
```bash
cd apps/mobile
npm install
```

### 2. Start Expo Development Server
```bash
npm start
# or for web
npm run web
# or for android
npm run android
```

### 3. Run Automated Tests
```bash
npm test
```

---

## 🎯 Hackathon Live Demo Script (How Dhruv's Part Wows the Judges)

1. **Launch App**: The app opens centered at **SVNIT Surat**, displaying verified police chowkis, 24/7 hospitals, and live incident heatmaps across the city.
2. **Safe Route vs Fastest Route**:
   - Destination is set to **Adajan Gam**.
   - Tap **Green Route (Score 93 - Safest)**: Shows via Athwa Gate & Vivekananda Bridge with full street lighting and active police posts.
   - Tap **Red Route (Score 41 - Dangerous)**: Shows via Adajan Canal backroad. Judges clearly see why: *"2 reports of harassment and low lighting near Adajan Gam canal. Zero CCTV checkpoints."*
3. **Dead-Zone Proximity Alert**:
   - Open Demo Controller (robot icon) and tap **"Simulate Entering Dead Zone"**.
   - The user position teleports into the Dumas Mangrove RF Blind Spot.
   - The top banner flashes: **"CRITICAL: Cellular Dead Zone Active - Route cached offline, SMS SOS standby."**
4. **Emergency Haven Helper**:
   - Tap the **Blue Shield icon**: Instantly shows the nearest police post (Umra Police Chowki) with distance and one-tap **"Navigate Here"** button.
5. **One-Tap Reset**:
   - Open Demo Controller and tap **"Reset Demo Scenario"** to restore pristine presentation state instantly!
