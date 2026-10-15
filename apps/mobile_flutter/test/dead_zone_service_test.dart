import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import '../lib/models/dead_zone.dart';
import '../lib/services/dead_zone_service.dart';

void main() {
  group('DeadZoneService Tests', () {
    late DeadZoneService service;

    final mockDeadZones = [
      const DeadZone(
        id: 'dz_test_1',
        name: 'Dumas Blind Spot',
        center: LatLng(21.0921, 72.7154),
        radiusMeters: 300,
        warningLevel: DeadZoneSeverity.high,
        description: 'Mangrove cellular blind spot',
        carrierNotes: 'No coverage',
      ),
    ];

    setUp(() {
      service = DeadZoneService();
      service.setDeadZones(mockDeadZones);
    });

    test('User inside dead zone triggers DeadZoneState.inside', () {
      // Coordinate right at the center of the dead zone
      const insideLocation = LatLng(21.0921, 72.7154);
      final alert = service.checkUserPosition(insideLocation);

      expect(alert.state, DeadZoneState.inside);
      expect(alert.hasWarning, isTrue);
      expect(alert.deadZone?.name, 'Dumas Blind Spot');
    });

    test('User approaching dead zone triggers DeadZoneState.approaching', () {
      // Coordinate ~450m away (radius is 300m, threshold is 300m, so 450m is approaching)
      const approachingLocation = LatLng(21.0935, 72.7154);
      final alert = service.checkUserPosition(approachingLocation, warningThresholdMeters: 300);

      expect(alert.state, DeadZoneState.approaching);
      expect(alert.hasWarning, isTrue);
    });

    test('User far away triggers DeadZoneState.safe', () {
      // SVNIT coordinate is ~10km away
      const svnitLocation = LatLng(21.1648, 72.7848);
      final alert = service.checkUserPosition(svnitLocation);

      expect(alert.state, DeadZoneState.safe);
      expect(alert.hasWarning, isFalse);
    });
  });
}
