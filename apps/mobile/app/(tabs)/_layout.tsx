import React from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { colors } from '../../src/theme';
import { MapProvider } from '../../src/context/MapContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <MapProvider>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          overflow: 'visible',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Safe Route',
          tabBarIcon: ({ color }) => <MaterialIcons name="alt-route" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.sosRed,
          },
          tabBarIcon: () => (
            <View style={styles.sosCircle}>
              <MaterialIcons name="warning" size={26} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="guardians"
        options={{
          title: 'Guardians',
          tabBarIcon: ({ color }) => <MaterialIcons name="group" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
    </MapProvider>
  );
}

const styles = StyleSheet.create({
  sosCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    elevation: 4,
    shadowColor: colors.sosRed,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
});
