import { LocationPayload, TrackingSession, SosState } from '../types/tracker';

export interface MockLocationEmitter {
  start: (onLocation: (payload: LocationPayload) => void, onStatusChange?: (status: string) => void) => void;
  stop: () => void;
  pause?: () => void;
  resume?: (onLocation?: (payload: LocationPayload) => void) => void;
  triggerNextPoint?: () => void;
  reset?: () => void;
  isCompleted?: () => boolean;
}

// Sample route coordinates (Connaught Place to India Gate & Lodhi Colony, New Delhi)
const MOCK_ROUTE: [number, number, number][] = [
  // [lat, lng, heading]
  [28.6315, 77.2167, 135],
  [28.6298, 77.2185, 135],
  [28.6275, 77.2208, 140],
  [28.6248, 77.2235, 145],
  [28.6215, 77.2268, 150],
  [28.6180, 77.2289, 155],
  [28.6145, 77.2295, 170],
  [28.6129, 77.2295, 180], // India Gate area
  [28.6085, 77.2285, 190],
  [28.6040, 77.2265, 200],
  [28.5985, 77.2240, 205],
  [28.5930, 77.2215, 210],
  [28.5880, 77.2190, 210], // Lodhi Colony / Destination approach
  [28.5875, 77.2185, 210], // Lodhi Estate / Destination arrival point
];

export function getMockSession(token: string): TrackingSession {
  // Test special tokens for simulating different states during IEEE judging / QA
  if (token === 'invalid-token') {
    throw new Error('SESSION_INVALID');
  }
  if (token === 'expired-token') {
    return {
      token,
      userName: 'Priya Verma',
      status: 'expired',
      sosState: 'normal',
      lastUpdated: Date.now() - 3600000,
      startedAt: Date.now() - 7200000,
      isMock: true,
    };
  }

  // State B Demo: SOS Active initial state
  if (token === 'sos-active') {
    return {
      token,
      userName: 'Ananya Sharma',
      userPhoneMasked: '+91 98*** **412',
      status: 'sos',
      sosState: 'active',
      destination: {
        name: 'Home (Lodhi Estate, Central Delhi)',
        latitude: 28.5875,
        longitude: 77.2185,
        address: 'Block 4, Lodhi Colony, New Delhi',
      },
      currentLocation: {
        latitude: MOCK_ROUTE[4][0],
        longitude: MOCK_ROUTE[4][1],
        accuracy: 9,
        speed: 12.0,
        heading: MOCK_ROUTE[4][2],
      },
      lastUpdated: Date.now() - 15000,
      batteryLevel: 42,
      startedAt: Date.now() - 25 * 60 * 1000,
      emergencyContactName: 'Rahul Sharma (Brother)',
      isMock: true,
    };
  }

  // State C Demo: SOS Resolved state
  if (token === 'sos-resolved') {
    return {
      token,
      userName: 'Ananya Sharma',
      userPhoneMasked: '+91 98*** **412',
      status: 'resolved',
      sosState: 'resolved',
      destination: {
        name: 'Home (Lodhi Estate, Central Delhi)',
        latitude: 28.5875,
        longitude: 77.2185,
        address: 'Block 4, Lodhi Colony, New Delhi',
      },
      currentLocation: {
        latitude: MOCK_ROUTE[8][0],
        longitude: MOCK_ROUTE[8][1],
        accuracy: 7,
        speed: 24.5,
        heading: MOCK_ROUTE[8][2],
      },
      lastUpdated: Date.now() - 5000,
      batteryLevel: 71,
      startedAt: Date.now() - 30 * 60 * 1000,
      emergencyContactName: 'Rahul Sharma (Brother)',
      isMock: true,
    };
  }

  // Edge case: Missing destination test
  if (token === 'no-destination') {
    return {
      token,
      userName: 'Ananya Sharma',
      userPhoneMasked: '+91 98*** **412',
      status: 'active',
      sosState: 'normal',
      destination: null, // Graceful missing destination
      currentLocation: {
        latitude: MOCK_ROUTE[0][0],
        longitude: MOCK_ROUTE[0][1],
        accuracy: 8,
        speed: 28.5,
        heading: MOCK_ROUTE[0][2],
      },
      lastUpdated: Date.now(),
      batteryLevel: 80,
      startedAt: Date.now() - 10 * 60 * 1000,
      emergencyContactName: 'Rahul Sharma (Brother)',
      isMock: true,
    };
  }

  // Edge case: Missing timestamp test
  if (token === 'no-timestamp') {
    return {
      token,
      userName: 'Ananya Sharma',
      userPhoneMasked: '+91 98*** **412',
      status: 'active',
      sosState: 'normal',
      destination: {
        name: 'Home (Lodhi Estate, Central Delhi)',
        latitude: 28.5875,
        longitude: 77.2185,
        address: 'Block 4, Lodhi Colony, New Delhi',
      },
      currentLocation: {
        latitude: MOCK_ROUTE[0][0],
        longitude: MOCK_ROUTE[0][1],
        accuracy: 8,
        speed: 28.5,
        heading: MOCK_ROUTE[0][2],
      },
      lastUpdated: null, // Missing timestamp
      batteryLevel: 78,
      startedAt: Date.now() - 15 * 60 * 1000,
      emergencyContactName: 'Rahul Sharma (Brother)',
      isMock: true,
    };
  }

  // Default: State A (Normal Trip)
  return {
    token,
    userName: 'Ananya Sharma',
    userPhoneMasked: '+91 98*** **412',
    status: 'active',
    sosState: 'normal',
    destination: {
      name: 'Home (Lodhi Estate, Central Delhi)',
      latitude: 28.5875,
      longitude: 77.2185,
      address: 'Block 4, Lodhi Colony, New Delhi',
    },
    currentLocation: {
      latitude: MOCK_ROUTE[0][0],
      longitude: MOCK_ROUTE[0][1],
      accuracy: 8,
      speed: 28.5,
      heading: MOCK_ROUTE[0][2],
    },
    lastUpdated: Date.now(),
    batteryLevel: 78,
    startedAt: Date.now() - 15 * 60 * 1000,
    emergencyContactName: 'Rahul Sharma (Brother)',
    isMock: true,
  };
}

