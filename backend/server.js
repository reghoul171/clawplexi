/**
 * PM Dashboard Server - Portable Version
 * 
 * A real-time dashboard server for tracking AI project states.
 * Features:
 * - SQLite-based persistence (survives restarts)
 * - Git-based state synchronization
 * - OpenClaw integration
 * - Zero hardcoded paths
 * 
 * Environment Variables:
 *   PM_DASHBOARD_PORT         - Server port (default: 3001)
 *   PM_DASHBOARD_HOST         - Server host (default: localhost)
 *   PM_DASHBOARD_PROJECTS_DIR - Projects directory
 *   PM_DASHBOARD_STATE_FILE   - SQLite database path
 *   PM_DASHBOARD_SYNC_ENABLED - Enable Git sync (true/false)
 */

'use strict';

// Load modules
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

// Load internal modules
const { getConfig } = require('./lib/config');
const { getPaths, ensureDirectories, isOpenClawEnvironment } = require('./lib/paths');
const db = require('./lib/database');
const { GitSync, ProjectFileSync } = require('./lib/sync');

// Initialize configuration
const config = getConfig();
const paths = getPaths(config);

// Ensure required directories exist
ensureDirectories(paths);

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.server.corsOrigins,
    methods: ['GET', 'POST']
  }
});

const PORT = config.server.port;
const HOST = config.server.host;

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors({ origin: config.server.corsOrigins }));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// FILE WATCHER
// =============================================================================

let watcher = null;

/**
 * Initialize the file watcher for .project_state.json files
 */
