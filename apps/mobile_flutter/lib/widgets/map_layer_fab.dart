import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';
import 'nearest_safe_dialog.dart';
import 'demo_control_modal.dart';

class MapLayerFab extends StatelessWidget {
  final MapController mapController;

  const MapLayerFab({super.key, required this.mapController});

  void _showLayersDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) {
        return Consumer<MapStateProvider>(
          builder: (context, provider, _) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.layers_rounded, color: Color(0xFF1E88E5)),
                  SizedBox(width: 8),
                  Text("Map Layers & Overlays", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SwitchListTile(
                    dense: true,
                    title: const Text("Landmarks & Safe Havens", style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text("Police, 24/7 hospitals, schools", style: TextStyle(fontSize: 11)),
                    value: provider.showLandmarks,
                    onChanged: (val) => provider.toggleLandmarks(val),
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    dense: true,
                    title: const Text("Community Reports Heatmap", style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text("Incident clusters, harassment, dark spots", style: TextStyle(fontSize: 11)),
                    value: provider.showHeatmap,
                    onChanged: (val) => provider.toggleHeatmap(val),
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    dense: true,
                    title: const Text("Cellular Dead Zones", style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text("Known low-coverage RF blind spots", style: TextStyle(fontSize: 11)),
                    value: provider.showDeadZones,
                    onChanged: (val) => provider.toggleDeadZones(val),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  child: const Text("Done", style: TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: () => Navigator.pop(ctx),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // 1. Nearest Safe Place SOS Button (High priority shield)
        FloatingActionButton.small(
          heroTag: "fab_nearest_safe",
          backgroundColor: const Color(0xFF1E88E5),
          foregroundColor: Colors.white,
          tooltip: "Nearest Safe Haven",
          onPressed: () => NearestSafeDialog.show(context),
          child: const Icon(Icons.shield_rounded, size: 20),
        ),
        const SizedBox(height: 10),

        // 2. Demo Mode Controller
        FloatingActionButton.small(
          heroTag: "fab_demo_mode",
          backgroundColor: Colors.purple.shade700,
          foregroundColor: Colors.white,
          tooltip: "Demo Controls",
          onPressed: () => DemoControlModal.show(context),
          child: const Icon(Icons.smart_toy_rounded, size: 18),
        ),
        const SizedBox(height: 10),

        // 3. Layer Filter
        FloatingActionButton.small(
          heroTag: "fab_layers",
          backgroundColor: Colors.white,
          foregroundColor: Colors.grey.shade800,
          tooltip: "Layer Overlays",
          onPressed: () => _showLayersDialog(context),
          child: const Icon(Icons.layers_rounded, size: 20),
        ),
        const SizedBox(height: 10),

        // 4. Recenter GPS
        FloatingActionButton.small(
          heroTag: "fab_recenter",
          backgroundColor: Colors.white,
          foregroundColor: const Color(0xFF1E88E5),
          tooltip: "Recenter to My Location",
          onPressed: () {
            mapController.move(provider.userLocation, 14.5);
          },
          child: const Icon(Icons.my_location_rounded, size: 20),
        ),
      ],
    );
  }
}
