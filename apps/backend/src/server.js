const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/database');
const { initializeSocketIO } = require('./modules/core/socket/socket.handler');

const startServer = async () => {
  try {
    // 1. Establish MongoDB Connection
    await connectDB();

    // 2. Initialize HTTP & Socket.io Servers
    const server = http.createServer(app);
    const io = initializeSocketIO(server);

    // Make io instance accessible to Express app if needed
    app.set('io', io);

    // 3. Start listening on configured port
    server.listen(config.port, () => {
      console.log(`===============================================`);
      console.log(`  SafeSafar Backend Core Server Running`);
      console.log(`  Environment : ${config.env}`);
      console.log(`  Port        : ${config.port}`);
      console.log(`  Health Check: http://localhost:${config.port}/health`);
      console.log(`===============================================`);
    });

    // Graceful Shutdown handling
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('[Server] HTTP and WebSocket connections closed.');
        await disconnectDB();
        console.log('[Database] MongoDB connection closed.');
        process.exit(0);
      });

      // Force close after 10s timeout
      setTimeout(() => {
        console.error('[Server] Force shutdown timeout exceeded.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return { server, io };
  } catch (error) {
    console.error(`[Server] Startup failure: ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer
};
