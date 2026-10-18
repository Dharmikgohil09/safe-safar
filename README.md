# SafeSafar — Android-First Personal Safety Platform

SafeSafar is an Android-first personal safety platform designed to help users find safer routes, share live journeys with trusted contacts, and request emergency assistance in real time.

## Team Codecraft & Ownership

| Teammate | Focus Area | Ownership | Branch |
| :--- | :--- | :--- | :--- |
| **Dharmik Gohil** | Backend Core & Lead Architect | Repository, Auth, Contacts, Trips, Socket.io, Core Docs, Deployment | `dharmik/backend-core` |
| **Satej** | Safety Scoring | Community reports, trust & time decay, `/routes/safe`, Surat seed data | `satej/scoring-engine` |
| **Harshil** | Mobile App Shell & UI | Onboarding, contacts UI, Walk Me Home UI, report UI | `harshil/mobile-ui` |
| **Dhruv Raval** | Mobile Map & Navigation | Route display, landmarks, offline cache, dead-zone warnings | `dhruv/maps` |
| **Kristal** | SOS Engine | Emergency triggers, SMS/calls, Telegram, FCM, SOS backend | `kristal/emergency-engine` |
| **Priyavardhan** | Live Web Tracker | Tracker web page, heatmap, admin view, demo assets | `priyavardhan/tracker-web` |

## Repository Architecture

```text
safesafar/
  apps/
    mobile/                 # Mobile Application (Flutter/Dart & Expo integration)
      app/
      src/features/
        emergency/
        map/
        trip/
    backend/                # Node.js + Express + MongoDB Atlas + Socket.io
      src/
        config/             # Environment, DB config
        middleware/         # JWT Auth, Validation, Rate Limiter, Error Handler
        models/             # User, Contact, Trip Mongoose schemas
        modules/
          core/             # Auth, Contacts, Trips, Socket.io, Health check
          scoring/          # Safety Scoring & Community Reports (Satej mount point)
          sos/              # SOS engine & Emergency integrations (Kristal mount point)
        app.js              # Express app definition & route mounting
        server.js           # Server bootstrap & Socket.io initialization
      tests/                # Automated integration & unit tests
      render.yaml           # Render deployment configuration
    tracker/                # Live journey tracking web app (Priyavardhan)
  scripts/                  # Shared automation & database seed scripts
    landmarks/              # Dhruv's landmark extraction scripts (Overpass OSM)
  docs/
    api.md                  # Comprehensive API contract and protocol documentation
  .github/
    CODEOWNERS              # GitHub ownership assignments
```

## Branching & Contribution Rules

1. **Main Branch Protection**:
   - `main` is protected. Direct pushes are disallowed.
   - All contributions must land through pull requests requiring review and passing checks.
2. **Dedicated Feature Branches**:
   - Every developer works exclusively on their assigned branch (e.g. `dhruv/maps`).
3. **Module Boundaries**:
   - Never overwrite another developer's module files.
   - Core provides stable mount points and interfaces for `/routes`, `/reports`, and `/sos`.

