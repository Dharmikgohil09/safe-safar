import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useMapState } from '../context/MapContext';
import { Landmark } from '../types';
import { getLandmarkColor } from '../models/Landmark';

interface NearestSafeModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NearestSafeModal: React.FC<NearestSafeModalProps> = ({ visible, onClose }) => {
  const { getNearestSafePlace, calculateRoutes } = useMapState();

  const nearestPolice = getNearestSafePlace({ filterType: 'police' });
  const nearestHospital = getNearestSafePlace({ filterType: 'hospital' });
  const nearestPharmacy = getNearestSafePlace({ filterType: 'pharmacy' });

  const renderCard = (landmark: Landmark, distance: string) => {
    const color = getLandmarkColor(landmark.type);
    let icon = '🏛️';
    if (landmark.type === 'police') icon = '👮';
    if (landmark.type === 'hospital') icon = '🏥';
    if (landmark.type === 'pharmacy') icon = '💊';

    return (
      <View key={landmark.id} style={[styles.card, { borderColor: color + '55' }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
          <Text style={styles.cardIcon}>{icon}</Text>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {landmark.name}
            </Text>
            <View style={styles.distTag}>
              <Text style={styles.distText}>{distance}</Text>
            </View>
          </View>

          <Text style={styles.cardAddress} numberOfLines={1}>
            {landmark.address}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: color }]}
              onPress={() => {
                calculateRoutes(landmark.coordinates, landmark.name);
                onClose();
              }}
            >
              <Text style={styles.navText}>Navigate Here</Text>
            </TouchableOpacity>

            {landmark.phone ? (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  Alert.alert('Emergency Call', `Calling ${landmark.name} (${landmark.phone})...`);
                }}
              >
                <Text style={styles.callIcon}>📞</Text>
                <Text style={styles.callText}>{landmark.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            <View style={styles.header}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerIcon}>🛡️</Text>
              </View>
              <View style={styles.headerTitles}>
                <Text style={styles.title}>NEAREST SAFE HAVENS</Text>
                <Text style={styles.subtitle}>
                  Instant emergency route to verified guarded facilities
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {nearestPolice && renderCard(nearestPolice.landmark, nearestPolice.formattedDistance)}
            {nearestHospital && renderCard(nearestHospital.landmark, nearestHospital.formattedDistance)}
            {nearestPharmacy && renderCard(nearestPharmacy.landmark, nearestPharmacy.formattedDistance)}

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
    maxHeight: '80%',
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
    backgroundColor: '#E3F2FD',
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
    fontSize: 16,
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
  card: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardDetails: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 13.5,
    color: '#212121',
    flex: 1,
    marginRight: 8,
  },
  distTag: {
    backgroundColor: '#212121',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardAddress: {
    color: '#616161',
    fontSize: 11.5,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BDBDBD',
  },
  callIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  callText: {
    color: '#424242',
    fontSize: 11,
    fontWeight: '600',
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
