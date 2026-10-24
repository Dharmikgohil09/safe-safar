import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Switch,
  StyleSheet,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { NearestSafeModal } from './NearestSafeModal';

interface MapLayerControlsProps {
  onRecenter?: () => void;
}

export const MapLayerControls: React.FC<MapLayerControlsProps> = ({ onRecenter }) => {
  const {
    showLandmarks,
    showHeatmap,
    showDeadZones,
    toggleLandmarks,
    toggleHeatmap,
    toggleDeadZones,
    recenterOnUser,
  } = useMapState();

  const [safeModalVisible, setSafeModalVisible] = useState(false);
  const [layersModalVisible, setLayersModalVisible] = useState(false);

  return (
    <>
      <View style={styles.fabCluster}>
        {/* 1. Nearest Safe Place SOS Button (Blue Shield) */}
        <TouchableOpacity
          style={[styles.fab, styles.safeFab]}
          onPress={() => setSafeModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>🛡️</Text>
        </TouchableOpacity>

        {/* 2. Map Layers Overlay Filter */}
        <TouchableOpacity
          style={[styles.fab, styles.layersFab]}
          onPress={() => setLayersModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>📑</Text>
        </TouchableOpacity>

        {/* 4. Recenter to GPS Location */}
        <TouchableOpacity
          style={[styles.fab, styles.recenterFab]}
          onPress={onRecenter || recenterOnUser}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>🎯</Text>
        </TouchableOpacity>
      </View>

      {/* Layer Visibility Dialog */}
      <Modal visible={layersModalVisible} transparent animationType="fade" onRequestClose={() => setLayersModalVisible(false)}>
        <View style={styles.layerModalOverlay}>
          <View style={styles.layerModalBox}>
            <View style={styles.layerModalHeader}>
              <Text style={styles.layerHeaderIcon}>📑</Text>
              <Text style={styles.layerModalTitle}>Map Layers & Overlays</Text>
            </View>

            <View style={styles.layerRow}>
              <View style={styles.layerTextCol}>
                <Text style={styles.layerLabel}>Landmarks & Safe Havens</Text>
                <Text style={styles.layerSub}>Police, 24/7 hospitals, schools</Text>
              </View>
              <Switch
                value={showLandmarks}
                onValueChange={toggleLandmarks}
                trackColor={{ false: '#E0E0E0', true: '#90CAF9' }}
                thumbColor={showLandmarks ? '#1E88E5' : '#FAFAFA'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.layerRow}>
              <View style={styles.layerTextCol}>
                <Text style={styles.layerLabel}>Community Reports Heatmap</Text>
                <Text style={styles.layerSub}>Incident clusters, harassment, dark spots</Text>
              </View>
              <Switch
                value={showHeatmap}
                onValueChange={toggleHeatmap}
                trackColor={{ false: '#E0E0E0', true: '#EF9A9A' }}
                thumbColor={showHeatmap ? '#D32F2F' : '#FAFAFA'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.layerRow}>
              <View style={styles.layerTextCol}>
                <Text style={styles.layerLabel}>Cellular Dead Zones</Text>
                <Text style={styles.layerSub}>Known low-coverage RF blind spots</Text>
              </View>
              <Switch
                value={showDeadZones}
                onValueChange={toggleDeadZones}
                trackColor={{ false: '#E0E0E0', true: '#FFE082' }}
                thumbColor={showDeadZones ? '#FFA000' : '#FAFAFA'}
              />
            </View>

            <TouchableOpacity
              style={styles.layerDoneButton}
              onPress={() => setLayersModalVisible(false)}
            >
              <Text style={styles.layerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modals */}
      <NearestSafeModal visible={safeModalVisible} onClose={() => setSafeModalVisible(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  fabCluster: {
    position: 'absolute',
    right: 14,
    bottom: 230,
    alignItems: 'center',
    zIndex: 10,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  safeFab: {
    backgroundColor: '#1E88E5',
  },
  layersFab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recenterFab: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fabIcon: {
    fontSize: 18,
  },
  layerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  layerModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  layerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  layerHeaderIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  layerModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  layerTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  layerLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#212121',
  },
  layerSub: {
    fontSize: 11,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 4,
  },
  layerDoneButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  layerDoneText: {
    color: '#1E88E5',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
