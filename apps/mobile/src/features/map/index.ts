/**
 * SafeSafar - Map & Safe Navigation Feature Module
 * Owner: Dhruv Raval (@dhruv)
 *
 * Public interface for SafeSafar Maps, Safe Routing, and Landmark Havens
 * fully implemented in React Native & TypeScript.
 */

import { MapScreen } from '../../screens/MapScreen';

// Types & Models
export * from '../../types';
export * from '../../models/SafetyFactors';
export * from '../../models/DeadZone';
export * from '../../models/IncidentReport';
export * from '../../models/Landmark';
export * from '../../models/RouteOption';

// Utilities
export * from '../../utils/geo';

// Services & Safe Route Client
export * from './safeRouteClient';
export * from './mockRoutes';
export * from './safePlaceHelper';
export * from './offlineManager';
export * from './reportClient';
export * from '../../services/deadZoneService';
export * from '../../services/landmarksService';
export * from '../../services/offlineCacheService';
export * from '../../services/demoService';
export * from '../../services/apiService';
export * from '../../services/geocodingService';

// State & Context
export * from '../../context/MapContext';

// Components & UI
export * from '../../components/SafetyBadge';
export * from '../../components/DeadZoneWarningBanner';
export * from '../../components/DestinationSearchBar';
export * from '../../components/RouteSelectionPanel';
export * from '../../components/RouteDetailModal';
export * from '../../components/NearestSafeModal';
export * from '../../components/DemoControlModal';
export * from '../../components/MapLayerControls';
export * from '../../components/MapViewComponent';
export * from '../../screens/MapScreen';

// Default export for route files expecting default export
export default MapScreen;

// Default Demo Anchor: SVNIT Surat
export const SVNIT_SURAT_COORDINATES = {
  latitude: 21.1648,
  longitude: 72.7848,
};

// Default Demo Destination: Adajan Gam Circle
export const ADAJAN_GAM_COORDINATES = {
  latitude: 21.1963,
  longitude: 72.7952,
};
