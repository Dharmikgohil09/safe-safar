# SafeSafar — Live Guardian Tracker Web Application (`apps/tracker`)

SafeSafar's real-time personal safety tracker web application, built for trusted contacts to monitor a loved one's journey directly from an SMS or Telegram tracking link without requiring login or authentication.

---

## 1. Architecture & Technology Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Routing**: `/track/[token]` (corresponds to `/track/:token` contract) and `/` (interactive demo launcher)
- **Mapping Library**: Leaflet 1.9.4 with OpenStreetMap raster tiles (dynamically loaded on the client, zero SSR hydration mismatches, zero exposed secret keys)
- **Styling**: Vanilla CSS (`globals.css`) adhering to a sleek dark-mode personal safety design system with glassmorphism, responsive drawer layout, pulsating SVG radar markers, and high-contrast alert indicators
- **Real-Time Adapter**: Socket.IO client (`socket.io-client` 4.8.1) wrapped in an isolated integration adapter (`src/services/socketAdapter.ts`)
- **Telemetry Validation**: Strict coordinate and payload sanitization (`src/services/validation.ts`) rejecting malformed/out-of-bounds telemetry
- **Simulator / Mock Mode**: Independent simulated GPS telemetry generator (`src/services/mockDataService.ts`) with interactive demo controls (Pause/Resume, Simulate SOS mode)

---

## 2. Directory Structure

```text
apps/tracker/
├── .env.example              # Environment variables template
├── .env.local                # Local overrides (mock mode enabled by default)
├── .gitignore                # Tracker-specific ignores (node_modules, .next, .env*.local)
├── package.json              # Self-contained dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── next.config.js            # Next.js configuration
├── README.md                 # Tracker documentation and run guide
└── src/
    ├── app/
    │   ├── globals.css       # Core vanilla CSS design system & micro-animations
    │   ├── layout.tsx        # Responsive viewport (100dvh) and SEO metadata
    │   ├── page.tsx          # Landing page with demo launcher & IEEE test scenarios
    │   └── track/
    │       └── [token]/
    │           └── page.tsx  # Dynamic tracking route (/track/:token)
    ├── components/
    │   ├── ErrorState.tsx    # Invalid token, expired, or network error screens
    │   ├── LoadingState.tsx  # Initial connection and telemetry handshake screen
    │   ├── MockModeBadge.tsx # Prominent MOCK DATA badge and interactive simulator controls
    │   ├── TrackerHeader.tsx # SafeSafar brand, live connection status pill, refresh button
    │   ├── TrackerStatusCard.tsx # Bottom drawer with live metrics (speed, battery, accuracy, destination)
    │   └── Map/
    │       ├── SafetyMap.tsx       # Dynamic SSR-safe wrapper
    │       └── SafetyMapClient.tsx # Leaflet map, custom pulse marker, route polyline
    ├── config/
    │   └── env.ts            # Centralized environment configuration
    ├── services/
    │   ├── mockDataService.ts# Simulated telemetry along realistic urban corridor
    │   ├── socketAdapter.ts  # Isolated Socket.IO client adapter & lifecycle manager
    │   └── validation.ts     # Boundary checks and sanitization for GPS data
    ├── types/
    │   └── tracker.ts        # TypeScript interfaces and telemetry contracts
    └── utils/
        └── geo.ts            # Haversine distance and relative time formatting
```

---

## 3. How to Install and Run Locally

Navigate to the `apps/tracker` directory:

```bash
cd apps/tracker
```

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```
The tracker will start at `http://localhost:3000`.

### Build and Run for Production
```bash
npm run build
npm run start
```

---

## 4. Enabling Mock Mode vs Real Backend

Mock mode is controlled via the `NEXT_PUBLIC_MOCK_MODE` environment variable in `.env.local`:

```bash
# Set to 'true' for independent demo without backend (default for Day 1-2)
NEXT_PUBLIC_MOCK_MODE=true

# Set to 'false' to connect to the SafeSafar Socket.IO backend
NEXT_PUBLIC_MOCK_MODE=false
```

