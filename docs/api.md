# SafeSafar API & Real-Time Protocol Specification
**Version:** 1.0.0  
**Lead Architect & Core Author:** Dharmik Gohil (@Dharmikgohil09)  
**Team:** Codecraft  
**Target Environments:** Mobile (Expo React Native), Tracker Web (Next.js/React), Render Cloud  

---

## 1. Overview & Architecture

SafeSafar is an Android-first personal safety platform designed to empower travelers with real-time route safety scoring, trusted contact alerts, "Walk Me Home" journey monitoring, and instant multi-channel SOS emergency response.

This document serves as the **official contract** between all six team members:

| Teammate | Focus Area | Owned Endpoints & Contracts |
| :--- | :--- | :--- |
| **Dharmik Gohil** | Backend Core & Lead Architect | `/health`, `/auth/*`, `/contacts/*`, `/trips/*`, Socket.io live tracking |
| **Satej** | Safety Scoring Engine | `/routes/safe`, `/reports` |
| **Harshil** | Mobile UI & Onboarding | Client consumer of `/auth`, `/contacts`, `/trips`, `/reports` |
| **Dhruv** | Mobile Map & Navigation | Client consumer of `/routes/safe`, Socket.io location emitter |
| **Kristal** | SOS Emergency Engine | `/sos/trigger`, `/sos/cancel`, Trip-expiry emergency hook |
| **Priyavardhan** | Live Web Tracker | Client consumer of `/trips/track/:token`, Socket.io viewer room |

---

## 2. Global Standards & Protocols

### 2.1 Base URLs
- **Local Development:** `http://localhost:5000`
- **Render Production:** `https://safesafar-backend.onrender.com`

### 2.2 Standard Response Envelope
All HTTP JSON responses strictly adhere to the following schema:

#### Success Response
```json
{
  "success": true,
  "message": "Optional human-readable success message",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Short description of error",
  "details": [
    {
      "field": "phone",
      "message": "Phone number must be a valid 10-digit or E.164 phone number"
    }
  ]
}
```

### 2.3 Authentication Header
Protected endpoints require an `Authorization` header containing a valid JSON Web Token:
```http
Authorization: Bearer <jwt_token>
```

---

## 3. Data Models

### 3.1 User Model
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | MongoDB unique user identifier |
| `phone` | String | Unique E.164 or 10-digit mobile number (e.g., `+919876543210`) |
| `name` | String | User's full name (2–80 characters) |
| `pin` | String | Hashed PIN (`select: false` - never transmitted or logged) |
| `emergencyNote` | String | Medical/safety notes visible to responders during emergency |
| `createdAt` | ISO Date | Timestamp of account registration |

### 3.2 Contact Model
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Contact unique identifier |
| `userId` | ObjectId | Reference to user owning this contact |
| `name` | String | Contact display name |
| `phone` | String | Contact phone number |
| `telegramToken` | String | Optional chat/bot token (`select: false`) |
| `createdAt` | ISO Date | Timestamp when contact was added |

### 3.3 Trip Model (Walk Me Home)
| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Trip unique identifier |
| `userId` | ObjectId | Reference to user taking the trip |
| `trackingToken` | String | 32-character random hex token for public/contact tracking |
| `origin` | Object | `{ address: string, coordinates: [lng, lat] }` |
| `destination` | Object | `{ address: string, coordinates: [lng, lat] }` |
| `status` | Enum | `active` \| `arrived` \| `expired` \| `cancelled` |
| `estimatedDurationMinutes`| Number | Total agreed trip duration (1–1440 min) |
| `deadlineAt` | ISO Date | Server-managed deadline timestamp |
| `lastCheckinAt` | ISO Date | Timestamp of most recent check-in |
| `arrivedAt` | ISO Date | Timestamp when user marked safe arrival |
| `emergencyContacts` | Array | Snapshots of contacts assigned to monitor this trip |
| `lastKnownLocation` | Object | `{ coordinates: [lng, lat], speed, heading, accuracy, timestamp }` |

---

## 4. Endpoints: Core Foundation (Dharmik)

