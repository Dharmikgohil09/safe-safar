
import React from 'react';
import { router } from 'expo-router';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const showMessage = (feature: string) => {
    Alert.alert(feature, 'This feature will be connected during development.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F9F6" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>SafeSafar</Text>
            <Text style={styles.subtitle}>Your safety, your journey.</Text>
          </View>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign in or register"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.greeting}>Travel with confidence.</Text>
          <Text style={styles.description}>
            Plan your journey and stay connected with people you trust.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => showMessage('SOS preview')}
          activeOpacity={0.85}
        >
          <Text style={styles.sosTitle}>SOS</Text>
          <Text style={styles.sosSubtitle}>Emergency assistance preview</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your safety tools</Text>

        <TouchableOpacity
          style={styles.setupCard}
          onPress={() => router.push('/onboarding')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Set up your safety profile"
        >
          <Text style={styles.icon}>🛡️</Text>
          <View style={styles.featureText}>
            <Text style={styles.cardTitle}>Set up your safety profile</Text>
            <Text style={styles.cardDescription}>
              Explore SafeSafar features and configure emergency permissions.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => showMessage('Plan a Safe Route')}
        >
          <Text style={styles.icon}>🗺️</Text>
          <View style={styles.featureText}>
            <Text style={styles.cardTitle}>Plan a Safe Route</Text>
            <Text style={styles.cardDescription}>
              Find a safer way to your destination.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => showMessage('Walk Me Home')}
        >
          <Text style={styles.icon}>🚶</Text>
          <View style={styles.featureText}>
            <Text style={styles.cardTitle}>Walk Me Home</Text>
            <Text style={styles.cardDescription}>
              Stay connected while travelling.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => router.push('/contacts')}
        >
          <Text style={styles.icon}>👥</Text>
          <View style={styles.featureText}>
            <Text style={styles.cardTitle}>Trusted Contacts</Text>
            <Text style={styles.cardDescription}>
              Manage the people you rely on.
            </Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => showMessage('Report an Unsafe Location')}
        >
          <Text style={styles.cardTitle}>Report an unsafe location</Text>
          <Text style={styles.cardDescription}>
            Help other travellers make informed decisions.
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Stay aware. Stay connected. Travel safely.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F9F6',
  },
  container: {
    padding: 22,
    paddingTop: 18,
    paddingBottom: 36,
  },
  brand: {
    fontSize: 29,
    fontWeight: '800',
    color: '#146B4B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64756C',
    marginTop: 4,
  },
  welcome: {
    marginTop: 28,
    marginBottom: 22,
  },
  greeting: {
    fontSize: 25,
    fontWeight: '800',
    color: '#18392B',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: '#65766C',
    marginTop: 8,
  },
  sosButton: {
    backgroundColor: '#C83F43',
    borderRadius: 20,
    padding: 23,
    alignItems: 'center',
    marginBottom: 30,
  },
  sosTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sosSubtitle: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#18392B',
    marginBottom: 14,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1EAE4',
  },
  icon: {
    fontSize: 26,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#244635',
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#738078',
    marginTop: 5,
  },
  arrow: {
    fontSize: 26,
    color: '#438568',
    marginLeft: 8,
  },
  reportCard: {
    backgroundColor: '#E5F2E9',
    borderRadius: 16,
    padding: 18,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signInButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#E5F2E9',
    borderWidth: 1,
    borderColor: '#CBE0D4',
  },
  signInButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#146B4B',
  },
  setupCard: {
    backgroundColor: '#EEF7F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BDDCCB',
  },
  footer: {
    textAlign: 'center',
    color: '#75847A',
    fontSize: 12,
    marginTop: 26,
  },
});
