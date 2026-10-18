import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  Image,
  PanResponder,
  Platform,
  Alert,
} from 'react-native';
import { useMapState, MapStyleType } from '../context/MapContext';
import { Landmark, LatLng, RouteOption, IncidentReport } from '../types';
import { getLandmarkColor, getLandmarkLabel } from '../models/Landmark';
import { getDeadZoneBorderColor, getDeadZoneCircleColor } from '../models/DeadZone';
import { getIncidentColor } from '../models/IncidentReport';
import { getRouteColor, getSafetyTier } from '../models/RouteOption';
import { formatDistance, formatDuration } from '../utils/geo';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tile server URLs
const TILE_SERVERS: Record<MapStyleType, (z: number, x: number, y: number) => string> = {
  street: (z, x, y) => `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
  dark: (z, x, y) => `https://a.basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`,
  satellite: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}.jpg`,
};

// Tile math utilities (Web Mercator EPSG:3857)
function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * Math.pow(2, zoom);
}

function tile2lon(x: number, zoom: number): number {
  return (x / Math.pow(2, zoom)) * 360 - 180;
}

function tile2lat(y: number, zoom: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export const MapViewComponent: React.FC = () => {
  const {
    userLocation,
    destination,
    destinationName,
    routes,
    selectedRoute,
    landmarks,
    deadZones,
    reports,
    showLandmarks,
    showHeatmap,
    showDeadZones,
    mapStyle,
    isNavigating,
    navigationStep,
    setMapStyle,
    stopNavigation,
    selectRoute,
    calculateRoutes,
    handleMapTap,
  } = useMapState();

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Selected landmark / report inspection sheets
  const [inspectedLandmark, setInspectedLandmark] = useState<Landmark | null>(null);
  const [inspectedReport, setInspectedReport] = useState<IncidentReport | null>(null);

  // Map center defaults to user location
  const mapCenter = useMemo(() => {
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    };
  }, [userLocation]);

  // Pixel projector: converts lat/lon to current screen coordinates
  const projectToPixels = (coords: LatLng) => {
    const centerTileX = lon2tile(mapCenter.longitude, zoomLevel);
    const centerTileY = lat2tile(mapCenter.latitude, zoomLevel);

    const ptTileX = lon2tile(coords.longitude, zoomLevel);
    const ptTileY = lat2tile(coords.latitude, zoomLevel);

    // 1 tile = 256 pixels
    const dX = (ptTileX - centerTileX) * 256;
    const dY = (ptTileY - centerTileY) * 256;

    const x = SCREEN_WIDTH / 2 + dX + panOffset.x;
    const y = SCREEN_HEIGHT / 2 + dY + panOffset.y;
    return { x, y };
  };

  // Inverse projector: screen pixels to lat/lon (for map tap)
  const unprojectFromPixels = (screenX: number, screenY: number): LatLng => {
    const dX = screenX - SCREEN_WIDTH / 2 - panOffset.x;
    const dY = screenY - SCREEN_HEIGHT / 2 - panOffset.y;

    const centerTileX = lon2tile(mapCenter.longitude, zoomLevel);
    const centerTileY = lat2tile(mapCenter.latitude, zoomLevel);

    const ptTileX = centerTileX + dX / 256;
    const ptTileY = centerTileY + dY / 256;

    return {
      latitude: tile2lat(ptTileY, zoomLevel),
      longitude: tile2lon(ptTileX, zoomLevel),
    };
  };

  // Pan gesture responder
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
        onPanResponderGrant: () => {
          setDragStart({ x: panOffset.x, y: panOffset.y });
        },
        onPanResponderMove: (_, gesture) => {
          if (dragStart) {
            setPanOffset({
              x: dragStart.x + gesture.dx,
              y: dragStart.y + gesture.dy,
            });
          }
        },
        onPanResponderRelease: () => {
          setDragStart(null);
        },
      }),
    [dragStart, panOffset]
  );

  // Compute slippy tile grid covering the viewport
  const visibleTiles = useMemo(() => {
    const centerTileX = lon2tile(mapCenter.longitude, zoomLevel);
    const centerTileY = lat2tile(mapCenter.latitude, zoomLevel);

    const tilesAcross = Math.ceil(SCREEN_WIDTH / 256) + 2;
    const tilesDown = Math.ceil(SCREEN_HEIGHT / 256) + 2;

    const minTileX = Math.floor(centerTileX - tilesAcross / 2);
    const maxTileX = Math.ceil(centerTileX + tilesAcross / 2);
    const minTileY = Math.floor(centerTileY - tilesDown / 2);
    const maxTileY = Math.ceil(centerTileY + tilesDown / 2);

    const maxCoord = Math.pow(2, zoomLevel);
    const tiles: Array<{ key: string; x: number; y: number; left: number; top: number; url: string }> = [];

    const tileUrlFn = TILE_SERVERS[mapStyle];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        if (ty < 0 || ty >= maxCoord) continue;
        const normalizedX = ((tx % maxCoord) + maxCoord) % maxCoord;

        const left = SCREEN_WIDTH / 2 + (tx - centerTileX) * 256 + panOffset.x;
        const top = SCREEN_HEIGHT / 2 + (ty - centerTileY) * 256 + panOffset.y;

        tiles.push({
          key: `${zoomLevel}_${normalizedX}_${ty}`,
          x: normalizedX,
          y: ty,
          left,
          top,
          url: tileUrlFn(zoomLevel, normalizedX, ty),
        });
      }
    }
    return tiles;
  }, [mapCenter, zoomLevel, panOffset, mapStyle]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(18, prev + 1));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(11, prev - 1));
  };

  const handleRecenter = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(14);
  };

  const handleCanvasTap = (e: any) => {
    const { locationX, locationY } = e.nativeEvent;
    const coords = unprojectFromPixels(locationX, locationY);
    handleMapTap(coords);
  };

  const userPix = projectToPixels(userLocation);
  const destPix = destination ? projectToPixels(destination) : null;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* 1. Real Slippy Raster Map Tile Layer */}
      <View style={styles.tileCanvas} onTouchEnd={handleCanvasTap}>
        {visibleTiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.url }}
            style={[
              styles.mapTile,
              {
                left: tile.left,
                top: tile.top,
              },
            ]}
            resizeMode="cover"
          />
        ))}

        {/* 2. Dead Zones Layer */}
        {showDeadZones &&
          deadZones.map((dz) => {
            const pix = projectToPixels(dz.center);
            const radiusPix = (dz.radiusMeters / 1000) * (Math.pow(2, zoomLevel - 11) * 32);
            const circleColor = getDeadZoneCircleColor(dz.warningLevel);
            const borderColor = getDeadZoneBorderColor(dz.warningLevel);

            return (
              <View
                key={dz.id}
                style={[
                  styles.deadZoneCircle,
                  {
                    left: pix.x - radiusPix,
                    top: pix.y - radiusPix,
                    width: radiusPix * 2,
                    height: radiusPix * 2,
                    borderRadius: radiusPix,
                    backgroundColor: circleColor,
                    borderColor: borderColor,
                  },
                ]}
              >
                <View style={styles.deadZonePill}>
                  <Text style={styles.deadZoneIcon}>📵</Text>
                  <Text style={styles.deadZoneLabel} numberOfLines={1}>
                    {dz.name}
                  </Text>
                </View>
              </View>
            );
          })}

        {/* 3. Incident Heatmap & Report Markers */}
        {showHeatmap &&
          reports.map((rep) => {
            const pix = projectToPixels(rep.coordinates);
            const color = getIncidentColor(rep.type);
            const heatRadius = Math.max(16, rep.severity * 8);

            return (
              <React.Fragment key={rep.id}>
                {/* Heat glow circle */}
                <View
                  style={[
                    styles.heatGlow,
                    {
                      left: pix.x - heatRadius,
                      top: pix.y - heatRadius,
                      width: heatRadius * 2,
                      height: heatRadius * 2,
                      borderRadius: heatRadius,
                      backgroundColor: color + '30',
                    },
                  ]}
                />
                {/* Report Marker Pin */}
                <TouchableOpacity
                  style={[
                    styles.reportPin,
                    {
                      left: pix.x - 12,
                      top: pix.y - 12,
                      backgroundColor: color,
                    },
                  ]}
                  onPress={() => setInspectedReport(rep)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reportPinText}>⚠️</Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}

        {/* 4. Real Street Route Polylines */}
        {routes.map((route) => {
          const isSelected = selectedRoute?.routeId === route.routeId;
          const tier = getSafetyTier(route.safetyScore);
          const routeColor = getRouteColor(tier);
          const strokeWidth = isSelected ? 6 : 4;
          const coords = route.coordinates;

          // Connect consecutive coordinate pairs with rotated line views
          const segments: React.ReactNode[] = [];
          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = projectToPixels(coords[i]);
            const p2 = projectToPixels(coords[i + 1]);

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            if (len < 1) continue;

            const angle = Math.atan2(dy, dx);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            segments.push(
              <View
                key={`seg_${route.routeId}_${i}`}
                style={[
                  styles.routeSegment,
                  {
                    width: len,
                    height: strokeWidth,
                    left: midX - len / 2,
                    top: midY - strokeWidth / 2,
                    backgroundColor: routeColor,
                    opacity: isSelected ? 1.0 : 0.6,
                    transform: [{ rotate: `${angle}rad` }],
                    zIndex: isSelected ? 8 : 4,
                  },
                ]}
              />
            );
          }

          // Midpoint badge for route selection on map
          const midIndex = Math.floor(coords.length / 2);
          const midPix = coords.length > 0 ? projectToPixels(coords[midIndex]) : null;

          return (
            <React.Fragment key={route.routeId}>
              {/* Outer soft glow for safest route */}
              {route.isSafest && isSelected && (
                <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                  {segments}
                </View>
              )}

              {/* Main polyline segments */}
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                {segments}
              </View>

              {/* Tappable Route Score Pill on Map */}
              {midPix && (
                <TouchableOpacity
                  style={[
                    styles.routePillOnMap,
                    {
                      left: midPix.x - 48,
                      top: midPix.y - 14,
                      borderColor: routeColor,
                      backgroundColor: isSelected ? routeColor : '#FFFFFF',
                    },
                  ]}
                  onPress={() => selectRoute(route)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.routePillText,
                      { color: isSelected ? '#FFFFFF' : '#111827' },
                    ]}
                  >
                    {route.isSafest ? '🛡️ Safe' : route.isFastest ? '⚡ Fast' : '⚖️ Mid'} • {route.safetyScore}
                  </Text>
                </TouchableOpacity>
              )}
            </React.Fragment>
          );
        })}

        {/* 5. Safe Haven Landmark Markers */}
        {showLandmarks &&
          landmarks.map((lm) => {
            const pix = projectToPixels(lm.coordinates);
            const color = getLandmarkColor(lm.type);
            let icon = '🏛️';
            if (lm.type === 'police') icon = '🛡️';
            if (lm.type === 'hospital') icon = '🏥';
            if (lm.type === 'pharmacy') icon = '💊';
            if (lm.type === 'school') icon = '🏫';

            return (
              <TouchableOpacity
                key={lm.id}
                style={[
                  styles.landmarkMarker,
                  {
                    left: pix.x - 16,
                    top: pix.y - 16,
                    backgroundColor: color,
                    borderColor: '#FFFFFF',
                  },
                ]}
                onPress={() => setInspectedLandmark(lm)}
                activeOpacity={0.8}
              >
                <Text style={styles.landmarkIcon}>{icon}</Text>
              </TouchableOpacity>
            );
          })}

        {/* 6. Destination Red Google Pin */}
        {destPix && (
          <View
            style={[
              styles.destPinContainer,
              {
                left: destPix.x - 18,
                top: destPix.y - 36,
              },
            ]}
          >
            <View style={styles.destCallout}>
              <Text style={styles.destCalloutText} numberOfLines={1}>
                {destinationName || 'Destination'}
              </Text>
            </View>
            <Text style={styles.destPinEmoji}>📍</Text>
            <View style={styles.destShadow} />
          </View>
        )}

        {/* 7. Current Location Glowing GPS Beacon */}
        <View
          style={[
            styles.userLocationBeacon,
            {
              left: userPix.x - 20,
              top: userPix.y - 20,
            },
          ]}
        >
          <View style={styles.userPulseRing} />
          <View style={styles.userInnerDot} />
        </View>
      </View>

      {/* 8. Top Navigation HUD ("Walk Me Home" Active Mode) */}
      {isNavigating && (
        <View style={styles.navHudBanner}>
          <View style={styles.navHudLeft}>
            <Text style={styles.navTurnIcon}>↰</Text>
            <View>
              <Text style={styles.navTurnText}>In 250m, Keep Left</Text>
              <Text style={styles.navStreetText}>{navigationStep}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.navExitButton} onPress={stopNavigation}>
            <Text style={styles.navExitText}>EXIT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 9. Map Style Switcher (Street, Dark Safety, Satellite) */}
      <View style={styles.styleSwitcher}>
        {(['street', 'dark', 'satellite'] as MapStyleType[]).map((style) => (
          <TouchableOpacity
            key={style}
            style={[
              styles.styleButton,
              mapStyle === style && styles.styleButtonActive,
            ]}
            onPress={() => setMapStyle(style)}
          >
            <Text
              style={[
                styles.styleButtonText,
                mapStyle === style && styles.styleButtonTextActive,
              ]}
            >
              {style === 'street' ? '🗺️ Street' : style === 'dark' ? '🌙 Dark' : '🛰️ Sat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 10. Floating Map Controls (Zoom +, Zoom -, Recenter) */}
      <View style={styles.floatingControls}>
        <TouchableOpacity style={styles.controlFab} onPress={handleZoomIn} activeOpacity={0.8}>
          <Text style={styles.controlFabText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlFab} onPress={handleZoomOut} activeOpacity={0.8}>
          <Text style={styles.controlFabText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlFab, styles.recenterFab]} onPress={handleRecenter} activeOpacity={0.8}>
          <Text style={styles.controlFabIcon}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* 11. Watermark & Attribution */}
      <View style={styles.attributionBadge}>
        <Text style={styles.attributionText}>OpenStreetMap & OSRM • Surat Live Data</Text>
      </View>

      {/* 12. Landmark Place Details Modal (Google Maps Style) */}
      <Modal visible={!!inspectedLandmark} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.placeCard}>
            <View style={styles.placeCardHeader}>
              <View>
                <Text style={styles.placeCardTitle}>{inspectedLandmark?.name}</Text>
                <Text style={styles.placeCardSubtitle}>
                  {inspectedLandmark ? getLandmarkLabel(inspectedLandmark.type) : ''} •{' '}
                  {inspectedLandmark?.isOpen24Hours ? 'Open 24/7' : 'Standard Hours'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectedLandmark(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.placeCardAddress}>{inspectedLandmark?.address}</Text>
            <Text style={styles.placeCardPhone}>📞 {inspectedLandmark?.phone || 'Helpline 112'}</Text>

            <View style={styles.placeCardActions}>
              <TouchableOpacity
                style={styles.navigateBtn}
                onPress={() => {
                  if (inspectedLandmark) {
                    calculateRoutes(inspectedLandmark.coordinates, inspectedLandmark.name);
                    setInspectedLandmark(null);
                  }
                }}
              >
                <Text style={styles.navigateBtnText}>🧭 Safest Route to Haven</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 13. Incident Report Details Modal */}
      <Modal visible={!!inspectedReport} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.reportCard}>
            <View style={styles.placeCardHeader}>
              <Text style={styles.reportCardTitle}>⚠️ Incident Alert</Text>
              <TouchableOpacity onPress={() => setInspectedReport(null)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.reportType}>
              Type: {inspectedReport?.type.replace('_', ' ').toUpperCase()}
            </Text>
            <Text style={styles.reportDesc}>{inspectedReport?.description}</Text>
            <Text style={styles.reportMeta}>
              Confirmations: {inspectedReport?.confirmations} • Severity: {inspectedReport?.severity}/5
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
  },
  tileCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  mapTile: {
    position: 'absolute',
    width: 256,
    height: 256,
  },
  deadZoneCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  deadZonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  deadZoneIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  deadZoneLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heatGlow: {
    position: 'absolute',
    zIndex: 3,
  },
  reportPin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  reportPinText: {
    fontSize: 12,
  },
  routeSegment: {
    position: 'absolute',
    borderRadius: 2,
  },
  routePillOnMap: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    zIndex: 9,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  routePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  landmarkMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  landmarkIcon: {
    fontSize: 16,
  },
  destPinContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  destCallout: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
    maxWidth: 140,
  },
  destCalloutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  destPinEmoji: {
    fontSize: 28,
  },
  destShadow: {
    width: 14,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 7,
  },
  userLocationBeacon: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  userPulseRing: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  userInnerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  navHudBanner: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 48,
    left: 16,
    right: 16,
    backgroundColor: '#047857',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  navHudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navTurnIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    marginRight: 12,
  },
  navTurnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  navStreetText: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 2,
  },
  navExitButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  navExitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  styleSwitcher: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 140 : 156,
    right: 12,
    flexDirection: 'column',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 10,
    padding: 4,
    zIndex: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  styleButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginVertical: 2,
  },
  styleButtonActive: {
    backgroundColor: '#1E293B',
  },
  styleButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  styleButtonTextActive: {
    color: '#FFFFFF',
  },
  floatingControls: {
    position: 'absolute',
    right: 12,
    bottom: 230,
    zIndex: 12,
  },
  controlFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlFabText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 24,
  },
  recenterFab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  controlFabIcon: {
    fontSize: 18,
  },
  attributionBadge: {
    position: 'absolute',
    bottom: 4,
    left: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 5,
  },
  attributionText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  placeCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  placeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  placeCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  placeCardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#94A3B8',
    fontWeight: '700',
  },
  placeCardAddress: {
    fontSize: 13,
    color: '#334155',
    marginVertical: 4,
  },
  placeCardPhone: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
    marginVertical: 4,
  },
  placeCardActions: {
    marginTop: 14,
  },
  navigateBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  navigateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  reportCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    alignSelf: 'center',
    width: '90%',
  },
  reportCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC2626',
  },
  reportType: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 8,
  },
  reportDesc: {
    fontSize: 13,
    color: '#475569',
    marginVertical: 6,
  },
  reportMeta: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
