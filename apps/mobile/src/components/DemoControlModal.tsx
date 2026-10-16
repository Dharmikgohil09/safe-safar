import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMapState } from '../context/MapContext';

interface DemoControlModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DemoControlModal: React.FC<DemoControlModalProps> = ({ visible, onClose }) => {
  const {
    demoScenarios,
    destinationName,
    isOffline,
    loadDemoScenario,
    updateUserLocation,
    toggleOfflineMode,
    resetDemo,
  } = useMapState();

  const handleSimulateDeadZone = () => {
    // Dumas Mangrove cellular blind spot
    updateUserLocation({ latitude: 21.0921, longitude: 72.7154 });
    onClose();
    Alert.alert('Simulating Dead Zone', 'Teleported user to Dumas Mangrove Cellular Blind Spot.');
  };

  const handleReset = () => {
    resetDemo();
    onClose();
    Alert.alert('Demo Reset', 'Demo scenario reset: SVNIT -> Adajan Gam with seeded data.');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerIcon}>🤖</Text>
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.title}>HACKATHON DEMO CONTROLLER</Text>
                <Text style={styles.subtitle}>
                  1-tap scenario testing, seeded data & resets
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Select Scenario */}
            <Text style={styles.sectionHeader}>SELECT DEMO SCENARIO</Text>
            {demoScenarios.map((s) => {
              const isCurrent = destinationName === s.destinationName;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.scenarioCard,
                    isCurrent ? styles.scenarioCardActive : styles.scenarioCardInactive,
                  ]}
                  onPress={() => {
                    loadDemoScenario(s.id);
                    onClose();
                  }}
                >
                  <View style={styles.scenarioInfo}>
                    <Text
                      style={[
                        styles.scenarioTitle,
                        { color: isCurrent ? '#4A148C' : '#212121' },
                      ]}
                    >
                      {s.title}
                    </Text>
                    <Text style={styles.scenarioRoute}>
                      {s.originName} → {s.destinationName}
                    </Text>
                  </View>
                  <Text style={styles.scenarioArrow}>{isCurrent ? '🟣' : '›'}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            {/* Simulation Shortcuts */}
            <Text style={styles.sectionHeader}>SIMULATION SHORTCUTS</Text>

            {/* Simulate Dead Zone */}
            <TouchableOpacity
              style={styles.shortcutCard}
              onPress={handleSimulateDeadZone}
              activeOpacity={0.8}
            >
              <Text style={styles.shortcutIcon}>📵</Text>
              <View style={styles.shortcutInfo}>
                <Text style={styles.shortcutTitle}>Simulate Entering Dead Zone</Text>
                <Text style={styles.shortcutSubtitle}>
                  Teleports user position into Dumas Mangrove Cellular Blind Spot
                </Text>
              </View>
            </TouchableOpacity>

            {/* Offline Mode Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchIcon}>{isOffline ? '✈️' : '📶'}</Text>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Airplane / Offline Mode</Text>
                <Text style={styles.switchSubtitle}>
                  Tests offline routing from local cache and SMS fallback
                </Text>
              </View>
              <Switch
                value={isOffline}
                onValueChange={(val) => toggleOfflineMode(val)}
                trackColor={{ false: '#CFD8DC', true: '#81C784' }}
                thumbColor={isOffline ? '#2E7D32' : '#FAFAFA'}
              />
            </View>

            {/* 1-Tap Reset Button */}
            <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
              <Text style={styles.resetIcon}>🔄</Text>
              <Text style={styles.resetText}>Reset Demo Scenario (SVNIT to Adajan)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#212121',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9E9E9E',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  scenarioCardActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#AB47BC',
  },
  scenarioCardInactive: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E0E0E0',
  },
  scenarioInfo: {
    flex: 1,
  },
  scenarioTitle: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  scenarioRoute: {
    fontSize: 11.5,
    color: '#616161',
    marginTop: 2,
  },
  scenarioArrow: {
    fontSize: 14,
    marginLeft: 8,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    marginBottom: 8,
  },
  shortcutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  shortcutInfo: {
    flex: 1,
  },
  shortcutTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#BF360C',
  },
  shortcutSubtitle: {
    fontSize: 11,
    color: '#5D4037',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    marginBottom: 16,
  },
  switchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  switchInfo: {
    flex: 1,
    paddingRight: 8,
  },
  switchTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#263238',
  },
  switchSubtitle: {
    fontSize: 11,
    color: '#546E7A',
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EF5350',
    backgroundColor: '#FFEBEE',
  },
  resetIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  resetText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#C62828',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  closeText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
