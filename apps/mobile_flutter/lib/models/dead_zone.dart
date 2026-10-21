import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum DeadZoneSeverity { moderate, high }

class DeadZone {
  final String id;
  final String name;
  final LatLng center;
  final double radiusMeters;
  final DeadZoneSeverity warningLevel;
  final String description;
  final String carrierNotes;

  const DeadZone({
    required this.id,
    required this.name,
    required this.center,
    required this.radiusMeters,
    required this.warningLevel,
    required this.description,
    required this.carrierNotes,
  });

  Color get circleColor {
    if (warningLevel == DeadZoneSeverity.high) {
      return const Color(0xFFD32F2F).withOpacity(0.28);
    }
    return const Color(0xFFFF9800).withOpacity(0.25);
  }

  Color get borderColor {
    if (warningLevel == DeadZoneSeverity.high) {
      return const Color(0xFFD32F2F);
    }
    return const Color(0xFFFF9800);
  }

  double distanceTo(LatLng point) {
    const Distance distance = Distance();
    return distance.as(LengthUnit.Meter, center, point);
  }

  bool isInside(LatLng point) {
    return distanceTo(point) <= radiusMeters;
  }

  bool isApproaching(LatLng point, {double proximityThresholdMeters = 300.0}) {
    final d = distanceTo(point);
    return d > radiusMeters && d <= (radiusMeters + proximityThresholdMeters);
  }

  factory DeadZone.fromJson(Map<String, dynamic> json) {
    final rawCenter = json['center'] as List<dynamic>? ?? [72.8, 21.1];
    final lng = (rawCenter[0] as num).toDouble();
    final lat = (rawCenter[1] as num).toDouble();

    return DeadZone(
      id: json['id'] as String? ?? 'dz_unknown',
      name: json['name'] as String? ?? 'Cellular Dead Zone',
      center: LatLng(lat, lng),
      radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? 250.0,
      warningLevel: json['warningLevel'] == 'high'
          ? DeadZoneSeverity.high
          : DeadZoneSeverity.moderate,
      description: json['description'] as String? ?? 'Low coverage area.',
      carrierNotes: json['carrierNotes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'center': [center.longitude, center.latitude],
    'radiusMeters': radiusMeters,
    'warningLevel': warningLevel.name,
    'description': description,
    'carrierNotes': carrierNotes,
  };
}
