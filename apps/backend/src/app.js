const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const config = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Routers
const healthRouter = require('./modules/core/health/health.router');
const authRouter = require('./routes/auth.routes');
const contactsRouter = require('./modules/core/contacts/contacts.router');
const tripsRouter = require('./modules/core/trips/trips.router');
const { routesRouter } = require('./modules/scoring/scoring.router');
const { createReportsRouter } = require('./modules/scoring/reports.router');
const { requireAuth } = require('./middleware/auth');
const sosRouter = require('./modules/sos/sos.router');

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing with safe size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());

// Apply general rate limiting
app.use(generalLimiter);

// Root / Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SafeSafar Backend API is live and healthy',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      contacts: '/contacts',
      trips: '/trips',
      routes: '/routes',
      reports: '/reports',
      sos: '/sos'
    }
  });
});

// Health check endpoints
const { getDBStatus } = require('./config/database');
app.get('/api/health', (req, res) => {
  const db = getDBStatus();
  const ok = db === 'connected';
  res.status(ok ? 200 : 503).json({
    ok,
    db,
  });
});

// Core Modules
app.use('/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/auth', authRouter); // Backward compatibility
app.use('/contacts', contactsRouter);
app.use('/trips', tripsRouter);
app.use('/api/trips', tripsRouter);

// Teammate Module Mount Points
app.use('/routes', routesRouter);
app.use('/api/reports', createReportsRouter({ requireAuth }));
app.use('/reports', createReportsRouter({ requireAuth }));
app.use('/sos', sosRouter);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
