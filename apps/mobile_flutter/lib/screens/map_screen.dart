import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';
import '../models/landmark.dart';
import '../widgets/destination_search_bar.dart';
import '../widgets/dead_zone_warning_banner.dart';
import '../widgets/route_selection_panel.dart';
import '../widgets/map_layer_fab.dart';
import '../widgets/route_detail_bottom_sheet.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MapStateProvider>().initialize();
    });
  }

  void _showLandmarkDetails(Landmark landmark) {
    final provider = context.read<MapStateProvider>();
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: landmark.color.withOpacity(0.12), shape: BoxShape.circle),
                    child: Icon(landmark.icon, color: landmark.color, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(landmark.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text(landmark.typeLabel, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(landmark.address, style: const TextStyle(fontSize: 13, height: 1.3)),
              if (landmark.zone.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text("Zone: ${landmark.zone}", style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: landmark.color,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.directions_rounded),
                      label: const Text("Route to Landmark", style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.pop(ctx);
                        provider.calculateRoutes(landmark.coordinates, landmark.name);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();

    return Scaffold(
      body: Stack(
        children: [
          // 1. The Interactive Flutter Map
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: provider.userLocation,
              initialZoom: 13.5,
              minZoom: 9.0,
              maxZoom: 18.0,
              onTap: (_, __) {
                // Deselect active landmark if tapped away
                provider.selectLandmark(null);
              },
            ),
            children: [
              // OpenStreetMap Tile Layer
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.safesafar.app',
                maxZoom: 19,
              ),

              // Cellular Dead Zones Circles Layer
              if (provider.showDeadZones)
                CircleLayer(
                  circles: provider.deadZones.map((dz) {
                    return CircleMarker(
                      point: dz.center,
                      radius: dz.radiusMeters,
                      useRadiusInMeter: true,
                      color: dz.circleColor,
                      borderColor: dz.borderColor,
                      borderStrokeWidth: 2.0,
                    );
                  }).toList(),
                ),

              // Incident Reports Heatmap Layer (Visual density circles)
              if (provider.showHeatmap)
                CircleLayer(
                  circles: provider.reports.map((rep) {
                    final double radius = 120.0 + (rep.severity * 30.0);
                    return CircleMarker(
                      point: rep.coordinates,
                      radius: radius,
                      useRadiusInMeter: true,
                      color: rep.color.withOpacity(0.24),
                      borderColor: rep.color.withOpacity(0.6),
                      borderStrokeWidth: 1.5,
                    );
                  }).toList(),
                ),

              // Polylines Layer for 2-3 Safe Alternative Routes
              PolylineLayer(
                polylines: [
                  // First draw unselected routes in background
                  ...provider.routes
                      .where((r) => r.routeId != provider.selectedRoute?.routeId)
                      .map((r) {
                    return Polyline(
                      points: r.coordinates,
                      strokeWidth: 4.5,
                      color: r.routeColor.withOpacity(0.55),
                    );
                  }),
                  // Draw selected active route on top with border casing
                  if (provider.selectedRoute != null) ...[
                    Polyline(
                      points: provider.selectedRoute!.coordinates,
                      strokeWidth: 9.0,
                      color: Colors.white,
                    ),
                    Polyline(
                      points: provider.selectedRoute!.coordinates,
                      strokeWidth: 6.5,
                      color: provider.selectedRoute!.routeColor,
                    ),
                  ],
                ],
              ),

              // Markers Layer: Current Location, Destination, Landmarks, Reports
              MarkerLayer(
                markers: [
                  // Current User Location Marker (SVNIT Surat)
                  Marker(
                    point: provider.userLocation,
                    width: 50,
                    height: 50,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF1E88E5).withOpacity(0.2),
                          ),
                        ),
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF1E88E5),
                            border: Border.all(color: Colors.white, width: 3),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Destination Marker
                  if (provider.destination != null)
                    Marker(
                      point: provider.destination!,
                      width: 44,
                      height: 44,
                      alignment: Alignment.topCenter,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: Color(0xFFD32F2F),
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 3)),
                              ],
                            ),
                            child: const Icon(Icons.flag_rounded, color: Colors.white, size: 18),
                          ),
                          Container(
                            width: 2,
                            height: 6,
                            color: const Color(0xFFD32F2F),
                          ),
                        ],
                      ),
                    ),

                  // Landmarks Markers (Police, Hospitals, Schools, Pharmacies)
                  if (provider.showLandmarks)
                    ...provider.landmarks.map((landmark) {
                      return Marker(
                        point: landmark.coordinates,
                        width: 34,
                        height: 34,
                        child: GestureDetector(
                          onTap: () => _showLandmarkDetails(landmark),
                          child: Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              border: Border.all(color: landmark.color, width: 2),
                              boxShadow: const [
                                BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                              ],
                            ),
                            child: Icon(landmark.icon, size: 16, color: landmark.color),
                          ),
                        ),
                      );
                    }),

                  // Community Incident Heatmap Markers
                  if (provider.showHeatmap)
                    ...provider.reports.map((report) {
                      return Marker(
                        point: report.coordinates,
                        width: 28,
                        height: 28,
                        child: Container(
                          decoration: BoxDecoration(
                            color: report.color,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 1.5),
                            boxShadow: const [
                              BoxShadow(color: Colors.black26, blurRadius: 3, offset: Offset(0, 1)),
                            ],
                          ),
                          child: Icon(report.icon, size: 14, color: Colors.white),
                        ),
                      );
                    }),
                ],
              ),
            ],
          ),

          // 2. Top Bar (Search + Dead-Zone Warning Banner)
          SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                const DestinationSearchBar(),
                DeadZoneWarningBanner(alert: provider.deadZoneAlert),
              ],
            ),
          ),

          // 3. Right Floating Action Buttons (Safe Havens, Layers, Demo Controller, Recenter)
          Positioned(
            right: 14,
            bottom: 180,
            child: MapLayerFab(mapController: _mapController),
          ),

          // 4. Bottom Route Alternatives Carousel
          const Positioned(
            left: 0,
            right: 0,
            bottom: 12,
            child: RouteSelectionPanel(),
          ),
        ],
      ),
    );
  }
}
