# SafeSafar 🛡️
> **Safer Routes. Brighter Journeys.**  
> *An Android-First Intelligent Personal Safety Platform featuring Safe Navigation, Real-Time Guardian Telemetry, and Resilient SOS Dispatch.*

[![Node.js CI](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB%20Atlas-8.7-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🌐 Live Deployments & Demos

| Component | URL | Notes |
| :--- | :--- | :--- |
| **Backend REST API & WebSockets** | [https://safe-safar.onrender.com](https://safe-safar.onrender.com/api/health) | Hosted on Render Free Tier. *Cold start may take 30–60s on first load.* |
| **Guardian Live Web Tracker** | [https://safesafar-tracker.vercel.app](https://safesafar-tracker.vercel.app) | Hosted on Vercel. Works on any browser without app installation. |
| **Demonstration Video** | `[Demo Video Link Placeholder — Add YouTube/Loom Link]` | 3-minute hackathon walkthrough and field test. |

---

## 🎯 The Problem

Standard navigation applications optimize for only one variable: **speed**. They route pedestrians and commuters through dark alleys, poorly lit corridors, deserted streets, and known cellular dead zones simply because it saves two minutes. When emergencies occur, calling for help requires unlocking the phone, opening an app, and manually sharing coordinates—steps that are impossible during acute distress.

## 💡 Our Solution: SafeSafar

SafeSafar re-engineers navigation with **safety as a primary constraint**:
1. **Safety-Weighted Routing**: Evaluates alternative routes and scores them from 0 to 100 based on verified street lighting, police chowki proximity, safe havens (24/7 pharmacies, hospitals), and crowdsourced hazard reports with time decay.
2. **Offline-Resilient SOS**: Multimodal emergency triggers (one-tap countdown, offline voice trigger using Vosk, and device shake) dispatch automated SMS messages with live GPS coordinates over the native cellular network even when mobile data is unavailable.
3. **Zero-App Guardian Tracking**: Shares a zero-trust encrypted Web link with trusted contacts, allowing them to track your walk home in real time on any desktop or mobile browser.
4. **Dead-Zone Proximity Warnings**: Alerts users before entering known cellular blind spots and caches offline routes in advance.

---

## ⚡ Key Features

### ✅ Implemented & Working in Codebase

- **🛡️ Multi-Factor Route Safety Scoring (0–100)**:
  - Generates 2–3 alternative path corridors via OSRM / OpenRouteService.
  - Scores routes using geospatial weighting: Lighting Index (35%), Police Proximity (30%), Safe Haven Density (20%), and Incident Hazard Decay (15%).
  - Provides plain-language explanations (e.g. *"Recommended: 92/100 safety score with continuous lighting along Ring Road"*).
  - One-tap "Open in Google Maps" export for native turn-by-turn navigation along the safe corridor.

- **📍 "Walk With Me" Live Telemetry**:
  - Continuous GPS location streaming to backend via low-latency Socket.IO rooms.
  - Generates a unique, secure tracking session URL for trusted contacts.

- **🚨 Multimodal SOS Engine**:
  - **One-Tap SOS**: 5-second cancelable countdown with haptic feedback.
  - **Offline Voice Trigger**: Background hotword detection via embedded Vosk speech recognizer (`react-native-vosk`), functioning 100% on-device with zero internet connection.
  - **Shake Detection**: Accelerometer-driven emergency alert when the device is vigorously shaken.
  - **Native Cellular Dispatch**: Sends automated emergency SMS with live GPS link and places emergency calls directly through the device's SIM card.

- **📡 Cellular Dead-Zone Warning**:
  - Proximity detection for verified cellular blind spots.
  - Triggers audio-visual warnings and switches to offline cached tiles and routing automatically.

- **📢 Crowdsourced Incident & Hazard Reporting**:
  - Users report hazards (broken streetlights, harassment, deserted paths) with GeoJSON coordinates.
  - Reports dynamically feed into the routing engine to lower route safety scores in real time.

- **👁️ Guardian Web Tracker (`apps/tracker`)**:
  - Responsive Next.js web application for family and emergency contacts.
  - Real-time location marker tracking, route corridor visualization, and SOS alert banner.
  - Interactive incident density heatmap and admin telemetry console.

- **🔐 Zero-Trust Authentication Subsystem**:
  - Clean Email + 4-digit numeric PIN authentication (no cumbersome passwords).
  - Bcrypt hashing (cost 12), DNS MX record domain verification, and Nodemailer email activation.
  - Brute-force account lockout (5 failed attempts locks account for 15 minutes).
  - Short-lived JWT access tokens (15m) + refresh token rotation in MongoDB Atlas.

### 📋 Planned / Roadmap

- **Fake Call Simulator** *(Planned)*: Scheduled realistic incoming call interface to discreetly exit uncomfortable situations.
- **Telegram Bot & Webhook Gateway** *(Planned)*: Automated broadcast alerts to trusted Telegram groups.
- **Push Notification Fallback** *(Planned)*: Firebase Cloud Messaging (FCM) high-priority data messages.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Mobile ["📱 SafeSafar Mobile App (React Native / Expo)"]
        UI["Navigation & Safety UI"]
        Sensors["GPS Telemetry & Accelerometer"]
        Vosk["Offline Voice Recognizer (Vosk)"]
        Native["Native SIM SMS & Telephony"]
    end

    subgraph Backend ["⚙️ SafeSafar Backend Core (Node.js / Express)"]
        API["REST API (Auth, Reports, Contacts, Trips)"]
        Scoring["Route Safety Scoring Engine"]
        Sockets["Socket.IO Telemetry Gateway"]
        AuthMiddleware["JWT Verification & Rate Limiting"]
    end

    subgraph Data ["🗄️ Database & Cloud Services"]
        Atlas[("MongoDB Atlas (GeoJSON 2dsphere)")]
        OSRM["OSRM / OpenRouteService"]
        Mapbox["Mapbox / CartoDB Tile Engine"]
        SMTP["Gmail SMTP Email Verification"]
    end

    subgraph TrackerWeb ["💻 Guardian Web Tracker (Next.js)"]
        LiveMap["Live Journey Tracking Map"]
        Heatmap["Incident Density Heatmap"]
    end

    UI -->|REST HTTPS| API
    Sensors -->|Live Lat/Lng (WSS)| Sockets
    UI -->|Fetch Safe Routes| Scoring
    Vosk -->|Voice Trigger| Native
    Sensors -->|Shake Trigger| Native
    Native -->|Direct SIM SMS/Call| GuardianPhone["📞 Guardian Phone (SMS/Voice)"]

    API -->|Read / Write| Atlas
    Scoring -->|Fetch Geometry| OSRM
    API -->|Send Verification| SMTP
    UI -->|Fetch Raster Tiles| Mapbox

    Sockets -->|Push Coordinates| TrackerWeb
    API -->|Fetch Trip Metadata| TrackerWeb
```

---

## 📂 Monorepo Structure

```text
safesafar/
├── apps/
│   ├── backend/                # Node.js, Express, MongoDB Atlas, Socket.IO core
│   │   ├── src/
│   │   │   ├── config/         # Database, environment, and security configurations
│   │   │   ├── controllers/    # Auth, contacts, trips, and reports controllers
│   │   │   ├── middleware/     # JWT authentication, rate limiting, and error handling
│   │   │   ├── models/         # Mongoose schemas (User, Contact, Trip, Report)
│   │   │   ├── modules/
│   │   │   │   ├── core/       # Authentication, Socket.IO telemetry, and trip services
│   │   │   │   └── scoring/    # Safety scoring engine, OSRM routing, and polyline logic
│   │   │   ├── routes/         # Express API route endpoints
│   │   │   └── server.js       # Bootstrap script with graceful shutdown
│   │   ├── tests/              # Jest integration and unit test suite
│   │   └── package.json
│   ├── mobile/                 # React Native / Expo Mobile Application
│   │   ├── app/                # Expo Router screen navigation tree
│   │   ├── src/
│   │   │   ├── components/     # RouteSelectionPanel, MapView, Modals
│   │   │   ├── context/        # AuthContext, MapContext
│   │   │   ├── features/
│   │   │   │   ├── emergency/  # SOS triggers, Vosk voice model, shake, SMS engine
│   │   │   │   └── trip/       # Journey planning, contacts, user profile
│   │   │   └── services/       # Google Maps launcher, report service, telemetry
│   │   ├── app.config.js       # Dynamic Expo configuration (injected API keys)
│   │   ├── app.json            # Expo app manifest and Android native permissions
│   │   └── package.json
│   ├── tracker/                # Guardian Live Web Application (Next.js 14)
│   │   ├── src/
│   │   │   ├── app/            # App router pages (Home, Track, Heatmap, Admin)
│   │   │   └── components/     # Leaflet map, socket client, incident overlays
│   │   └── package.json
│   └── mobile_flutter/         # [Legacy / Prototype] Flutter & Dart exploration
├── docs/                       # Architecture documentation, API specs & setup guides
│   ├── api.md                  # Comprehensive REST & Socket.IO specification
│   ├── auth-api.md             # Email + PIN authentication contract
│   └── screenshots/            # Demonstration screenshots directory
├── package.json                # Root monorepo scripts
└── README.md
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile Application** | React Native 0.76, Expo SDK 54, Expo Router, TypeScript, React Native Maps, Vosk Offline Speech |
| **Backend Core** | Node.js 18+, Express.js 4, Socket.IO 4.8, Mongoose 8.7, Bcrypt.js, Nodemailer |
| **Database** | MongoDB Atlas (M0 Free Tier) with 2dsphere spatial indexes |
| **Web Tracker** | Next.js 14 (App Router), React 18, Tailwind CSS, Leaflet / React-Leaflet, Socket.IO Client |
| **Routing & GIS** | OSRM (Open Source Routing Machine), OpenRouteService, OpenStreetMap, CartoDB, Mapbox |
| **DevOps & Hosting** | Render (Backend Web Service), Vercel (Tracker Web App) |

---

## 📸 Screenshots

*(Capture the 4 screens from your Android device and save them in `docs/screenshots/` matching the filenames below)*

| Mobile Authentication | Safe Route Evaluation | SOS & Live Telemetry | Hazard Reporting |
| :---: | :---: | :---: | :---: |
| ![Auth Screen](docs/screenshots/login.png) | ![Safe Route Screen](docs/screenshots/safe_route.png) | ![SOS Screen](docs/screenshots/sos_walk.png) | ![Report Screen](docs/screenshots/report_hazard.png) |
| *Email + 4-Digit PIN Auth* | *Scored Path Corridors (0–100)* | *Live Journey Telemetry & SOS* | *Crowdsourced Community Hazard Log* |

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js 18.x or 20.x
- npm 9+
- Android Studio / Android Device with USB Debugging enabled *(Required for native dev build due to SMS and offline Vosk speech recognizer)*

---

### 1. Backend Service (`apps/backend`)

```bash
# Navigate to backend directory
cd apps/backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and supply your MONGODB_URI and JWT secrets (see Environment Variables table below)

# Run test suite
npm test

# Start development server
npm run dev
# Server runs on http://localhost:5000 (Health check: http://localhost:5000/api/health)
```

---

### 2. Guardian Web Tracker (`apps/tracker`)

```bash
# Navigate to tracker directory
cd apps/tracker

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start Next.js development server
npm run dev
# Web tracker runs on http://localhost:3000
```

---

### 3. Mobile Application (`apps/mobile`)

> [!IMPORTANT]
> Because SafeSafar utilizes native Android capabilities (**SIM-based direct SMS dispatch**, **cellular phone calls**, and **embedded on-device Vosk acoustic models**), you must run a **development build** (`expo-dev-client`) rather than standard Expo Go.

```bash
# Navigate to mobile directory
cd apps/mobile

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your backend (e.g. http://<YOUR_LAN_IP>:5000 or https://safe-safar.onrender.com)

# Build and run the Android Development Client on your connected phone
npx expo run:android

# Start Metro bundler with dev client
npx expo start --dev-client
```

---

## 🔑 Environment Variables Reference

Never commit `.env` or `.env.local` files. Reference templates are provided in `.env.example` in each directory.

### Backend (`apps/backend/.env`)
| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `PORT` | Local server port | `5000` |
| `BACKEND_URL` | Public URL of backend server | `https://safe-safar.onrender.com` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/...` |
| `JWT_SECRET` | Primary JWT signing secret (min 32 chars) | Random 64-char hex string |
| `JWT_ACCESS_SECRET` | Short-lived access token secret | Random 64-char hex string |
| `JWT_REFRESH_SECRET` | Long-lived refresh token secret | Random 64-char hex string |
| `EMAIL_USER` | Gmail address for Nodemailer verification | `your_account@gmail.com` |
| `EMAIL_APP_PASSWORD` | Google 16-character App Password | `xxxx xxxx xxxx xxxx` |
| `ORS_API_KEY` | OpenRouteService API key | `eyJ...` (from openrouteservice.org) |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token (optional fallback) | `pk.eyJ...` |

### Mobile (`apps/mobile/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | SafeSafar Backend API endpoint | `https://safe-safar.onrender.com` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps Android/iOS SDK Key | `AIzaSy...` (configured in Google Cloud) |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Mapbox token for vector map tiles | `pk.eyJ...` (optional) |
| `EXPO_PUBLIC_ROUTING_API_URL` | OSRM routing engine URL | `https://router.project-osrm.org` |
| `EXPO_PUBLIC_DEMO_MODE` | Force-loads pre-seeded Surat scenario | `true` (demo) / `false` (real GPS) |
| `EXPO_PUBLIC_TRACKER_URL` | Web tracker URL | `https://safesafar-tracker.vercel.app` |

### Tracker (`apps/tracker/.env.local`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SOCKET_URL` | Backend Socket.IO server URL | `https://safe-safar.onrender.com` |
| `NEXT_PUBLIC_API_URL` | Backend REST API URL | `https://safe-safar.onrender.com/api` |
| `NEXT_PUBLIC_MOCK_MODE` | Simulates telemetry without active GPS | `false` (live) / `true` (demo) |

---

## 👥 The Team — Codecraft

| Name | Role / Focus Area |
| :--- | :--- |
| **Dharmik Gohil** | Lead Architect, Backend Core, Auth Subsystem, Sockets, DevOps |
| **Harshil Bamaniya** | Mobile Application Shell, User Interfaces, Navigation Flow |
| **Satej Kolhe** | Safety Scoring Engine, OSRM Integration, Community Reports API |
| **Dhruv Raval** | Mobile GIS, Landmarks Engine, Dead-Zone Proximity Detection |
| **Kristal Patel** | Resilient SOS Engine, Vosk Offline Speech, Native Telephony & SMS |
| **Priyavardhan Singh** | Guardian Web Tracker, Live Heatmap Visualizer, Admin Console |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
