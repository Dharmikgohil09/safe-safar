const defaultBaseUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://safe-safar-1.onrender.com'
    : 'http://localhost:5000';

export const config = {
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || defaultBaseUrl,
  apiUrl: (process.env.NEXT_PUBLIC_API_URL || defaultBaseUrl).replace(/\/api\/?$/, ''),
  isMockMode: process.env.NEXT_PUBLIC_MOCK_MODE === 'true',
  mapTileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
