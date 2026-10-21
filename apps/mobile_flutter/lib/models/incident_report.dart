import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum IncidentType { darkStreet, harassment, isolatedPath, suspicious }

class IncidentReport {
  final String id;
  final IncidentType type;
  final LatLng coordinates;
  final String description;
  final int severity; // 1 to 5
  final int confirmations;
  final bool verified;
  final DateTime createdAt;

  const IncidentReport({
    required this.id,
    required this.type,
    required this.coordinates,
    required this.description,
    required this.severity,
    required this.confirmations,
    required this.verified,
    required this.createdAt,
  });

  IconData get icon {
    switch (type) {
      case IncidentType.darkStreet:
        return Icons.lightbulb_outline_rounded;
      case IncidentType.harassment:
        return Icons.warning_amber_rounded;
      case IncidentType.isolatedPath:
        return Icons.remove_road_rounded;
      case IncidentType.suspicious:
        return Icons.visibility_outlined;
    }
  }

  Color get color {
    switch (type) {
      case IncidentType.darkStreet:
        return const Color(0xFF6A1B9A); // Deep Purple
      case IncidentType.harassment:
        return const Color(0xFFD50000); // Danger Red
      case IncidentType.isolatedPath:
        return const Color(0xFFE65100); // Dark Orange
      case IncidentType.suspicious:
        return const Color(0xFFC2185B); // Pink
    }
  }

  String get typeLabel {
    switch (type) {
      case IncidentType.darkStreet:
        return "Poor Lighting / Dark Street";
      case IncidentType.harassment:
        return "Reported Harassment";
      case IncidentType.isolatedPath:
        return "Isolated / Desolate Path";
      case IncidentType.suspicious:
        return "Suspicious Activity";
    }
  }

  static IncidentType parseType(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'dark_street':
      case 'darkstreet':
        return IncidentType.darkStreet;
      case 'harassment':
        return IncidentType.harassment;
      case 'isolated_path':
      case 'isolatedpath':
        return IncidentType.isolatedPath;
      case 'suspicious':
      default:
        return IncidentType.suspicious;
    }
  }

  factory IncidentReport.fromJson(Map<String, dynamic> json) {
    final rawCoords = json['coordinates'] as List<dynamic>? ?? [72.8, 21.1];
    final lng = (rawCoords[0] as num).toDouble();
    final lat = (rawCoords[1] as num).toDouble();

    return IncidentReport(
      id: json['id'] as String? ?? 'rep_${DateTime.now().millisecondsSinceEpoch}',
      type: parseType(json['type'] as String?),
      coordinates: LatLng(lat, lng),
      description: json['description'] as String? ?? 'Incident reported by community member',
      severity: json['severity'] as int? ?? 3,
      confirmations: json['confirmations'] as int? ?? 1,
      verified: json['verified'] as bool? ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type.name,
    'coordinates': [coordinates.longitude, coordinates.latitude],
    'description': description,
    'severity': severity,
    'confirmations': confirmations,
    'verified': verified,
    'createdAt': createdAt.toIso8601String(),
  };
}
