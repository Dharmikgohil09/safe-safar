const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const parseCorsOrigins = () => {
  const localDefaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:8082',
    'http://127.0.0.1:8082'
  ];

  // Deployed SafeSafar web tracker origin
  const deployedTrackerOrigins = [
    'https://safesafar-tracker.onrender.com'
  ];

  // Regex matching LAN private IP origins on ports 3000, 8081, 8082 for local mobile/hotspot testing
  const lanOriginRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):(3000|8081|8082)$/;

  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // Filter out wildcard '*' to prevent invalid wildcard origin with credentialed requests
  const validEnvOrigins = envOrigins.filter(o => o !== '*');

  if (process.env.NODE_ENV === 'production') {
    return Array.from(new Set([...deployedTrackerOrigins, ...(validEnvOrigins.length > 0 ? validEnvOrigins : localDefaults)]));
  }

  // Development/Test: union of explicit local origins, deployed tracker origins, configured origins, and LAN regex
  const explicitOrigins = Array.from(new Set([...localDefaults, ...deployedTrackerOrigins, ...validEnvOrigins]));
  return [...explicitOrigins, lanOriginRegex];
};

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/safesafar',
  jwt: {
    secret: process.env.JWT_SECRET || 'safesafar_default_jwt_secret_must_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origin: parseCorsOrigins()
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 15
  }
};

if (config.isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('default_jwt_secret'))) {
  throw new Error('[FATAL SECURITY] In production, JWT_SECRET must be explicitly configured with a secure random key!');
}

module.exports = config;
