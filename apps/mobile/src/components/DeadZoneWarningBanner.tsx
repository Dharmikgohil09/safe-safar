import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeadZoneAlert } from '../types';

interface DeadZoneWarningBannerProps {
  alert: DeadZoneAlert;
}

export const DeadZoneWarningBanner: React.FC<DeadZoneWarningBannerProps> = ({ alert }) => {
  if (!alert.hasWarning) {
    return null;
  }

  const isInside = alert.state === 'inside';
  const primaryColor = isInside ? '#D32F2F' : '#E65100';
  const bgColor = isInside ? '#FFEBEE' : '#FFF3E0';

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor: primaryColor }]}>
      <View style={[styles.iconCircle, { backgroundColor: primaryColor }]}>
        <Text style={styles.iconText}>{isInside ? '📵' : '📶'}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: primaryColor }]}>
            {isInside ? 'CELLULAR DEAD ZONE' : 'DEAD ZONE APPROACHING'}
          </Text>
          <View style={styles.offlineTag}>
            <Text style={styles.offlineText}>OFFLINE ACTIVE</Text>
          </View>
        </View>

        <Text style={styles.message}>{alert.bannerMessage}</Text>

        <View style={styles.footerRow}>
          <Text style={styles.footerCheck}>✓</Text>
          <Text style={styles.footerText}>Route cached offline • SMS SOS ready</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 14,
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  offlineTag: {
    backgroundColor: '#212121',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  message: {
    color: '#212121',
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  footerCheck: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
  footerText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
