import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import '../lib/models/landmark.dart';
import '../lib/services/landmarks_service.dart';

void main() {
  group('LandmarksService Tests', () {
    late LandmarksService service;

    final mockLandmarks = [
      const Landmark(
        id: 'pol_1',
        name: 'Umra Police Station',
        type: LandmarkType.police,
        coordinates: LatLng(21.1685, 72.7935),
        address: 'Athwa Lines, Umra',
        phone: '+91 261 222 3444',
        isOpen24Hours: true,
        zone: 'Umra',
      ),
      const Landmark(
        id: 'hosp_1',
        name: 'New Civil Hospital',
        type: LandmarkType.hospital,
        coordinates: LatLng(21.1712, 72.8189),
        address: 'Majura Gate',
        phone: '+91 261 224 4456',
        isOpen24Hours: true,
        zone: 'Majura',
      ),
      const Landmark(
        id: 'sch_1',
        name: 'SVNIT Surat',
        type: LandmarkType.school,
        coordinates: LatLng(21.1648, 72.7848),
        address: 'Ichchhanath',
        phone: '+91 261 225 9571',
        isOpen24Hours: true,
        zone: 'SVNIT',
      ),
    ];

    setUp(() {
      service = LandmarksService();
      service.setLandmarks(mockLandmarks);
    });

    test('Filter by type returns only matching landmarks', () {
      final police = service.filterByType(LandmarkType.police);
      expect(police.length, 1);
      expect(police.first.name, 'Umra Police Station');
    });

    test('findNearestSafePlace returns closest landmark accurately', () {
      // User standing right outside SVNIT
      const userLoc = LatLng(21.1650, 72.7850);
      final nearest = service.findNearestSafePlace(userLoc);

      expect(nearest, isNotNull);
      expect(nearest!.landmark.name, 'SVNIT Surat');
      expect(nearest.distanceMeters, lessThan(100));
    });

    test('findNearestSafePlace with filterType returns closest matching type', () {
      const userLoc = LatLng(21.1650, 72.7850);
      final nearestPolice = service.findNearestSafePlace(userLoc, filterType: LandmarkType.police);

      expect(nearestPolice, isNotNull);
      expect(nearestPolice!.landmark.type, LandmarkType.police);
      expect(nearestPolice.landmark.name, 'Umra Police Station');
    });
  });
}
