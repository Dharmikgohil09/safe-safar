import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  FakeCallScreen,
  initFakeCall,
  registerDefaultChannels,
  registerEmergencyBackground,
} from '../src/features/emergency';

registerEmergencyBackground();
// SOS must always have its channels (SMS, call, backend) ready, whichever screen starts it.
registerDefaultChannels();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void initFakeCall();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        {/* Every screen draws its own SafeSafar header, so the native one is off everywhere. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
        </Stack>
        {/* The fake call can ring on top of any screen. Renders nothing when idle. */}
        <FakeCallScreen />
      </View>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
