import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../providers/map_state_provider.dart';

class DestinationSearchBar extends StatefulWidget {
  const DestinationSearchBar({super.key});

  @override
  State<DestinationSearchBar> createState() => _DestinationSearchBarState();
}

class _DestinationSearchBarState extends State<DestinationSearchBar> {
  late TextEditingController _controller;

  // Preset quick navigation spots in Surat
  final List<Map<String, dynamic>> _quickSpots = [
    {
      "name": "Adajan Gam",
      "coords": const LatLng(21.1963, 72.7952),
      "tag": "Demo End",
    },
    {
      "name": "VR Mall Surat",
      "coords": const LatLng(21.1442, 72.7565),
      "tag": "Mall & Hub",
    },
    {
      "name": "Surat Railway Stn",
      "coords": const LatLng(21.2044, 72.8407),
      "tag": "Transit",
    },
    {
      "name": "SVNIT Campus",
      "coords": const LatLng(21.1648, 72.7848),
      "tag": "Demo Start",
    },
    {
      "name": "Dumas Silent Zone",
      "coords": const LatLng(21.0921, 72.7154),
      "tag": "Dead Zone Test",
    },
  ];

  @override
  void initState() {
    super.initState();
    final provider = context.read<MapStateProvider>();
    _controller = TextEditingController(text: provider.destinationName);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MapStateProvider>();

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Main Search Card
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.12),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Origin display
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 4),
                child: Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: const BoxDecoration(
                        color: Color(0xFF1E88E5),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        "Current Location (SVNIT Dumas Road)",
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                          fontWeight: FontWeight.w600,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (provider.isOffline)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade100,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          "OFFLINE",
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade900,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const Divider(height: 8, indent: 36, endIndent: 14),
              // Destination Input
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 2, 8, 8),
                child: Row(
                  children: [
                    const Icon(Icons.place_rounded, color: Color(0xFFD32F2F), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(
                          hintText: "Enter destination in Surat...",
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.symmetric(vertical: 8),
                        ),
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                        onSubmitted: (val) {
                          // Default to Adajan Gam if typed
                          provider.calculateRoutes(
                            const LatLng(21.1963, 72.7952),
                            val.isNotEmpty ? val : "Adajan Gam",
                          );
                        },
                      ),
                    ),
                    if (provider.isLoading)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      IconButton(
                        icon: const Icon(Icons.search_rounded, color: Color(0xFF1E88E5)),
                        onPressed: () {
                          provider.calculateRoutes(
                            const LatLng(21.1963, 72.7952),
                            _controller.text.isNotEmpty ? _controller.text : "Adajan Gam",
                          );
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Quick destination chips
        Container(
          height: 38,
          margin: const EdgeInsets.only(top: 8),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            scrollDirection: Axis.horizontal,
            itemCount: _quickSpots.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final spot = _quickSpots[index];
              final isSelected = provider.destinationName == spot['name'];

              return GestureDetector(
                onTap: () {
                  setState(() {
                    _controller.text = spot['name'] as String;
                  });
                  provider.calculateRoutes(
                    spot['coords'] as LatLng,
                    spot['name'] as String,
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF1E88E5) : Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.Border.all(
                      color: isSelected ? const Color(0xFF1E88E5) : Colors.grey.shade300,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.navigation_outlined,
                        size: 14,
                        color: isSelected ? Colors.white : Colors.grey.shade700,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        spot['name'] as String,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? Colors.white : Colors.grey.shade800,
                        ),
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
