/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure self-contained operation
  env: {
    NEXT_PUBLIC_APP_NAME: 'SafeSafar Live Tracker',
  },
};

module.exports = nextConfig;
