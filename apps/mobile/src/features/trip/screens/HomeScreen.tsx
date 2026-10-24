import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { Card, DarkHeader, DrawerMenu, PrimaryButton, ShieldLogo } from '../../../components/ui';
import { colors, radius, typography } from '../../../theme';
import { tripLocationPublisher } from '../../../services/tripLocationPublisher';
import { useMapState } from '../../../context/MapContext';
import type { PlaceSearchResult } from '../../../services/geocodingService';
import { getContacts } from '../../emergency';

const QUICK_PICKS = [
  { name: 'Adajan Gam Circle', coords: { latitude: 21.1963, longitude: 72.7952 } },
  { name: 'VR Mall Surat', coords: { latitude: 21.1442, longitude: 72.7565 } },
  { name: 'Surat Railway Station', coords: { latitude: 21.2044, longitude: 72.8407 } },
];

export default function HomeScreen() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { searchPlaces, calculateRoutes, isLoading } = useMapState();

  const [guardianCount, setGuardianCount] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ name: string; coords: { latitude: number; longitude: number } } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getContacts().then((c) => setGuardianCount(c.length));
    }, []),
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setPicked(null);
    if (timer.current) clearTimeout(timer.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        setSuggestions((await searchPlaces(text)).slice(0, 4));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const choose = (name: string, coords: { latitude: number; longitude: number }) => {
    setQuery(name);
    setPicked({ name, coords });
    setSuggestions([]);
    Keyboard.dismiss();
  };

  const findRoute = async () => {
    Keyboard.dismiss();
    let target = picked;
    if (!target && query.trim().length >= 2) {
      try {
        const results = await searchPlaces(query);
        if (results[0]) target = { name: results[0].name, coords: results[0].coordinates };
      } catch {
        // fall through to the alert below
      }
    }
    if (!target) {
      Alert.alert('Where to?', 'Type a destination or pick one of the quick options.');
      return;
    }
    setSuggestions([]);
    void calculateRoutes(target.coords, target.name);
    router.push('/(tabs)/map');
  };

  const openTracker = () => {
    const pubStatus = tripLocationPublisher.getStatus();
    const token = pubStatus.trackingToken || 'safesafar-live-session-2026';
    const trackerBaseUrl =
      process.env.EXPO_PUBLIC_TRACKER_URL || 'https://safesafar-tracker.vercel.app';
    const url = `${trackerBaseUrl.replace(/\/+$/, '')}/track/${token}`;
    Linking.openURL(url).catch(() => Alert.alert('Tracker URL', url));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <DrawerMenu visible={drawerOpen} onClose={() => setDrawerOpen(false)} showMessage={showMessage} />

      <DarkHeader
        title="SafeSafar"
        subtitle="Safer routes. Brighter journeys."
        leftSlot={
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              onPress={() => setDrawerOpen(true)}
              style={styles.menuButton}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialIcons name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <ShieldLogo size={24} />
          </View>
        }
        rightSlot={
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => showMessage('Notifications')}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <MaterialIcons name="notifications-none" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              style={styles.avatarCircle}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text style={styles.avatarText}>HB</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. SOS first: the one thing that must always be one tap away */}
        <Card
          onPress={() => router.push('/(tabs)/sos')}
          style={styles.sosHero}
          accessibilityLabel="Emergency SOS. Opens the SOS screen."
          entranceDelay={0}
        >
          <View style={styles.sosHeroIcon}>
            <MaterialIcons name="warning" size={30} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosHeroTitle}>Emergency SOS</Text>
            <Text style={styles.sosHeroSub}>
              {guardianCount === null
                ? 'Alert your guardians with your live location'
                : guardianCount === 0
                  ? 'Add a guardian so SOS can reach someone'
                  : `Alerts ${guardianCount} guardian${guardianCount === 1 ? '' : 's'} with your live location`}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={26} color="#FECACA" />
        </Card>

        {/* 2. Plan a Safe Route: the main purpose of the app */}
        <Card style={styles.planRouteCard} entranceDelay={60}>
          <View style={styles.planRouteHeader}>
            <MaterialIcons name="alt-route" size={22} color={colors.primary} />
            <Text style={styles.planRouteTitle}>Plan a Safe Route</Text>
          </View>
          <Text style={styles.planRouteSubtitle}>
            Streets scored by lighting, incidents, and nearby police and hospitals.
          </Text>

          <View style={styles.inputsWrapper}>
            <TouchableOpacity
              style={styles.inputRow}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/map')}
            >
              <MaterialIcons name="my-location" size={20} color={colors.accent} />
              <Text style={styles.inputText}>Your Current Location</Text>
            </TouchableOpacity>
            <View style={styles.inputDivider} />
            <TouchableOpacity
              style={styles.inputRow}
              activeOpacity={0.85}
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/map')}
            >
              <MaterialIcons name="place" size={20} color={colors.danger} />
              <TextInput
                style={styles.destInput}
                value={query}
                onChangeText={onChangeQuery}
                placeholder="Where are you going?"
                placeholderTextColor={colors.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => void findRoute()}
                accessibilityLabel="Destination"
              />
              {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
              {query.length > 0 && !searching ? (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setPicked(null);
                    setSuggestions([]);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Clear destination"
                >
                  <MaterialIcons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          </View>

          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.suggestionRow}
                  onPress={() => choose(p.name, p.coordinates)}
                  accessibilityRole="button"
                >
                  <MaterialIcons name="place" size={18} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName} numberOfLines={1}>{p.name}</Text>
                    {p.address ? <Text style={styles.suggestionAddr} numberOfLines={1}>{p.address}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {QUICK_PICKS.map((q) => (
              <TouchableOpacity
                key={q.name}
                style={[styles.chip, picked?.name === q.name && styles.chipActive]}
                onPress={() => choose(q.name, q.coords)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, picked?.name === q.name && styles.chipTextActive]}>{q.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <PrimaryButton
            variant="accent"
            label={isLoading ? 'Finding routes…' : 'Find Safe Route'}
            onPress={() => void findRoute()}
            disabled={isLoading}
            icon={<MaterialIcons name="search" size={20} color={colors.primaryDark} />}
            style={styles.findRouteButton}
          />
        </Card>

        {/* 3. Trip tools */}
        <View style={styles.tilesRow}>
          <Card
            onPress={() => router.push('/walk-me-home')}
            style={styles.walkTile}
            accessibilityLabel="Walk Me Home"
            entranceDelay={120}
          >
            <View style={styles.walkIconCircle}>
              <MaterialIcons name="directions-walk" size={26} color={colors.safe} />
            </View>
            <Text style={styles.tileTitle}>Walk Me Home</Text>
            <Text style={styles.tileSubtitle}>Guardians check in on you</Text>
          </Card>

          <Card
            onPress={() => router.push('/live-location')}
            style={styles.shareTile}
            accessibilityLabel="Share Live Location"
            entranceDelay={180}
          >
            <View style={styles.shareIconCircle}>
              <MaterialIcons name="share-location" size={26} color={colors.accent} />
            </View>
            <Text style={styles.tileTitle}>Share Live Location</Text>
            <Text style={styles.tileSubtitle}>Real-time tracking link</Text>
          </Card>
        </View>

        {/* 4. Get ready & help others */}
        <Text style={styles.sectionTitle}>Be prepared</Text>
        <View style={styles.exploreList}>
          <ExploreCard
            icon="security"
            title="Safety Toolkit"
            desc="Shake and voice triggers, fake call, duress PIN and decoy calculator."
            onPress={() => router.push('/safety-toolkit' as any)}
            delay={240}
          />
          <ExploreCard
            icon="group"
            title="Trusted Contacts"
            desc="Manage the guardians who are alerted when you need help."
            onPress={() => router.push('/contacts')}
            delay={300}
          />
          <ExploreCard
            icon="flag"
            title="Report an unsafe place"
            desc="Help other travellers make informed decisions."
            onPress={() => router.push('/report')}
            delay={360}
          />
          <ExploreCard
            icon="verified-user"
            title="Complete your Safety Profile"
            desc="Set countdowns and hardware safety permissions."
            onPress={() => router.push('/onboarding')}
            delay={420}
          />
          <ExploreCard
            icon="language"
            title="Guardian Web Tracker"
            desc="See what your guardians see: live map and safety heatmap."
            onPress={openTracker}
            delay={480}
            tint="#0284C7"
            trailing="open-in-browser"
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/auth')}
            accessibilityRole="button"
            accessibilityLabel="Sign in or register"
          >
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExploreCard({
  icon,
  title,
  desc,
  onPress,
  delay,
  tint,
  trailing = 'chevron-right',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  desc: string;
  onPress: () => void;
  delay: number;
  tint?: string;
  trailing?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <Card onPress={onPress} style={styles.exploreCard} accessibilityLabel={title} entranceDelay={delay}>
      <View style={styles.exploreCardInner}>
        <View style={[styles.exploreIconCircle, tint ? { backgroundColor: 'rgba(56, 189, 248, 0.15)' } : null]}>
          <MaterialIcons name={icon} size={22} color={tint ?? colors.primary} />
        </View>
        <View style={styles.exploreTextGroup}>
          <Text style={styles.exploreCardTitle}>{title}</Text>
          <Text style={styles.exploreCardDesc}>{desc}</Text>
        </View>
        <MaterialIcons name={trailing} size={22} color={tint ?? colors.textMuted} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },

  /* (greeting card removed) */
  greetingCard: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginBottom: 16,
  },
  greetingContent: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  shieldBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Plan Route Card */
  planRouteCard: {
    padding: 18,
    marginBottom: 16,
  },
  planRouteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planRouteTitle: {
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
    color: colors.textPrimary,
  },
  planRouteSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  inputsWrapper: {
    backgroundColor: colors.background,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 14,
  },
  inputText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  findRouteButton: {
    height: 48,
  },

  /* Quick Action Tiles */
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  sosTile: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    padding: 16,
    alignItems: 'flex-start',
  },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  shareTile: {
    flex: 1,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    padding: 16,
    alignItems: 'flex-start',
  },
  shareIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  tileSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  /* Explore Section */
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  exploreList: {
    gap: 10,
    marginBottom: 24,
  },
  exploreCard: {
    padding: 14,
  },
  exploreCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exploreIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreTextGroup: {
    flex: 1,
  },
  exploreCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  exploreCardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },

  /* SOS hero */
  sosHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.sosRed,
    borderColor: '#A93236',
    padding: 16,
    marginBottom: 16,
  },
  sosHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosHeroTitle: { fontSize: 19, fontWeight: '800', color: '#FFFFFF' },
  sosHeroSub: { fontSize: 12, color: '#FEE2E2', marginTop: 2, lineHeight: 17 },

  destInput: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500', paddingVertical: 0 },
  suggestions: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    marginBottom: 12,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  suggestionAddr: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  chipRow: { gap: 8, paddingBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  chipTextActive: { color: '#FFFFFF' },
  walkTile: {
    flex: 1,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    padding: 16,
    alignItems: 'flex-start',
  },
  walkIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
});
