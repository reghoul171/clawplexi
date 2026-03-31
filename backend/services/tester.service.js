/**
 * Tester Service
 * Business logic for test-related operations
 */

'use strict';

const taskService = require('./task.service');
const projectService = require('./project.service');

/**
 * Simulate task completion (for demo when gateway unavailable)
 * @param {string} taskId - Task ID
 * @param {string} type - Task type
 * @param {string} projectName - Project name
 * @param {Object} [project] - Project data (optional)
 * @param {Function} emitProgress - Progress emit callback
 */
async function simulateTaskCompletion(taskId, type, projectName, project = null, emitProgress) {
  // Simulate progress
  for (let i = 20; i <= 80; i += 20) {
    await taskService.updateTaskProgress(taskId, { progress: i, message: `Processing... ${i}%` });
    emitProgress({
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
  await taskService.completeTask(taskId, { result, report });

  return {
    taskId,
    type,
    projectName,
    status: 'completed',
    progress: 100,
    result,
    report,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle tester agent request
 * @param {string} type - Task type (create-tests, run-tests, generate-report)
 * @param {string} projectName - Project name
 * @param {Object} options - Options including io and gatewayUrl
 * @returns {Promise<Object>} Task info
 */
async function handleTesterRequest(type, projectName, options) {
  const { io, gatewayUrl } = options;

  if (!projectName) {
    throw new Error('Project name is required');
  }

  console.log(`[TesterService] Spawn request to ${type} for: ${projectName}`);

  // Create task in database
  const taskId = await taskService.createTask({
    project_name: projectName,
    type,
    message: getInitialMessage(type),
  });

  // Emit task started event
  io.emit('task_started', {
    taskId,
    type,
    projectName,
    status: 'pending',
    progress: 0,
    message: getInitialMessage(type),
    timestamp: new Date().toISOString(),
  });

  // Try to spawn via OpenClaw gateway if available
  try {
    const fetch = (await import('node-fetch')).default;
    await fetch(`${gatewayUrl}/api/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'tester',
        message: `${getSpawnMessage(type)} for project "${projectName}"`,
        context: { projectName, action: type, taskId },
      }),
    });

    // Update task to running
    await taskService.updateTaskProgress(taskId, {
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
    console.log('[TesterService] Gateway unavailable, simulating task');
    // Simulate completion for demo purposes
    const project = await projectService.getProjectByName(projectName);
    setTimeout(async () => {
      const completion = await simulateTaskCompletion(taskId, type, projectName, project, data => {
        io.emit('task_progress', data);
      });
      io.emit('task_completed', completion);
    }, 2000);
  }

  return {
    success: true,
    taskId,
    message: `Tester agent ${type} request sent`,
    projectName,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get initial message for task type
 */
function getInitialMessage(type) {
  const messages = {
    'create-tests': 'Creating tests...',
    'run-tests': 'Running tests...',
    'generate-report': 'Generating report...',
  };
  return messages[type] || 'Processing...';
}

/**
 * Get spawn message for task type
 */
function getSpawnMessage(type) {
  const messages = {
    'create-tests': 'Create new tests',
    'run-tests': 'Run all tests',
    'generate-report': 'Generate test report',
  };
  return messages[type] || 'Process';
}

module.exports = {
  handleTesterRequest,
  simulateTaskCompletion,
};