### 4.1 System Health
#### `GET /health`
Returns service availability, MongoDB connection status, and server uptime.
- **Auth:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "status": "healthy",
  "service": "safesafar-backend-core",
  "version": "1.0.0",
  "uptime": "142s",
  "database": {
    "status": "connected"
  },
  "timestamp": "2026-10-15T10:15:30.000Z"
}
```

---

### 4.2 Authentication

#### `POST /auth/register`
Creates a new user account with phone and PIN.
- **Auth:** None (Rate-limited: 15 req/15min)
- **Request Body:**
```json
{
  "phone": "+919876543210",
  "name": "Ananya Sharma",
  "pin": "1234",
  "emergencyNote": "Asthmatic, carries inhaler"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "_id": "66f4b1a80c9a5b3a1d94b001",
      "phone": "+919876543210",
      "name": "Ananya Sharma",
      "emergencyNote": "Asthmatic, carries inhaler",
      "createdAt": "2026-10-15T10:15:30.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `POST /auth/login`
Authenticates user using phone and PIN. Protects against user enumeration.
- **Auth:** None (Rate-limited: 15 req/15min)
- **Request Body:**
```json
{
  "phone": "+919876543210",
  "pin": "1234"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "66f4b1a80c9a5b3a1d94b001",
      "phone": "+919876543210",
      "name": "Ananya Sharma",
      "emergencyNote": "Asthmatic, carries inhaler"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `GET /auth/me`
Retrieves current authenticated profile.
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "66f4b1a80c9a5b3a1d94b001",
      "phone": "+919876543210",
      "name": "Ananya Sharma"
    }
  }
}
```

---

### 4.3 Trusted Contacts

#### `GET /contacts`
Lists all trusted contacts belonging to the authenticated user.
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "66f4b23c0c9a5b3a1d94b010",
      "name": "Rajesh Sharma",
      "phone": "+919876543211",
      "createdAt": "2026-10-15T10:16:00.000Z"
    }
  ]
}
```

#### `POST /contacts`
Adds a new trusted contact (enforces a maximum of 5 contacts per user).
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "name": "Rajesh Sharma",
  "phone": "+919876543211",
  "telegramToken": "tg_optional_token_123"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Contact added successfully",
  "data": {
    "_id": "66f4b23c0c9a5b3a1d94b010",
    "name": "Rajesh Sharma",
    "phone": "+919876543211",
    "createdAt": "2026-10-15T10:16:00.000Z"
  }
}
```

#### `DELETE /contacts/:id`
Removes a trusted contact. Verifies ownership.
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Contact removed successfully",
  "data": {
    "id": "66f4b23c0c9a5b3a1d94b010",
    "deleted": true
  }
}
```

---

### 4.4 Walk Me Home Trips

#### `POST /trips`
Starts a new Walk Me Home session with server-calculated deadline.
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "origin": {
    "address": "Surat Railway Station",
    "coordinates": [72.8407, 21.2044]
  },
  "destination": {
    "address": "VR Mall Surat",
    "coordinates": [72.7565, 21.1442]
  },
  "estimatedDurationMinutes": 35,
  "emergencyContactIds": ["66f4b23c0c9a5b3a1d94b010"]
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Walk Me Home trip created successfully",
  "data": {
    "tripId": "66f4b3210c9a5b3a1d94b050",
    "trackingToken": "8f4d92a10c8e2b7e61a4f09d8c3e1b7a",
    "userId": "66f4b1a80c9a5b3a1d94b001",
    "origin": {
      "address": "Surat Railway Station",
      "coordinates": [72.8407, 21.2044]
    },
    "destination": {
      "address": "VR Mall Surat",
      "coordinates": [72.7565, 21.1442]
    },
    "status": "active",
    "estimatedDurationMinutes": 35,
    "deadlineAt": "2026-10-15T10:50:30.000Z",
    "remainingSeconds": 2100,
    "lastCheckinAt": "2026-10-15T10:15:30.000Z",
    "arrivedAt": null,
    "emergencyContacts": [
      {
        "contactId": "66f4b23c0c9a5b3a1d94b010",
        "name": "Rajesh Sharma",
        "phone": "+919876543211"
      }
    ],
    "lastKnownLocation": {
      "coordinates": [72.8407, 21.2044],
      "timestamp": "2026-10-15T10:15:30.000Z"
    }
  }
}
```

#### `POST /trips/:id/checkin`
Confirms user safety during journey and optionally extends deadline.
- **Auth:** Bearer Token
- **Request Body (Optional):**
```json
{
  "extendMinutes": 10
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "tripId": "66f4b3210c9a5b3a1d94b050",
    "status": "active",
    "deadlineAt": "2026-10-15T11:00:30.000Z",
    "remainingSeconds": 2580,
    "lastCheckinAt": "2026-10-15T10:17:00.000Z"
  }
}
```

#### `POST /trips/:id/arrived`
Marks the journey as safely completed.
- **Auth:** Bearer Token
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Trip safely completed. You have arrived!",
  "data": {
    "tripId": "66f4b3210c9a5b3a1d94b050",
    "status": "arrived",
    "arrivedAt": "2026-10-15T10:45:12.000Z"
  }
}
```

#### `GET /trips/track/:token`
Public / contact tracking endpoint using the unguessable 32-character `trackingToken`. Used by Priyavardhan's Tracker Web application.
- **Auth:** None
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tripId": "66f4b3210c9a5b3a1d94b050",
    "trackingToken": "8f4d92a10c8e2b7e61a4f09d8c3e1b7a",
    "userName": "Ananya Sharma",
    "origin": { "address": "Surat Railway Station", "coordinates": [72.8407, 21.2044] },
    "destination": { "address": "VR Mall Surat", "coordinates": [72.7565, 21.1442] },
    "status": "active",
    "deadlineAt": "2026-10-15T10:50:30.000Z",
    "remainingSeconds": 1820,
    "lastCheckinAt": "2026-10-15T10:17:00.000Z",
    "lastKnownLocation": {
      "coordinates": [72.8123, 21.1821],
      "speed": 4.2,
      "heading": 180,
      "accuracy": 5,
      "timestamp": "2026-10-15T10:20:00.000Z"
    }
  }
}
```

