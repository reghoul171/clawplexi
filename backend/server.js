// Load .env from parent directory (project root) if running from backend/
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Resolve workspace directory relative to project root
const projectRoot = path.resolve(__dirname, '..');
const WORKSPACE_DIR = path.resolve(projectRoot, process.env.WORKSPACE_DIR || './mock_workspace');

// In-memory state manager for projects
const projectsState = new Map();

// Middleware
app.use(cors());
app.use(express.json());

// Validate project state schema
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

  // Validate implementation_plan items
  for (const item of data.implementation_plan) {
    if (!item.step || !item.task || !item.status) {
      console.error('Invalid implementation_plan item structure');
      return false;
    }
    if (!['done', 'in_progress', 'pending'].includes(item.status)) {
      console.error(`Invalid status in implementation_plan: ${item.status}`);
      return false;
    }
  }

  // Validate decision_tree items
  for (const item of data.decision_tree) {
    if (!item.node_id || !item.decision || !item.chosen || !item.reason) {
      console.error('Invalid decision_tree item structure');
      return false;
    }
  }

  // Validate tests_generated items
  for (const item of data.tests_generated) {
    if (!item.test_name || !item.status || !item.file) {
      console.error('Invalid tests_generated item structure');
      return false;
    }
    if (!['passing', 'failing'].includes(item.status)) {
      console.error(`Invalid status in tests_generated: ${item.status}`);
      return false;
    }
  }

  return true;
}

// Read and parse a project state file
function readProjectState(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!validateProjectState(data)) {
      console.error(`Invalid schema in ${filePath}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Extract project name from file path
function getProjectName(filePath) {
  const parts = filePath.split(path.sep);
  const projectIndex = parts.findIndex(p => p === '.project_state.json');
  if (projectIndex > 0) {
    return parts[projectIndex - 1];
  }
  return path.dirname(filePath).split(path.sep).pop();
}

// Initialize watcher for .project_state.json files
const watcher = chokidar.watch('**/.project_state.json', {
  cwd: WORKSPACE_DIR,
  persistent: true,
  ignoreInitial: false,
  awaitWriteFinish: {
    stabilityThreshold: 100,
    pollInterval: 50
  }
});

// Handle file additions and changes
watcher.on('add', filePath => {
  const fullPath = path.join(WORKSPACE_DIR, filePath);
  console.log(`Project file found: ${fullPath}`);
  
  const projectData = readProjectState(fullPath);
  if (projectData) {
    projectsState.set(projectData.project_name, projectData);
    io.emit('project_updated', projectData);
    console.log(`Loaded project: ${projectData.project_name}`);
  }
});

watcher.on('change', filePath => {
  const fullPath = path.join(WORKSPACE_DIR, filePath);
  console.log(`Project file changed: ${fullPath}`);
  
  const projectData = readProjectState(fullPath);
  if (projectData) {
    projectsState.set(projectData.project_name, projectData);
    io.emit('project_updated', projectData);
    console.log(`Updated project: ${projectData.project_name}`);
  }
});

watcher.on('unlink', filePath => {
  const fullPath = path.join(WORKSPACE_DIR, filePath);
  console.log(`Project file removed: ${fullPath}`);
  
  const projectName = getProjectName(fullPath);
  if (projectsState.has(projectName)) {
    projectsState.delete(projectName);
    io.emit('project_removed', { project_name: projectName });
    console.log(`Removed project: ${projectName}`);
  }
});

watcher.on('error', error => {
  console.error('Watcher error:', error);
});

// REST API endpoints
app.get('/api/projects', (req, res) => {
  const projects = Array.from(projectsState.values());
  res.json(projects);
});

app.get('/api/projects/:name', (req, res) => {
  const project = projectsState.get(req.params.name);
  if (project) {
    res.json(project);
  } else {
    res.status(404).json({ error: 'Project not found' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projectsTracked: projectsState.size });
});

// Socket.io connection handling
io.on('connection', socket => {
  console.log('Client connected:', socket.id);
  
  // Send current state to newly connected client
  socket.emit('initial_state', Array.from(projectsState.values()));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Watching directory: ${path.resolve(WORKSPACE_DIR)}`);
});
