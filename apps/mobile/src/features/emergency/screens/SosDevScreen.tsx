import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { registerDefaultChannels, requestEmergencyPermissions, setContacts, setUserName, sosEngine } from '../index';

// Temporary test screen for Days 1-4, so the SOS engine can be tried on a phone
// without waiting for the real UI. Remove or hide it before the final demo.

registerDefaultChannels();

function Btn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, danger && styles.danger]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function SosDevScreen() {
  const snap = useSyncExternalStore(sosEngine.subscribe, sosEngine.getSnapshot);
  const [phones, setPhones] = useState('');
  const [name, setName] = useState('');
  const [, force] = useState(0);

  // re-render during the countdown so the seconds tick down
  useEffect(() => {
    if (snap.state !== 'countdown') return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [snap.state]);

  const secondsLeft =
    snap.state === 'countdown' && snap.countdownEndsAt
      ? Math.max(0, Math.ceil((snap.countdownEndsAt - Date.now()) / 1000))
      : null;

  const save = async () => {
    const list = phones
      .split(',')
      .map((p, i) => ({ id: String(i + 1), name: `Contact ${i + 1}`, phone: p }))
      .filter((c) => c.phone.trim().length > 0);
    const saved = await setContacts(list);
    if (name.trim()) await setUserName(name);
    Alert.alert('Saved', `${saved.length} valid contact(s) stored`);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.h1}>SOS dev screen</Text>
      <Text style={styles.state}>
        State: {snap.state}
        {secondsLeft !== null ? ` (${secondsLeft}s)` : ''}
        {snap.source ? `  source: ${snap.source}` : ''}
      </Text>

      <Btn
        label="Grant permissions"
        onPress={async () => Alert.alert('Permissions', JSON.stringify(await requestEmergencyPermissions(), null, 2))}
      />

      <Text style={styles.label}>Your name (used in the SMS)</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Kristal" />
      <Text style={styles.label}>Contact numbers, comma separated</Text>
      <TextInput
        style={styles.input}
        value={phones}
        onChangeText={setPhones}
        placeholder="9876543210, +919812345678"
        keyboardType="phone-pad"
      />
      <Btn label="Save contacts" onPress={save} />

      <View style={styles.sep} />

      <Btn label="Trigger SOS (5 s countdown)" danger onPress={() => sosEngine.trigger('button')} />
      <Btn label="Cancel countdown" onPress={() => sosEngine.cancelCountdown()} />
      <Btn label="Trigger silent SOS (no countdown, no call)" danger onPress={() => sosEngine.trigger('duress')} />
      <Btn label="I'm safe (resolve + all-clear SMS)" onPress={() => void sosEngine.resolve()} />

      <View style={styles.sep} />
      <Text style={styles.label}>Channel timings (ms from trigger)</Text>
      <Text style={styles.mono}>{JSON.stringify(snap.timings, null, 2)}</Text>
      <Text style={styles.label}>Location</Text>
      <Text style={styles.mono}>{snap.coords ? JSON.stringify(snap.coords) : 'none yet'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10 },
  h1: { fontSize: 22, fontWeight: '700' },
  state: { fontSize: 16, marginBottom: 6 },
  label: { fontSize: 13, color: '#555', marginTop: 6 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 10, fontSize: 16 },
  btn: { backgroundColor: '#5B2D8E', padding: 14, borderRadius: 10, alignItems: 'center' },
  danger: { backgroundColor: '#C62828' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sep: { height: 1, backgroundColor: '#ddd', marginVertical: 8 },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});
