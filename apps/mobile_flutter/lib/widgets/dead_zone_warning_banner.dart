import 'package:flutter/material.dart';
import '../services/dead_zone_service.dart';

class DeadZoneWarningBanner extends StatelessWidget {
  final DeadZoneAlert alert;
  final VoidCallback? onDismiss;

  const DeadZoneWarningBanner({
    super.key,
    required this.alert,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    if (!alert.hasWarning) return const SizedBox.shrink();

    final isInside = alert.state == DeadZoneState.inside;
    final primaryColor = isInside ? const Color(0xFFD32F2F) : const Color(0xFFE65100);
    final bgColor = isInside ? const Color(0xFFFFEBEE) : const Color(0xFFFFF3E0);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeInOut,
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.Border.all(color: primaryColor, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: primaryColor,
              shape: BoxShape.circle,
            ),
            child: Icon(
              isInside ? Icons.signal_cellular_connected_no_internet_0_bar_rounded : Icons.signal_cellular_alt_2_bar_rounded,
              color: Colors.white,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      isInside ? "CELLULAR DEAD ZONE" : "DEAD ZONE APPROACHING",
                      style: TextStyle(
                        color: primaryColor,
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        letterSpacing: 0.6,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        "OFFLINE ACTIVE",
                        style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  alert.bannerMessage,
                  style: TextStyle(
                    color: Colors.grey.shade900,
                    fontSize: 12.5,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(Icons.check_circle_outline, size: 14, color: Colors.green.shade800),
                    const SizedBox(width: 4),
                    Text(
                      "Route cached offline • SMS SOS ready",
                      style: TextStyle(
                        color: Colors.green.shade800,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
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
