import React from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { mockUser } from '../../features/trip/mock/mockData';
import { colors, radius, spacing, typography } from '../../theme';
import { ShieldLogo } from './ShieldLogo';

const DRAWER_WIDTH = 280;

export interface DrawerItem {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  action: 'navigate' | 'message';
  route?: string;
  badge?: string;
  isDanger?: boolean;
}

export interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  showMessage?: (feature: string) => void;
}

export function DrawerMenu({
  visible,
  onClose,
  showMessage,
}: DrawerMenuProps) {
  const [modalVisible, setModalVisible] = React.useState(visible);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const animX = React.useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;

  // Listen to reduce-motion accessibility setting
  React.useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        if (isMounted) setReduceMotion(enabled);
      }
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Handle open / close animation based on `visible` and `reduceMotion`
  React.useEffect(() => {
    if (visible) {
      setModalVisible(true);
      if (reduceMotion) {
        animX.setValue(0);
        backdropAnim.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(animX, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else if (modalVisible) {
      if (reduceMotion) {
        animX.setValue(-DRAWER_WIDTH);
        backdropAnim.setValue(0);
        setModalVisible(false);
      } else {
        Animated.parallel([
          Animated.timing(animX, {
            toValue: -DRAWER_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setModalVisible(false);
        });
      }
    }
  }, [visible, reduceMotion]);

  const handleClose = (callback?: () => void) => {
    if (reduceMotion) {
      animX.setValue(-DRAWER_WIDTH);
      backdropAnim.setValue(0);
      setModalVisible(false);
      onClose();
      callback?.();
    } else {
      Animated.parallel([
        Animated.timing(animX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        onClose();
        callback?.();
      });
    }
  };

  const handleItemPress = (item: DrawerItem) => {
    handleClose(() => {
      if (item.id === 'help') {
        Alert.alert(
          'Help and Support',
          'Need help with SafeSafar? Call our customer care team on 8780888428. For an emergency, use the SOS button or call 112 immediately.',
          [
            { text: 'Close', style: 'cancel' },
            { text: 'Call 8780888428', onPress: () => Linking.openURL('tel:8780888428').catch(() => {}) },
          ]
        );
        return;
      }
      if (item.action === 'navigate' && item.route) {
        router.push(item.route as any);
      } else if (item.action === 'message') {
        if (showMessage) {
          showMessage(item.label);
        } else {
          Alert.alert(item.label, 'This feature will be connected during development.');
        }
      }
    });
  };

  const navItems: DrawerItem[] = [
    { id: 'home', label: 'Home', icon: 'home', action: 'navigate', route: '/' },
    { id: 'map', label: 'Safe Route Map', icon: 'map', action: 'navigate', route: '/map' },
    { id: 'walk', label: 'Walk Me Home', icon: 'directions-walk', action: 'navigate', route: '/walk-me-home' },
    { id: 'share_live', label: 'Share Live Location', icon: 'near-me', action: 'navigate', route: '/live-location' },
    { id: 'report', label: 'Report Unsafe Place', icon: 'flag', action: 'navigate', route: '/report' },
    {
      id: 'sos',
      label: 'Emergency SOS',
      icon: 'warning',
      action: 'navigate',
      route: '/sos',
      badge: 'SOS',
      isDanger: true,
    },
    { id: 'toolkit', label: 'Safety Toolkit', icon: 'security', action: 'navigate', route: '/safety-toolkit' },
    { id: 'contacts', label: 'Trusted Contacts', icon: 'people', action: 'navigate', route: '/contacts' },
    { id: 'profile', label: 'Safety Profile', icon: 'verified-user', action: 'navigate', route: '/onboarding' },
    { id: 'help', label: 'Help and Support', icon: 'help-outline', action: 'message' },
    { id: 'logout', label: 'Logout', icon: 'logout', action: 'message', isDanger: true },
  ];

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={() => handleClose()}
      statusBarTranslucent
    >
      <SafeAreaProvider>
      <View style={styles.modalRoot}>
        {/* Dark overlay backdrop that closes on tap */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => handleClose()}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          />
        </Animated.View>

        {/* 280px wide drawer sliding in from the left */}
        <Animated.View
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: animX }] },
          ]}
          accessibilityRole="menu"
          accessibilityLabel="Navigation menu"
        >
          <SafeAreaView style={styles.safeContainer}>
            {/* Header: User Profile & Brand */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.brandRow}>
                  <ShieldLogo size={22} />
                  <Text style={styles.brandText}>SafeSafar</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleClose()}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close menu"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="close" size={22} color="#CBD5E1" />
                </TouchableOpacity>
              </View>

              <View style={styles.userCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{mockUser.initials}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {mockUser.name}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {mockUser.email}
                  </Text>
                </View>
              </View>
            </View>

            {/* Menu Items List */}
            <ScrollView
              style={styles.itemList}
              contentContainerStyle={styles.itemListContent}
              showsVerticalScrollIndicator={false}
            >
              {navItems.map((item, index) => {
                const isSos = item.id === 'sos';
                const isLogout = item.id === 'logout';
                const showDivider =
                  item.id === 'report' ||
                  item.id === 'toolkit' ||
                  item.id === 'profile' ||
                  item.id === 'help';

                return (
                  <React.Fragment key={item.id}>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item)}
                      style={[
                        styles.menuItem,
                        isSos && styles.menuItemSos,
                        isLogout && styles.menuItemLogout,
                      ]}
                      accessibilityRole="menuitem"
                      accessibilityLabel={item.label}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          isSos && styles.iconContainerSos,
                          isLogout && styles.iconContainerLogout,
                        ]}
                      >
                        <MaterialIcons
                          name={item.icon}
                          size={20}
                          color={
                            isSos
                              ? colors.danger
                              : isLogout
                              ? colors.textMuted
                              : colors.primary
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.menuItemText,
                          isSos && styles.menuItemTextSos,
                          isLogout && styles.menuItemTextLogout,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    {showDivider ? <View style={styles.divider} /> : null}
                  </React.Fragment>
                );
              })}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              {/* Long-press (hidden): opens the raw SOS engine dev screen for testing */}
              <Pressable
                onLongPress={() => handleClose(() => router.push('/emergency-dev' as any))}
                delayLongPress={1500}
              >
                <Text style={styles.footerText}>SafeSafar · v1.0.0</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomRightRadius: 18,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemList: {
    flex: 1,
  },
  itemListContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  menuItemSos: {
    backgroundColor: 'rgba(200, 63, 67, 0.06)',
  },
  menuItemLogout: {
    marginTop: 4,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerSos: {
    backgroundColor: 'rgba(200, 63, 67, 0.12)',
  },
  iconContainerLogout: {
    backgroundColor: colors.primarySoft,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  menuItemTextSos: {
    color: colors.danger,
    fontWeight: '700',
  },
  menuItemTextLogout: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: colors.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
    marginHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
