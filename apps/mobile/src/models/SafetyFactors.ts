import { SafetyFactors } from '../types';

export function parseSafetyFactors(json?: any): SafetyFactors {
  return {
    lightingScore: typeof json?.lightingScore === 'number' ? json.lightingScore : 70,
    policeProximityScore: typeof json?.policeProximityScore === 'number' ? json.policeProximityScore : 70,
    incidentDecayScore: typeof json?.incidentDecayScore === 'number' ? json.incidentDecayScore : 70,
  };
}
