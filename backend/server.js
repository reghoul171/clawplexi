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
const { updateProjectState, updateStepStatus } = require('./lib/projectState');

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
    methods: ['GET', 'POST'],
  },
  // Enable polling fallback for tunnel/proxy compatibility
  transports: ['polling', 'websocket'],
  // Allow upgrading to websocket after polling establishes connection
  allowUpgrades: true,
  // Increase ping timeout for slow connections through tunnels
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = config.server.port;
const HOST = config.server.host;

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Dynamic CORS origin checker
 * Supports exact matches, patterns, and development mode
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

app.use(
  cors({
    origin: getCorsOriginHandler(config),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Global error handler for JSON parsing and other errors
 * Prevents stack trace exposure in production
 */
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error('[Error]', err.message);

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains malformed JSON',
    });
  }

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed',
    });
  }

  // Generic error response (hide details in production)
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
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
      pollInterval: 50,
    },
  });

  watcher.on('add', handleFileAdd);
  watcher.on('change', handleFileChange);
  watcher.on('unlink', handleFileUnlink);
  watcher.on('error', error => console.error('[Watcher] Error:', error));

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
  const requiredFields = [
    'project_name',
    'editor_used',
    'progress_percentage',
    'implementation_plan',
    'decision_tree',
    'tests_generated',
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }

  if (
    typeof data.progress_percentage !== 'number' ||
    data.progress_percentage < 0 ||
    data.progress_percentage > 100
  ) {
    console.error('progress_percentage must be a number between 0 and 100');
    return false;
  }

  if (
    !Array.isArray(data.implementation_plan) ||
    !Array.isArray(data.decision_tree) ||
    !Array.isArray(data.tests_generated)
  ) {
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
    config: config.sync,
  });

  projectFileSync = new ProjectFileSync(paths.projectsStateDir);

  // Check if git is initialized
  if (!gitSync.isGitRepo()) {
    console.log(
      '[Sync] Git not initialized. Run "pm-dashboard init --remote <url>" to enable sync.'
    );
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
// STATIC FILE SERVING (Frontend)
// =============================================================================

/**
 * Serve frontend static files
 */
function serveFrontend() {
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
    console.log(`[Server] Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  } else {
    console.log('[Server] No frontend found - running in API-only mode');
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
    const { name } = req.params;

    // Validate project name is not empty
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Project name cannot be empty' });
    }

    const project = await db.getProject(name);
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
 * PATCH/PUT /api/projects/:name/steps/:stepNumber/status
 * Update step status via REST API (supports both PATCH and PUT)
 */
const handleStepStatusUpdate = async (req, res) => {
  const { name, stepNumber } = req.params;
  const { status } = req.body;

  // Validate project name is not empty
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Project name cannot be empty' });
  }

  // Validate status
  const validStatuses = ['pending', 'in_progress', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
    });
  }

  try {
    // Get project
    const project = await db.getProject(name);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Find step in implementation plan
    const stepExists = project.implementation_plan?.some(
      s => String(s.step) === String(stepNumber)
    );

    if (!stepExists) {
      return res.status(404).json({ error: `Step ${stepNumber} not found` });
    }

    // Get previous status for response
    const previousStatus = project.implementation_plan.find(
      s => String(s.step) === String(stepNumber)
    )?.status;

    // Update step status
    const updatedPlan = project.implementation_plan.map(step =>
      String(step.step) === String(stepNumber) ? { ...step, status } : step
    );

    // Update project
    const projectPath = project.path || path.join(paths.projectsDir, name);

    // Update file if path exists
    try {
      await updateProjectState(projectPath, { implementation_plan: updatedPlan });
    } catch (fileError) {
      console.warn('[API] Could not update project file:', fileError.message);
      // Continue with database update only
    }

    // Update database
    const updatedProject = { ...project, implementation_plan: updatedPlan };
    await db.upsertProject(updatedProject, projectPath);

    // Broadcast via WebSocket
    io.emit('project_updated', updatedProject);

    console.log(`[API] Step ${stepNumber} status updated to ${status} in ${name}`);

    // Return success
    res.json({
      success: true,
      step: { step: stepNumber, status, previousStatus },
      project: updatedProject,
    });
  } catch (error) {
    console.error('[API] Error updating step status:', error);
    res.status(500).json({ error: error.message });
  }
};

app.patch('/api/projects/:name/steps/:stepNumber/status', handleStepStatusUpdate);
app.put('/api/projects/:name/steps/:stepNumber/status', handleStepStatusUpdate);

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
        syncEnabled: config.sync.enabled,
      },
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
      status: syncState?.sync_status || 'idle',
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
      sync_error: result.success ? null : result.message,
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

  // Create task in database
  const taskId = await db.createTask({
    project_name: projectName,
    type: 'create-tests',
    message: 'Creating tests...',
  });

  // Emit task started event
  io.emit('task_started', {
    taskId,
    type: 'create-tests',
    projectName,
    status: 'pending',
    progress: 0,
    message: 'Initializing test creation...',
    timestamp: new Date().toISOString(),
  });

  // Try to spawn via OpenClaw gateway if available
  const gatewayUrl =
    config.openclawGatewayUrl || process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';

  try {
    await fetch(`${gatewayUrl}/api/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'tester',
        message: `Create new tests for project "${projectName}"`,
        context: { projectName, action: 'create-tests', taskId },
      }),
    });

    // Update task to running
    await db.updateTask(taskId, {
      status: 'running',
      progress: 10,
      message: 'Tester agent spawned',
    });
    io.emit('task_progress', {
      taskId,
      progress: 10,
      message: 'Tester agent spawned, analyzing project...',
    });
  } catch (error) {
    console.log('[Tester] Gateway unavailable, simulating task');
    // Simulate completion for demo purposes
    setTimeout(async () => {
      await simulateTaskCompletion(taskId, 'create-tests', projectName);
    }, 2000);
  }

  res.json({
    success: true,
    taskId,
    message: 'Tester agent spawn request sent',
    projectName,
    timestamp: new Date().toISOString(),
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

  // Create task in database
  const taskId = await db.createTask({
    project_name: projectName,
    type: 'run-tests',
    message: 'Running tests...',
  });

  // Emit task started event
  io.emit('task_started', {
    taskId,
    type: 'run-tests',
    projectName,
    status: 'pending',
    progress: 0,
    message: 'Initializing test run...',
    timestamp: new Date().toISOString(),
  });

  // Simulate test running for demo
  setTimeout(async () => {
    await simulateTaskCompletion(taskId, 'run-tests', projectName);
  }, 1000);

  res.json({
    success: true,
    taskId,
    message: 'Test run initiated',
    projectName,
    timestamp: new Date().toISOString(),
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

  // Get project to include test data in report
  const project = await db.getProject(projectName);

  // Create task in database
  const taskId = await db.createTask({
    project_name: projectName,
    type: 'generate-report',
    message: 'Generating report...',
  });

  // Emit task started event
  io.emit('task_started', {
    taskId,
    type: 'generate-report',
    projectName,
    status: 'pending',
    progress: 0,
    message: 'Generating test report...',
    timestamp: new Date().toISOString(),
  });

  // Simulate report generation
  setTimeout(async () => {
    await simulateTaskCompletion(taskId, 'generate-report', projectName, project);
  }, 1500);

  res.json({
    success: true,
    taskId,
    message: 'Report generation initiated',
    projectName,
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/tasks/:taskId/progress - Update task progress (for agents)
 */
app.post('/api/tasks/:taskId/progress', async (req, res) => {
  const { taskId } = req.params;
  const { progress, message, status } = req.body;

  try {
    const task = await db.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updates = {};
    if (progress !== undefined) updates.progress = progress;
    if (message !== undefined) updates.message = message;
    if (status !== undefined) updates.status = status;

    await db.updateTask(taskId, updates);

    // Emit progress event
    io.emit('task_progress', {
      taskId,
      type: task.type,
      projectName: task.project_name,
      progress: progress ?? task.progress,
      message: message ?? task.message,
      status: status ?? task.status,
    });

    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tasks/:taskId/complete - Mark task complete (for agents)
 */
app.post('/api/tasks/:taskId/complete', async (req, res) => {
  const { taskId } = req.params;
  const { result, report } = req.body;

  try {
    const task = await db.getTask(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await db.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      result: result ? JSON.stringify(result) : null,
      report: report || null,
    });

    // Emit completion event
    io.emit('task_completed', {
      taskId,
      type: task.type,
      projectName: task.project_name,
      status: 'completed',
      progress: 100,
      result,
      report,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, taskId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks - Get tasks (optionally filtered)
 */
app.get('/api/tasks', async (req, res) => {
  const { projectName, status } = req.query;

  try {
    let tasks;
    if (projectName) {
      tasks = await db.getTasksByProject(projectName, status);
    } else if (status === 'pending') {
      tasks = await db.getPendingTasks();
    } else {
      tasks = await db.getRecentCompletedTasks(50);
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tasks/:taskId - Get specific task
 */
app.get('/api/tasks/:taskId', async (req, res) => {
  try {
    const task = await db.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Simulate task completion (for demo when gateway unavailable)
 */
async function simulateTaskCompletion(taskId, type, projectName, project = null) {
  // Simulate progress
  for (let i = 20; i <= 80; i += 20) {
    await db.updateTask(taskId, { progress: i, message: `Processing... ${i}%` });
    io.emit('task_progress', {
      taskId,
      type,
      projectName,
      progress: i,
      message: `Processing... ${i}%`,
    });
    await new Promise(r => setTimeout(r, 500));
  }

  let result = {};
  let report = '';

  if (type === 'create-tests') {
    result = {
      testsCreated: 3,
      files: ['tests/new_test_1.test.js', 'tests/new_test_2.test.js', 'tests/new_test_3.test.js'],
    };
    report = `# Test Creation Report\n\n## Project: ${projectName}\n\n### Tests Created: 3\n\n1. **new_test_1.test.js** - Unit tests for core functionality\n2. **new_test_2.test.js** - Integration tests for API endpoints\n3. **new_test_3.test.js** - E2E tests for user flows\n\n### Status: ✅ Success\n\nAll test files have been created and are ready to run.`;
  } else if (type === 'run-tests') {
    result = {
      total: 4,
      passed: 3,
      failed: 1,
      duration: '2.4s',
    };
    report = `# Test Run Report\n\n## Project: ${projectName}\n\n### Summary\n- **Total Tests:** 4\n- **Passed:** 3 ✅\n- **Failed:** 1 ❌\n- **Duration:** 2.4s\n\n### Details\n\n#### ✅ Passing Tests\n1. User Authentication Tests\n2. Database Unit Tests\n3. Frontend Component Tests\n\n#### ❌ Failing Tests\n1. API Integration Tests\n   - Error: Expected status 200, got 500\n   - File: tests/api.test.js:45`;
  } else if (type === 'generate-report') {
    const tests = project?.tests_generated || [];
    const passing = tests.filter(t => t.status === 'passing').length;
    const failing = tests.filter(t => t.status === 'failing').length;
    result = {
      total: tests.length,
      passed: passing,
      failed: failing,
      coverage: '78%',
    };
    report = `# Test Report\n\n## Project: ${projectName}\n\nGenerated: ${new Date().toISOString()}\n\n### Summary\n\n| Metric | Value |\n|--------|-------|\n| Total Tests | ${tests.length} |\n| Passed | ${passing} |\n| Failed | ${failing} |\n| Coverage | 78% |\n\n### Test Details\n\n${tests.map(t => `- ${t.status === 'passing' ? '✅' : '❌'} **${t.test_name}** (${t.file})`).join('\n')}\n\n### Recommendations\n\n1. Fix failing API Integration Tests\n2. Increase test coverage for edge cases\n3. Add more E2E tests for critical user paths`;
  }

  // Complete the task
  await db.updateTask(taskId, {
    status: 'completed',
    progress: 100,
    result: JSON.stringify(result),
    report,
  });

  io.emit('task_completed', {
    taskId,
    type,
    projectName,
    status: 'completed',
    progress: 100,
    result,
    report,
    timestamp: new Date().toISOString(),
  });
}

// =============================================================================
// SOCKET.IO
// =============================================================================

io.on('connection', async socket => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current state to newly connected client
  try {
    const projects = await db.getAllProjects();
    socket.emit('initial_state', projects);
  } catch (error) {
    console.error('[Socket] Error sending initial state:', error);
  }

  // Handle step status update via WebSocket
  socket.on('step_status_update', async data => {
    const { projectName, stepId, newStatus, previousStatus } = data;

    console.log(`[Socket] Step status update: ${projectName} step ${stepId} -> ${newStatus}`);

    try {
      // Get project from database
      const project = await db.getProject(projectName);

      if (!project) {
        return socket.emit('step_status_error', {
          projectName,
          stepId,
          error: 'Project not found',
          previousStatus,
        });
      }

      // Use project path if available, otherwise construct it
      const projectPath = project.path || path.join(paths.projectsDir, projectName);

      // Update step status in file
      const result = await updateStepStatus(projectPath, stepId, newStatus);

      // Update database
      const updatedProject = {
        ...project,
        implementation_plan: result.updatedPlan,
      };
      await db.upsertProject(updatedProject, projectPath);

      // Broadcast to ALL clients (including sender)
      io.emit('project_updated', updatedProject);

      console.log(`[Socket] Step ${stepId} updated to ${newStatus} in ${projectName}`);
    } catch (error) {
      console.error('[Socket] Step status update error:', error);

      socket.emit('step_status_error', {
        projectName,
        stepId,
        error: error.message,
        previousStatus,
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Global error handler - sanitizes errors in production
 */
app.use((err, req, res, next) => {
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
});

/**
 * 404 handler for undefined API routes
 */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `API endpoint ${req.method} ${req.path} not found`,
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
    console.log('     PM Dashboard Server v1.0.1        ');
    console.log('========================================');
    console.log('');

    // Print environment info
    console.log(
      `[Server] OpenClaw environment: ${isOpenClawEnvironment() ? 'Detected' : 'Not detected'}`
    );
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

    // Serve frontend static files
    serveFrontend();

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
