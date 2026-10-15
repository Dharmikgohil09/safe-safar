const express = require('express');
const { getDBStatus } = require('../../../config/database');

const router = express.Router();

const startTime = Date.now();

router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'safesafar-backend-core',
    version: '1.0.0',
    uptime: `${uptimeSeconds}s`,
    database: {
      status: dbStatus
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
