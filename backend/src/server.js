// Load environment configurations
require('dotenv').config();

const app = require('./app');
const db = require('./config/db');
const cronService = require('./services/cron.service');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

// Fail-fast: critical environment variable validation
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    logger.error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production with a fallback secret.');
    process.exit(1);
  } else {
    logger.warn('WARNING: JWT_SECRET is not set. Using fallback secret — this is acceptable only in development.');
  }
}

async function startServer() {
  try {
    // 1. Verify connection pool with Supabase/PostgreSQL database
    logger.info('Verifying database pool connectivity...');
    const dbTest = await db.query('SELECT NOW()');
    logger.info(`Database connectivity verified. Database time: ${dbTest.rows[0].now}`);

    // 2. Start Cron Job Reminders/Missed dose scanners
    cronService.start();

    // 3. Start Express server listener
    const server = app.listen(PORT, () => {
      logger.info(`===================================================`);
      logger.info(` MediReminder AI Backend Server Running on Port ${PORT}`);
      logger.info(` URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
      logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`===================================================`);
    });

    // Handle graceful process termination
    const gracefulShutdown = () => {
      logger.info('Received termination signal. Starting graceful shutdown sequence...');
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await db.pool.end();
          logger.info('Database pool connection terminated.');
          process.exit(0);
        } catch (dbError) {
          logger.error('Error during database pool shutdown: %o', dbError);
          process.exit(1);
        }
      });

      // Force kill after 10s if shutdown hangs
      setTimeout(() => {
        logger.warn('Graceful shutdown timed out. Forcing process shutdown.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Server failed to start during initialization: %o', error);
    process.exit(1);
  }
}

startServer();
