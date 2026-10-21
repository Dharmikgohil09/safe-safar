# Scoring Module

This module manages safety reports, landmark infrastructure, illumination data, trust & decay calculation, and safety scoring for SafeSafar.

## Rules & Algorithms

1. **Activation Threshold**:
   - A report is marked active (`isActive: true`) only after receiving **2 or more confirmations** from distinct users.
   - The original reporter (`reporterId`) **does not count** toward confirmations and cannot confirm their own report.
   - Each user can confirm a given report at most once.

2. **Time Decay Weighting**:
   - Every report has an exponential decay weight:
     $$\text{weight} = 0.5^{(\text{ageInDays} / 7)}$$
   - The weight halves every 7 days from creation.
   - For reports created at current or future timestamps, age is clamped to $\ge 0$ (weight = 1.0).

3. **Route Safety Scoring Engine**:
   - **Sampling**: Polylines are sampled along their path at intervals of `SAMPLE_INTERVAL_M = 50m` using geodesic Haversine interpolation (`samplePath`), always preserving the exact origin and destination coordinates.
   - **Candidate Fetching**: Geospatial candidates are fetched using a single `$geoWithin: { $box: [...] }` query per collection over the padded bounding box, eliminating per-point database queries.
   - **Three Safety Factors**:
     - **Incident Decay (`incidentDecayScore`, 0-100)**: Starts at 100 and applies penalties for active hazard reports (`confirmations >= 2`) within `REPORT_RADIUS_M = 100m` of any sample. Each report is counted exactly once and penalized by $\text{decayWeight} \times \text{REPORT\_PENALTY} (15)$, clamped to $[0, 100]$.
     - **Street Lighting (`lightingScore`, 0-100)**: Evaluates the fraction of route samples with a `LightPoint` within `LIGHT_RADIUS_M = 50m`, rounded to an integer ($100 \times \text{fraction}$).
     - **Police & Hospital Proximity (`policeProximityScore`, 0-100)**: Computes the average over all samples of $\max(0, 1 - \text{distanceToNearest} / \text{POLICE\_MAX\_DISTANCE\_M} (1000m)) \times 100$, rounded to an integer.
   - **No-Data Neutral Rule**: Absence of infrastructure data in the queried area is not penalized as darkness or hazard. When no candidates exist in the padded box for lighting or landmarks, the engine assigns `NEUTRAL_SCORE = 50`.
   - **Weights & Overall Safety Score**:
     $$\text{safetyScore} = \text{round}(0.40 \times \text{incident} + 0.35 \times \text{lighting} + 0.25 \times \text{police})$$
     Clamped to $[0, 100]$.
   - **Color Thresholds**:
     - $\ge 70 \to \text{"green"}$ (Safe)
     - $\ge 40 \to \text{"yellow"}$ (Moderate caution)
     - $< 40 \to \text{"red"}$ (High risk)
   - **Implementation**: The HTTP endpoint `POST /routes/safe` evaluates alternative walking routes fetched from OpenRouteService, scores them against safety infrastructure and incidents, and returns routes ranked by safety score.



---

## Time of Day and Explanations

### 1. Indian Standard Time (IST) Periods
The SafeSafar backend server operates in UTC, but the target deployment and team are located in Surat, India (UTC+05:30 with no daylight saving time). The hour of departure or request is explicitly computed in IST:
$$\text{IST Hour} = \text{new Date}(\text{timestamp}.\text{getTime}() + 330 \times 60000).\text{getUTCHours}()$$

The 24-hour cycle is segmented into three time periods:
- **Day**: `06:00 - 17:59 IST` (hours 6–17)
- **Evening**: `18:00 - 20:59 IST` (hours 18–20)
- **Night**: `21:00 - 05:59 IST` (hours 21–23 and 0–5; wraps past midnight)

### 2. Time-of-Day Dynamic Weights & Penalty Multipliers
At night, street lighting and hazard reports carry increased safety importance for women and solo travelers. Therefore, the scoring engine adjusts factor weights and incident penalties according to the time of day:

| Period | Incident Weight | Lighting Weight | Police/Hospital Weight | Sum | Report Penalty Multiplier |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Day** | 0.40 | 0.35 | 0.25 | 1.00 | 1.00 |
| **Evening** | 0.40 | 0.40 | 0.20 | 1.00 | 1.25 |
| **Night** | 0.35 | 0.45 | 0.20 | 1.00 | 1.50 |

> [!NOTE]
> These weights and penalty multipliers are tunable parameters chosen by Team Codecraft for SafeSafar (IEEE WIE ILS 2026, Track 3 SheLeads), rather than a fixed standard.

### 3. Request and Response Contract Additions
> [!IMPORTANT]
> The optional `departureTime` request field and the response fields (`timeOfDay` in `data` and `explanation` on each route) are additions to the base API contract in `docs/api.md` that Dharmik (backend lead) should know about for core router integration and API documentation sync.

