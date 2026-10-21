/// Quantified safety breakdown metrics
class SafetyFactors {
  final int lightingScore;
  final int policeProximityScore;
  final int incidentDecayScore;

  const SafetyFactors({
    required this.lightingScore,
    required this.policeProximityScore,
    required this.incidentDecayScore,
  });

  factory SafetyFactors.fromJson(Map<String, dynamic> json) {
    return SafetyFactors(
      lightingScore: json['lightingScore'] as int? ?? 70,
      policeProximityScore: json['policeProximityScore'] as int? ?? 70,
      incidentDecayScore: json['incidentDecayScore'] as int? ?? 70,
    );
  }

  Map<String, dynamic> toJson() => {
    'lightingScore': lightingScore,
    'policeProximityScore': policeProximityScore,
    'incidentDecayScore': incidentDecayScore,
  };
}