---

## 5. Socket.io Real-Time Protocol Specification

### 5.1 Connection Handshake
Clients connect to `/` via WebSocket or Polling:
- **Mobile Trip Owner (Authenticated):**
  ```javascript
  const socket = io('https://safesafar-backend.onrender.com', {
    auth: { token: 'jwt_token_here' }
  });
  ```
- **Web Tracker / Trusted Contact (Viewer):**
  ```javascript
  const socket = io('https://safesafar-backend.onrender.com', {
    auth: { trackingToken: '8f4d92a10c8e2b7e61a4f09d8c3e1b7a' }
  });
  ```

### 5.2 Real-Time Event Catalog

| Event Name | Direction | Emitter | Payload | Description |
| :--- | :--- | :--- | :--- | :--- |
| `trip:join` | Client -> Server | Mobile or Web | `{ tripId, trackingToken }` | Join the real-time trip room `trip:<tripId>` |
| `trip:joined` | Server -> Client | Server | `{ tripId, role: 'owner'\|'viewer' }` | Confirms room membership |
| `trip:leave` | Client -> Server | Mobile or Web | `{ tripId }` | Leaves the trip tracking room |
| `trip:location_update` | Client -> Server | Trip Owner Mobile | `{ tripId, latitude, longitude, speed, heading, accuracy }` | Publishes live GPS position |
| `trip:location_ack` | Server -> Client | Server | `{ tripId, receivedAt }` | Confirms DB persistence to owner |
| `trip:location_broadcast` | Server -> Room | Server to Viewers | `{ tripId, latitude, longitude, speed, heading, accuracy, timestamp }` | Broadcast to all authorized contacts in room |
| `trip:error` | Server -> Client | Server | `{ message: string }` | Emitted when validation or authorization fails |

---

## 6. Teammate Module Contracts

### 6.1 Safety Scoring & Routing (Satej)
- **Mounted Paths:** `/routes/safe`, `/reports`, `/reports/:id/confirm`
- **POST `/routes/safe`**
  ```json
  {
    "origin": { "coordinates": [72.8407, 21.2044] },
    "destination": { "coordinates": [72.7565, 21.1442] },
    "preferences": { "prioritizeLighting": true, "avoidReportHotspots": true }
  }
  ```
- **Response Structure Expected from Satej Engine:**
  ```json
  {
    "success": true,
    "data": {
      "routes": [
        {
          "routeId": "safe_primary",
          "safetyScore": 92,
          "distanceMeters": 2600,
          "durationSeconds": 1400,
          "polyline": "...",
          "safetyFactors": {
            "lightingScore": 95,
            "policeProximityScore": 88,
            "incidentDecayScore": 94
          }
        }
      ]
    }
  }
  ```

- **GET `/reports`**
  Returns active community incident reports.
  - **Auth:** None

- **POST `/reports`**
  Submits a community incident report.
  - **Auth:** Bearer Token
  - **Request Body:**
    ```json
    {
      "type": "dark_street",
      "location": { "coordinates": [72.8311, 21.1702] },
      "description": "Street lights broken"
    }
    ```

- **POST `/reports/:id/confirm`**
  Confirms an existing report for Satej's trust decay and verification algorithm.
  - **Auth:** Bearer Token


### 6.2 SOS & Emergency Module (Kristal)
- **Mounted Path:** `/sos/trigger` and `/sos/cancel`
- **POST `/sos/trigger`**
  ```json
  {
    "latitude": 21.1702,
    "longitude": 72.8311,
    "reason": "panic_button_pressed",
    "batteryLevel": 42
  }
  ```
- **Response Structure Expected from Kristal Engine:**
  ```json
  {
    "success": true,
    "data": {
      "alertId": "sos_alert_12345",
      "dispatches": {
        "sms": "dispatched",
        "telegram": "sent",
        "fcm": "sent"
      }
    }
  }
  ```

---

## 7. Local Setup & Execution Guide

1. **Install Dependencies:**
   ```bash
   cd apps/backend
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Update MONGODB_URI and JWT_SECRET
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Execute Automated Test Suite:**
   ```bash
   npm test
   ```
