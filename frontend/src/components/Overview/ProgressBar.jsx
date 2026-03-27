/**
 * Progress bar with gradient fill and percentage display.
 */

function ProgressBar({ percentage, completedSteps, totalSteps }) {
  return (
    <section className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Progress</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Overall Completion</span>
          <span className="text-white font-medium">{percentage}%</span>
        </div>
        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-400">
          <span>{completedSteps} of {totalSteps} steps completed</span>
        </div>
      </div>
    </section>
  );
}

export default ProgressBar;