export interface MockEmitterOptions {
  omitTimestamp?: boolean;
}

export function createMockEmitter(
  intervalMs = 3500,
  options?: MockEmitterOptions
): MockLocationEmitter {
  let timer: NodeJS.Timeout | null = null;
  let currentIndex = 0;
  let battery = 78;
  let isStarted = false;
  let isCompleted = false;
  let activeCallback: ((payload: LocationPayload) => void) | null = null;
  let activeStatusCallback: ((status: string) => void) | null = null;
  const shouldOmitTimestamp = options?.omitTimestamp === true;

  const emitPoint = (index: number, cb: (payload: LocationPayload) => void) => {
    const [lat, lng, heading] = MOCK_ROUTE[index];
    const isInitial = index === 0 && !isStarted;
    const isFinal = index === MOCK_ROUTE.length - 1;
    // Do not add random jitter to initial or arrival point to keep pins exact
    const jitterLat = isInitial || isFinal ? 0 : (Math.random() - 0.5) * 0.0001;
    const jitterLng = isInitial || isFinal ? 0 : (Math.random() - 0.5) * 0.0001;

    if (index % 4 === 0 && battery > 10) {
      battery -= 1;
    }

    cb({
      latitude: lat + jitterLat,
      longitude: lng + jitterLng,
      accuracy: isInitial || isFinal ? 5 : 5 + Math.random() * 6,
      speed: isFinal ? 0 : isInitial ? 26 + Math.random() * 6 : 24 + Math.random() * 8,
      heading: isInitial || isFinal ? heading : heading + (Math.random() - 0.5) * 5,
      timestamp: shouldOmitTimestamp ? null : Date.now(),
      batteryLevel: battery,
    });
  };

  const clearTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startInterval = (cb: (payload: LocationPayload) => void) => {
    clearTimer();
    if (isCompleted) return;

    timer = setInterval(() => {
      if (currentIndex < MOCK_ROUTE.length - 1) {
        currentIndex++;
        emitPoint(currentIndex, cb);

        if (currentIndex >= MOCK_ROUTE.length - 1) {
          isCompleted = true;
          clearTimer();
          if (activeStatusCallback) {
            activeStatusCallback('completed');
          }
        }
      } else {
        isCompleted = true;
        clearTimer();
        if (activeStatusCallback) {
          activeStatusCallback('completed');
        }
      }
    }, intervalMs);
  };

  return {
    start: (onLocation, onStatusChange) => {
      clearTimer();
      activeCallback = onLocation;
      if (onStatusChange) {
        activeStatusCallback = onStatusChange;
      }

      if (isCompleted) {
        return;
      }

      if (!isStarted) {
        // Send initial point immediately only on the very first start
        emitPoint(0, onLocation);
        isStarted = true;
      }

      startInterval(onLocation);
    },
    pause: () => {
      clearTimer();
    },
    resume: (onLocation) => {
      clearTimer();
      if (isCompleted) return;
      if (onLocation) {
        activeCallback = onLocation;
      }
      if (activeCallback) {
        startInterval(activeCallback);
      }
    },
    stop: () => {
      clearTimer();
    },
    reset: () => {
      clearTimer();
      currentIndex = 0;
      isStarted = false;
      isCompleted = false;
    },
    triggerNextPoint: () => {
      if (isCompleted || !activeCallback) return;
      if (currentIndex < MOCK_ROUTE.length - 1) {
        currentIndex++;
        emitPoint(currentIndex, activeCallback);
        if (currentIndex === MOCK_ROUTE.length - 1) {
          isCompleted = true;
          clearTimer();
          if (activeStatusCallback) {
            activeStatusCallback('completed');
          }
        }
      }
    },
    isCompleted: () => isCompleted,
  };
}
