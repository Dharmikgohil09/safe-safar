import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { Card } from '../../../components/ui';
import { colors, radius } from '../../../theme';
import {
  PinPad,
  getContacts,
  hasPins,
  registerDefaultChannels,
  scheduleFakeCall,
  sosEngine,
  useSos,
} from '../../emergency';

registerDefaultChannels();

const HOLD_MS = 3000;
const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS with live location',
  call: 'Calling guardians',
  backend: 'Live tracker & server',
};

function dial(number: string) {
  Linking.openURL(`tel:${number}`).catch(() => {});
}

/** Hold the big button for 3 s. Letting go early cancels, so a stray tap does nothing. */
function HoldSosButton({ onTrigger }: { onTrigger: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const release = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const press = () => {
    Vibration.vibrate(30);
    anim.current = Animated.timing(progress, { toValue: 1, duration: HOLD_MS, useNativeDriver: false });
    anim.current.start();
    timer.current = setTimeout(() => {
      timer.current = null;
      Vibration.vibrate(250);
      progress.setValue(0);
      onTrigger();
    }, HOLD_MS);
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.sosCenterWrapper}>
      <Animated.View style={[styles.sosOuterRing, { transform: [{ scale: ringScale }] }]}>
        <View style={styles.sosMiddleRing}>
          <Pressable
            onPressIn={press}
            onPressOut={release}
            style={styles.sosButton}
            accessibilityRole="button"
            accessibilityLabel="SOS Emergency Button, press and hold for 3 seconds"
          >
            <MaterialIcons name="warning" size={32} color="#FFFFFF" />
            <Text style={styles.sosText}>SOS</Text>
            <Text style={styles.sosHoldText}>Hold for 3 seconds</Text>
          </Pressable>
        </View>
      </Animated.View>
      <View style={styles.holdTrack}>
        <Animated.View style={[styles.holdFill, { width: barWidth }]} />
      </View>
    </View>
  );
}

/** A real slide-to-trigger: drag the thumb to the end. */
function SlideToSos({ onTrigger }: { onTrigger: () => void }) {
  const THUMB = 46;
  const [trackW, setTrackW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const maxRef = useRef(0);
  maxRef.current = Math.max(0, trackW - THUMB - 10);
  const cb = useRef(onTrigger);
  cb.current = onTrigger;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => x.setValue(Math.min(Math.max(0, g.dx), maxRef.current)),
      onPanResponderRelease: (_, g) => {
        if (maxRef.current > 0 && g.dx >= maxRef.current * 0.85) {
          Vibration.vibrate(250);
          cb.current();
        }
        Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: false }).start(),
    }),
  ).current;

  return (
    <View
      style={styles.sliderTrack}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      accessibilityLabel="Slide to trigger SOS"
    >
      <Text style={styles.sliderLabel}>Slide to Trigger SOS</Text>
      <Animated.View style={[styles.sliderThumb, { transform: [{ translateX: x }] }]} {...pan.panHandlers}>
        <MaterialIcons name="double-arrow" size={22} color="#FFFFFF" />
      </Animated.View>
    </View>
  );
}

