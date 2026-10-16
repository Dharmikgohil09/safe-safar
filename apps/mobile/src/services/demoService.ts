import { DemoScenario, LatLng } from '../types';
import { parseRouteOption } from '../models/RouteOption';
import demoRoutesData from '../../assets/data/surat_demo_routes.json';

export class DemoService {
  private scenariosList: DemoScenario[] = [];
  private isLoaded = false;

  get scenarios(): DemoScenario[] {
    return [...this.scenariosList];
  }

  async loadScenarios(): Promise<DemoScenario[]> {
    if (this.isLoaded && this.scenariosList.length > 0) {
      return this.scenariosList;
    }

    try {
      const rawList = (demoRoutesData as any)?.scenarios || [];

      this.scenariosList = rawList.map((item: any) => {
        const originCoords = item.origin?.coordinates || [72.7848, 21.1648];
        const destCoords = item.destination?.coordinates || [72.7952, 21.1963];

        const origin: LatLng = {
          latitude: Number(originCoords[1]),
          longitude: Number(originCoords[0]),
        };

        const destination: LatLng = {
          latitude: Number(destCoords[1]),
          longitude: Number(destCoords[0]),
        };

        const routes = (item.routes || []).map(parseRouteOption);

        return {
          id: item.id || `scenario_${Date.now()}`,
          title: item.title || 'Demo Scenario',
          originName: item.origin?.name || 'Origin',
          origin,
          destinationName: item.destination?.name || 'Destination',
          destination,
          routes,
        };
      });

      this.isLoaded = true;
    } catch (_) {
      this.scenariosList = [];
    }

    return this.scenariosList;
  }
}
