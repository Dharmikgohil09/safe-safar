import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'safety_factors.dart';

enum SafetyTier { safe, moderate, risky }

class RouteOption {
  final String routeId;
  final String name;
  final int safetyScore;
  final String color; // 'green', 'yellow', 'red'
  final int distanceMeters;
  final int durationSeconds;
  final bool isSafest;
  final bool isFastest;
  final SafetyFactors safetyFactors;
  final String explanation;
  final List<String> dangerAlerts;
  final List<LatLng> coordinates;

  RouteOption({
    required this.routeId,
    required this.name,
    required this.safetyScore,
    required this.color,
    required this.distanceMeters,
    required this.durationSeconds,
    required this.isSafest,
    required this.isFastest,
    required this.safetyFactors,
    required this.explanation,
    required this.dangerAlerts,
    required this.coordinates,
  });

  SafetyTier get tier {
    if (safetyScore >= 80) return SafetyTier.safe;
    if (safetyScore >= 60) return SafetyTier.moderate;
    return SafetyTier.risky;
  }

  Color get routeColor {
    switch (tier) {
      case SafetyTier.safe:
        return const Color(0xFF00C853); // Vibrant Safety Green
      case SafetyTier.moderate:
        return const Color(0xFFFFAB00); // Amber Warning
      case SafetyTier.risky:
        return const Color(0xFFFF1744); // Crimson Danger Red
    }
  }

  String get tierLabel {
    switch (tier) {
      case SafetyTier.safe:
        return "Safest Route";
      case SafetyTier.moderate:
        return "Moderate Risk";
      case SafetyTier.risky:
        return "High Risk Caution";
    }
  }

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '$distanceMeters m';
    }
    return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }

  String get formattedDuration {
    final mins = (durationSeconds / 60).round();
    if (mins < 60) return '$mins min';
    final hrs = mins ~/ 60;
    final remMins = mins % 60;
    return '${hrs}h ${remMins}m';
  }

  factory RouteOption.fromJson(Map<String, dynamic> json) {
    // Parse coordinates [lng, lat]
    final rawCoords = json['coordinates'] as List<dynamic>? ?? [];
    final coords = rawCoords.map((item) {
      if (item is List && item.length >= 2) {
        final lng = (item[0] as num).toDouble();
        final lat = (item[1] as num).toDouble();
        return LatLng(lat, lng);
      }
      return const LatLng(0, 0);
    }).toList();

    return RouteOption(
      routeId: json['routeId'] as String? ?? 'route_custom',
      name: json['name'] as String? ?? 'Standard Route',
      safetyScore: json['safetyScore'] as int? ?? 75,
      color: json['color'] as String? ?? 'green',
      distanceMeters: json['distanceMeters'] as int? ?? 3000,
      durationSeconds: json['durationSeconds'] as int? ?? 600,
      isSafest: json['isSafest'] as bool? ?? false,
      isFastest: json['isFastest'] as bool? ?? false,
      safetyFactors: json['safetyFactors'] != null
          ? SafetyFactors.fromJson(json['safetyFactors'] as Map<String, dynamic>)
          : const SafetyFactors(lightingScore: 70, policeProximityScore: 70, incidentDecayScore: 70),
      explanation: json['explanation'] as String? ?? 'Evaluated route based on real-time factors.',
      dangerAlerts: (json['dangerAlerts'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      coordinates: coords,
    );
  }

  Map<String, dynamic> toJson() => {
    'routeId': routeId,
    'name': name,
    'safetyScore': safetyScore,
    'color': color,
    'distanceMeters': distanceMeters,
    'durationSeconds': durationSeconds,
    'isSafest': isSafest,
    'isFastest': isFastest,
    'safetyFactors': safetyFactors.toJson(),
    'explanation': explanation,
    'dangerAlerts': dangerAlerts,
    'coordinates': coordinates.map((c) => [c.longitude, c.latitude]).toList(),
  };
}
