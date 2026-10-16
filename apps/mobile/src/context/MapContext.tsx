import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  DeadZone,
  DeadZoneAlert,
  DemoScenario,
  IncidentReport,
  Landmark,
  LandmarkType,
  LatLng,
  NearestLandmarkResult,
  RouteOption,
} from '../types';
import { ApiService } from '../services/apiService';
import { LandmarksService } from '../services/landmarksService';
import { DeadZoneService } from '../services/deadZoneService';
import { OfflineCacheService } from '../services/offlineCacheService';
import { DemoService } from '../services/demoService';

export interface MapContextType {
  userLocation: LatLng;
  destination: LatLng | null;
  destinationName: string;
  routes: RouteOption[];
  selectedRoute: RouteOption | null;
  landmarks: Landmark[];
  deadZones: DeadZone[];
  reports: IncidentReport[];
  deadZoneAlert: DeadZoneAlert;
  showLandmarks: boolean;
  showHeatmap: boolean;
  showDeadZones: boolean;
  isOffline: boolean;
  isLoading: boolean;
  selectedLandmark: Landmark | null;
  demoScenarios: DemoScenario[];
  initialize: () => Promise<void>;
  calculateRoutes: (dest: LatLng, name: string) => Promise<void>;
  selectRoute: (route: RouteOption) => void;
  updateUserLocation: (newLocation: LatLng) => void;
  selectLandmark: (landmark: Landmark | null) => void;
  getNearestSafePlace: (options?: { filterType?: LandmarkType }) => NearestLandmarkResult | null;
  toggleLandmarks: (value: boolean) => void;
  toggleHeatmap: (value: boolean) => void;
  toggleDeadZones: (value: boolean) => void;
  toggleOfflineMode: (value: boolean) => Promise<void>;
  loadDemoScenario: (scenarioId: string) => void;
  resetDemo: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{
  children: React.ReactNode;
  apiService?: ApiService;
  landmarksService?: LandmarksService;
  deadZoneService?: DeadZoneService;
  cacheService?: OfflineCacheService;
  demoService?: DemoService;
}> = ({
  children,
  apiService: injectedApiService,
  landmarksService: injectedLandmarksService,
  deadZoneService: injectedDeadZoneService,
  cacheService: injectedCacheService,
  demoService: injectedDemoService,
}) => {
  const apiService = useMemo(() => injectedApiService || new ApiService(), [injectedApiService]);
  const landmarksService = useMemo(() => injectedLandmarksService || new LandmarksService(), [injectedLandmarksService]);
  const deadZoneService = useMemo(() => injectedDeadZoneService || new DeadZoneService(), [injectedDeadZoneService]);
  const cacheService = useMemo(() => injectedCacheService || new OfflineCacheService(), [injectedCacheService]);
  const demoService = useMemo(() => injectedDemoService || new DemoService(), [injectedDemoService]);

  // Default to SVNIT Surat (Hackathon Demo Anchor)
  const [userLocation, setUserLocation] = useState<LatLng>({ latitude: 21.1648, longitude: 72.7848 });
  const [destination, setDestination] = useState<LatLng | null>({ latitude: 21.1963, longitude: 72.7952 });
  const [destinationName, setDestinationName] = useState<string>('Adajan Gam Circle');

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [deadZones, setDeadZones] = useState<DeadZone[]>([]);
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [deadZoneAlert, setDeadZoneAlert] = useState<DeadZoneAlert>({
    state: 'safe',
    hasWarning: false,
    bannerTitle: 'Cellular Network Operational',
    bannerMessage: 'Mobile signal normal.',
  });

  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showDeadZones, setShowDeadZones] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [demoScenarios, setDemoScenarios] = useState<DemoScenario[]>([]);

