const logger = require('../config/logger');

/**
 * Middleware generator for Joi schema validation
 * @param {Object} schema - Joi Schema to validate against
 * @param {string} [property='body'] - Property of the request object to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorDetails = error.details.map(err => ({
        message: err.message,
        path: err.path.join('.'),
        type: err.type
      }));

      logger.warn('Validation error on route %s %s: %j', req.method, req.originalUrl, errorDetails);

      return res.status(400).json({
        success: false,
        message: 'Request validation failed',
        errors: errorDetails
      });
    }

    // Replace the validated property with Joi's parsed & cleaned value
    req[property] = value;
    next();
  };
};

module.exports = validate;
