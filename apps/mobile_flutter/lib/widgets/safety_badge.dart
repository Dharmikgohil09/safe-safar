import 'package:flutter/material.dart';
import '../models/route_option.dart';

class SafetyBadge extends StatelessWidget {
  final int score;
  final SafetyTier tier;
  final bool isCompact;

  const SafetyBadge({
    super.key,
    required this.score,
    required this.tier,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    String label;
    IconData icon;

    switch (tier) {
      case SafetyTier.safe:
        bg = const Color(0xFFE8F5E9);
        textColor = const Color(0xFF2E7D32);
        label = "Safest";
        icon = Icons.verified_user_rounded;
        break;
      case SafetyTier.moderate:
        bg = const Color(0xFFFFF8E1);
        textColor = const Color(0xFFF57F17);
        label = "Moderate";
        icon = Icons.info_outline_rounded;
        break;
      case SafetyTier.risky:
        bg = const Color(0xFFFFEBEE);
        textColor = const Color(0xFFC62828);
        label = "High Risk";
        icon = Icons.warning_rounded;
        break;
    }

    if (isCompact) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(12),
          border: Border.Border.all(color: textColor.withOpacity(0.4), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: textColor),
            const SizedBox(width: 4),
            Text(
              '$score',
              style: TextStyle(
                color: textColor,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.Border.all(color: textColor.withOpacity(0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: textColor.withOpacity(0.15),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 6),
          Text(
            '$score/100',
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w900,
              fontSize: 13,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '• $label',
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
