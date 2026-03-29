import { useState, useMemo } from 'react';
import WorkspaceHeader from './WorkspaceHeader';
import SpaceSection from './SpaceSection';
import SidebarFooter from './SidebarFooter';
import { transformToWorkspace } from '../../utils/transformProjects';

function Sidebar({ projects, activeProject, onSelectProject, connected, onViewChange }) {
  // State for workspace collapse
  const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
  
  // State for expanded spaces (store space IDs)
  const [expandedSpaces, setExpandedSpaces] = useState(() => new Set());
  
  // Transform projects into workspace structure
  const workspace = useMemo(() => transformToWorkspace(projects), [projects]);
  
  // Determine active list ID from active project
  const activeListId = activeProject ? `impl-${activeProject.project_name}` : null;
  
  // Toggle space expansion
  const toggleSpace = (spaceId) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      if (next.has(spaceId)) {
        next.delete(spaceId);
      } else {
        next.add(spaceId);
      }
      return next;
    });
  };
  
  // Handle list selection - switches both project and view
  const handleSelectList = (list) => {
    if (list.project) {
      onSelectProject(list.project);
    }
    // Switch view based on list ID prefix
    if (onViewChange && list.id) {
      if (list.id.startsWith('tests-')) {
        onViewChange('tests');
      } else if (list.id.startsWith('impl-')) {
        onViewChange('board');
      } else if (list.id.startsWith('decisions-')) {
        onViewChange('list');
      }
    }
  };
  
  // Toggle workspace collapse
  const toggleWorkspace = () => {
    setWorkspaceCollapsed(prev => !prev);
  };
  
  return (
    <aside className="w-72 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Workspace header */}
      <WorkspaceHeader
        workspaceName={workspace.name}
        isCollapsed={workspaceCollapsed}
        onToggle={toggleWorkspace}
        projectCount={workspace.totalProjects}
        activeCount={workspace.activeProjects}
        completedCount={workspace.completedProjects}
      />
      
      {/* Spaces and lists (collapsible) */}
      <div 
        className={`flex-1 overflow-y-auto transition-all duration-200 ${
          workspaceCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {workspace.spaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <p className="text-gray-500 text-sm">No projects yet</p>
            <p className="text-gray-600 text-xs mt-1">
              Add a .project_state.json file to your workspace
            </p>
          </div>
        ) : (
          <div className="py-1">
            {workspace.spaces.map(space => (
              <SpaceSection
                key={space.id}
                space={space}
                isExpanded={expandedSpaces.has(space.id)}
                onToggle={() => toggleSpace(space.id)}
                activeListId={activeListId}
                onSelectList={handleSelectList}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer with connection status */}
      <SidebarFooter connected={connected} />
    </aside>
  );
}

export default Sidebar;
