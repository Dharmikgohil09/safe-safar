import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:latlong2/latlong.dart';
import '../models/landmark.dart';

class NearestLandmarkResult {
  final Landmark landmark;
  final double distanceMeters;

  const NearestLandmarkResult({
    required this.landmark,
    required this.distanceMeters,
  });

  String get formattedDistance {
    if (distanceMeters < 1000) {
      return '${distanceMeters.round()} m';
    }
    return '${(distanceMeters / 1000).toStringAsFixed(1)} km';
  }
}

class LandmarksService {
  List<Landmark> _landmarks = [];
  bool _isLoaded = false;

  List<Landmark> get allLandmarks => List.unmodifiable(_landmarks);

  /// Load landmarks from JSON asset
  Future<List<Landmark>> loadLandmarks({String assetPath = 'assets/data/surat_landmarks.json'}) async {
    if (_isLoaded && _landmarks.isNotEmpty) return _landmarks;

    try {
      final jsonString = await rootBundle.loadString(assetPath);
      final List<dynamic> data = jsonDecode(jsonString);
      _landmarks = data.map((item) => Landmark.fromJson(item as Map<String, dynamic>)).toList();
      _isLoaded = true;
    } catch (e) {
      // Fallback empty list if bundle fails
      _landmarks = [];
    }
    return _landmarks;
  }

  /// Manually populate landmarks (e.g., from unit test or network)
  void setLandmarks(List<Landmark> landmarks) {
    _landmarks = landmarks;
    _isLoaded = true;
  }

  /// Filter landmarks by type
  List<Landmark> filterByType(LandmarkType type) {
    return _landmarks.where((l) => l.type == type).toList();
  }

  /// Find the single nearest safe place
  NearestLandmarkResult? findNearestSafePlace(
    LatLng userLocation, {
    LandmarkType? filterType,
    bool require24Hours = false,
  }) {
    if (_landmarks.isEmpty) return null;

    final candidates = _landmarks.where((l) {
      if (filterType != null && l.type != filterType) return false;
      if (require24Hours && !l.isOpen24Hours) return false;
      return true;
    }).toList();

    if (candidates.isEmpty) return null;

    const distance = Distance();
    NearestLandmarkResult? nearest;
    double minDistance = double.infinity;

    for (final l in candidates) {
      final d = distance.as(LengthUnit.Meter, userLocation, l.coordinates);
      if (d < minDistance) {
        minDistance = d;
        nearest = NearestLandmarkResult(landmark: l, distanceMeters: d);
      }
    }
    return nearest;
  }

  /// Get top N nearest landmarks sorted by distance
  List<NearestLandmarkResult> getNearestLandmarks(
    LatLng userLocation, {
    int limit = 5,
    LandmarkType? filterType,
  }) {
    if (_landmarks.isEmpty) return [];

    const distance = Distance();
    final results = <NearestLandmarkResult>[];

    for (final l in _landmarks) {
      if (filterType != null && l.type != filterType) continue;
      final d = distance.as(LengthUnit.Meter, userLocation, l.coordinates);
      results.add(NearestLandmarkResult(landmark: l, distanceMeters: d));
    }

    results.sort((a, b) => a.distanceMeters.compareTo(b.distanceMeters));
    return results.take(limit).toList();
  }
}
