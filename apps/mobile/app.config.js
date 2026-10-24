module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios && config.ios.config),
        ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android && config.android.config),
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },
  };
};
