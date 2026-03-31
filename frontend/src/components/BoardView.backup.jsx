import { LayoutGrid, Kanban, ArrowRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';

function BoardView({ project }) {
  // Group implementation steps by status for Kanban columns
  const completedSteps = project.implementation_plan?.filter(s => s.status === 'done') || [];
  const inProgressSteps =
    project.implementation_plan?.filter(s => s.status === 'in_progress') || [];
  const pendingSteps = project.implementation_plan?.filter(s => s.status === 'pending') || [];

  const KanbanColumn = ({ title, steps, icon: Icon, iconColor, borderColor, bgColor }) => (
    <div
      className={`flex-1 min-w-[280px] bg-gray-800/50 rounded-xl border ${borderColor} overflow-hidden`}
    >
      {/* Column Header */}
      <div className={`px-4 py-3 ${bgColor} border-b ${borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <h3 className="font-medium text-white">{title}</h3>
          </div>
          <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
            {steps.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-auto">
        {steps.map((step, index) => (
          <div
            key={index}
            className="p-3 bg-gray-700/50 rounded-lg border border-gray-600/50 hover:border-gray-500 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono text-gray-500">Step {step.step}</span>
            </div>
            <p className="text-sm text-white">{step.task}</p>
          </div>
        ))}

        {steps.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No items</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Kanban className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Board View</h2>
            <p className="text-purple-300 text-sm mt-1">
              Coming in Phase 3 — Interactive Kanban board with drag & drop
            </p>
          </div>
        </div>
      </div>

      {/* Preview Mockup */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-400" />
          Preview Mockup
        </h3>

        <div className="flex gap-4 overflow-x-auto pb-4">
          <KanbanColumn
            title="Pending"
            steps={pendingSteps}
            icon={Circle}
            iconColor="text-gray-400"
            borderColor="border-gray-600"
            bgColor="bg-gray-700/30"
          />

          <KanbanColumn
            title="In Progress"
            steps={inProgressSteps}
            icon={Loader2}
            iconColor="text-yellow-400"
            borderColor="border-yellow-600/50"
            bgColor="bg-yellow-900/20"
          />

          <KanbanColumn
            title="Completed"
            steps={completedSteps}
            icon={CheckCircle2}
            iconColor="text-green-400"
            borderColor="border-green-600/50"
            bgColor="bg-green-900/20"
          />
        </div>
      </div>

      {/* Planned Features */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Planned Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'Drag & drop cards between columns',
            'Real-time status updates',
            'Card priority indicators',
            'Quick task editing',
            'Filter by assignee/status',
            'Swimlane grouping',
          ].map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-gray-300">
              <ArrowRight className="w-4 h-4 text-blue-400" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BoardView;
