import { LandmarksService } from '../src/services/landmarksService';
import { Landmark, LatLng } from '../src/types';

describe('LandmarksService Tests', () => {
  let service: LandmarksService;

  const mockLandmarks: Landmark[] = [
    {
      id: 'pol_1',
      name: 'Umra Police Station',
      type: 'police',
      coordinates: { latitude: 21.1685, longitude: 72.7935 },
      address: 'Athwa Lines, Umra',
      phone: '+91 261 222 3444',
      isOpen24Hours: true,
      zone: 'Umra',
    },
    {
      id: 'hosp_1',
      name: 'New Civil Hospital',
      type: 'hospital',
      coordinates: { latitude: 21.1712, longitude: 72.8189 },
      address: 'Majura Gate',
      phone: '+91 261 224 4456',
      isOpen24Hours: true,
      zone: 'Majura',
    },
    {
      id: 'sch_1',
      name: 'SVNIT Surat',
      type: 'school',
      coordinates: { latitude: 21.1648, longitude: 72.7848 },
      address: 'Ichchhanath',
      phone: '+91 261 225 9571',
      isOpen24Hours: true,
      zone: 'SVNIT',
    },
  ];

  beforeEach(() => {
    service = new LandmarksService();
    service.setLandmarks(mockLandmarks);
  });

  test('Filter by type returns only matching landmarks', () => {
    const police = service.filterByType('police');
    expect(police.length).toBe(1);
    expect(police[0].name).toBe('Umra Police Station');
  });

  test('findNearestSafePlace returns closest landmark accurately', () => {
    // User standing right outside SVNIT
    const userLoc: LatLng = { latitude: 21.165, longitude: 72.785 };
    const nearest = service.findNearestSafePlace(userLoc);

    expect(nearest).not.toBeNull();
    expect(nearest!.landmark.name).toBe('SVNIT Surat');
    expect(nearest!.distanceMeters).toBeLessThan(100);
  });

  test('findNearestSafePlace with filterType returns closest matching type', () => {
    const userLoc: LatLng = { latitude: 21.165, longitude: 72.785 };
    const nearestPolice = service.findNearestSafePlace(userLoc, { filterType: 'police' });

    expect(nearestPolice).not.toBeNull();
    expect(nearestPolice!.landmark.type).toBe('police');
    expect(nearestPolice!.landmark.name).toBe('Umra Police Station');
  });
});
