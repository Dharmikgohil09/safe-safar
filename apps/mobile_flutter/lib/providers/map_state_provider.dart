import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import '../models/route_option.dart';
import '../models/landmark.dart';
import '../models/dead_zone.dart';
import '../models/incident_report.dart';
import '../services/api_service.dart';
import '../services/landmarks_service.dart';
import '../services/dead_zone_service.dart';
import '../services/offline_cache_service.dart';
import '../services/demo_service.dart';

class MapStateProvider extends ChangeNotifier {
  final ApiService _apiService;
  final LandmarksService _landmarksService;
  final DeadZoneService _deadZoneService;
  final OfflineCacheService _cacheService;
  final DemoService _demoService;

  MapStateProvider({
    ApiService? apiService,
    LandmarksService? landmarksService,
    DeadZoneService? deadZoneService,
    OfflineCacheService? cacheService,
    DemoService? demoService,
  })  : _apiService = apiService ?? ApiService(),
        _landmarksService = landmarksService ?? LandmarksService(),
        _deadZoneService = deadZoneService ?? DeadZoneService(),
        _cacheService = cacheService ?? OfflineCacheService(),
        _demoService = demoService ?? DemoService();

  // Map and Location State
  // Default to SVNIT Surat (Hackathon Demo Anchor)
  LatLng _userLocation = const LatLng(21.1648, 72.7848);
  LatLng? _destination;
  String _destinationName = "Adajan Gam Circle";

  // Data Collections
  List<RouteOption> _routes = [];
  RouteOption? _selectedRoute;
  List<Landmark> _landmarks = [];
  List<DeadZone> _deadZones = [];
  List<IncidentReport> _reports = [];

  // Active Alert
  DeadZoneAlert _deadZoneAlert = const DeadZoneAlert(state: DeadZoneState.safe);

  // Layer Visibility Toggles
  bool _showLandmarks = true;
  bool _showHeatmap = true;
  bool _showDeadZones = true;
  bool _isOffline = false;
  bool _isLoading = false;

  // Selected Landmark for bottom sheet
  Landmark? _selectedLandmark;

  // Getters
  LatLng get userLocation => _userLocation;
  LatLng? get destination => _destination;
  String get destinationName => _destinationName;
  List<RouteOption> get routes => _routes;
  RouteOption? get selectedRoute => _selectedRoute;
  List<Landmark> get landmarks => _landmarks;
  List<DeadZone> get deadZones => _deadZones;
  List<IncidentReport> get reports => _reports;
  DeadZoneAlert get deadZoneAlert => _deadZoneAlert;
  bool get showLandmarks => _showLandmarks;
  bool get showHeatmap => _showHeatmap;
  bool get showDeadZones => _showDeadZones;
  bool get isOffline => _isOffline;
  bool get isLoading => _isLoading;
  Landmark? get selectedLandmark => _selectedLandmark;
  List<DemoScenario> get demoScenarios => _demoService.scenarios;

  /// Initialize application datasets and demo defaults
  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      _landmarks = await _landmarksService.loadLandmarks();
      _deadZones = await _deadZoneService.loadDeadZones();
      _reports = await _apiService.fetchIncidentReports();
      await _demoService.loadScenarios();

      // Check offline preference
      _isOffline = await _cacheService.isOfflineModeForced();

      // Automatically load the primary Hackathon Demo Scenario (SVNIT -> Adajan Gam)
      if (_demoService.scenarios.isNotEmpty) {
        final scenario = _demoService.scenarios.first;
        _userLocation = scenario.origin;
        _destination = scenario.destination;
        _destinationName = scenario.destinationName;
        _routes = scenario.routes;
        if (_routes.isNotEmpty) {
          _selectedRoute = _routes.first;
        }
      }

      // Check initial dead zone status
      _deadZoneAlert = _deadZoneService.checkUserPosition(_userLocation);
    } catch (_) {
      // Keep resilient state
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Calculates safe routes to given destination
  Future<void> calculateRoutes(LatLng dest, String name) async {
    _destination = dest;
    _destinationName = name;
    _isLoading = true;
    notifyListeners();

    try {
      if (_isOffline) {
        // Load from offline persistent cache
        _routes = await _cacheService.getCachedRoutes();
        if (_routes.isEmpty) {
          // If cache was empty, use resilient local generator
          _routes = await _apiService.fetchSafeRoutes(
            origin: _userLocation,
            destination: dest,
          );
        }
      } else {
        _routes = await _apiService.fetchSafeRoutes(
          origin: _userLocation,
          destination: dest,
        );
        // Cache routes offline for future dead zones
        await _cacheService.cacheRoutes(_routes, name);
      }

      if (_routes.isNotEmpty) {
        // Default to safest route (green)
        _selectedRoute = _routes.firstWhere(
          (r) => r.isSafest,
          orElse: () => _routes.first,
        );
      }
    } catch (e) {
      // Fallback
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Select a route to inspect
  void selectRoute(RouteOption route) {
    _selectedRoute = route;
    notifyListeners();
  }

  /// Update simulated or actual user location
  void updateUserLocation(LatLng newLocation) {
    _userLocation = newLocation;
    _deadZoneAlert = _deadZoneService.checkUserPosition(newLocation);
    notifyListeners();
  }

  /// Select a landmark to view its details
  void selectLandmark(Landmark? landmark) {
    _selectedLandmark = landmark;
    notifyListeners();
  }

  /// Get closest safe place (Police or Hospital)
  NearestLandmarkResult? getNearestSafePlace({LandmarkType? filterType}) {
    return _landmarksService.findNearestSafePlace(
      _userLocation,
      filterType: filterType,
      require24Hours: true,
    );
  }

  /// Toggle layers
  void toggleLandmarks(bool value) {
    _showLandmarks = value;
    notifyListeners();
  }

  void toggleHeatmap(bool value) {
    _showHeatmap = value;
    notifyListeners();
  }

  void toggleDeadZones(bool value) {
    _showDeadZones = value;
    notifyListeners();
  }

  /// Toggle manual offline simulation
  Future<void> toggleOfflineMode(bool value) async {
    _isOffline = value;
    await _cacheService.setOfflineModeForced(value);
    notifyListeners();
  }

  /// Load a pre-set presentation scenario
  void loadDemoScenario(String scenarioId) {
    final scenario = _demoService.scenarios.firstWhere(
      (s) => s.id == scenarioId,
      orElse: () => _demoService.scenarios.first,
    );

    _userLocation = scenario.origin;
    _destination = scenario.destination;
    _destinationName = scenario.destinationName;
    _routes = scenario.routes;
    if (_routes.isNotEmpty) {
      _selectedRoute = _routes.first;
    }
    _deadZoneAlert = _deadZoneService.checkUserPosition(_userLocation);
    notifyListeners();
  }

  /// Reset demo to initial SVNIT -> Adajan Gam scenario in one tap
  void resetDemo() {
    if (_demoService.scenarios.isNotEmpty) {
      loadDemoScenario(_demoService.scenarios.first.id);
    }
  }
}
