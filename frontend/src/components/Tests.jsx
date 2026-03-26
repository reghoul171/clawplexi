import { useState } from 'react';
import { CheckCircle, XCircle, FileCode, Plus, Play, FileText, Loader2, CheckCircle2, XCircle as XCircleIcon, X } from 'lucide-react';
import { useTesterAgent } from '../hooks/useTesterAgent';

function Tests({ project }) {
  const { loading, error, lastResult, createTests, runTests, generateReport, clearError, clearResult } = useTesterAgent();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCreateTests = async () => {
    try {
      const result = await createTests(project.project_name);
      showToast(result.message || 'Tester agent spawned to create new tests', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to spawn tester agent', 'error');
    }
  };

  const handleRunTests = async () => {
    try {
      const result = await runTests(project.project_name);
      showToast(result.message || 'Tester agent spawned to run all tests', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to spawn tester agent', 'error');
    }
  };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReport(project.project_name);
      showToast(result.message || 'Tester agent spawned to generate report', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to spawn tester agent', 'error');
    }
  };

  if (!project.tests_generated || project.tests_generated.length === 0) {
    return (
      <div className="space-y-6">
        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCreateTests}
              disabled={loading.createTests}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading.createTests ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Generate New Tests</span>
            </button>
            
            <button
              onClick={handleRunTests}
              disabled={loading.runTests}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading.runTests ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Run All Tests</span>
            </button>
            
            <button
              onClick={handleGenerateReport}
              disabled={loading.generateReport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading.generateReport ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Generate Report</span>
            </button>
          </div>
        </div>

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
          <button
            onClick={handleCreateTests}
            disabled={loading.createTests}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading.createTests ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Generate New Tests</span>
          </button>
          
          <button
            onClick={handleRunTests}
            disabled={loading.runTests}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading.runTests ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Run All Tests</span>
          </button>
          
          <button
            onClick={handleGenerateReport}
            disabled={loading.generateReport}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {loading.generateReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Generate Report</span>
          </button>
        </div>
      </div>

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
    </div>
  );
}

function Toast({ toast, onClose }) {
  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
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

export default Tests;