function initWatcher() {
  const workspaceDir = paths.projectsDir;
  
  // Check if workspace exists
  if (!fs.existsSync(workspaceDir)) {
    console.warn(`[Watcher] Workspace directory not found: ${workspaceDir}`);
    console.log('[Watcher] Will create directory when projects are added');
    fs.mkdirSync(workspaceDir, { recursive: true });
  }
  
  console.log(`[Watcher] Watching: ${workspaceDir}`);
  
  watcher = chokidar.watch('**/.project_state.json', {
    cwd: workspaceDir,
    persistent: true,
    ignoreInitial: false,
    ignored: config.watcher.ignorePatterns,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  
  watcher.on('add', handleFileAdd);
  watcher.on('change', handleFileChange);
  watcher.on('unlink', handleFileUnlink);
  watcher.on('error', (error) => console.error('[Watcher] Error:', error));
  
  watcher.on('ready', () => {
    console.log('[Watcher] Ready - scanning for project files');
  });
}

/**
 * Handle file addition
 */
async function handleFileAdd(relativePath) {
  const fullPath = path.join(paths.projectsDir, relativePath);
  console.log(`[Watcher] File found: ${fullPath}`);
  
  const projectData = await readAndValidateProject(fullPath);
  if (projectData) {
    await db.upsertProject(projectData, fullPath);
    io.emit('project_updated', projectData);
    console.log(`[Watcher] Loaded project: ${projectData.project_name}`);
  }
}

/**
 * Handle file change
 */
async function handleFileChange(relativePath) {
  const fullPath = path.join(paths.projectsDir, relativePath);
  console.log(`[Watcher] File changed: ${fullPath}`);
  
  const projectData = await readAndValidateProject(fullPath);
  if (projectData) {
    await db.upsertProject(projectData, fullPath);
    io.emit('project_updated', projectData);
    console.log(`[Watcher] Updated project: ${projectData.project_name}`);
  }
}

/**
 * Handle file removal
 */
async function handleFileUnlink(relativePath) {
  const fullPath = path.join(paths.projectsDir, relativePath);
  console.log(`[Watcher] File removed: ${fullPath}`);
  
  // Extract project name from path
  const parts = relativePath.split(path.sep);
  const projectName = parts[parts.length - 2] || path.dirname(relativePath);
  
  // Soft delete in database
  await db.deleteProject(projectName);
  io.emit('project_removed', { project_name: projectName });
  console.log(`[Watcher] Removed project: ${projectName}`);
}

/**
 * Read and validate a project state file
 */
async function readAndValidateProject(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!validateProjectState(data)) {
      console.error(`[Watcher] Invalid schema in ${filePath}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`[Watcher] Error reading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Validate project state schema
 */
function validateProjectState(data) {
  const requiredFields = ['project_name', 'editor_used', 'progress_percentage', 'implementation_plan', 'decision_tree', 'tests_generated'];
  
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  if (typeof data.progress_percentage !== 'number' || data.progress_percentage < 0 || data.progress_percentage > 100) {
    console.error('progress_percentage must be a number between 0 and 100');
    return false;
  }
  
  if (!Array.isArray(data.implementation_plan) || !Array.isArray(data.decision_tree) || !Array.isArray(data.tests_generated)) {
    console.error('implementation_plan, decision_tree, and tests_generated must be arrays');
    return false;
  }
  
  return true;
}

// =============================================================================
// SYNC SCHEDULER
// =============================================================================

let syncInterval = null;
let gitSync = null;
let projectFileSync = null;

/**
 * Initialize Git sync if enabled
 */
function initSync() {
  if (!config.sync.enabled) {
    console.log('[Sync] Disabled by configuration');
    return;
  }
  
  const stateDir = path.dirname(paths.stateFile);
  
  gitSync = new GitSync({
    stateDir,
    config: config.sync
  });
  
  projectFileSync = new ProjectFileSync(paths.projectsStateDir);
  
  // Check if git is initialized
  if (!gitSync.isGitRepo()) {
    console.log('[Sync] Git not initialized. Run "pm-dashboard init --remote <url>" to enable sync.');
    return;
  }
  
  console.log('[Sync] Git sync enabled');
  
  // Schedule periodic sync
  if (config.sync.intervalMs > 0) {
    syncInterval = setInterval(async () => {
      try {
        const result = await gitSync.sync();
        if (result.success) {
          console.log('[Sync] Sync completed');
        } else {
          console.warn('[Sync] Sync failed:', result.message);
        }
      } catch (error) {
        console.error('[Sync] Error:', error.message);
      }
    }, config.sync.intervalMs);
    
    console.log(`[Sync] Scheduled every ${config.sync.intervalMs}ms`);
  }
}

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * GET /api/projects - List all projects
 */
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await db.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('[API] Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:name - Get specific project
 */
app.get('/api/projects/:name', async (req, res) => {
  try {
    const project = await db.getProject(req.params.name);
    if (project) {
      res.json(project);
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error) {
    console.error('[API] Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

/**
 * GET /api/health - Health check
 */
app.get('/api/health', async (req, res) => {
  try {
    const stats = await db.getStatistics();
    res.json({
      status: 'ok',
      projectsTracked: stats.projectCount,
      averageProgress: stats.averageProgress,
      uptime: process.uptime(),
      config: {
        projectsDir: paths.projectsDir,
        stateFile: paths.stateFile,
        syncEnabled: config.sync.enabled
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * GET /api/stats - Dashboard statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('[API] Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * GET /api/sync/status - Sync status
 */
app.get('/api/sync/status', async (req, res) => {
  try {
    const syncState = await db.getSyncState();
    const gitStatus = gitSync ? gitSync.getStatus() : null;
    
    res.json({
      enabled: config.sync.enabled,
      initialized: gitStatus?.initialized || false,
      hasRemote: gitSync?.hasRemote() || false,
      clean: gitStatus?.clean ?? true,
      lastSync: syncState?.last_sync_at || null,
      status: syncState?.sync_status || 'idle'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

/**
 * POST /api/sync/trigger - Manually trigger sync
 */
app.post('/api/sync/trigger', async (req, res) => {
  if (!gitSync || !gitSync.isGitRepo()) {
    return res.status(400).json({ error: 'Git sync not initialized' });
  }
  
  try {
    const result = await gitSync.sync();
    
    // Update sync state in database
    await db.updateSyncState({
      last_sync_at: result.success ? new Date().toISOString() : undefined,
      sync_status: result.success ? 'success' : 'error',
      sync_error: result.success ? null : result.message
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tester/create-tests - Spawn tester agent
 */
app.post('/api/tester/create-tests', async (req, res) => {
  const { projectName } = req.body;
  
  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  
  console.log(`[Tester] Spawn request to create tests for: ${projectName}`);
  
  io.emit('tester_action', {
    type: 'create-tests',
    projectName,
    status: 'spawned',
    timestamp: new Date().toISOString()
  });
  
  // Try to spawn via OpenClaw gateway if available
  const gatewayUrl = config.openclawGatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
  
  try {
    await fetch(`${gatewayUrl}/api/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'tester',
        message: `Create new tests for project "${projectName}"`,
        context: { projectName, action: 'create-tests' }
      })
    });
  } catch (error) {
    console.log('[Tester] Gateway unavailable, using fallback');
  }
  
  res.json({
    success: true,
    message: 'Tester agent spawn request sent',
    projectName,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/tester/run-tests - Run all tests
 */
app.post('/api/tester/run-tests', async (req, res) => {
  const { projectName } = req.body;
  
  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  
  console.log(`[Tester] Spawn request to run tests for: ${projectName}`);
  
  io.emit('tester_action', {
    type: 'run-tests',
    projectName,
    status: 'spawned',
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'Tester agent spawn request sent',
    projectName,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/tester/generate-report - Generate test report
 */
app.post('/api/tester/generate-report', async (req, res) => {
  const { projectName } = req.body;
  
  if (!projectName) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  
  console.log(`[Tester] Spawn request to generate report for: ${projectName}`);
  
  io.emit('tester_action', {
    type: 'generate-report',
    projectName,
    status: 'spawned',
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'Tester agent spawn request sent',
    projectName,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// SOCKET.IO
// =============================================================================

io.on('connection', async (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Send current state to newly connected client
  try {
    const projects = await db.getAllProjects();
    socket.emit('initial_state', projects);
  } catch (error) {
    console.error('[Socket] Error sending initial state:', error);
  }
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// =============================================================================
// STARTUP & SHUTDOWN
// =============================================================================

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received, shutting down...`);
  
  // Stop sync interval
  if (syncInterval) {
    clearInterval(syncInterval);
    console.log('[Sync] Stopped sync scheduler');
  }
  
  // Close watcher
  if (watcher) {
    await watcher.close();
    console.log('[Watcher] Closed file watcher');
  }
  
  // Close database
  await db.closeDatabase();
  
  // Close server
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after timeout
  setTimeout(() => {
    console.log('[Server] Forced exit');
    process.exit(1);
  }, 5000);
}

/**
 * Start the server
 */
async function start() {
  try {
    console.log('========================================');
    console.log('     PM Dashboard Server v1.0.0        ');
    console.log('========================================');
    console.log('');
    
    // Print environment info
    console.log(`[Server] OpenClaw environment: ${isOpenClawEnvironment() ? 'Detected' : 'Not detected'}`);
    console.log(`[Server] Config file: ${config._configFile}`);
    console.log(`[Server] Projects directory: ${paths.projectsDir}`);
    console.log(`[Server] Database: ${paths.stateFile}`);
    console.log('');
    
    // Initialize database
    console.log('[Database] Initializing...');
    await db.initDatabase(paths.stateFile);
    
    // Initialize file watcher
    console.log('[Watcher] Initializing...');
    initWatcher();
    
    // Initialize sync
    console.log('[Sync] Initializing...');
    initSync();
    
    // Start HTTP server
    server.listen(PORT, HOST, () => {
      console.log('');
      console.log('========================================');
      console.log(`  Dashboard running at http://${HOST}:${PORT}`);
      console.log('========================================');
      console.log('');
      console.log('API Endpoints:');
      console.log(`  GET  /api/projects          - List all projects`);
      console.log(`  GET  /api/projects/:name    - Get project details`);
      console.log(`  GET  /api/health            - Health check`);
      console.log(`  GET  /api/stats             - Statistics`);
      console.log(`  GET  /api/sync/status       - Sync status`);
      console.log(`  POST /api/sync/trigger      - Trigger sync`);
      console.log('');
    });
    
    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('[Server] Startup failed:', error);
    process.exit(1);
  }
}

// Start the server
start();