When Mock Mode is enabled:
- Sample user data ("Ananya Sharma") and destination ("Lodhi Colony, Central Delhi") are loaded.
- Realistic GPS coordinates update every 3.5 seconds with simulated vehicle speed (24–34 km/h), heading, and GPS jitter.
- A visible `DEMO / MOCK DATA` badge is displayed in the header.
- An interactive demo panel allows IEEE judges to **Pause/Resume** the telemetry stream or **Simulate SOS Mode**.

---

## 5. Environment Variables

Create `.env.local` using the template below:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` | SafeSafar Socket.IO server URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` | REST base URL for session checks |
| `NEXT_PUBLIC_MOCK_MODE` | `true` | `true` for demo telemetry, `false` for live backend |
| `NEXT_PUBLIC_MAP_TILE_URL` | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | Free OpenStreetMap tiles |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | `&copy; OpenStreetMap contributors` | Map copyright attribution |

---

## 6. Socket.IO Event & Payload Specification

The Socket.IO adapter (`src/services/socketAdapter.ts`) implements the following contract:

### Client -> Server Events:
- **`join-session`**: `{ token: string }`
  - Emitted immediately upon connection to join the session's WebSocket room.
- **`leave-session`**: `{ token: string }`
  - Emitted when unmounting or switching tokens to clean up server listeners.

### Server -> Client Events:
- **`session:data`**: Initial session metadata:
  ```json
  {
    "token": "safe-xyz-123",
    "userName": "Ananya Sharma",
    "userPhoneMasked": "+91 98*** **412",
    "status": "active",
    "destination": {
      "name": "Home (Lodhi Estate)",
      "latitude": 28.5875,
      "longitude": 77.2185,
      "address": "Block 4, Lodhi Colony, New Delhi"
    },
    "currentLocation": {
      "latitude": 28.6315,
      "longitude": 77.2167,
      "accuracy": 8
    },
    "lastUpdated": 1729080000000,
    "batteryLevel": 78
  }
  ```
- **`location`** (or **`location:update`**): Real-time GPS coordinate telemetry:
  ```json
  {
    "latitude": 28.6298,
    "longitude": 77.2185,
    "accuracy": 7.5,
    "speed": 28.4,
    "heading": 135,
    "batteryLevel": 77,
    "timestamp": 1729080035000
  }
  ```
- **`sos:active`** (or **`sos:triggered`**): Real-time emergency trigger alert from mobile/backend.
- **`sos:resolved`**: Emergency all-clear resolution from mobile/backend.
- **`session:ended`**: `{ status: "completed" | "expired" }`
- **`session:error`**: `{ message: "Invalid or expired tracking link", code: "INVALID_TOKEN" }`

---

## 7. Day 3–4: 3-State SOS Tracking & Demonstration

The tracker features a dedicated **SOS State Banner** with three distinct states:

| State | Visual Theme | Description |
| :--- | :--- | :--- |
| **A. Normal Trip** | Subtle Emerald/Cyan | Active safe tracking, no emergency reported. |
| **B. SOS Active** | Urgent Pulsing Crimson | High-visibility emergency alert with quick "Call 112" shortcut. |
| **C. Resolved** | Calming Ocean Blue | Confirmed all-clear signal; journey monitoring resumes. |

### How to Test Each State:

1. **Via Direct URL Quick Links:**
   - **State A (Normal Trip)**: [`http://localhost:3000/track/safesafar-live-session-2026`](http://localhost:3000/track/safesafar-live-session-2026)
   - **State B (SOS Active)**: [`http://localhost:3000/track/sos-active`](http://localhost:3000/track/sos-active)
   - **State C (SOS Resolved)**: [`http://localhost:3000/track/sos-resolved`](http://localhost:3000/track/sos-resolved)
   - **Edge Case (Missing Destination)**: [`http://localhost:3000/track/no-destination`](http://localhost:3000/track/no-destination)
   - **Edge Case (Missing Timestamp)**: [`http://localhost:3000/track/no-timestamp`](http://localhost:3000/track/no-timestamp)

2. **Via On-Screen Demo Controls:**
   - Open any tracking session, click **`Demo Controls ⚙️`** on the floating simulator pill, and tap **`Normal`**, **`SOS Active`**, or **`Resolved`** to toggle states on the fly!
