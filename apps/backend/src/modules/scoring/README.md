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
```