- **Request Body (`POST /routes/safe`)**:
  - `departureTime` *(optional)*: ISO 8601 date-time string with timezone offset (e.g., `"2026-10-20T21:30:00+05:30"` or `"2026-10-20T16:00:00Z"`). When omitted, the current clock time is used.
- **Response Data (`POST /routes/safe`)**:
  - `data.timeOfDay`: The time period applied (`"day" | "evening" | "night"`).
  - `data.routes[].explanation`: A plain-language English explanation explaining why the route received its score. Note: internal details (`activeReportCount`, `litSamplePercent`, etc.) are consumed internally to build the explanation and are not directly exposed in the API response.

### 4. Deterministic Explanation Sentence Rules
Every route explanation is built from up to 4 deterministic English sentences joined by a single space, without randomness, third-party calls, or geocoded area/street names (geocoding is out of scope):

1. **Period Sentence**:
   - `night` -> `"Night-time: lighting and reports count more."`
   - `evening` -> `"Evening: lighting counts slightly more."`
   - `day` -> *(no sentence)*
2. **Community Reports Sentence**:
   - 0 reports -> `"No active community reports along this route."`
   - 1 report -> `"1 community report near this route."`
   - $n$ reports -> `"{n} community reports near this route."`
3. **Street Lighting Sentence**:
   - No data available -> `"Lighting data is not available for this area."`
   - Lit percentage $\ge 70\%$ -> `"Mostly well lit ({pct}% of the route is near street lights)."`
   - Lit percentage $40\% - 69\%$ -> `"Partly lit ({pct}% of the route is near street lights)."`
   - Lit percentage $< 40\%$ -> `"Poorly lit ({pct}% of the route is near street lights)."`
4. **Nearest Safe Place Sentence**:
   - No safe place data -> `"No police or hospital data for this area."`
   - Landmark available (distance rounded to nearest 10 m):
     - With name: `"Nearest {police station | hospital} is {name} about {distance} m from the route."`
     - Missing name: `"Nearest {police station | hospital} is about {distance} m from the route."`

---

## Fields Used by the Mobile App

To support client-side parsing by the React Native app (`apps/mobile`) without requiring client-side polyline decoding or nested property lookups, the following additive fields and hazard types are provided:

### 1. Route Fields (`POST /routes/safe`)
- **`coordinates`** (`Array<[number, number]>`): An array of `[longitude, latitude]` coordinate pairs representing the sampled/decoded route path. The mobile map renders the path directly from this array while retaining the encoded `polyline` string for backward compatibility.
- **`isSafest`** (`boolean`): Flag indicating the safest route option. Assigned `true` exclusively to the first route ranked by `safetyScore` descending; all other alternatives receive `false`.

### 2. Community Report Fields (`GET /reports` and `POST /reports`)
- **`id`** (`string`): Top-level alias for `_id` (`String(doc._id)`).
- **`coordinates`** (`[number, number]`): Top-level copy of `[longitude, latitude]` from `location.coordinates`.
- **`confirmations`** (`number`): Top-level alias matching `confirmationCount`.
- **`verified`** (`boolean`): Top-level alias matching `isActive`.

### 3. Additional Report Types
The allowed hazard report types now accept:
- **`isolated_path`**: Unlit, deserted pathways or alleys.
- **`suspicious`**: Suspicious activities, persons, or vehicles.

All previous report types (`dark_street`, `poor_lighting`, `harassment`, `isolated`, `unsafe_crowd`, `other`) remain supported. All additions are non-breaking and additive: all original response fields (`_id`, `polyline`, `location`, `isActive`, `confirmationCount`, `isFastest`, etc.) remain intact.

---

## API Endpoints

### 1. `POST /reports`
Submit a new community hazard report.

- **Auth**: Required (`Authorization: Bearer <jwt>`)
- **Request Body**:
```json
{
  "type": "dark_street",
  "location": {
    "coordinates": [72.8311, 21.1702]
  },
  "description": "Street lights broken near main road"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "Report submitted",
  "data": {
    "_id": "6644f1c8e1d3b45a90123456",
    "type": "dark_street",
    "description": "Street lights broken near main road",
    "location": {
      "type": "Point",
      "coordinates": [72.8311, 21.1702]
    },
    "confirmationCount": 0,
    "isActive": false,
    "weight": 1.0,
    "createdAt": "2026-10-17T12:00:00.000Z"
  }
}
```

### 2. `POST /reports/:id/confirm`
Confirm an existing community report.

