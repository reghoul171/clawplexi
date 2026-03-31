/**
 * File Watcher Service
 * Manages Chokidar file watching for .project_state.json files
 */

'use strict';

const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const projectRepository = require('../repositories/project.repository');

/**
 * Create a file watcher service
 * @param {Object} options - Configuration options
 * @param {string} options.projectsDir - Directory to watch
 * @param {Array} options.ignorePatterns - Patterns to ignore
 * @param {Object} options.io - Socket.io server instance
 * @returns {Object} Watcher service
 */
function createFileWatcherService(options) {
  const { projectsDir, ignorePatterns, io } = options;
  let watcher = null;

  /**
   * Initialize the file watcher
   */
  function init() {
    // Check if workspace exists
    if (!fs.existsSync(projectsDir)) {
      console.warn(`[FileWatcher] Workspace directory not found: ${projectsDir}`);
      console.log('[FileWatcher] Will create directory when projects are added');
      fs.mkdirSync(projectsDir, { recursive: true });
    }

    console.log(`[FileWatcher] Watching: ${projectsDir}`);

    watcher = chokidar.watch('**/.project_state.json', {
      cwd: projectsDir,
      persistent: true,
      ignoreInitial: false,
      ignored: ignorePatterns,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    watcher.on('add', handleFileAdd);
    watcher.on('change', handleFileChange);
    watcher.on('unlink', handleFileUnlink);
    watcher.on('error', error => console.error('[FileWatcher] Error:', error));

    watcher.on('ready', () => {
      console.log('[FileWatcher] Ready - scanning for project files');
    });
  }

  /**
   * Handle file addition
   */
  async function handleFileAdd(relativePath) {
    const fullPath = path.join(projectsDir, relativePath);
    console.log(`[FileWatcher] File found: ${fullPath}`);

    const projectData = await readAndValidateProject(fullPath);
    if (projectData) {
      await projectRepository.upsert(projectData, fullPath);
      io.emit('project_updated', projectData);
      console.log(`[FileWatcher] Loaded project: ${projectData.project_name}`);
    }
  }

  /**
   * Handle file change
   */
  async function handleFileChange(relativePath) {
    const fullPath = path.join(projectsDir, relativePath);
    console.log(`[FileWatcher] File changed: ${fullPath}`);

    const projectData = await readAndValidateProject(fullPath);
    if (projectData) {
      await projectRepository.upsert(projectData, fullPath);
      io.emit('project_updated', projectData);
      console.log(`[FileWatcher] Updated project: ${projectData.project_name}`);
    }
  }

  /**
   * Handle file removal
   */
  async function handleFileUnlink(relativePath) {
    const fullPath = path.join(projectsDir, relativePath);
    console.log(`[FileWatcher] File removed: ${fullPath}`);

    // Extract project name from path
    const parts = relativePath.split(path.sep);
    const projectName = parts[parts.length - 2] || path.dirname(relativePath);

    // Soft delete in database
    await projectRepository.softDelete(projectName);
    io.emit('project_removed', { project_name: projectName });
    console.log(`[FileWatcher] Removed project: ${projectName}`);
  }

  /**
   * Read and validate a project state file
   */
  function readAndValidateProject(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      if (!validateProjectState(data)) {
        console.error(`[FileWatcher] Invalid schema in ${filePath}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`[FileWatcher] Error reading ${filePath}:`, error.message);
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

  /**
   * Close the watcher
   */
  async function close() {
    if (watcher) {
      await watcher.close();
      console.log('[FileWatcher] Closed file watcher');
    }
  }

  return {
    init,
    close,
  };
}

module.exports = {
  createFileWatcherService,
};
