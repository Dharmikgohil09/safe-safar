const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// Routers
const healthRouter = require('./modules/core/health/health.router');
const authRouter = require('./modules/core/auth/auth.router');
const contactsRouter = require('./modules/core/contacts/contacts.router');
const tripsRouter = require('./modules/core/trips/trips.router');
const scoringRouter = require('./modules/scoring/scoring.router');
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

// Apply general rate limiting
app.use(generalLimiter);

// Core Modules
app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/contacts', contactsRouter);
app.use('/trips', tripsRouter);

// Teammate Module Mount Points
app.use('/routes', scoringRouter);
app.use('/reports', scoringRouter);
app.use('/sos', sosRouter);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
