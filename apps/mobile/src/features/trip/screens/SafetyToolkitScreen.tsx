import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { Card, PrimaryButton } from '../../../components/ui';
import { colors, radius } from '../../../theme';
import {
  DecoyCalculator,
  ensureFakeCallPermissions,
  getContacts,
  getFakeCallProfile,
  getLastHeard,
  getVoiceError,
  hasPins,
  initVoiceTrigger,
  isFakeCallNotificationAvailable,
  isShakeTriggerEnabled,
  isVoiceTriggerAvailable,
  openExactAlarmSettings,
  requestEmergencyPermissions,
  scheduleFakeCall,
  sendTestSms,
  setFakeCallProfile,
  setPins,
  setShakeTriggerEnabled,
  setVoiceSensitivity,
  startVoiceTrigger,
  stopVoiceTrigger,
  voiceStore,
} from '../../emergency';

function SectionTitle({ icon, title, subtitle }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionIcon}>
        <MaterialIcons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function SmallButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <TouchableOpacity style={styles.smallBtn} onPress={onPress} accessibilityRole="button">
      {icon ? <MaterialIcons name={icon} size={18} color={colors.primary} /> : null}
      <Text style={styles.smallBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SafetyToolkitScreen() {
  const [contactCount, setContactCount] = useState(0);
  const [pinsSet, setPinsSet] = useState(false);
  const [shakeOn, setShakeOn] = useState(isShakeTriggerEnabled());
  const [permsDone, setPermsDone] = useState(false);
  const [realPin, setRealPin] = useState('');
  const [duressPin, setDuressPin] = useState('');
  const [fakeName, setFakeName] = useState(getFakeCallProfile().name);
  const [fakeNumber, setFakeNumber] = useState(getFakeCallProfile().number);
  const [twice, setTwice] = useState(true);
  const [showDecoy, setShowDecoy] = useState(false);

  const voice = useSyncExternalStore(voiceStore.subscribe, voiceStore.getSnapshot);

  useFocusEffect(
    useCallback(() => {
      void getContacts().then((c) => setContactCount(c.length));
      void hasPins().then(setPinsSet);
    }, []),
  );

  useEffect(() => {
    void initVoiceTrigger();
  }, []);

  const grantPermissions = async () => {
    const res = await requestEmergencyPermissions();
    const all = Object.values(res).every(Boolean);
    setPermsDone(all);
    Alert.alert(
      all ? 'All set' : 'Some permissions are missing',
      all
        ? 'SOS can send SMS, call, and read your location.'
        : 'SOS works best with every permission allowed. You can change this in your phone settings.',
    );
  };

  const toggleVoice = async (on: boolean) => {
    if (!on) return stopVoiceTrigger();
    const r = await startVoiceTrigger();
    if (!r.ok) Alert.alert('Voice trigger', r.reason ?? 'Could not start listening.');
  };

  const toggleShake = (on: boolean) => {
    setShakeTriggerEnabled(on);
    setShakeOn(on);
  };

  const ring = async (sec: number) => {
    const perm = await ensureFakeCallPermissions();
    if (sec > 0 && isFakeCallNotificationAvailable() && !perm.exactAlarm) {
      Alert.alert('One more step', 'Allow exact alarms on the next screen, then try again.');
      await openExactAlarmSettings();
      return;
    }
    await setFakeCallProfile({ name: fakeName, number: fakeNumber });
    await scheduleFakeCall(sec);
    if (sec > 0) Alert.alert('Fake call scheduled', `It will ring in ${sec} seconds. You can lock your phone.`);
  };

  const savePins = async () => {
    const res = await setPins(realPin, duressPin);
    if (res.ok) {
      setPinsSet(true);
      setRealPin('');
      setDuressPin('');
      Alert.alert('PINs saved', 'Your real PIN and duress PIN are stored securely on this phone.');
    } else {
      Alert.alert('PINs not saved', res.error);
    }
  };

  const testSms = async () => {
    try {
      const contacts = await getContacts();
      if (contacts.length === 0) {
        Alert.alert('No guardians', 'Add a trusted contact first.');
        return;
      }
      await sendTestSms(contacts);
      Alert.alert('Test SMS sent', `Sent to ${contacts.length} guardian${contacts.length === 1 ? '' : 's'}. No SOS was started.`);
    } catch (e) {
      Alert.alert('Test SMS failed', e instanceof Error ? e.message : String(e));
    }
  };

  if (showDecoy) {
    return (
      <View style={{ flex: 1 }}>
        <DecoyCalculator onPinResult={() => setShowDecoy(false)} onDevExit={() => setShowDecoy(false)} />
      </View>
    );
  }

  const ready = [contactCount > 0, pinsSet, shakeOn || voice === 'listening'];
  const readyCount = ready.filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Safety Toolkit</Text>
          <Text style={styles.headerSubtitle}>Ways to get help, quietly or loudly</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Readiness */}
        <Card style={styles.readyCard} disableEntranceAnimation>
          <View style={styles.readyTop}>
            <Text style={styles.readyTitle}>Readiness {readyCount}/3</Text>
            <MaterialIcons
              name={readyCount === 3 ? 'verified-user' : 'shield'}
              size={22}
              color={readyCount === 3 ? '#4ADE80' : colors.accent}
            />
          </View>
          <ReadyLine ok={contactCount > 0} text={contactCount > 0 ? `${contactCount} guardian${contactCount === 1 ? '' : 's'} added` : 'Add a guardian'} onPress={() => router.push('/contacts')} />
          <ReadyLine ok={pinsSet} text={pinsSet ? 'Safety PINs set' : 'Set your safety PINs'} />
          <ReadyLine ok={shakeOn || voice === 'listening'} text={shakeOn || voice === 'listening' ? 'Hands-free trigger is on' : 'Turn on a hands-free trigger'} />
        </Card>

        {/* Permissions */}
        <Card style={styles.card} disableEntranceAnimation>
          <SectionTitle icon="verified-user" title="Permissions" subtitle="SOS needs SMS, calls and location to work." />
          <PrimaryButton
            variant={permsDone ? 'primary' : 'accent'}
            label={permsDone ? 'Permissions granted' : 'Grant permissions'}
            onPress={grantPermissions}
            style={styles.fullBtn}
          />
          <SmallButton label="Send one test SMS (no SOS)" icon="sms" onPress={testSms} />
        </Card>

        {/* Hands-free triggers */}
        <Card style={styles.card} disableEntranceAnimation>
          <SectionTitle icon="touch-app" title="Hands-free triggers" subtitle="Start SOS without touching the screen." />
          <ToggleRow
            label="Shake to SOS"
            hint="Three hard shakes start the 5-second countdown. Works while the app is open."
            value={shakeOn}
            onChange={toggleShake}
          />
          <View style={styles.sep} />
          <ToggleRow
            label={'Voice trigger: "help me"'}
            hint={
              !isVoiceTriggerAvailable()
                ? 'Needs the full app build (not available in Expo Go).'
                : voice === 'listening'
                  ? `Listening. Last heard: ${getLastHeard() || 'nothing yet'}`
                  : voice === 'starting'
                    ? 'Starting…'
                    : voice === 'error'
                      ? `Error: ${getVoiceError()}`
                      : 'Keeps listening even with the screen off.'
            }
            value={voice === 'listening' || voice === 'starting'}
            onChange={(v) => void toggleVoice(v)}
            disabled={!isVoiceTriggerAvailable()}
          />
          {isVoiceTriggerAvailable() && (
            <SmallButton
              label={twice ? 'Say it twice (fewer false alarms)' : 'Say it once (more sensitive)'}
              icon="tune"
              onPress={() => {
                setVoiceSensitivity(twice ? 1 : 2);
                setTwice(!twice);
              }}
            />
          )}
        </Card>

        {/* Fake call */}
        <Card style={styles.card} disableEntranceAnimation>
          <SectionTitle
            icon="phone-in-talk"
            title="Fake call"
            subtitle="Get out of an uncomfortable situation. Long-press the caller's name during the call to silently send an SOS."
          />
          <Text style={styles.label}>Caller name</Text>
          <TextInput
            style={styles.input}
            value={fakeName}
            onChangeText={setFakeName}
            placeholder="Mom"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.label}>Caller number</Text>
          <TextInput
            style={styles.input}
            value={fakeNumber}
            onChangeText={setFakeNumber}
            placeholder="+91 98765 43210"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
          <View style={styles.btnRow}>
            <SmallButton label="Ring now" icon="call" onPress={() => void ring(0)} />
            <SmallButton label="Ring in 15 s" icon="schedule" onPress={() => void ring(15)} />
          </View>
        </Card>

        {/* Duress PIN + decoy */}
        <Card style={styles.card} disableEntranceAnimation>
          <SectionTitle
            icon="lock"
            title="Safety PINs and decoy"
            subtitle="Your real PIN ends an SOS. Your duress PIN looks like it ends it, but the alert keeps running silently."
          />
          <Text style={styles.hint}>
            Status: <Text style={{ fontWeight: '800', color: pinsSet ? colors.safe : colors.danger }}>{pinsSet ? 'PINs set' : 'Not set'}</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={realPin}
            onChangeText={setRealPin}
            placeholder="Real PIN (4–6 digits)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <TextInput
            style={styles.input}
            value={duressPin}
            onChangeText={setDuressPin}
            placeholder="Duress PIN (4–6 digits, different)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
          />
          <PrimaryButton variant="primary" label="Save PINs" onPress={savePins} style={styles.fullBtn} />
          <SmallButton label="Preview decoy calculator" icon="calculate" onPress={() => setShowDecoy(true)} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadyLine({ ok, text, onPress }: { ok: boolean; text: string; onPress?: () => void }) {
  const body = (
    <View style={styles.readyLine}>
      <MaterialIcons name={ok ? 'check-circle' : 'radio-button-unchecked'} size={18} color={ok ? '#4ADE80' : '#94A3B8'} />
      <Text style={styles.readyText}>{text}</Text>
      {!ok && onPress ? <MaterialIcons name="chevron-right" size={18} color="#94A3B8" /> : null}
    </View>
  );
  return !ok && onPress ? <TouchableOpacity onPress={onPress}>{body}</TouchableOpacity> : body;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { padding: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  headerSubtitle: { fontSize: 12, color: '#CBD5E1', marginTop: 2 },
  container: { padding: 20, paddingBottom: 40, gap: 14 },

  readyCard: { backgroundColor: colors.primaryDark, borderColor: colors.primary, padding: 16, gap: 8 },
  readyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  readyTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  readyLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readyText: { flex: 1, fontSize: 13, color: '#E2E8F0' },

  card: { padding: 16, gap: 10 },
  sectionHead: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  sectionSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
  sep: { height: 1, backgroundColor: colors.border },
  label: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textPrimary,
  },
  fullBtn: { height: 48 },
  btnRow: { flexDirection: 'row', gap: 10 },
  smallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.card,
    backgroundColor: colors.primarySoft,
  },
  smallBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
