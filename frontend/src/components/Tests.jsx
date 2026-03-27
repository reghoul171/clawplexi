import { useState } from 'react';
import { CheckCircle, XCircle, FileCode, Plus, Play, FileText, Loader2, CheckCircle2, XCircle as XCircleIcon, X, Clock, AlertCircle } from 'lucide-react';
import { useTesterAgent } from '../hooks/useTesterAgent';

function Tests({ project }) {
  const { 
    loading, 
    pendingTasks, 
    completedTasks, 
    lastResult, 
    createTests, 
    runTests, 
    generateReport, 
    clearError, 
    dismissTask 
  } = useTesterAgent();
  
  const [toast, setToast] = useState(null);
  const [showReport, setShowReport] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreateTests = async () => {
    try {
      const result = await createTests(project.project_name);
      showToast(result.message || 'Creating tests...', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create tests', 'error');
    }
  };

  const handleRunTests = async () => {
    try {
      const result = await runTests(project.project_name);
      showToast(result.message || 'Running tests...', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to run tests', 'error');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport(project.project_name);
      showToast(result.message || 'Generating report...', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to generate report', 'error');
    }
  };

  const handleViewReport = (task) => {
    setShowReport(task);
  };

  const handleCloseReport = () => {
    setShowReport(null);
  };

  // Get pending tasks for this project
  const projectPendingTasks = Object.values(pendingTasks).filter(
    t => t.projectName === project.project_name
  );
  
  const projectCompletedTasks = completedTasks.filter(
    t => t.projectName === project.project_name
  );

  if (!project.tests_generated || project.tests_generated.length === 0) {
    return (
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3">
            <ActionButton
              onClick={handleCreateTests}
              loading={loading.createTests}
              pendingTask={projectPendingTasks.find(t => t.type === 'create-tests')}
              icon={<Plus className="w-4 h-4" />}
              label="Generate New Tests"
              color="blue"
            />
            
            <ActionButton
              onClick={handleRunTests}
              loading={loading.runTests}
              pendingTask={projectPendingTasks.find(t => t.type === 'run-tests')}
              icon={<Play className="w-4 h-4" />}
              label="Run All Tests"
              color="green"
            />
            
            <ActionButton
              onClick={handleGenerateReport}
              loading={loading.generateReport}
              pendingTask={projectPendingTasks.find(t => t.type === 'generate-report')}
              icon={<FileText className="w-4 h-4" />}
              label="Generate Report"
              color="purple"
            />
          </div>
        </div>

        {/* Pending Tasks */}
        {projectPendingTasks.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
              In Progress
            </h3>
            <div className="space-y-3">
              {projectPendingTasks.map(task => (
                <TaskProgressCard key={task.taskId} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {projectCompletedTasks.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Recent Completed
            </h3>
            <div className="space-y-3">
              {projectCompletedTasks.slice(0, 5).map(task => (
                <CompletedTaskCard 
                  key={task.taskId} 
                  task={task} 
                  onViewReport={handleViewReport}
                  onDismiss={() => dismissTask(task.taskId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Test Results</h3>
          </div>
          <p className="text-gray-400">No tests generated yet. Click "Generate New Tests" to create tests for this project.</p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <Toast toast={toast} onClose={() => setToast(null)} />
        )}

        {/* Report Modal */}
        {showReport && (
          <ReportModal task={showReport} onClose={handleCloseReport} />
        )}
      </div>
    );
  }

  const passingTests = project.tests_generated.filter(t => t.status === 'passing').length;
  const failingTests = project.tests_generated.filter(t => t.status === 'failing').length;
  const totalTests = project.tests_generated.length;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <ActionButton
            onClick={handleCreateTests}
            loading={loading.createTests}
            pendingTask={projectPendingTasks.find(t => t.type === 'create-tests')}
            icon={<Plus className="w-4 h-4" />}
            label="Generate New Tests"
            color="blue"
          />
          
          <ActionButton
            onClick={handleRunTests}
            loading={loading.runTests}
            pendingTask={projectPendingTasks.find(t => t.type === 'run-tests')}
            icon={<Play className="w-4 h-4" />}
            label="Run All Tests"
            color="green"
          />
          
          <ActionButton
            onClick={handleGenerateReport}
            loading={loading.generateReport}
            pendingTask={projectPendingTasks.find(t => t.type === 'generate-report')}
            icon={<FileText className="w-4 h-4" />}
            label="Generate Report"
            color="purple"
          />
        </div>
      </div>

      {/* Pending Tasks */}
      {projectPendingTasks.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
            In Progress
          </h3>
          <div className="space-y-3">
            {projectPendingTasks.map(task => (
              <TaskProgressCard key={task.taskId} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {projectCompletedTasks.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Recent Completed
          </h3>
          <div className="space-y-3">
            {projectCompletedTasks.slice(0, 5).map(task => (
              <CompletedTaskCard 
                key={task.taskId} 
                task={task} 
                onViewReport={handleViewReport}
                onDismiss={() => dismissTask(task.taskId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Test Summary */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCode className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Test Results</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{totalTests}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{passingTests}</div>
            <div className="text-sm text-gray-400">Passing</div>
          </div>
          <div className="bg-red-500/10 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{failingTests}</div>
            <div className="text-sm text-gray-400">Failing</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full flex">
            <div
              className="bg-green-500"
              style={{ width: `${(passingTests / totalTests) * 100}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${(failingTests / totalTests) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Test Details Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Test Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                File Path
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {project.tests_generated.map((test, index) => (
              <tr key={index} className="hover:bg-gray-700/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {test.status === 'passing' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`ml-2 text-sm ${
                      test.status === 'passing' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {test.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-white font-mono text-sm">{test.test_name}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-gray-400 font-mono text-sm">{test.file}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}

      {/* Report Modal */}
      {showReport && (
        <ReportModal task={showReport} onClose={handleCloseReport} />
      )}
    </div>
  );
}

// Action Button Component with Progress
function ActionButton({ onClick, loading, pendingTask, icon, label, color }) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50',
    green: 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50',
    purple: 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50',
  };

  const isRunning = pendingTask && pendingTask.status !== 'completed';

  return (
    <button
      onClick={onClick}
      disabled={loading || isRunning}
      className={`flex items-center gap-2 px-4 py-2 ${colorClasses[color]} disabled:cursor-not-allowed text-white rounded-lg transition-colors`}
    >
      {loading || isRunning ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{pendingTask?.progress || 0}%</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// Task Progress Card
function TaskProgressCard({ task }) {
  const typeLabels = {
    'create-tests': 'Creating Tests',
    'run-tests': 'Running Tests',
    'generate-report': 'Generating Report'
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{typeLabels[task.type] || task.type}</span>
        <span className="text-sm text-gray-400">{task.progress}%</span>
      </div>
      <div className="h-2 bg-gray-600 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${task.progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-400">{task.message}</p>
    </div>
  );
}

// Completed Task Card
function CompletedTaskCard({ task, onViewReport, onDismiss }) {
  const typeLabels = {
    'create-tests': 'Test Creation',
    'run-tests': 'Test Run',
    'generate-report': 'Report Generation'
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400" />
        <div>
          <span className="text-white font-medium">{typeLabels[task.type] || task.type}</span>
          <span className="text-sm text-gray-400 ml-2">
            {new Date(task.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onViewReport(task)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          View Report
        </button>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-gray-600 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// Toast Component
function Toast({ toast, onClose }) {
  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg z-50 ${
      toast.type === 'success' 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white'
    }`}>
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
      ) : (
        <XCircleIcon className="w-5 h-5 flex-shrink-0" />
      )}
      <span className="text-sm">{toast.message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:opacity-75 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Report Modal Component
function ReportModal({ task, onClose }) {
  const typeLabels = {
    'create-tests': 'Test Creation Report',
    'run-tests': 'Test Run Report',
    'generate-report': 'Test Report'
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4 flex items-center justify-between border-b border-gray-600">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              {typeLabels[task.type] || 'Task Report'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[60vh]">
          {/* Result Summary */}
          {task.result && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(task.result).map(([key, value]) => (
                  <div key={key} className="bg-gray-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-white">{value}</div>
                    <div className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Markdown */}
          {task.report && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
              <div className="bg-gray-900 rounded-lg p-4 prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
                  {task.report}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-6 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-500">
              Completed: {new Date(task.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-700 px-6 py-4 flex justify-end gap-3 border-t border-gray-600">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
          {task.report && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(task.report);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Copy Report
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tests;
