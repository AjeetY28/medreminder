const logger = require('../config/logger');

/**
 * Global Express Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || 'An unexpected server error occurred';

  // Log error stack with winston
  logger.error('API Error: %s - Status: %d - Method: %s - URL: %s - Stack: %s', 
    message, 
    status, 
    req.method, 
    req.originalUrl, 
    err.stack || 'N/A'
  );

  const response = {
    success: false,
    message: message
  };

  // Expose stack trace only in development mode
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
