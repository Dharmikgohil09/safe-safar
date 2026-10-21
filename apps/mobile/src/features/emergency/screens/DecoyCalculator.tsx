import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { display, EMPTY_CALC, press, pretty } from '../security/calc';
import { submitPin } from '../security/pinFlow';
import type { PinOutcome } from '../security/pinFlow';

// A working calculator. Typing a PIN and pressing "=" checks it, and the calculator shows the
// number back like any other sum, so an onlooker sees nothing unusual either way.

interface Props {
  /** Called only for a real or duress PIN. The parent decides what to show next. */
  onPinResult: (outcome: 'real' | 'duress') => void;
  /** Development only: a small text link to leave the calculator without a PIN. */
  onDevExit?: () => void;
}

type Key = { label: string; key: string; flex?: number; kind?: 'op' | 'fn' | 'num' };

const ROWS: Key[][] = [
  [
    { label: 'C', key: 'C', kind: 'fn' },
    { label: '⌫', key: '⌫', kind: 'fn' },
    { label: '÷', key: '/', kind: 'op' },
    { label: '×', key: '*', kind: 'op' },
  ],
  [
    { label: '7', key: '7' },
    { label: '8', key: '8' },
    { label: '9', key: '9' },
    { label: '−', key: '-', kind: 'op' },
  ],
  [
    { label: '4', key: '4' },
    { label: '5', key: '5' },
    { label: '6', key: '6' },
    { label: '+', key: '+', kind: 'op' },
  ],
  [
    { label: '1', key: '1' },
    { label: '2', key: '2' },
    { label: '3', key: '3' },
    { label: '=', key: '=', kind: 'op' },
  ],
  [
    { label: '0', key: '0', flex: 3 },
    { label: '.', key: '.' },
  ],
];

export function DecoyCalculator({ onPinResult, onDevExit }: Props) {
  const [state, setState] = useState(EMPTY_CALC);

  const onKey = (key: string) => {
    const looksLikePin = key === '=' && state.result === null && /^\d{4,6}$/.test(state.expr);
    const typed = state.expr;
    setState((s) => press(s, key));

    if (looksLikePin) {
      void submitPin(typed).then((outcome: PinOutcome) => {
        if (outcome === 'real' || outcome === 'duress') onPinResult(outcome);
      });
    }
  };

  const main = pretty(display(state));
  const small = state.result !== null ? pretty(state.expr) : '';

  return (
    <View style={styles.screen}>
      <View style={styles.readout}>
        <Text style={styles.small} numberOfLines={1}>
          {small}
        </Text>
        <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
          {main}
        </Text>
      </View>

      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((k) => (
            <Pressable
              key={k.label}
              onPress={() => onKey(k.key)}
              style={({ pressed }) => [
                styles.key,
                { flex: k.flex ?? 1 },
                k.kind === 'op' && styles.opKey,
                k.kind === 'fn' && styles.fnKey,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.keyText}>{k.label}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {onDevExit ? (
        <Pressable onPress={onDevExit} style={styles.devExit}>
          <Text style={styles.devExitText}>dev: back to SOS dev screen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000', padding: 12, justifyContent: 'flex-end', gap: 10 },
  readout: { alignItems: 'flex-end', paddingHorizontal: 8, paddingBottom: 8 },
  small: { color: '#8E8E93', fontSize: 20, minHeight: 26 },
  big: { color: '#FFFFFF', fontSize: 64, fontWeight: '300' },
  row: { flexDirection: 'row', gap: 10 },
  key: {
    height: 72,
    borderRadius: 36,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  opKey: { backgroundColor: '#FF9F0A' },
  fnKey: { backgroundColor: '#A5A5A5' },
  pressed: { opacity: 0.6 },
  keyText: { color: '#FFFFFF', fontSize: 30 },
  devExit: { alignItems: 'center', paddingVertical: 6 },
  devExitText: { color: '#555555', fontSize: 11 },
});
