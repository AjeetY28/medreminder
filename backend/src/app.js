const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swagger = require('./config/swagger');
const routes = require('./routes');
const errorHandler = require('./middleware/error.middleware');
const logger = require('./config/logger');

const app = express();

// Set security headers
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP constraints for Swagger UI access if needed
}));

// Enable CORS with configured origins
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000']; // Dev defaults

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  credentials: true,
}));

// Parse incoming payloads with size limits to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Serve API swagger documentation at /api-docs
app.use('/api-docs', swagger.serve, swagger.setup);
logger.info('Swagger API documentation hosted at /api-docs');

// Mount primary API router under /api
app.use('/api', routes);

// Handle undefined endpoints
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Mount global error handler middleware (must be defined last)
app.use(errorHandler);

module.exports = app;
