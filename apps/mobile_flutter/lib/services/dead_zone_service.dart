import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:latlong2/latlong.dart';
import '../models/dead_zone.dart';

enum DeadZoneState { safe, approaching, inside }

class DeadZoneAlert {
  final DeadZoneState state;
  final DeadZone? deadZone;
  final double? distanceMeters;

  const DeadZoneAlert({
    required this.state,
    this.deadZone,
    this.distanceMeters,
  });

  bool get hasWarning => state != DeadZoneState.safe;

  String get bannerTitle {
    switch (state) {
      case DeadZoneState.inside:
        return "CRITICAL: Cellular Dead Zone Active";
      case DeadZoneState.approaching:
        return "WARNING: Approaching Low Network Zone";
      case DeadZoneState.safe:
        return "Cellular Network Operational";
    }
  }

  String get bannerMessage {
    if (deadZone == null) return "Mobile signal normal.";
    if (state == DeadZoneState.inside) {
      return "${deadZone!.name}: Mobile internet & voice unavailable. Offline routing cached, SMS standby.";
    }
    final dist = distanceMeters?.round() ?? 200;
    return "Entering ${deadZone!.name} in ~$dist m. Offline map tiles cached automatically.";
  }
}

class DeadZoneService {
  List<DeadZone> _deadZones = [];
  bool _isLoaded = false;

  List<DeadZone> get allDeadZones => List.unmodifiable(_deadZones);

  /// Load dead zones from asset bundle
  Future<List<DeadZone>> loadDeadZones({String assetPath = 'assets/data/surat_dead_zones.json'}) async {
    if (_isLoaded && _deadZones.isNotEmpty) return _deadZones;

    try {
      final jsonString = await rootBundle.loadString(assetPath);
      final List<dynamic> data = jsonDecode(jsonString);
      _deadZones = data.map((item) => DeadZone.fromJson(item as Map<String, dynamic>)).toList();
      _isLoaded = true;
    } catch (_) {
      _deadZones = [];
    }
    return _deadZones;
  }

  /// Manually populate for testing
  void setDeadZones(List<DeadZone> zones) {
    _deadZones = zones;
    _isLoaded = true;
  }

  /// Evaluates user position relative to known dead zones
  DeadZoneAlert checkUserPosition(LatLng userLocation, {double warningThresholdMeters = 300.0}) {
    if (_deadZones.isEmpty) {
      return const DeadZoneAlert(state: DeadZoneState.safe);
    }

    // First check if inside any zone
    for (final zone in _deadZones) {
      if (zone.isInside(userLocation)) {
        return DeadZoneAlert(
          state: DeadZoneState.inside,
          deadZone: zone,
          distanceMeters: 0,
        );
      }
    }

    // Check if approaching any zone
    for (final zone in _deadZones) {
      if (zone.isApproaching(userLocation, proximityThresholdMeters: warningThresholdMeters)) {
        final d = zone.distanceTo(userLocation) - zone.radiusMeters;
        return DeadZoneAlert(
          state: DeadZoneState.approaching,
          deadZone: zone,
          distanceMeters: d,
        );
      }
    }

    return const DeadZoneAlert(state: DeadZoneState.safe);
  }
}
