import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

enum LandmarkType { police, hospital, school, pharmacy, shelter }

class Landmark {
  final String id;
  final String name;
  final LandmarkType type;
  final LatLng coordinates;
  final String address;
  final String phone;
  final bool isOpen24Hours;
  final String zone;

  const Landmark({
    required this.id,
    required this.name,
    required this.type,
    required this.coordinates,
    required this.address,
    required this.phone,
    required this.isOpen24Hours,
    required this.zone,
  });

  IconData get icon {
    switch (type) {
      case LandmarkType.police:
        return Icons.local_police_rounded;
      case LandmarkType.hospital:
        return Icons.local_hospital_rounded;
      case LandmarkType.school:
        return Icons.school_rounded;
      case LandmarkType.pharmacy:
        return Icons.medication_rounded;
      case LandmarkType.shelter:
        return Icons.security_rounded;
    }
  }

  Color get color {
    switch (type) {
      case LandmarkType.police:
        return const Color(0xFF1E88E5); // Blue
      case LandmarkType.hospital:
        return const Color(0xFFE53935); // Red
      case LandmarkType.school:
        return const Color(0xFF8E24AA); // Purple
      case LandmarkType.pharmacy:
        return const Color(0xFF00897B); // Teal
      case LandmarkType.shelter:
        return const Color(0xFF43A047); // Green
    }
  }

  String get typeLabel {
    switch (type) {
      case LandmarkType.police:
        return "Police Station / Chowki";
      case LandmarkType.hospital:
        return "Hospital & Trauma Center";
      case LandmarkType.school:
        return "Educational / Guarded Campus";
      case LandmarkType.pharmacy:
        return "24/7 Pharmacy";
      case LandmarkType.shelter:
        return "Verified Safe Shelter";
    }
  }

  static LandmarkType parseType(String? raw) {
    switch (raw?.toLowerCase()) {
      case 'police':
        return LandmarkType.police;
      case 'hospital':
      case 'clinic':
        return LandmarkType.hospital;
      case 'school':
      case 'college':
      case 'university':
        return LandmarkType.school;
      case 'pharmacy':
        return LandmarkType.pharmacy;
      case 'shelter':
      default:
        return LandmarkType.shelter;
    }
  }

  factory Landmark.fromJson(Map<String, dynamic> json) {
    final rawCoords = json['coordinates'] as List<dynamic>? ?? [72.8, 21.1];
    final lng = (rawCoords[0] as num).toDouble();
    final lat = (rawCoords[1] as num).toDouble();

    return Landmark(
      id: json['id'] as String? ?? 'lm_${DateTime.now().millisecondsSinceEpoch}',
      name: json['name'] as String? ?? 'Safe Landmark',
      type: parseType(json['type'] as String?),
      coordinates: LatLng(lat, lng),
      address: json['address'] as String? ?? 'Surat, Gujarat',
      phone: json['phone'] as String? ?? '',
      isOpen24Hours: json['isOpen24Hours'] as bool? ?? false,
      zone: json['zone'] as String? ?? 'Surat',
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'type': type.name,
    'coordinates': [coordinates.longitude, coordinates.latitude],
    'address': address,
    'phone': phone,
    'isOpen24Hours': isOpen24Hours,
    'zone': zone,
  };
}
