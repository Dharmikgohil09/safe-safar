import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/route_option.dart';
import '../models/landmark.dart';

class OfflineCacheService {
  static const String _keyCachedRoutes = 'safesafar_cached_routes';
  static const String _keyLastDestination = 'safesafar_last_destination';
  static const String _keyOfflineModeOverride = 'safesafar_offline_override';
  static const String _keyCachedLandmarks = 'safesafar_cached_landmarks';

  /// Save computed route alternatives to local persistent storage
  Future<void> cacheRoutes(List<RouteOption> routes, String destinationName) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = routes.map((r) => r.toJson()).toList();
    await prefs.setString(_keyCachedRoutes, jsonEncode(jsonList));
    await prefs.setString(_keyLastDestination, destinationName);
  }

  /// Retrieve last cached routes when user is offline
  Future<List<RouteOption>> getCachedRoutes() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyCachedRoutes);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((item) => RouteOption.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Get last saved destination name
  Future<String?> getLastDestination() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyLastDestination);
  }

  /// Check if offline mode is manually forced for testing
  Future<bool> isOfflineModeForced() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyOfflineModeOverride) ?? false;
  }

  /// Toggle manual offline simulation
  Future<void> setOfflineModeForced(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyOfflineModeOverride, enabled);
  }

  /// Cache landmarks list
  Future<void> cacheLandmarks(List<Landmark> landmarks) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = landmarks.map((l) => l.toJson()).toList();
    await prefs.setString(_keyCachedLandmarks, jsonEncode(jsonList));
  }

  /// Retrieve cached landmarks
  Future<List<Landmark>> getCachedLandmarks() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyCachedLandmarks);
    if (raw == null) return [];
    try {
      final decoded = jsonDecode(raw) as List<dynamic>;
      return decoded.map((item) => Landmark.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}
