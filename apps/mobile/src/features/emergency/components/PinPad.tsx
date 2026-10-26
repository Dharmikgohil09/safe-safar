import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { getPinLockoutRemainingMs, submitPin } from '../security/pinFlow';

interface Props {
  title?: string;
  /**
   * Called for a real or a duress PIN. The two must look the same on screen: the parent shows
   * "all safe" for both. Only the real PIN truly ends the SOS.
   */
  onResult: (outcome: 'real' | 'duress') => void;
  onCancel: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'];

/** The PIN prompt for ending an SOS. 4 to 6 digits, then OK. */
export function PinPad({ title = 'Enter your PIN to end the alert', onResult, onCancel }: Props) {
  const [digits, setDigits] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, tick] = useState(0);

  // while locked, count the seconds down
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const t = setInterval(() => {
      tick((n) => n + 1);
      if (Date.now() >= lockedUntil) {
        clearInterval(t);
        setMessage('');
      }
    }, 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const secsLeft = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
  const locked = secsLeft > 0;

  const lockFor = (ms: number) => setLockedUntil(Date.now() + ms);

  const submit = async () => {
    if (busy || locked || digits.length < 4) return;
    setBusy(true);
    try {
      const outcome = await submitPin(digits);
      if (outcome === 'real' || outcome === 'duress') {
        onResult(outcome);
        return;
      }
      Vibration.vibrate(250);
      setDigits('');
      if (outcome === 'not-set') {
        setMessage('No PIN is set yet.');
      } else if (outcome === 'locked') {
        const ms = await getPinLockoutRemainingMs();
        lockFor(ms);
        setMessage('Too many tries.');
      } else {
        const ms = await getPinLockoutRemainingMs();
        if (ms > 0) {
          lockFor(ms);
          setMessage('Wrong PIN. Too many tries.');
        } else {
          setMessage('Wrong PIN.');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const onKey = (k: string) => {
    if (locked) return;
    if (k === '⌫') {
      setDigits((d) => d.slice(0, -1));
    } else if (k === 'OK') {
      void submit();
    } else {
      setMessage('');
      setDigits((d) => (d.length < 6 ? d + k : d));
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.dots}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[styles.dot, i < digits.length && styles.dotOn]} />
        ))}
      </View>

      <Text style={styles.message}>
        {locked ? `${message} Try again in ${secsLeft}s.` : message || ' '}
      </Text>

      <View style={styles.grid}>
        {KEYS.map((k) => (
          <Pressable
            key={k}
            disabled={locked || busy}
            onPress={() => onKey(k)}
            style={({ pressed }) => [
              styles.key,
              k === 'OK' && styles.okKey,
              (locked || busy) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.keyText}>{k}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B10', padding: 24, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#8A8AA0' },
  dotOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  message: { color: '#FF8A80', fontSize: 14, minHeight: 20, marginBottom: 16, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 264, gap: 12, justifyContent: 'center' },
  key: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#242433',
    alignItems: 'center',
    justifyContent: 'center',
  },
  okKey: { backgroundColor: '#5B2D8E' },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  keyText: { color: '#FFFFFF', fontSize: 26, fontWeight: '500' },
  cancel: { marginTop: 28, padding: 10 },
  cancelText: { color: '#9A9AAE', fontSize: 16 },
});
