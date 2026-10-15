# SafeSafar - Landmark Data & Ingestion (Dhruv Raval)

This folder contains scripts to extract and seed real-world safety landmarks for Surat, Gujarat.

## Files
- `fetch_landmarks.js`: Queries the OpenStreetMap Overpass API for police stations, hospitals, 24/7 pharmacies, and schools in Surat. Falls back to pre-verified Surat safety coordinates if OSM Overpass is unreachable.
- `surat_landmarks.json`: Structured JSON containing verified landmarks with geo-coordinates, contact details, and 24/7 availability.
- `surat_landmarks.geojson`: GeoJSON FeatureCollection ready for Mapbox, MapLibre, QGIS, or Leaflet visualization.
- `seed_landmarks_mongo.js`: Ingestion script to push landmarks into MongoDB Atlas with a `2dsphere` index for fast geospatial queries (`$geoNear` / `$nearSphere`).

## Usage
```bash
# 1. Fetch or refresh landmarks
node scripts/landmarks/fetch_landmarks.js

# 2. Seed to MongoDB Atlas
MONGODB_URI="your_mongodb_connection_string" node scripts/landmarks/seed_landmarks_mongo.js
```
