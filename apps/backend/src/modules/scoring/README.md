# Scoring Module

This module manages safety reports, landmark infrastructure, illumination data, trust & decay calculation, and safety scoring for SafeSafar.

## Schemas & Models

### 1. Report (`models/Report.js`)
Stores community-reported safety hazards and observations.
- `location`: GeoJSON `Point` (`coordinates: [longitude, latitude]`). Indexed with `2dsphere`.
- `type`: Enum `['poor_lighting', 'harassment', 'isolated', 'unsafe_crowd', 'other']`.
- `note`: Optional string up to 280 characters.
- `reporterId`: ID string of the submitting user.
- `confirmations`: Array of `{ userId, at }`. Guarded by a schema validator preventing duplicate confirmations from the same user.
- `createdAt`: Timestamp with B-tree index for age-based decay calculations.

### 2. Landmark (`models/Landmark.js`)
Stores static infrastructure points (e.g. police stations, hospitals, schools).
- `name`: String identifier of the landmark.
- `category`: Enum `['police', 'hospital', 'school', 'other']`.
- `location`: GeoJSON `Point` (`coordinates: [longitude, latitude]`). Indexed with `2dsphere`.
- `source`: Origin source of the data (default: `'osm'`).

### 3. LightPoint (`models/LightPoint.js`)
Stores streetlighting points and verified night illumination markers.
- `location`: GeoJSON `Point` (`coordinates: [longitude, latitude]`). Indexed with `2dsphere`.
- `intensity`: Optional numeric rating (0–10).
- `status`: Enum `['active', 'dim', 'broken', 'unknown']` (default: `'active'`).

---

## Planned Endpoints (Day 2)
- `POST /reports` - Submit a new safety report.
- `POST /reports/:id/confirm` - Confirm an existing report by another user.
- `GET /reports?near=` - Retrieve nearby reports using geospatial `$near` / `$geoWithin`.

---

## Day 2 Scoring & Decay Rules
1. **Activation Threshold**: A report is marked active only after receiving **2 or more confirmations** from distinct users (the original `reporterId` does not count toward confirmations).
2. **Time Decay**: Report weight decays exponentially over time—the weight **halves every 7 days** from its creation date.
