# SafeSafar — Mobile Map & Safe Navigation (Dhruv Raval)

This module implements the complete Maps, Safe Route Evaluation, Landmarks, Offline Caching, Dead-Zone Warning, and Incident Heatmap system for SafeSafar built using **Flutter and Dart**.

---

## 🌟 Delivered Features (Dhruv Raval Plan Checklist)

| Milestone | Deliverable | Status | Implementation Details |
| :--- | :--- | :--- | :--- |
| **Day 1** | **Interactive Map Screen** | ✅ Completed | Built with `flutter_map` (OpenStreetMap / MapLibre compatible), destination search with quick chips for Surat spots (SVNIT, Adajan, VR Mall, Station), user GPS location marker with accuracy aura. |
| **Days 2-3** | **Safe Routes (`POST /routes/safe`)** | ✅ Completed | Evaluates and renders 2-3 alternative routes colored **Green** (Safest, e.g. 93/100), **Yellow** (Moderate, 72/100), and **Red** (Risky, 41/100). Tap route to inspect Safety Score, Lighting %, Police Proximity %, Incident Decay %, and plain-language explanation string. |
| **Day 4** | **Landmark Data & Nearest Safe Haven** | ✅ Completed | Overpass OSM extraction script in `scripts/landmarks/` + mobile landmark layers (Police chowkis, 24/7 hospitals, schools, pharmacies). **"Nearest Safe Place"** SOS feature finds closest guarded facility in 1 tap with direct emergency call. |
| **Days 5-6** | **Offline Mode & Dead-Zone Detection** | ✅ Completed | Offline route & tile cache service. Proximity engine tracking hardcoded cellular blind spots in Surat (e.g. Dumas Silent Zone, Singanpore Causeway underpass). Triggers immediate visual alert banner: *"Entering Low Mobile Coverage Zone! Offline routing active, SMS standby"*. |
| **Day 7** | **Heatmap & 1-Tap Demo Mode** | ✅ Completed | Density overlay of community safety reports (harassment, broken lighting, deserted paths). Hackathon **Demo Controller modal** loads seeded Surat scenarios and resets with 1 tap. |

---

## 📁 Project Structure

```text
apps/mobile_flutter/
├── assets/
│   └── data/
│       ├── surat_landmarks.json      # 22 verified Surat safety landmarks (Police, Hospitals, Schools)
│       ├── surat_dead_zones.json     # Known cellular blind spots with geofence radiuses
│       ├── surat_demo_routes.json    # Pre-calculated multi-route polylines for Surat
│       └── surat_reports.json       # Community incident reports for heatmap layer
├── lib/
│   ├── main.dart                     # App entry point with MultiProvider & theme
│   ├── models/
│   │   ├── route_option.dart         # Route metrics, colors, coordinates & formatting
│   │   ├── landmark.dart             # Police, hospital, pharmacy models & icons
│   │   ├── dead_zone.dart            # Dead zone geofence & proximity math
│   │   ├── incident_report.dart      # Community incident model
│   │   └── safety_factors.dart       # Quantified lighting, police & incident scores
│   ├── services/
│   │   ├── api_service.dart          # POST /routes/safe & GET /reports with smart mock fallback
│   │   ├── landmarks_service.dart    # Nearest safe place algorithm (distance & filter)
│   │   ├── dead_zone_service.dart    # Real-time cellular blind-spot proximity detector
│   │   ├── offline_cache_service.dart# SharedPreferences persistent cache for offline mode
│   │   └── demo_service.dart         # Hackathon demo scenarios & reset management
│   ├── providers/
│   │   └── map_state_provider.dart   # Unified reactive state coordinator
│   ├── screens/
│   │   └── map_screen.dart           # Interactive map with markers, polylines & HUD
│   └── widgets/
│       ├── destination_search_bar.dart   # Destination input + quick Surat landmark chips
│       ├── route_selection_panel.dart    # Bottom carousel showing green/yellow/red routes
│       ├── route_detail_bottom_sheet.dart# In-depth breakdown (Lighting %, Police %, Explanations)
│       ├── dead_zone_warning_banner.dart # Prominent RF blind-spot warning banner
│       ├── nearest_safe_dialog.dart      # 1-tap nearest police station & hospital navigator
│       ├── demo_control_modal.dart       # Presentation switch & 1-tap reset
│       ├── map_layer_fab.dart            # Floating layer & emergency control cluster
│       └── safety_badge.dart             # Glowing visual score badge
├── test/
│   ├── landmarks_service_test.dart   # Unit tests for closest safe haven search
│   ├── dead_zone_service_test.dart   # Unit tests for cellular blind-spot detection
│   └── route_scoring_test.dart       # Unit tests for route tiers & distance/duration
└── pubspec.yaml                      # Flutter dependencies and assets declaration
```

---

## 🚀 Running the App

### Prerequisites
- Flutter SDK (>= 3.10.0)
- Android Studio / VS Code / Antigravity IDE

### 1. Install Dependencies
```bash
cd apps/mobile_flutter
flutter pub get
```

### 2. Run on Connected Device or Emulator
```bash
flutter run
```

### 3. Run Automated Tests
```bash
flutter test
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
