import {
  GanttChart,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';

function TimelineView({ project }) {
  const implementationPlan = project.implementation_plan || [];

  // Calculate timeline visualization
  const totalSteps = implementationPlan.length;
  const completedCount = implementationPlan.filter(s => s.status === 'done').length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const statusColors = {
    done: 'bg-green-500',
    in_progress: 'bg-yellow-500',
    pending: 'bg-gray-500',
  };

  const statusIcons = {
    done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    in_progress: <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />,
    pending: <Circle className="w-4 h-4 text-gray-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-xl p-6 border border-cyan-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <GanttChart className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Timeline View</h2>
            <p className="text-cyan-300 text-sm mt-1">
              Coming Soon — Gantt chart with milestones and dependencies
            </p>
          </div>
        </div>
      </div>

      {/* Preview Mockup */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Timeline Preview
        </h3>

        {/* Timeline Visualization */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="relative">
            {/* Progress Line Background */}
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-700" />

            {/* Progress Line Filled */}
            <div
              className="absolute left-[19px] top-0 w-0.5 bg-gradient-to-b from-green-500 to-green-500/50 transition-all duration-500"
              style={{ height: `${progressPercentage}%` }}
            />

            {/* Timeline Items */}
            <div className="space-y-4">
              {implementationPlan.slice(0, 8).map((step, index) => (
                <div key={index} className="flex items-start gap-4 relative">
                  {/* Status Indicator */}
                  <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-700">
                    {statusIcons[step.status]}
                  </div>

                  {/* Content */}
                  <div
                    className={`flex-1 p-3 rounded-lg ${
                      step.status === 'done'
                        ? 'bg-gray-700/30'
                        : step.status === 'in_progress'
                          ? 'bg-yellow-900/20 border border-yellow-600/30'
                          : 'bg-gray-700/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">Step {step.step}</span>
                      <div className={`w-2 h-2 rounded-full ${statusColors[step.status]}`} />
                    </div>
                    <p
                      className={`text-sm ${step.status === 'done' ? 'text-gray-400' : 'text-white'}`}
                    >
                      {step.task}
                    </p>
                  </div>

                  {/* Duration Bar (visual mockup) */}
                  <div className="hidden lg:flex items-center gap-2 min-w-[120px]">
                    <div
                      className={`h-2 rounded-full ${
                        step.status === 'done'
                          ? 'bg-green-500'
                          : step.status === 'in_progress'
                            ? 'bg-yellow-500'
                            : 'bg-gray-600'
                      }`}
                      style={{ width: `${((step.step * 7) % 40) + 40}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {implementationPlan.length > 8 && (
            <div className="text-center text-gray-400 text-sm mt-4">
              +{implementationPlan.length - 8} more steps
            </div>
          )}
        </div>
      </div>

      {/* Planned Features */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Planned Features
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Interactive Gantt chart',
            'Task dependencies visualization',
            'Milestone markers',
            'Critical path highlighting',
            'Resource allocation view',
            'Progress forecasting',
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-gray-300">
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimelineView;
