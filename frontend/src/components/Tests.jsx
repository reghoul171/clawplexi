import { CheckCircle, XCircle, FileCode } from 'lucide-react';

function Tests({ project }) {
  if (!project.tests_generated || project.tests_generated.length === 0) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCode className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Test Results</h3>
        </div>
        <p className="text-gray-400">No tests generated yet.</p>
      </div>
    );
  }

  const passingTests = project.tests_generated.filter(t => t.status === 'passing').length;
  const failingTests = project.tests_generated.filter(t => t.status === 'failing').length;
  const totalTests = project.tests_generated.length;

  return (
    <div className="space-y-6">
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
    </div>
  );
}

export default Tests;
