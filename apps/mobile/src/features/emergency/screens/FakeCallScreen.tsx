import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { registerDefaultChannels } from '../channels/defaults';
import { sosEngine } from '../engine/sosEngine';
import { acceptFakeCall, endFakeCall, fakeCallStore, getFakeCallProfile } from '../services/fakeCall';

/**
 * Looks like a phone call. Renders nothing when there is no call.
 *
 * Secret: LONG-PRESS the caller's name (for about 1.5 s) to start a silent SOS. Nothing on screen
 * changes, so whoever is watching sees an ordinary call. The SOS goes to SMS only, no dialer.
 */
export function FakeCallScreen() {
  const phase = useSyncExternalStore(fakeCallStore.subscribe, fakeCallStore.getSnapshot);
  const [secs, setSecs] = useState(0);
  const { name, number } = getFakeCallProfile();

  useEffect(() => {
    if (phase !== 'ringing') return;
    Vibration.vibrate([0, 800, 1000], true);
    return () => Vibration.cancel();
  }, [phase]);

  useEffect(() => {
    if (phase !== 'incall') return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (phase === 'idle') return null;

  const secretSos = () => {
    registerDefaultChannels();
    sosEngine.trigger('fakecall');
  };

  const mmss = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.status}>{phase === 'ringing' ? 'Incoming call' : mmss}</Text>
        <Pressable onLongPress={secretSos} delayLongPress={1500}>
          <Text style={styles.name}>{name}</Text>
        </Pressable>
        <Text style={styles.number}>{number || 'mobile'}</Text>
      </View>

      {phase === 'ringing' ? (
        <View style={styles.row}>
          <RoundButton color="#E53935" label="Decline" onPress={endFakeCall} />
          <RoundButton color="#2E7D32" label="Accept" onPress={acceptFakeCall} />
        </View>
      ) : (
        <View style={styles.row}>
          <RoundButton color="#E53935" label="End" onPress={endFakeCall} />
        </View>
      )}
    </View>
  );
}

function RoundButton({ color, label, onPress }: { color: string; label: string; onPress: () => void }) {
  return (
    <View style={styles.btnWrap}>
      <Pressable onPress={onPress} style={[styles.btn, { backgroundColor: color }]} />
      <Text style={styles.btnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#101418',
    justifyContent: 'space-between',
    paddingVertical: 96,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  top: { alignItems: 'center', gap: 8 },
  status: { color: '#B0B8C0', fontSize: 16 },
  name: { color: '#FFFFFF', fontSize: 34, fontWeight: '500', paddingHorizontal: 24, paddingVertical: 6 },
  number: { color: '#B0B8C0', fontSize: 16 },
  row: { flexDirection: 'row', gap: 96 },
  btnWrap: { alignItems: 'center', gap: 10 },
  btn: { width: 72, height: 72, borderRadius: 36 },
  btnLabel: { color: '#B0B8C0', fontSize: 14 },
});
