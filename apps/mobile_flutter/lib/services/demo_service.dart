import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:latlong2/latlong.dart';
import '../models/route_option.dart';

class DemoScenario {
  final String id;
  final String title;
  final String originName;
  final LatLng origin;
  final String destinationName;
  final LatLng destination;
  final List<RouteOption> routes;

  DemoScenario({
    required this.id,
    required this.title,
    required this.originName,
    required this.origin,
    required this.destinationName,
    required this.destination,
    required this.routes,
  });
}

class DemoService {
  List<DemoScenario> _scenarios = [];
  bool _isLoaded = false;

  List<DemoScenario> get scenarios => List.unmodifiable(_scenarios);

  Future<List<DemoScenario>> loadScenarios() async {
    if (_isLoaded && _scenarios.isNotEmpty) return _scenarios;

    try {
      final jsonString = await rootBundle.loadString('assets/data/surat_demo_routes.json');
      final data = jsonDecode(jsonString);
      final rawList = data['scenarios'] as List<dynamic>;

      _scenarios = rawList.map((item) {
        final originData = item['origin'];
        final destData = item['destination'];

        final originCoords = originData['coordinates'] as List<dynamic>;
        final destCoords = destData['coordinates'] as List<dynamic>;

        final rawRoutes = item['routes'] as List<dynamic>;
        final parsedRoutes = rawRoutes.map((r) => RouteOption.fromJson(r as Map<String, dynamic>)).toList();

        return DemoScenario(
          id: item['id'] as String,
          title: item['title'] as String,
          originName: originData['name'] as String,
          origin: LatLng((originCoords[1] as num).toDouble(), (originCoords[0] as num).toDouble()),
          destinationName: destData['name'] as String,
          destination: LatLng((destCoords[1] as num).toDouble(), (destCoords[0] as num).toDouble()),
          routes: parsedRoutes,
        );
      }).toList();

      _isLoaded = true;
    } catch (_) {
      _scenarios = [];
    }

    return _scenarios;
  }
}
