import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { Landmark, LatLng } from '../types';
import { getLandmarkColor, getLandmarkLabel } from '../models/Landmark';
import { getDeadZoneBorderColor, getDeadZoneCircleColor } from '../models/DeadZone';
import { getIncidentColor } from '../models/IncidentReport';
import { getRouteColor, getSafetyTier } from '../models/RouteOption';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Anchor around Surat (lat: ~21.1648 to 21.21, lng: ~72.71 to 72.84)
const BASE_LAT = 21.1648;
const BASE_LNG = 72.7848;

export const MapViewComponent: React.FC = () => {
  const {
    userLocation,
    destination,
    routes,
    selectedRoute,
    landmarks,
    deadZones,
    reports,
    showLandmarks,
    showHeatmap,
    showDeadZones,
    calculateRoutes,
  } = useMapState();

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(14);
  const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Scale factors for converting lat/lng to view pixels
  const scale = useMemo(() => {
    return Math.pow(2, zoomLevel - 11) * 3500;
  }, [zoomLevel]);

  const mapCenter = useMemo(() => {
    return {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    };
  }, [userLocation]);

  const projectToPixels = (coords: LatLng) => {
    const dLng = coords.longitude - mapCenter.longitude;
    const dLat = coords.latitude - mapCenter.latitude;

    const x = SCREEN_WIDTH / 2 + dLng * scale + centerOffset.x;
    // Latitude increases upwards, whereas screen Y increases downwards
    const y = SCREEN_HEIGHT / 2 - dLat * scale + centerOffset.y;
    return { x, y };
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(18, prev + 1));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(10, prev - 1));
  };

  const handleResetCenter = () => {
    setCenterOffset({ x: 0, y: 0 });
    setZoomLevel(14);
  };

  const userPix = projectToPixels(userLocation);
  const destPix = destination ? projectToPixels(destination) : null;

  return (
    <View style={styles.container}>
      {/* Map Background Canvas */}
      <View style={styles.mapCanvas}>
        {/* Surat City Grid Lines (Visual Map Layer) */}
        <View style={styles.gridOverlay}>
          <Text style={styles.mapWatermark}>Surat, Gujarat • OpenStreetMap Data</Text>
        </View>

        {/* 1. Dead Zones Circles Layer */}
        {showDeadZones &&
          deadZones.map((dz) => {
            const pix = projectToPixels(dz.center);
            const radiusPix = (dz.radiusMeters / 1000) * (scale / 111);
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
                <Text style={styles.deadZoneLabel}>{dz.name}</Text>
              </View>
            );
          })}

        {/* 2. Incident Reports Heatmap Layer */}
        {showHeatmap &&
          reports.map((rep) => {
            const pix = projectToPixels(rep.coordinates);
            const radiusPix = 24 + rep.severity * 6;
            const color = getIncidentColor(rep.type);

            return (
              <View
                key={rep.id}
                style={[
                  styles.heatmapAura,
                  {
                    left: pix.x - radiusPix,
                    top: pix.y - radiusPix,
                    width: radiusPix * 2,
                    height: radiusPix * 2,
                    borderRadius: radiusPix,
                    backgroundColor: color + '33',
                    borderColor: color + '88',
                  },
                ]}
              >
                <View style={[styles.reportCenterDot, { backgroundColor: color }]}>
                  <Text style={styles.reportIconText}>⚠️</Text>
                </View>
              </View>
            );
          })}

        {/* 3. Route Polyline Segments */}
        {routes.map((route) => {
          const isSelected = selectedRoute?.routeId === route.routeId;
          const tier = getSafetyTier(route.safetyScore);
          const color = getRouteColor(tier);

          // Render linear connecting segments between waypoints
          const points = route.coordinates.map(projectToPixels);
          if (points.length < 2) return null;

          return (
            <React.Fragment key={route.routeId}>
              {points.slice(0, -1).map((pt1, i) => {
                const pt2 = points[i + 1];
                const dx = pt2.x - pt1.x;
                const dy = pt2.y - pt1.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                return (
                  <View
                    key={`line_${route.routeId}_${i}`}
                    style={[
                      styles.routeSegment,
                      {
                        left: pt1.x,
                        top: pt1.y,
                        width: length,
                        height: isSelected ? 6 : 3.5,
                        backgroundColor: color,
                        opacity: isSelected ? 1 : 0.45,
                        transform: [
                          { translateY: isSelected ? -3 : -1.75 },
                          { rotate: `${angle}deg` },
                        ],
                        zIndex: isSelected ? 4 : 2,
                      },
                    ]}
                  />
                );
              })}
            </React.Fragment>
          );
        })}

        {/* 4. Destination Marker */}
        {destPix && (
          <View
            style={[
              styles.destMarker,
              {
                left: destPix.x - 14,
                top: destPix.y - 28,
              },
            ]}
          >
            <View style={styles.flagBadge}>
              <Text style={styles.flagIcon}>🏁</Text>
            </View>
            <View style={styles.flagStick} />
          </View>
        )}

        {/* 5. Landmarks Markers */}
        {showLandmarks &&
          landmarks.map((l) => {
            const pix = projectToPixels(l.coordinates);
            const color = getLandmarkColor(l.type);
            let iconText = '🏛️';
            if (l.type === 'police') iconText = '👮';
            if (l.type === 'hospital') iconText = '🏥';
            if (l.type === 'school') iconText = '🎓';
            if (l.type === 'pharmacy') iconText = '💊';

            return (
              <TouchableOpacity
                key={l.id}
                style={[
                  styles.landmarkMarker,
                  {
                    left: pix.x - 16,
                    top: pix.y - 16,
                    borderColor: color,
                  },
                ]}
                onPress={() => setSelectedLandmark(l)}
                activeOpacity={0.8}
              >
                <Text style={styles.landmarkIconText}>{iconText}</Text>
              </TouchableOpacity>
            );
          })}

        {/* 6. User Location Marker with Pulsing Aura */}
        <View
          style={[
            styles.userMarkerContainer,
            {
              left: userPix.x - 22,
              top: userPix.y - 22,
            },
          ]}
        >
          <View style={styles.userAura} />
          <View style={styles.userDot} />
        </View>
      </View>

      {/* Floating Zoom & Pan Controls on Left */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.zoomButton} onPress={handleResetCenter}>
          <Text style={styles.zoomText}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Landmark Details Modal */}
      <Modal
        visible={selectedLandmark !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedLandmark(null)}
      >
        <View style={styles.landmarkModalOverlay}>
          <View style={styles.landmarkModalContent}>
            {selectedLandmark && (
              <>
                <View style={styles.modalHandle} />
                <View style={styles.landmarkHeaderRow}>
                  <View
                    style={[
                      styles.landmarkModalIconCircle,
                      { backgroundColor: getLandmarkColor(selectedLandmark.type) + '22' },
                    ]}
                  >
                    <Text style={styles.landmarkModalIcon}>
                      {selectedLandmark.type === 'police'
                        ? '👮'
                        : selectedLandmark.type === 'hospital'
                        ? '🏥'
                        : selectedLandmark.type === 'pharmacy'
                        ? '💊'
                        : '🎓'}
                    </Text>
                  </View>
                  <View style={styles.landmarkTitleGroup}>
                    <Text style={styles.landmarkModalTitle}>{selectedLandmark.name}</Text>
                    <Text style={styles.landmarkModalType}>
                      {getLandmarkLabel(selectedLandmark.type)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.landmarkModalAddress}>{selectedLandmark.address}</Text>
                {selectedLandmark.zone ? (
                  <Text style={styles.landmarkModalZone}>Zone: {selectedLandmark.zone}</Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.routeToLandmarkBtn,
                    { backgroundColor: getLandmarkColor(selectedLandmark.type) },
                  ]}
                  onPress={() => {
                    const lm = selectedLandmark;
                    setSelectedLandmark(null);
                    calculateRoutes(lm.coordinates, lm.name);
                  }}
                >
                  <Text style={styles.routeBtnText}>Route to this Safe Landmark</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeLandmarkBtn}
                  onPress={() => setSelectedLandmark(null)}
                >
                  <Text style={styles.closeLandmarkText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E8ECEF',
    overflow: 'hidden',
  },
  mapCanvas: {
    ...StyleSheet.absoluteFillObject,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 12,
  },
  mapWatermark: {
    fontSize: 10,
    color: '#90A4AE',
    fontWeight: 'bold',
  },
  deadZoneCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deadZoneLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#D32F2F',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  heatmapAura: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  reportCenterDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportIconText: {
    fontSize: 10,
  },
  routeSegment: {
    position: 'absolute',
    borderRadius: 3,
    transformOrigin: 'left center',
  },
  userMarkerContainer: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  userAura: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 136, 229, 0.25)',
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#1E88E5',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  destMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    zIndex: 5,
  },
  flagBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  flagIcon: {
    fontSize: 13,
  },
  flagStick: {
    width: 2,
    height: 6,
    backgroundColor: '#D32F2F',
  },
  landmarkMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 4,
  },
  landmarkIconText: {
    fontSize: 15,
  },
  zoomControls: {
    position: 'absolute',
    left: 14,
    bottom: 230,
    zIndex: 10,
  },
  zoomButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  zoomText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  landmarkModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  landmarkModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  landmarkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  landmarkModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  landmarkModalIcon: {
    fontSize: 22,
  },
  landmarkTitleGroup: {
    flex: 1,
  },
  landmarkModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  landmarkModalType: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  landmarkModalAddress: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  landmarkModalZone: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  routeToLandmarkBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  routeBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  closeLandmarkBtn: {
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  closeLandmarkText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
