import { Folder, CheckCircle2 } from 'lucide-react';

function Sidebar({ projects, activeProject, onSelectProject, connected }) {
  return (
    <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Folder className="w-6 h-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Projects</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {projects.length} project{projects.length !== 1 ? 's' : ''} tracked
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No projects yet</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {projects.map(project => (
              <li key={project.project_name}>
                <button
                  onClick={() => onSelectProject(project)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeProject?.project_name === project.project_name
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{project.project_name}</span>
                    <span className="text-xs opacity-75">{project.progress_percentage}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${project.progress_percentage}%` }}
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          WebSocket: {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
