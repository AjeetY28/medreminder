// Load environmental placeholder variables for testing
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test_secret_for_diagnostic_boot';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/postgres'; // local test placeholder

const app = require('../src/app');
const logger = require('../src/config/logger');

logger.info('[Diagnostic Boot] Running backend dependency verification check...');

try {
  // 1. Validate Express router setups
  const routesStack = app._router.stack;
  
  const hasIndexRouter = routesStack.some(layer => {
    return layer.name === 'router' || (layer.regexp && layer.regexp.toString().includes('api'));
  });

  if (hasIndexRouter) {
    logger.info('[Diagnostic Boot] SUCCESS: API endpoints successfully mounted under Router.');
  } else {
    throw new Error('Express routing endpoints failed to mount correctly.');
  }

  // 2. Validate Swagger initialization
  const hasSwagger = routesStack.some(layer => {
    return layer.regexp && layer.regexp.toString().includes('api-docs');
  });

  if (hasSwagger) {
    logger.info('[Diagnostic Boot] SUCCESS: Swagger documentation handler mounted under /api-docs.');
  } else {
    throw new Error('Swagger UI documentation handler failed to mount.');
  }

  logger.info('[Diagnostic Boot] SUCCESS: All component dependencies and middleware bindings resolved without errors.');
  process.exit(0);
} catch (error) {
  logger.error('[Diagnostic Boot] CRITICAL: System verification failed: %s', error.message);
  process.exit(1);
}
