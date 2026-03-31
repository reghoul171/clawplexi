/**
 * Express App Factory
 * Creates and configures the Express application
 */

'use strict';

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');

const routes = require('./routes');
const middleware = require('./middleware');

/**
 * Create Express application
 * @param {Object} config - Application configuration
 * @returns {Object} { app, server }
 */
function createApp(config) {
  const app = express();
  const server = http.createServer(app);

  // Store config and other shared state in app.locals
  app.locals.config = config;

  // =============================================================================
  // MIDDLEWARE
  // =============================================================================

  // CORS
  app.use(
    cors({
      origin: middleware.getCorsOriginHandler(config),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // JSON body parsing
  app.use(express.json());

  // Request logging
  app.use(middleware.requestLogger);

  // =============================================================================
  // STATIC FILE SERVING (Frontend)
  // =============================================================================

  serveFrontend(app);

  // =============================================================================
  // ROUTES
  // =============================================================================

  app.use('/api', routes);

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================

  // 404 handler for API routes
  app.use('/api/*', middleware.notFoundHandler);

  // Global error handler (must be last)
  app.use(middleware.errorHandler);

  return { app, server };
}

/**
 * Serve frontend static files
 * @param {Object} app - Express app
 */
function serveFrontend(app) {
  // Find frontend dist directory
  const possiblePaths = [
    path.join(__dirname, '..', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(__dirname, '..', 'dist'),
  ];

  let frontendPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      frontendPath = p;
      break;
    }
  }

  if (frontendPath) {
    console.log(`[App] Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    console.log('[App] No frontend found - running in API-only mode');
  }
}

module.exports = {
  createApp,
};
