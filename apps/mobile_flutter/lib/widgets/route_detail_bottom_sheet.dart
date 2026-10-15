import 'package:flutter/material.dart';
import '../models/route_option.dart';
import 'safety_badge.dart';

class RouteDetailBottomSheet extends StatelessWidget {
  final RouteOption route;

  const RouteDetailBottomSheet({super.key, required this.route});

  static void show(BuildContext context, RouteOption route) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RouteDetailBottomSheet(route: route),
    );
  }

  @override
  Widget build(BuildContext context) {
    final factors = route.safetyFactors;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
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

          // Header: Name + Badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      route.name,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "${route.formattedDuration} (${route.formattedDistance})",
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              SafetyBadge(score: route.safetyScore, tier: route.tier),
            ],
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),

          // Plain Language Explanation
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: route.routeColor.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.Border.all(color: route.routeColor.withOpacity(0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.shield_outlined, color: route.routeColor, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    route.explanation,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade900,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),
          const Text(
            "SAFETY METRICS BREAKDOWN",
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 12),

          // Factors
          _buildMetricRow("Street Illumination", factors.lightingScore, Icons.lightbulb_rounded, Colors.amber.shade700),
          const SizedBox(height: 10),
          _buildMetricRow("Police Post Proximity", factors.policeProximityScore, Icons.local_police_rounded, const Color(0xFF1E88E5)),
          const SizedBox(height: 10),
          _buildMetricRow("Incident-Free Index", factors.incidentDecayScore, Icons.verified_user_rounded, const Color(0xFF43A047)),

          // Danger Alerts
          if (route.dangerAlerts.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text(
              "ACTIVE HAZARDS ALONG ROUTE",
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: Color(0xFFD32F2F),
              ),
            ),
            const SizedBox(height: 8),
            ...route.dangerAlerts.map(
              (alert) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: Color(0xFFD32F2F)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        alert,
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 20),

          // Action: Start Walk Me Home CTA
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: route.routeColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 2,
              ),
              icon: const Icon(Icons.directions_walk_rounded),
              label: const Text(
                "Start Walk Me Home on this Route",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              onPressed: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: const Color(0xFF1E88E5),
                    content: Text(
                      "Trip navigation initiated via ${route.name}. Sharing live telemetry with trusted contacts.",
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricRow(String title, int score, IconData icon, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const Spacer(),
            Text(
              "$score%",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: score / 100.0,
            minHeight: 6,
            backgroundColor: Colors.grey.shade200,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}
