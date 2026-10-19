const { createOrsClient } = require('../ors.client');
const { encodePolyline } = require('../polyline');

describe('OpenRouteService Client (ors.client.js)', () => {
  const secretKey = 'test-secret-ors-key-12345';
  const sampleCoords = [
    [72.8311, 21.1702],
    [72.835, 21.175]
  ];
  const sampleEncoded = encodePolyline(sampleCoords);

  const mockSuccessBody = {
    routes: [
      {
        summary: {
          distance: 540.5,
          duration: 380.2
        },
        geometry: sampleEncoded
      }
    ]
  };

  test('builds the correct URL, headers and body', async () => {
    let capturedUrl;
    let capturedOptions;

    const mockFetch = jest.fn().mockImplementation(async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        json: async () => mockSuccessBody
      };
    });

    const client = createOrsClient({
      apiKey: secretKey,
      fetchImpl: mockFetch
    });

    const routes = await client.getRoutes({
      origin: { coordinates: [72.8311, 21.1702] },
      destination: { coordinates: [72.835, 21.175] }
    });

    expect(capturedUrl).toBe('https://api.openrouteservice.org/v2/directions/foot-walking');
    expect(capturedOptions.method).toBe('POST');
    // Authorization must be key itself, no "Bearer"
    expect(capturedOptions.headers.Authorization).toBe(secretKey);
    expect(capturedOptions.headers['Content-Type']).toBe('application/json; charset=utf-8');
    expect(capturedOptions.headers.Accept).toBe('application/json');

    const parsedBody = JSON.parse(capturedOptions.body);
    expect(parsedBody.coordinates).toEqual([
      [72.8311, 21.1702],
      [72.835, 21.175]
    ]);
    expect(parsedBody.alternative_routes).toEqual({
      target_count: 3,
      share_factor: 0.6,
      weight_factor: 1.4
    });

    expect(Array.isArray(routes)).toBe(true);
    expect(routes.length).toBe(1);
    expect(routes[0].distanceMeters).toBe(540.5);
    expect(routes[0].durationSeconds).toBe(380.2);
    expect(routes[0].polyline).toBe(sampleEncoded);
    expect(routes[0].coordinates.length).toBe(2);
  });

  test('throws 503 when API key is missing or empty', async () => {
    const clientNoKey = createOrsClient({ apiKey: '' });
    await expect(
      clientNoKey.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Routing service is not configured'
    });

    const clientUndefinedKey = createOrsClient({});
    await expect(
      clientUndefinedKey.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Routing service is not configured'
    });
  });

  test('triggers exactly one retry without alternative_routes on 400 and uses its result', async () => {
    let callCount = 0;
    const bodies = [];

    const mockFetch = jest.fn().mockImplementation(async (url, options) => {
      callCount++;
      bodies.push(JSON.parse(options.body));

      if (callCount === 1) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Alternative routes failed' })
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => mockSuccessBody
      };
    });

    const client = createOrsClient({
      apiKey: secretKey,
      fetchImpl: mockFetch
    });

    const routes = await client.getRoutes({
      origin: [72.8311, 21.1702],
      destination: [72.835, 21.175]
    });

    expect(callCount).toBe(2);
    // 1st request included alternative_routes
    expect(bodies[0].alternative_routes).toBeDefined();
    // 2nd request (retry) omitted alternative_routes
    expect(bodies[1].alternative_routes).toBeUndefined();
    expect(routes.length).toBe(1);
  });

  test('throws 404 on initial 404 or on 400/404 during retry', async () => {
    // Initial 404
    const mockFetch404 = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    });

    const client404 = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetch404 });
    await expect(
      client404.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'No route found'
    });

    // Retry fails with 400
    const mockFetchRetry400 = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' })
    });
    const clientRetry400 = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetchRetry400 });
    await expect(
      clientRetry400.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'No route found'
    });
  });

  test('throws 404 when response contains zero routes', async () => {
    const mockFetchZero = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ routes: [] })
    });

    const client = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetchZero });
    await expect(
      client.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: 'No route found'
    });
  });

  test('throws 503 on 429 rate limit', async () => {
    const mockFetch429 = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Rate limit exceeded' })
    });

    const client = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetch429 });
    await expect(
      client.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      message: 'Routing service is busy, try again shortly'
    });
  });

  test('throws 502 on other non-2xx status and on network failure', async () => {
    // 500 status
    const mockFetch500 = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' })
    });
    const client500 = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetch500 });
    await expect(
      client500.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      message: 'Routing provider error'
    });

    // Thrown fetch error (network drop)
    const mockFetchThrow = jest.fn().mockRejectedValue(new Error('Network connection timeout'));
    const clientThrow = createOrsClient({ apiKey: secretKey, fetchImpl: mockFetchThrow });
    await expect(
      clientThrow.getRoutes({
        origin: [72.8311, 21.1702],
        destination: [72.835, 21.175]
      })
    ).rejects.toMatchObject({
      statusCode: 502,
      message: 'Routing provider error'
    });
  });

  test('never leaks the API key in thrown error messages', async () => {
    const errorScenarios = [
      () => createOrsClient({ apiKey: secretKey, fetchImpl: jest.fn().mockRejectedValue(new Error('fail')) }),
      () => createOrsClient({ apiKey: secretKey, fetchImpl: jest.fn().mockResolvedValue({ status: 500, ok: false }) }),
      () => createOrsClient({ apiKey: secretKey, fetchImpl: jest.fn().mockResolvedValue({ status: 429, ok: false }) }),
      () => createOrsClient({ apiKey: secretKey, fetchImpl: jest.fn().mockResolvedValue({ status: 404, ok: false }) })
    ];

    for (const scenario of errorScenarios) {
      try {
        await scenario().getRoutes({
          origin: [72.8311, 21.1702],
          destination: [72.835, 21.175]
        });
        throw new Error('Expected function to throw');
      } catch (err) {
        expect(err.message).not.toContain(secretKey);
      }
    }
  });
});
