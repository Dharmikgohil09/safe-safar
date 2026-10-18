import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';

interface Props {
  label?: string;
  /** How long the finger must stay down before onTrigger fires. */
  holdMs?: number;
  onTrigger: () => void;
}

/**
 * Press and hold to fire. Letting go early cancels, so a stray tap does nothing.
 * A fill bar shows the progress and the phone vibrates when it fires.
 */
export function HoldToTriggerButton({
  label = 'HOLD 3 SECONDS FOR SOS',
  holdMs = 3000,
  onTrigger,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  }, [progress]);

  const press = () => {
    Vibration.vibrate(30); // a tick, so you can feel the press registered
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.current.start();
    timer.current = setTimeout(() => {
      timer.current = null;
      Vibration.vibrate(250);
      progress.setValue(0);
      onTrigger();
    }, holdMs);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable onPressIn={press} onPressOut={release} style={styles.wrap}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 10, overflow: 'hidden' },
  track: {
    backgroundColor: '#7A1B1B',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#E53935' },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
