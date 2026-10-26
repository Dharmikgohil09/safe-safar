import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';
import '../models/landmark.dart';

class NearestSafeDialog extends StatelessWidget {
  const NearestSafeDialog({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NearestSafeDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();
    final nearestPolice = provider.getNearestSafePlace(filterType: LandmarkType.police);
    final nearestHospital = provider.getNearestSafePlace(filterType: LandmarkType.hospital);
    final nearestPharmacy = provider.getNearestSafePlace(filterType: LandmarkType.pharmacy);

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
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

          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.shield_rounded, color: Color(0xFF1E88E5), size: 24),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "NEAREST SAFE HAVENS",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                  Text(
                    "Instant emergency route to verified guarded facilities",
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 18),

          // Nearest Police
          if (nearestPolice != null)
            _buildLandmarkCard(
              context,
              provider,
              nearestPolice.landmark,
              nearestPolice.formattedDistance,
            ),

          const SizedBox(height: 12),

          // Nearest Hospital
          if (nearestHospital != null)
            _buildLandmarkCard(
              context,
              provider,
              nearestHospital.landmark,
              nearestHospital.formattedDistance,
            ),

          const SizedBox(height: 12),

          // Nearest 24/7 Pharmacy
          if (nearestPharmacy != null)
            _buildLandmarkCard(
              context,
              provider,
              nearestPharmacy.landmark,
              nearestPharmacy.formattedDistance,
            ),
        ],
      ),
    );
  }

  Widget _buildLandmarkCard(
    BuildContext context,
    MapStateProvider provider,
    Landmark landmark,
    String formattedDistance,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.Border.all(color: landmark.color.withOpacity(0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: landmark.color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(landmark.icon, color: landmark.color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        landmark.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        formattedDistance,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  landmark.address,
                  style: TextStyle(color: Colors.grey.shade700, fontSize: 11.5),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: landmark.color,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        minimumSize: Size.zero,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.directions_rounded, size: 14),
                      label: const Text("Navigate Here", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        provider.calculateRoutes(landmark.coordinates, landmark.name);
                        Navigator.pop(context);
                      },
                    ),
                    if (landmark.phone.isNotEmpty) ...[
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.grey.shade800,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          minimumSize: Size.zero,
                          side: BorderSide(color: Colors.grey.shade400),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.phone_rounded, size: 14, color: Colors.green),
                        label: Text(landmark.phone, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text("Calling ${landmark.name} (${landmark.phone})...")),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
