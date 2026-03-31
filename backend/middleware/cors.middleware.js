/**
 * CORS Middleware
 * Dynamic CORS origin checker supporting exact matches, patterns, and development mode
 */

'use strict';

/**
 * Create dynamic CORS origin handler
 * @param {Object} config - Server configuration
 * @returns {Function} CORS origin callback
 */
function getCorsOriginHandler(config) {
  return (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In development mode with corsAllowAllInDev, allow all origins
    if (config.server.corsAllowAllInDev && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // Check exact matches
    if (config.server.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check pattern matches (e.g., *.trycloudflare.com)
    const patterns = config.server.corsOriginPatterns || [];
    for (const pattern of patterns) {
      if (origin.endsWith(pattern) || origin.includes(pattern)) {
        return callback(null, true);
      }
    }

    // Origin not allowed
    callback(new Error('Not allowed by CORS'));
  };
}

/**
 * Create CORS middleware configuration
 * @param {Object} config - Server configuration
 * @returns {Object} CORS options for express cors middleware
 */
function createCorsOptions(config) {
  return {
    origin: getCorsOriginHandler(config),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}

module.exports = {
  getCorsOriginHandler,
  createCorsOptions,
};
