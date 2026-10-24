import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
import { getTileUrl } from '../config/mapConfig';
import { walkTelemetryService } from '../services/walkTelemetryService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Downsamples dense polyline points to smooth, high-fps screen segments (eliminates React View lag)
function downsampleForScreen(
  coords: LatLng[],
  projectFn: (c: LatLng) => { x: number; y: number },
  minPixelDist = 14
): LatLng[] {
  if (!coords || coords.length <= 25) return coords || [];
  const result: LatLng[] = [coords[0]];
  let lastPix = projectFn(coords[0]);
  for (let i = 1; i < coords.length - 1; i++) {
    const curPix = projectFn(coords[i]);
    const d = Math.hypot(curPix.x - lastPix.x, curPix.y - lastPix.y);
    if (d >= minPixelDist) {
      result.push(coords[i]);
      lastPix = curPix;
    }
  }
  result.push(coords[coords.length - 1]);
  return result;
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
    isRealLocation,
    recenterCount,
    recenterOnUser,
    clearDestination,
    setMapStyle,
    stopNavigation,
    selectRoute,
    calculateRoutes,
    handleMapTap,
  } = useMapState();

  // Zoom (levels 2 to 19) & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Refs for 60fps pan/pinch gestures without recreating PanResponder
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomLevelRef = useRef<number>(14);
  const mapCenterRef = useRef<LatLng>(userLocation);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const initialTouchDistanceRef = useRef<number | null>(null);
  const isPinchingRef = useRef<boolean>(false);

  // Sync refs with state
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    mapCenterRef.current = userLocation;
  }, [userLocation]);

  // Recenter when triggered externally (e.g. from MapLayerControls)
  useEffect(() => {
    if (recenterCount > 0) {
      setPanOffset({ x: 0, y: 0 });
      panOffsetRef.current = { x: 0, y: 0 };
      setZoomLevel(15);
      zoomLevelRef.current = 15;
    }
  }, [recenterCount]);

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

  // Inverse projector: screen pixels to lat/lon (uses latest ref values)
  const unprojectFromPixels = (screenX: number, screenY: number): LatLng => {
    const currentPan = panOffsetRef.current;
    const currentZoom = zoomLevelRef.current;
    const center = mapCenterRef.current;

    const dX = screenX - SCREEN_WIDTH / 2 - currentPan.x;
    const dY = screenY - SCREEN_HEIGHT / 2 - currentPan.y;

    const centerTileX = lon2tile(center.longitude, currentZoom);
    const centerTileY = lat2tile(center.latitude, currentZoom);

    const ptTileX = centerTileX + dX / 256;
    const ptTileY = centerTileY + dY / 256;

    return {
      latitude: tile2lat(ptTileY, currentZoom),
      longitude: tile2lon(ptTileX, currentZoom),
    };
  };

  // Viewport visibility checker for high-performance culling
  const isVisible = (x: number, y: number, margin = 60) => {
    return x >= -margin && x <= SCREEN_WIDTH + margin && y >= -margin && y <= SCREEN_HEIGHT + margin;
  };

  // Smooth Zoom In: scales pan offset around center so focus point remains stationary
  const handleZoomIn = useCallback(() => {
    setZoomLevel((prevZoom) => {
      if (prevZoom >= 19) return prevZoom;
      const nextZoom = prevZoom + 1;
      zoomLevelRef.current = nextZoom;
      setPanOffset((prevPan) => {
        const nextPan = { x: prevPan.x * 2, y: prevPan.y * 2 };
        panOffsetRef.current = nextPan;
        return nextPan;
      });
      return nextZoom;
    });
  }, []);

  // Smooth Zoom Out: scales pan offset around center so focus point remains stationary
  const handleZoomOut = useCallback(() => {
    setZoomLevel((prevZoom) => {
      if (prevZoom <= 2) return prevZoom;
      const nextZoom = prevZoom - 1;
      zoomLevelRef.current = nextZoom;
      setPanOffset((prevPan) => {
        const nextPan = { x: Math.round(prevPan.x / 2), y: Math.round(prevPan.y / 2) };
        panOffsetRef.current = nextPan;
        return nextPan;
      });
      return nextZoom;
    });
  }, []);

  const handleRecenter = useCallback(async () => {
    setPanOffset({ x: 0, y: 0 });
    panOffsetRef.current = { x: 0, y: 0 };
    setZoomLevel(15);
    zoomLevelRef.current = 15;
    await recenterOnUser();
  }, [recenterOnUser]);

  // Stable PanResponder: 60fps pan, pinch zoom, double tap zoom, single tap navigation
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2 || gesture.numberActiveTouches > 1,
        onMoveShouldSetPanResponderCapture: () => false,

        onPanResponderGrant: (_, gesture) => {
          touchStartRef.current = { x: gesture.x0, y: gesture.y0, time: Date.now() };
          dragStartRef.current = { x: panOffsetRef.current.x, y: panOffsetRef.current.y };
          initialTouchDistanceRef.current = null;
          isPinchingRef.current = false;
        },

        onPanResponderMove: (evt, gesture) => {
          const touches = evt.nativeEvent.touches;

          // Two-Finger Pinch to Zoom
          if (touches && touches.length >= 2) {
            isPinchingRef.current = true;
            const t1 = touches[0];
            const t2 = touches[1];
            const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);

            if (!initialTouchDistanceRef.current) {
              initialTouchDistanceRef.current = dist;
            } else {
              const ratio = dist / initialTouchDistanceRef.current;
              if (ratio >= 1.35) {
                handleZoomIn();
                initialTouchDistanceRef.current = dist;
              } else if (ratio <= 0.72) {
                handleZoomOut();
                initialTouchDistanceRef.current = dist;
              }
            }
            return;
          }

          // Single-Finger Smooth Pan
          if (!isPinchingRef.current) {
            const nextX = dragStartRef.current.x + gesture.dx;
            const nextY = dragStartRef.current.y + gesture.dy;
            panOffsetRef.current = { x: nextX, y: nextY };
            setPanOffset({ x: nextX, y: nextY });
          }
        },

        onPanResponderRelease: (_, gesture) => {
          initialTouchDistanceRef.current = null;
          isPinchingRef.current = false;

          const moveDist = Math.hypot(gesture.dx, gesture.dy);
          const duration = Date.now() - touchStartRef.current.time;

          // Stationary quick tap
          if (moveDist < 8 && duration < 300) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTapRef.current.time;
            const distFromLastTap = Math.hypot(
              gesture.x0 - lastTapRef.current.x,
              gesture.y0 - lastTapRef.current.y
            );

            // Double Tap to Zoom In
            if (timeSinceLastTap < 350 && distFromLastTap < 35) {
              handleZoomIn();
              lastTapRef.current = { time: 0, x: 0, y: 0 };
              return;
            }

            lastTapRef.current = { time: now, x: gesture.x0, y: gesture.y0 };
            const coords = unprojectFromPixels(gesture.x0, gesture.y0);
            handleMapTap(coords);
          }
        },
      }),
    [handleZoomIn, handleZoomOut, handleMapTap]
  );

  // Web mouse wheel zoom support (React Native Web / Expo Web)
  const handleWheel = (e: any) => {
    if (Platform.OS === 'web' && e && e.nativeEvent) {
      const delta = e.nativeEvent.deltaY;
      if (delta < 0) {
        handleZoomIn();
      } else if (delta > 0) {
        handleZoomOut();
      }
    }
  };

  // Slippy tile grid covering the visible viewport dynamically anywhere on Earth
  const visibleTiles = useMemo(() => {
    const centerTileX = lon2tile(mapCenter.longitude, zoomLevel);
    const centerTileY = lat2tile(mapCenter.latitude, zoomLevel);

    // Shift view center in tile units according to current panOffset
    const viewCenterTileX = centerTileX - panOffset.x / 256;
    const viewCenterTileY = centerTileY - panOffset.y / 256;

    // Buffer generously so tiles are ready ahead of finger movement
    const tilesAcross = Math.ceil(SCREEN_WIDTH / 256) + 4;
    const tilesDown = Math.ceil(SCREEN_HEIGHT / 256) + 4;

    const minTileX = Math.floor(viewCenterTileX - tilesAcross / 2);
    const maxTileX = Math.ceil(viewCenterTileX + tilesAcross / 2);
    const minTileY = Math.floor(viewCenterTileY - tilesDown / 2);
    const maxTileY = Math.ceil(viewCenterTileY + tilesDown / 2);

    const maxCoord = Math.pow(2, zoomLevel);
    const tiles: Array<{ key: string; x: number; y: number; left: number; top: number; url: string }> = [];

    const tileUrlFn = (z: number, x: number, y: number) => getTileUrl(mapStyle, z, x, y);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        // Tile Y cannot exceed valid Web Mercator range [0, 2^z - 1]
        if (ty < 0 || ty >= maxCoord) continue;

        // Tile X wraps around the 360 degree meridian seamlessly
        const normalizedX = ((tx % maxCoord) + maxCoord) % maxCoord;

        // Screen coordinate placement
        const left = SCREEN_WIDTH / 2 + (tx - centerTileX) * 256 + panOffset.x;
        const top = SCREEN_HEIGHT / 2 + (ty - centerTileY) * 256 + panOffset.y;

        tiles.push({
          key: `${zoomLevel}_${normalizedX}_${ty}_${tx}`,
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

  const userPix = projectToPixels(userLocation);
  const destPix = destination ? projectToPixels(destination) : null;

  return (
    <View style={styles.container}>
      {/* 1. Interactive Map Gesture Surface & Slippy Canvas */}
      <View
        style={StyleSheet.absoluteFillObject}
        {...panResponder.panHandlers}
        // @ts-ignore onWheel is supported on react-native-web
        onWheel={handleWheel}
      >
        <View style={styles.tileCanvas} pointerEvents="none">
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
        </View>

        {/* 2. Dead Zones Layer (with viewport culling) */}
        {showDeadZones &&
          deadZones.map((dz) => {
            const pix = projectToPixels(dz.center);
            const radiusPix = (dz.radiusMeters / 1000) * (Math.pow(2, zoomLevel - 11) * 32);
            if (!isVisible(pix.x, pix.y, radiusPix + 40)) return null;

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

        {/* 3. Incident Heatmap & Report Markers (with viewport culling) */}
        {showHeatmap &&
          reports.map((rep) => {
            const pix = projectToPixels(rep.coordinates);
            if (!isVisible(pix.x, pix.y, 60)) return null;

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

        {/* 4. Real Street Route Polylines (downsampled for smooth 60fps) */}
        {routes.map((route) => {
          const isSelected = selectedRoute?.routeId === route.routeId;
          const tier = getSafetyTier(route.safetyScore);
          const routeColor = getRouteColor(tier);
          const strokeWidth = isSelected ? 6 : 4;
          // Downsample dense polyline to smooth lightweight screen segments
          const coords = downsampleForScreen(route.coordinates, projectToPixels, 14);

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
              {/* Main polyline segments */}
              <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                {segments}
              </View>

              {/* Tappable Route Score Pill on Map */}
              {midPix && isVisible(midPix.x, midPix.y, 60) && (
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

        {/* 5. Safe Haven Landmark Markers (with viewport culling) */}
        {showLandmarks &&
          landmarks.map((lm) => {
            const pix = projectToPixels(lm.coordinates);
            if (!isVisible(pix.x, pix.y, 40)) return null;

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
            <View style={{ flex: 1 }}>
              <Text style={styles.navTurnText}>In 250m, Keep Left</Text>
              <Text style={styles.navStreetText}>{navigationStep}</Text>
              <Text style={{ color: '#FCD34D', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                📡 Live Telemetry Broadcasting via SMS & Web
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.navExitButton, { backgroundColor: '#D97706', marginRight: 6 }]}
              onPress={() => walkTelemetryService.shareTrackingLink()}
              activeOpacity={0.8}
            >
              <Text style={styles.navExitText}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navExitButton} onPress={stopNavigation} activeOpacity={0.8}>
              <Text style={styles.navExitText}>ARRIVED</Text>
            </TouchableOpacity>
          </View>
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

      {/* 10. Floating Map Zoom & Recenter Controls (Left Side, Unobstructed) */}
      <View style={styles.floatingControls} pointerEvents="box-none">
        <View style={styles.zoomPill}>
          <TouchableOpacity
            style={styles.controlFab}
            onPress={handleZoomIn}
            activeOpacity={0.7}
            accessibilityLabel="Zoom In"
          >
            <Text style={styles.controlFabText}>+</Text>
          </TouchableOpacity>

          <View style={styles.zoomDivider} />

          <View style={styles.zoomBadge}>
            <Text style={styles.zoomBadgeText}>{zoomLevel}z</Text>
          </View>

          <View style={styles.zoomDivider} />

          <TouchableOpacity
            style={styles.controlFab}
            onPress={handleZoomOut}
            activeOpacity={0.7}
            accessibilityLabel="Zoom Out"
          >
            <Text style={styles.controlFabText}>−</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.recenterFab}
          onPress={handleRecenter}
          activeOpacity={0.8}
          accessibilityLabel="Recenter Map"
        >
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
    left: 16,
    bottom: 230,
    zIndex: 25,
    alignItems: 'center',
  },
  zoomPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    alignItems: 'center',
    marginBottom: 10,
  },
  controlFab: {
    width: 42,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  zoomDivider: {
    width: 28,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  zoomBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  controlFabText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 24,
  },
  recenterFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
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