- **Auth**: Required (`Authorization: Bearer <jwt>`)
- **Path Parameter**: `id` (24-hex ObjectId)
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Report confirmed",
  "data": {
    "_id": "6644f1c8e1d3b45a90123456",
    "confirmationCount": 2,
    "isActive": true
  }
}
```
- **Error Responses**:
  - `400`: Validation failed (invalid ID format)
  - `403`: `"You cannot confirm your own report"`
  - `404`: `"Report not found"`
  - `409`: `"You have already confirmed this report"`

### 3. `GET /reports`
Retrieve community reports. By default, returns only active reports (`isActive: true`).

- **Auth**: None (Public)
- **Query Parameters**:
  - `near` *(optional)*: Geospatial point `"lng,lat"` (e.g. `72.8311,21.1702`)
  - `radius` *(optional)*: Radius in meters (default: `1000`, max: `5000`)
  - `limit` *(optional)*: Maximum results (default: `50`, max: `200`)
  - `includePending` *(optional)*: Boolean flag (default: `false`). When `true`, returns unconfirmed/pending reports as well.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "6644f1c8e1d3b45a90123456",
      "type": "dark_street",
      "description": "Street lights broken near main road",
      "location": {
        "type": "Point",
        "coordinates": [72.8311, 21.1702]
      },
      "confirmationCount": 2,
      "isActive": true,
      "weight": 0.85,
      "distanceMeters": 42.5,
      "createdAt": "2026-10-15T10:00:00.000Z"
    }
  ]
}
```

### 4. `POST /routes/safe`
Calculate and rank alternative walking routes between origin and destination based on safety factors.

- **Auth**: None (Public)
- **Environment Variable**: `ORS_API_KEY` (OpenRouteService API token). Required on deployment (e.g. Render).
- **Request Body**:
```json
{
  "origin": {
    "coordinates": [72.8311, 21.1702]
  },
  "destination": {
    "coordinates": [72.8350, 21.1750]
  },
  "departureTime": "2026-10-20T21:30:00+05:30",
  "preferences": {
    "prioritizeLighting": true,
    "avoidReportHotspots": true
  }
}
```
> [!NOTE]
> `departureTime` is optional (defaults to current server time). `preferences` are optional and validated, but currently accepted without altering the scoring calculation.

- **Routing Behavior & Alternative Limit**:
  - Fetches walking directions (`foot-walking`) with up to 3 alternative routes from OpenRouteService.
  - ORS limits alternative routes to distances $< 100\text{ km}$ (returning HTTP 400 if exceeded). When a 400 occurs on an alternative routes query, the client automatically retries **once** without alternatives to fetch a single direct route.
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "timeOfDay": "night",
    "routes": [
      {
        "routeId": "route_2",
        "safetyScore": 85,
        "color": "green",
        "distanceMeters": 680,
        "durationSeconds": 490,
        "polyline": "_p~iF~ps|U_ulLnnqC_mqNvxq",
        "explanation": "Night-time: lighting and reports count more. No active community reports along this route. Mostly well lit (80% of the route is near street lights). Nearest police station is Athwa Police Station about 120 m from the route.",
        "safetyFactors": {
          "lightingScore": 80,
          "policeProximityScore": 90,
          "incidentDecayScore": 100
        },
        "isFastest": false
      },
      {
        "routeId": "route_1",
        "safetyScore": 68,
        "color": "yellow",
        "distanceMeters": 550,
        "durationSeconds": 380,
        "polyline": "_p~iF~ps|U_ulLnnqC",
        "explanation": "Night-time: lighting and reports count more. 1 community report near this route. Partly lit (50% of the route is near street lights). Nearest police station is Athwa Police Station about 210 m from the route.",
        "safetyFactors": {
          "lightingScore": 50,
          "policeProximityScore": 50,
          "incidentDecayScore": 78
        },
        "isFastest": true
      }
    ]
  }
}
```
- **Error Responses**:
  - `400`: Validation failed (invalid coordinates, out of range, or identical origin and destination).
  - `404`: `"No route found"` (no walkable path between coordinates).
  - `502`: `"Routing provider error"` (ORS provider failure or network drop).
  - `503`: `"Routing service is not configured"` (`ORS_API_KEY` missing) or `"Routing service is busy, try again shortly"` (rate limit 429).

---

## cURL Examples

```bash
# 1. Create a report
curl -X POST http://localhost:5000/reports \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dark_street",
    "location": { "coordinates": [72.8311, 21.1702] },
    "description": "Street lights broken near main road"
  }'

# 2. Confirm a report
curl -X POST http://localhost:5000/reports/6644f1c8e1d3b45a90123456/confirm \
  -H "Authorization: Bearer <JWT_TOKEN>"

# 3. List active reports near a point
curl -X GET "http://localhost:5000/reports?near=72.8311,21.1702&radius=1500"

# 4. List reports including pending
curl -X GET "http://localhost:5000/reports?includePending=true"

# 5. Get safe routes
curl -X POST http://localhost:5000/routes/safe \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "coordinates": [72.8311, 21.1702] },
    "destination": { "coordinates": [72.8350, 21.1750] },
    "preferences": {
      "prioritizeLighting": true,
      "avoidReportHotspots": true
    }
  }'
```

