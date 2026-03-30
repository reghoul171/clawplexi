import { List, LayoutGrid, GanttChart, FlaskConical } from 'lucide-react';

const views = [
  { id: 'list', icon: List, label: 'List View', tooltip: 'Detailed list view (Alt+1)' },
  { id: 'board', icon: LayoutGrid, label: 'Board View', tooltip: 'Kanban board (Alt+2)' },
  {
    id: 'timeline',
    icon: GanttChart,
    label: 'Timeline View',
    tooltip: 'Timeline/Gantt view (Alt+3)',
  },
  { id: 'tests', icon: FlaskConical, label: 'Tests View', tooltip: 'Tests dashboard (Alt+4)' },
];

function ViewSwitcher({ activeView, onViewChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
      {views.map(view => {
        const Icon = view.icon;
        const isActive = activeView === view.id;

        return (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            title={view.tooltip}
            className={`
              group relative flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200
              ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
              }
            `}
          >
            <Icon className="w-5 h-5" />

            {/* Tooltip on hover */}
            <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 whitespace-nowrap z-50">
              {view.tooltip}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ViewSwitcher;
