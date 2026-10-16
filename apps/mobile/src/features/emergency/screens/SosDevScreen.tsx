import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import {
  getContacts,
  registerDefaultChannels,
  requestEmergencyPermissions,
  sendTestSms,
  setContacts,
  setUserName,
  sosEngine,
} from '../index';

// Temporary test screen for Days 1-4, so the SOS engine can be tried on a phone
// without waiting for the real UI. Remove or hide it before the final demo.
// Colours are set explicitly so it is readable in both light and dark mode.

registerDefaultChannels();

const BG = '#0B0B10';
const CARD = '#1A1A24';
const TEXT = '#FFFFFF';
const MUTED = '#9A9AAE';

function Btn({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Vibration.vibrate(40); // so you can feel that the tap registered
        onPress();
      }}
      style={({ pressed }) => [styles.btn, danger && styles.danger, pressed && styles.pressed]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export default function SosDevScreen() {
  const snap = useSyncExternalStore(sosEngine.subscribe, sosEngine.getSnapshot);
  const [phones, setPhones] = useState('');
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [, force] = useState(0);

  const note = useCallback((msg: string) => {
    setLog((l) => [`${stamp()}  ${msg}`, ...l].slice(0, 10));
  }, []);

  const refreshSaved = useCallback(async () => {
    const list = await getContacts();
    setSaved(list.map((c) => c.phone));
  }, []);

  useEffect(() => {
    void refreshSaved();
  }, [refreshSaved]);

  // re-render during the countdown so the seconds tick down
  useEffect(() => {
    if (snap.state !== 'countdown') return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [snap.state]);

  // log every state change, so you can see what the engine did
  useEffect(() => {
    note(`state -> ${snap.state}${snap.source ? ` (${snap.source})` : ''}`);
  }, [snap.state, snap.source, note]);

  const secondsLeft =
    snap.state === 'countdown' && snap.countdownEndsAt
      ? Math.max(0, Math.ceil((snap.countdownEndsAt - Date.now()) / 1000))
      : null;

  const banner = {
    idle: { bg: '#2A2A38', title: 'IDLE', sub: 'Ready. Nothing is being sent.' },
    countdown: {
      bg: '#B26A00',
      title: `COUNTDOWN ${secondsLeft ?? ''}`,
      sub: 'Tap "Cancel countdown" to stop.',
    },
    active: { bg: '#C62828', title: 'SOS ACTIVE', sub: 'Alerts are going out.' },
    resolved: { bg: '#2E7D32', title: 'RESOLVED', sub: 'All-clear sent.' },
  }[snap.state];

  const save = async () => {
    const list = phones
      .split(',')
      .map((p, i) => ({ id: String(i + 1), name: `Contact ${i + 1}`, phone: p }))
      .filter((c) => c.phone.trim().length > 0);
    const stored = await setContacts(list);
    if (name.trim()) await setUserName(name);
    await refreshSaved();
    note(`saved ${stored.length} contact(s)`);
    Alert.alert('Saved', `${stored.length} valid contact(s) stored`);
  };

  const permissions = async () => {
    const res = await requestEmergencyPermissions();
    note(`permissions ${JSON.stringify(res)}`);
    Alert.alert('Permissions', JSON.stringify(res, null, 2));
  };

  const testSms = async () => {
    try {
      const contacts = await getContacts();
      note(`sending test SMS to ${contacts.length} contact(s)...`);
      await sendTestSms(contacts);
      note('test SMS: OK (the phone confirmed it was sent)');
    } catch (e) {
      note(`test SMS FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const channelNames = Object.keys(snap.timings);

  return (
    <ScrollView
      style={{ backgroundColor: BG }}
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.h1}>SOS dev screen</Text>

      <View style={[styles.banner, { backgroundColor: banner.bg }]}>
        <Text style={styles.bannerTitle}>{banner.title}</Text>
        <Text style={styles.bannerSub}>{banner.sub}</Text>
      </View>

      <Btn label="1. Grant permissions" onPress={permissions} />

      <Text style={styles.label}>Your name (used in the SMS)</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Kristal"
        placeholderTextColor={MUTED}
      />
      <Text style={styles.label}>Contact numbers, comma separated</Text>
      <TextInput
        style={styles.input}
        value={phones}
        onChangeText={setPhones}
        placeholder="9876543210, +919812345678"
        placeholderTextColor={MUTED}
        keyboardType="phone-pad"
      />
      <Btn label="2. Save contacts" onPress={save} />
      <Text style={styles.muted}>
        Saved: {saved.length === 0 ? 'none yet' : saved.join(', ')}
      </Text>

      <View style={styles.sep} />

      <Btn label="Send one test SMS (no SOS)" onPress={testSms} />
      <Btn label="Trigger SOS (5 s countdown, SMS + call)" danger onPress={() => sosEngine.trigger('button')} />
      <Btn label="Cancel countdown" onPress={() => sosEngine.cancelCountdown()} />
      <Btn
        label="Trigger silent SOS (no countdown, SMS only)"
        danger
        onPress={() => sosEngine.trigger('duress')}
      />
      <Btn label="I'm safe (resolve + all-clear SMS)" onPress={() => void sosEngine.resolve()} />

      <View style={styles.sep} />

      <Text style={styles.label}>Channel results</Text>
      <View style={styles.card}>
        {channelNames.length === 0 ? (
          <Text style={styles.muted}>nothing sent yet</Text>
        ) : (
          channelNames.map((n) => {
            const t = snap.timings[n];
            const ok = typeof t === 'number';
            return (
              <Text key={n} style={[styles.result, { color: ok ? '#66E08A' : '#FF6B6B' }]}>
                {n}: {ok ? `sent OK in ${t} ms` : `FAILED - ${snap.errors[n] ?? 'unknown error'}`}
              </Text>
            );
          })
        )}
      </View>

      <Text style={styles.label}>Location</Text>
      <View style={styles.card}>
        <Text style={styles.mono}>
          {snap.coords
            ? `${snap.coords.lat.toFixed(5)}, ${snap.coords.lng.toFixed(5)}  (±${Math.round(snap.coords.accuracy ?? 0)} m)`
            : 'none yet'}
        </Text>
      </View>

      <Text style={styles.label}>Log (newest first)</Text>
      <View style={styles.card}>
        {log.map((l, i) => (
          <Text key={`${i}-${l}`} style={styles.mono}>
            {l}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 10, paddingBottom: 60 },
  h1: { fontSize: 22, fontWeight: '700', color: TEXT },
  banner: { borderRadius: 12, padding: 14 },
  bannerTitle: { color: TEXT, fontSize: 20, fontWeight: '800' },
  bannerSub: { color: '#FFFFFFCC', fontSize: 13, marginTop: 2 },
  label: { fontSize: 13, color: MUTED, marginTop: 6 },
  muted: { fontSize: 13, color: MUTED },
  input: {
    borderWidth: 1,
    borderColor: '#55556A',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: TEXT,
    backgroundColor: CARD,
  },
  btn: { backgroundColor: '#5B2D8E', padding: 14, borderRadius: 10, alignItems: 'center' },
  danger: { backgroundColor: '#C62828' },
  pressed: { opacity: 0.55 },
  btnText: { color: TEXT, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  sep: { height: 1, backgroundColor: '#33334A', marginVertical: 8 },
  card: { backgroundColor: CARD, borderRadius: 10, padding: 12, gap: 4 },
  result: { fontSize: 14, fontWeight: '600' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: TEXT },
});