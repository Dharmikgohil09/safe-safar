export interface MockUser {
  name: string;
  email: string;
  initials: string;
}

export interface MockShareContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  initialChecked: boolean;
}

export interface MockSafetyFactor {
  id: string;
  title: string;
  description: string;
  icon: string;
  ratingText: string;
}

export interface MockRouteInsight {
  id: string;
  type: 'positive' | 'warning' | 'info';
  text: string;
  icon: string;
}

export interface MockRoute {
  id: string;
  name: string;
  tag: string;
  durationMinutes: number;
  durationText: string;
  distanceKm: number;
  distanceText: string;
  safetyScore: number;
  isRecommended: boolean;
  colorType: 'safer' | 'alternative';
  summary: string;
  safetyFactors: MockSafetyFactor[];
  insights: MockRouteInsight[];
}

export const mockUser: MockUser = {
  name: 'Harshil Bamaniya',
  email: 'harshil@example.com',
  initials: 'HB',
};

export const mockShareContacts: MockShareContact[] = [
  {
    id: 'contact-1',
    name: 'Mom',
    phone: '+91 98765 43210',
    relationship: 'Family',
    initialChecked: true,
  },
  {
    id: 'contact-2',
    name: 'Ananya (Friend)',
    phone: '+91 87654 32109',
    relationship: 'Friend',
    initialChecked: true,
  },
  {
    id: 'contact-3',
    name: 'Rohit (Sibling)',
    phone: '+91 76543 21098',
    relationship: 'Sibling',
    initialChecked: false,
  },
];

export const mockSafetyFactors: MockSafetyFactor[] = [
  {
    id: 'factor-lighting',
    title: 'Well-Lit Roads',
    description: 'High density of LED street illumination along major corridors',
    icon: 'wb-incandescent',
    ratingText: '96% Illuminated',
  },
  {
    id: 'factor-crowd',
    title: 'High Crowd & Activity',
    description: 'Active commercial areas, open shops, and regular pedestrian traffic',
    icon: 'groups',
    ratingText: 'Active Pedestrians',
  },
  {
    id: 'factor-police',
    title: 'Police Presence',
    description: 'Passing 2 active police check-posts and frequent PCR patrol points',
    icon: 'local-police',
    ratingText: '2 Check-posts En Route',
  },
  {
    id: 'factor-landmarks',
    title: 'Safe Landmarks',
    description: '24/7 hospitals, verified pharmacies, and transit hubs within reach',
    icon: 'local-hospital',
    ratingText: '3 24/7 Verified Shelters',
  },
  {
    id: 'factor-avoidance',
    title: 'Avoids High-Risk Areas',
    description: 'Path completely circumvents deserted lanes and unmonitored underpasses',
    icon: 'verified-user',
    ratingText: 'Zero Flagged Hazard Zones',
  },
];

export const mockRoutes: MockRoute[] = [
  {
    id: 'route-safer',
    name: 'Safer Route',
    tag: 'Recommended by SafeSafar',
    durationMinutes: 25,
    durationText: '25 min',
    distanceKm: 8.4,
    distanceText: '8.4 km',
    safetyScore: 94,
    isRecommended: true,
    colorType: 'safer',
    summary: 'Via Ring Road & Athwa Lines corridor (Surat)',
    safetyFactors: mockSafetyFactors,
    insights: [
      {
        id: 'insight-1',
        type: 'positive',
        text: 'Well-lit central avenues with 24/7 active retail hubs',
        icon: 'check-circle',
      },
      {
        id: 'insight-2',
        type: 'positive',
        text: '2 active police outposts with emergency SOS coverage',
        icon: 'local-police',
      },
      {
        id: 'insight-3',
        type: 'positive',
        text: 'Zero hazard reports within the last 48 hours',
        icon: 'verified',
      },
      {
        id: 'insight-4',
        type: 'info',
        text: 'Slight traffic slowdown near Majura Gate junction',
        icon: 'traffic',
      },
    ],
  },
  {
    id: 'route-alt',
    name: 'Alternative Route',
    tag: 'Faster Alternate',
    durationMinutes: 28,
    durationText: '28 min',
    distanceKm: 9.1,
    distanceText: '9.1 km',
    safetyScore: 78,
    isRecommended: false,
    colorType: 'alternative',
    summary: 'Via Dumas Road & Canal Bypass (Surat)',
    safetyFactors: [
      mockSafetyFactors[0],
      mockSafetyFactors[1],
      mockSafetyFactors[3],
    ],
    insights: [
      {
        id: 'insight-alt-1',
        type: 'warning',
        text: 'Moderate lighting along 1.2 km section of the Canal road',
        icon: 'warning',
      },
      {
        id: 'insight-alt-2',
        type: 'positive',
        text: 'Direct route bypassing central peak-hour traffic',
        icon: 'alt-route',
      },
      {
        id: 'insight-alt-3',
        type: 'info',
        text: 'Nearest emergency shelter is 800m off the primary highway',
        icon: 'info',
      },
    ],
  },
];
