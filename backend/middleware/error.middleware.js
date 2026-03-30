/**
 * Error Handling Middleware
 * Consolidated error handler - handles JSON parsing, CORS, and general errors
 */

'use strict';

/**
 * Global error handler for JSON parsing and other errors
 * Prevents stack trace exposure in production
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error('[Error]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Stack]', err.stack);
  }

  // Handle JSON parsing errors
  if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
      message: 'Request body contains malformed JSON',
    });
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }

  // Production: sanitize error details
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(err.status || err.statusCode || 500).json({
    error: isProduction ? 'Internal server error' : err.message,
    message: isProduction ? 'An unexpected error occurred' : err.message || 'Unknown error',
    // Never expose stack traces in production
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

/**
 * 404 handler for undefined API routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Not found',
    message: `API endpoint ${req.method} ${req.path} not found`,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