  const initialize = async () => {
    setIsLoading(true);
    try {
      const loadedLandmarks = await landmarksService.loadLandmarks();
      const loadedDeadZones = await deadZoneService.loadDeadZones();
      const loadedReports = await apiService.fetchIncidentReports();
      const loadedScenarios = await demoService.loadScenarios();
      const offlineForced = await cacheService.isOfflineModeForced();

      setLandmarks(loadedLandmarks);
      setDeadZones(loadedDeadZones);
      setReports(loadedReports);
      setDemoScenarios(loadedScenarios);
      setIsOffline(offlineForced);

      // Automatically load the primary Hackathon Demo Scenario (SVNIT -> Adajan Gam)
      if (loadedScenarios.length > 0) {
        const scenario = loadedScenarios[0];
        setUserLocation(scenario.origin);
        setDestination(scenario.destination);
        setDestinationName(scenario.destinationName);
        setRoutes(scenario.routes);
        if (scenario.routes.length > 0) {
          setSelectedRoute(scenario.routes[0]);
        }
        setDeadZoneAlert(deadZoneService.checkUserPosition(scenario.origin));
      } else {
        setDeadZoneAlert(deadZoneService.checkUserPosition(userLocation));
      }
    } catch (_) {
      // Keep resilient state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const calculateRoutes = async (dest: LatLng, name: string) => {
    setDestination(dest);
    setDestinationName(name);
    setIsLoading(true);

    try {
      let evaluatedRoutes: RouteOption[] = [];
      if (isOffline) {
        evaluatedRoutes = await cacheService.getCachedRoutes();
        if (evaluatedRoutes.length === 0) {
          evaluatedRoutes = await apiService.fetchSafeRoutes({
            origin: userLocation,
            destination: dest,
          });
        }
      } else {
        evaluatedRoutes = await apiService.fetchSafeRoutes({
          origin: userLocation,
          destination: dest,
        });
        await cacheService.cacheRoutes(evaluatedRoutes, name);
      }

      setRoutes(evaluatedRoutes);
      if (evaluatedRoutes.length > 0) {
        const safest = evaluatedRoutes.find((r) => r.isSafest) || evaluatedRoutes[0];
        setSelectedRoute(safest);
      }
    } catch (_) {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const selectRoute = (route: RouteOption) => {
    setSelectedRoute(route);
  };

  const updateUserLocation = (newLocation: LatLng) => {
    setUserLocation(newLocation);
    setDeadZoneAlert(deadZoneService.checkUserPosition(newLocation));
  };

  const selectLandmark = (landmark: Landmark | null) => {
    setSelectedLandmark(landmark);
  };

  const getNearestSafePlace = (options?: { filterType?: LandmarkType }) => {
    return landmarksService.findNearestSafePlace(userLocation, {
      filterType: options?.filterType,
      require24Hours: true,
    });
  };

  const toggleLandmarks = (value: boolean) => {
    setShowLandmarks(value);
  };

  const toggleHeatmap = (value: boolean) => {
    setShowHeatmap(value);
  };

  const toggleDeadZones = (value: boolean) => {
    setShowDeadZones(value);
  };

  const toggleOfflineMode = async (value: boolean) => {
    setIsOffline(value);
    await cacheService.setOfflineModeForced(value);
  };

  const loadDemoScenario = (scenarioId: string) => {
    const scenario = demoScenarios.find((s) => s.id === scenarioId) || demoScenarios[0];
    if (scenario) {
      setUserLocation(scenario.origin);
      setDestination(scenario.destination);
      setDestinationName(scenario.destinationName);
      setRoutes(scenario.routes);
      if (scenario.routes.length > 0) {
        setSelectedRoute(scenario.routes[0]);
      }
      setDeadZoneAlert(deadZoneService.checkUserPosition(scenario.origin));
    }
  };

  const resetDemo = () => {
    if (demoScenarios.length > 0) {
      loadDemoScenario(demoScenarios[0].id);
    }
  };

  const value: MapContextType = {
    userLocation,
    destination,
    destinationName,
    routes,
    selectedRoute,
    landmarks,
    deadZones,
    reports,
    deadZoneAlert,
    showLandmarks,
    showHeatmap,
    showDeadZones,
    isOffline,
    isLoading,
    selectedLandmark,
    demoScenarios,
    initialize,
    calculateRoutes,
    selectRoute,
    updateUserLocation,
    selectLandmark,
    getNearestSafePlace,
    toggleLandmarks,
    toggleHeatmap,
    toggleDeadZones,
    toggleOfflineMode,
    loadDemoScenario,
    resetDemo,
  };

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
};

export const useMapState = (): MapContextType => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error('useMapState must be used within a MapProvider');
  }
  return context;
};