export default function SosScreen() {
  const snap = useSos();
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [pinsSet, setPinsSet] = useState(false);
  const [showPad, setShowPad] = useState(false);
  const [fakeResolved, setFakeResolved] = useState(false); // duress PIN: looks resolved, SOS keeps going
  const [dismissedResolved, setDismissedResolved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getContacts().then((c) => setContactCount(c.length));
      void hasPins().then(setPinsSet);
    }, []),
  );

  useEffect(() => {
    if (snap.state === 'idle' || snap.state === 'resolved') setFakeResolved(false);
    if (snap.state === 'countdown' || snap.state === 'active') setDismissedResolved(false);
  }, [snap.state]);

  const start = () => sosEngine.trigger('button');
  const imSafe = () => {
    if (pinsSet) setShowPad(true);
    else void sosEngine.resolve();
  };

  if (showPad) {
    return (
      <PinPad
        onResult={(outcome) => {
          setFakeResolved(outcome === 'duress');
          setShowPad(false);
        }}
        onCancel={() => setShowPad(false)}
      />
    );
  }

  const showResolved = fakeResolved || (snap.state === 'resolved' && !dismissedResolved);
  const view: 'idle' | 'countdown' | 'active' | 'resolved' = showResolved
    ? 'resolved'
    : snap.state === 'resolved'
      ? 'idle'
      : snap.state;

  const subtitles = {
    idle: 'Help is one hold away',
    countdown: 'Sending in a moment',
    active: 'Alert is live',
    resolved: 'You are marked safe',
  };
  const channelNames = Object.keys(snap.timings);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Emergency SOS</Text>
          <Text style={styles.headerSubtitle}>{subtitles[view]}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/safety-toolkit' as any)}
          style={styles.toolkitButton}
          accessibilityRole="button"
          accessibilityLabel="Open safety toolkit"
        >
          <MaterialIcons name="tune" size={20} color="#FFFFFF" />
          <Text style={styles.toolkitText}>Toolkit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* ---------- IDLE ---------- */}
        {view === 'idle' && (
          <>
            {contactCount === 0 ? (
              <TouchableOpacity
                style={styles.warnBanner}
                onPress={() => router.push('/contacts')}
                accessibilityRole="button"
              >
                <MaterialIcons name="error-outline" size={20} color="#92400E" />
                <Text style={styles.warnText}>
                  No guardians yet. Add at least one so SOS has someone to alert.
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#92400E" />
              </TouchableOpacity>
            ) : (
              <View style={styles.noticeContainer}>
                <MaterialIcons name="security" size={18} color={colors.accent} />
                <Text style={styles.noticeText}>
                  {contactCount === null
                    ? 'Checking guardians…'
                    : `${contactCount} guardian${contactCount === 1 ? '' : 's'} on standby`}
                </Text>
              </View>
            )}

            <HoldSosButton onTrigger={start} />
            <SlideToSos onTrigger={start} />

            <Card style={styles.infoCard} disableEntranceAnimation>
              <Text style={styles.infoTitle}>What happens next</Text>
              <View style={styles.infoList}>
                <InfoRow icon="timer" text="A 5-second countdown starts. You can cancel if it was a mistake." />
                <InfoRow icon="sms" text="Your guardians get an SMS with your live location link." />
                <InfoRow icon="phone-in-talk" text="Guardians are called one after another until someone picks up." />
                <InfoRow icon="my-location" text="Your location keeps updating every 10 seconds until you end it." />
              </View>
            </Card>

            <View style={styles.quickRow}>
              <QuickAction icon="call" label="Fake call" onPress={() => void scheduleFakeCall(0)} />
              <QuickAction icon="share-location" label="Share location" onPress={() => router.push('/live-location')} />
              <QuickAction icon="group" label="Guardians" onPress={() => router.push('/contacts')} />
            </View>

            <View style={styles.helplinesRow}>
              <TouchableOpacity
                style={styles.helplineButton}
                onPress={() => dial('112')}
                accessibilityRole="button"
                accessibilityLabel="Call National Emergency 112"
              >
                <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                <Text style={styles.helplineText}>Dial 112 (Emergency)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.helplineButton}
                onPress={() => dial('1091')}
                accessibilityRole="button"
                accessibilityLabel="Call Women Helpline 1091"
              >
                <MaterialIcons name="phone" size={16} color="#FFFFFF" />
                <Text style={styles.helplineText}>Dial 1091 (Women Help)</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ---------- COUNTDOWN ---------- */}
        {view === 'countdown' && (
          <View style={styles.stateWrap}>
            <View style={[styles.bigCircle, { backgroundColor: '#B45309' }]}>
              <Text style={styles.bigNumber}>{snap.secondsLeft ?? ''}</Text>
            </View>
            <Text style={styles.stateTitle}>Sending SOS…</Text>
            <Text style={styles.stateSub}>Your guardians will be alerted when this reaches zero.</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => sosEngine.cancelCountdown()}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancel, I'm okay</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- ACTIVE ---------- */}
        {view === 'active' && (
          <View style={styles.stateWrap}>
            <View style={[styles.bigCircle, { backgroundColor: colors.danger }]}>
              <MaterialIcons name="warning" size={56} color="#FFFFFF" />
            </View>
            <Text style={styles.stateTitle}>SOS is active</Text>
            <Text style={styles.stateSub}>Stay calm. Your guardians are being alerted.</Text>

            <Card style={styles.infoCard} disableEntranceAnimation>
              <Text style={styles.infoTitle}>Alert status</Text>
              {channelNames.length === 0 ? (
                <Text style={styles.statusLine}>Getting your location…</Text>
              ) : (
                channelNames.map((n) => {
                  const t = snap.timings[n];
                  const ok = typeof t === 'number';
                  return (
                    <View key={n} style={styles.statusRow}>
                      <MaterialIcons name={ok ? 'check-circle' : 'error'} size={18} color={ok ? '#4ADE80' : '#F87171'} />
                      <Text style={styles.statusLine}>
                        {CHANNEL_LABELS[n] ?? n}
                        {ok ? ` · sent in ${(t / 1000).toFixed(1)}s` : ' · failed'}
                      </Text>
                    </View>
                  );
                })
              )}
              {snap.coords && (
                <Text style={styles.coordsLine}>
                  Location: {snap.coords.lat.toFixed(4)}, {snap.coords.lng.toFixed(4)}
                </Text>
              )}
            </Card>

            <TouchableOpacity style={styles.safeButton} onPress={imSafe} accessibilityRole="button">
              <MaterialIcons name="verified-user" size={20} color="#FFFFFF" />
              <Text style={styles.safeText}>{pinsSet ? "I'm safe (enter PIN)" : "I'm safe"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.helplineButtonWide} onPress={() => dial('112')}>
              <MaterialIcons name="phone" size={16} color="#FFFFFF" />
              <Text style={styles.helplineText}>Dial 112</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ---------- RESOLVED ---------- */}
        {view === 'resolved' && (
          <View style={styles.stateWrap}>
            <View style={[styles.bigCircle, { backgroundColor: colors.safe }]}>
              <MaterialIcons name="check" size={64} color="#FFFFFF" />
            </View>
            <Text style={styles.stateTitle}>You're marked safe</Text>
            <Text style={styles.stateSub}>Your guardians have been told you're okay.</Text>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setDismissedResolved(true);
                setFakeResolved(false);
              }}
            >
              <Text style={styles.cancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof MaterialIcons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconCircle}>
        <MaterialIcons name={icon} size={16} color={colors.danger} />
      </View>
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <MaterialIcons name={icon} size={22} color={colors.accent} />
      <Text style={styles.quickText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.primaryDark },
  header: {
    backgroundColor: colors.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitleGroup: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  toolkitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  toolkitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, alignItems: 'center' },

  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: 16,
  },
  noticeText: { fontSize: 12, fontWeight: '600', color: '#FDE68A' },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: radius.card,
    marginBottom: 16,
  },
  warnText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400E' },

  sosCenterWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  sosOuterRing: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(200, 63, 67, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosMiddleRing: {
    width: 195,
    height: 195,
    borderRadius: 97.5,
    backgroundColor: 'rgba(200, 63, 67, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  sosText: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: 2, marginTop: 2 },
  sosHoldText: { fontSize: 11, fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)', marginTop: 4 },
  holdTrack: {
    width: 160,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 12,
    overflow: 'hidden',
  },
  holdFill: { height: 5, backgroundColor: colors.danger },

  sliderTrack: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 28,
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sliderThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  sliderLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(51, 65, 85, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  infoList: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(200, 63, 67, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  infoRowText: { flex: 1, fontSize: 12, color: '#E2E8F0', lineHeight: 18 },

  quickRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 12 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.card,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  helplinesRow: { flexDirection: 'row', gap: 10, width: '100%' },
  helplineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.card,
  },
  helplineButtonWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radius.card,
    marginTop: 12,
  },
  helplineText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  stateWrap: { width: '100%', alignItems: 'center', paddingTop: 24 },
  bigCircle: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center' },
  bigNumber: { fontSize: 72, fontWeight: '900', color: '#FFFFFF' },
  stateTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 20 },
  stateSub: { fontSize: 13, color: '#CBD5E1', marginTop: 6, marginBottom: 20, textAlign: 'center' },
  cancelButton: {
    width: '100%',
    height: 52,
    borderRadius: radius.card,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  safeButton: {
    width: '100%',
    height: 52,
    borderRadius: radius.card,
    backgroundColor: colors.safe,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusLine: { fontSize: 13, color: '#E2E8F0' },
  coordsLine: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
});
