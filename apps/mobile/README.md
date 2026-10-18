# SafeSafar — Android Mobile Application (`apps/mobile`)

SafeSafar's React Native Expo application, featuring offline-first emergency SOS dispatch, safe routing alternatives, Walk Me Home live companion, and trusted guardian alerts.

## 🌟 Delivered Features

| Area | Owner | Deliverable | Status |
| :--- | :--- | :--- | :--- |
| **Emergency Systems** | Kristal Patel | SOS engine, on-device SMS, direct phone call, shake trigger, duress PIN, decoy calculator | ✅ Completed |
| **Mobile Shell & UI** | Harshil Bamaniya | Expo Router navigation, Dark/Amber theme, onboarding, trusted contacts, auth tabs, Walk Me Home UI | ✅ Completed |
| **Maps & Safe Routing** | Dhruv Raval | Interactive Map, 3 route tiers (Green/Yellow/Red), landmark havens, cellular dead-zone detector, demo simulator | ✅ Completed |

---

## 🚀 Running the App

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

## 🎯 Hackathon Live Demo Script

1. **Launch App**: The app opens centered at **SVNIT Surat**, displaying verified police chowkis, 24/7 hospitals, and live incident heatmaps across the city.
2. **Safe Route vs Fastest Route**:
   - Destination is set to **Adajan Gam**.
   - Tap **Green Route (Score 93 - Safest)**: Shows via Athwa Gate & Vivekananda Bridge with full street lighting and active police posts.
   - Tap **Red Route (Score 41 - Dangerous)**: Shows via Adajan Canal backroad with active hazards and incident warnings.
3. **Dead-Zone Proximity Alert**:
   - Open Demo Controller and tap **"Simulate Entering Dead Zone"**.
   - User enters Dumas Mangrove RF Blind Spot.
   - Top banner warns: **"CRITICAL: Cellular Dead Zone Active - Route cached offline, SMS SOS standby."**
4. **Emergency Haven Helper**:
   - Tap the **Blue Shield icon**: Instantly shows nearest police post with distance and one-tap **"Navigate Here"**.
5. **One-Tap Reset**:
   - Tap **"Reset Demo Scenario"** to restore pristine presentation state instantly!

