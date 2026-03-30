/**
 * Project WebSocket Handlers
 * Handles project-related socket events
 */

'use strict';

const path = require('path');
const projectService = require('../../services/project.service');
const { updateStepStatus } = require('../../lib/projectState');
const projectRepository = require('../../repositories/project.repository');

/**
 * Register project socket handlers
 * @param {Object} io - Socket.io server
 * @param {Object} socket - Socket connection
 * @param {Object} paths - Resolved paths
 */
function register(io, socket, paths) {
  /**
   * Handle step status update via WebSocket
   */
  socket.on('step_status_update', async data => {
    const { projectName, stepId, newStatus, previousStatus } = data;

    console.log(`[Socket] Step status update: ${projectName} step ${stepId} -> ${newStatus}`);

    try {
      // Get project from database
      const project = await projectRepository.findByName(projectName);

      if (!project) {
        return socket.emit('step_status_error', {
          projectName,
          stepId,
          error: 'Project not found',
          previousStatus,
        });
      }

      // Use project path if available, otherwise construct it
      const projectPath = project._db?.path || path.join(paths.projectsDir, projectName);

      // Update step status in file
      const result = await updateStepStatus(projectPath, stepId, newStatus);

      // Update database
      const updatedProject = {
        ...project,
        implementation_plan: result.updatedPlan,
      };
      await projectRepository.upsert(updatedProject, projectPath);

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
}

module.exports = {
  register,
};
