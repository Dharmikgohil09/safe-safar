import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';

class DemoControlModal extends StatelessWidget {
  const DemoControlModal({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const DemoControlModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();
    final scenarios = provider.demoScenarios;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.purple.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.smart_toy_rounded, color: Colors.purple, size: 22),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "HACKATHON DEMO CONTROLLER",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    "1-tap scenario testing, seeded data & resets",
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 18),
          const Text(
            "SELECT DEMO SCENARIO",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),

          ...scenarios.map((s) {
            final isCurrent = provider.destinationName == s.destinationName;
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                color: isCurrent ? Colors.purple.shade50 : Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.Border.all(
                  color: isCurrent ? Colors.purple : Colors.grey.shade300,
                  width: isCurrent ? 1.5 : 1,
                ),
              ),
              child: ListTile(
                dense: true,
                title: Text(
                  s.title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: isCurrent ? Colors.purple.shade900 : Colors.black87,
                  ),
                ),
                subtitle: Text(
                  "${s.originName} → ${s.destinationName}",
                  style: const TextStyle(fontSize: 11.5),
                ),
                trailing: isCurrent
                    ? const Icon(Icons.check_circle_rounded, color: Colors.purple)
                    : const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  provider.loadDemoScenario(s.id);
                  Navigator.pop(context);
                },
              ),
            );
          }),

          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 12),

          const Text(
            "SIMULATION SHORTCUTS",
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 8),

          // Simulate entering a dead zone
          ListTile(
            dense: true,
            tileColor: Colors.orange.shade50,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            leading: const Icon(Icons.signal_cellular_connected_no_internet_0_bar_rounded, color: Colors.deepOrange),
            title: const Text("Simulate Entering Dead Zone", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text("Teleports user position into Dumas Mangrove Cellular Blind Spot", style: TextStyle(fontSize: 11)),
            onTap: () {
              // Move user to Dumas dead zone center
              provider.updateUserLocation(const LatLng(21.0921, 72.7154));
              Navigator.pop(context);
            },
          ),

          const SizedBox(height: 8),

          // Toggle offline mode
          SwitchListTile(
            dense: true,
            tileColor: Colors.blueGrey.shade50,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            secondary: Icon(
              provider.isOffline ? Icons.wifi_off_rounded : Icons.wifi_rounded,
              color: provider.isOffline ? Colors.red : Colors.green,
            ),
            title: const Text("Airplane / Offline Mode", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            subtitle: const Text("Tests offline routing from local cache and SMS fallback", style: TextStyle(fontSize: 11)),
            value: provider.isOffline,
            onChanged: (val) {
              provider.toggleOfflineMode(val);
            },
          ),

          const SizedBox(height: 16),

          // 1-Tap Reset Button
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red.shade700,
                side: BorderSide(color: Colors.red.shade400, width: 1.5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              icon: const Icon(Icons.restart_alt_rounded),
              label: const Text(
                "Reset Demo Scenario (SVNIT to Adajan)",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              onPressed: () {
                provider.resetDemo();
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Demo scenario reset: SVNIT -> Adajan Gam with seeded data."),
                    duration: Duration(seconds: 2),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
