import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';
import '../models/route_option.dart';
import 'safety_badge.dart';
import 'route_detail_bottom_sheet.dart';

class RouteSelectionPanel extends StatelessWidget {
  const RouteSelectionPanel({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();
    final routes = provider.routes;
    final selected = provider.selectedRoute;

    if (routes.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            children: [
              const Text(
                "ROUTE ALTERNATIVES",
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.1,
                  color: Colors.white,
                  shadows: [
                    Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 1)),
                  ],
                ),
              ),
              const Spacer(),
              Text(
                "${routes.length} options evaluated",
                style: const TextStyle(
                  fontSize: 11,
                  color: Colors.white70,
                  fontWeight: FontWeight.w600,
                  shadows: [
                    Shadow(color: Colors.black54, blurRadius: 4, offset: Offset(0, 1)),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Route Cards Carousel
        SizedBox(
          height: 155,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            scrollDirection: Axis.horizontal,
            itemCount: routes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final route = routes[index];
              final isSelected = selected?.routeId == route.routeId;

              return GestureDetector(
                onTap: () {
                  provider.selectRoute(route);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 280,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.Border.all(
                      color: isSelected ? route.routeColor : Colors.grey.shade300,
                      width: isSelected ? 2.5 : 1.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isSelected
                            ? route.routeColor.withOpacity(0.25)
                            : Colors.black.withOpacity(0.08),
                        blurRadius: isSelected ? 12 : 6,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Top row: Score + Distance
                      Row(
                        children: [
                          SafetyBadge(
                            score: route.safetyScore,
                            tier: route.tier,
                            isCompact: true,
                          ),
                          const Spacer(),
                          Row(
                            children: [
                              Icon(Icons.directions_walk_rounded, size: 16, color: Colors.grey.shade700),
                              const SizedBox(width: 2),
                              Text(
                                route.formattedDuration,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '(${route.formattedDistance})',
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Route name
                      Text(
                        route.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 13.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),

                      // Plain language explanation preview
                      Text(
                        route.explanation,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 11.5,
                          height: 1.25,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),

                      // Bottom action: Tap to inspect
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          InkWell(
                            onTap: () {
                              provider.selectRoute(route);
                              RouteDetailBottomSheet.show(context, route);
                            },
                            child: Row(
                              children: [
                                Text(
                                  "View Safety Factors",
                                  style: TextStyle(
                                    color: route.routeColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11.5,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                Icon(Icons.arrow_forward_ios_rounded, size: 10, color: route.routeColor),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
