import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import '../lib/models/route_option.dart';
import '../lib/models/safety_factors.dart';

void main() {
  group('RouteOption & Safety Tier Tests', () {
    test('Route with score >= 80 classifies as SafetyTier.safe', () {
      final safeRoute = RouteOption(
        routeId: 'safe_1',
        name: 'Athwa Boulevard',
        safetyScore: 92,
        color: 'green',
        distanceMeters: 5200,
        durationSeconds: 720,
        isSafest: true,
        isFastest: false,
        safetyFactors: const SafetyFactors(
          lightingScore: 95,
          policeProximityScore: 90,
          incidentDecayScore: 94,
        ),
        explanation: 'Well lit main road',
        dangerAlerts: [],
        coordinates: const [LatLng(21.1648, 72.7848), LatLng(21.1963, 72.7952)],
      );

      expect(safeRoute.tier, SafetyTier.safe);
      expect(safeRoute.formattedDistance, '5.2 km');
      expect(safeRoute.formattedDuration, '12 min');
    });

    test('Route with score between 60 and 79 classifies as SafetyTier.moderate', () {
      final modRoute = RouteOption(
        routeId: 'mod_1',
        name: 'City Light Rd',
        safetyScore: 71,
        color: 'yellow',
        distanceMeters: 4800,
        durationSeconds: 660,
        isSafest: false,
        isFastest: false,
        safetyFactors: const SafetyFactors(
          lightingScore: 72,
          policeProximityScore: 68,
          incidentDecayScore: 75,
        ),
        explanation: 'Moderate residential road',
        dangerAlerts: [],
        coordinates: const [LatLng(21.1648, 72.7848), LatLng(21.1963, 72.7952)],
      );

      expect(modRoute.tier, SafetyTier.moderate);
    });

    test('Route with score < 60 classifies as SafetyTier.risky', () {
      final riskyRoute = RouteOption(
        routeId: 'risk_1',
        name: 'Canal Backroad',
        safetyScore: 41,
        color: 'red',
        distanceMeters: 4100,
        durationSeconds: 540,
        isSafest: false,
        isFastest: true,
        safetyFactors: const SafetyFactors(
          lightingScore: 30,
          policeProximityScore: 35,
          incidentDecayScore: 42,
        ),
        explanation: '2 reports and low lighting near Adajan Gam',
        dangerAlerts: ['Pitch dark stretch', 'No police presence'],
        coordinates: const [LatLng(21.1648, 72.7848), LatLng(21.1963, 72.7952)],
      );

      expect(riskyRoute.tier, SafetyTier.risky);
      expect(riskyRoute.isFastest, isTrue);
      expect(riskyRoute.dangerAlerts.length, 2);
    });
  });
}
