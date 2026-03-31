import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock lucide-react with all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
  };
});

// Mock transformToWorkspace
vi.mock('../../utils/transformProjects', () => ({
  transformToWorkspace: (projects) => {
    if (!projects || projects.length === 0) {
      return {
        name: 'Test Workspace',
        spaces: [],
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
      };
    }
    return {
      name: 'Test Workspace',
      spaces: [
        {
          id: 'space-1',
          name: 'Active Projects',
          lists: [
            { id: 'impl-project1', name: 'project1', project: { project_name: 'project1' } },
          ],
        },
      ],
      totalProjects: 2,
      activeProjects: 1,
      completedProjects: 1,
    };
  },
}));

// Import after mocks
import Sidebar from '../../components/Sidebar';
import WorkspaceHeader from '../../components/Sidebar/WorkspaceHeader';
import SpaceSection from '../../components/Sidebar/SpaceSection';
import SidebarFooter from '../../components/Sidebar/SidebarFooter';

describe('Sidebar', () => {
  const mockProjects = [
    { project_name: 'project1', status: 'active' },
    { project_name: 'project2', status: 'completed' },
  ];

  const defaultProps = {
    projects: mockProjects,
    activeProject: null,
    onSelectProject: vi.fn(),
    connected: true,
    onViewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render sidebar container', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('should show workspace name', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
  });

  it('should show connection status', () => {
    render(<Sidebar {...defaultProps} connected={true} />);
    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it('should show disconnected status', () => {
    render(<Sidebar {...defaultProps} connected={false} />);
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
  });

  it('should call onSelectProject when project selected', async () => {
    const onSelectProject = vi.fn();
    render(<Sidebar {...defaultProps} onSelectProject={onSelectProject} />);

    const projectLink = screen.getByText('project1');
    fireEvent.click(projectLink);

    expect(onSelectProject).toHaveBeenCalled();
  });

  it('should handle empty projects', () => {
    render(<Sidebar {...defaultProps} projects={[]} />);
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
  });
});

describe('WorkspaceHeader', () => {
  const defaultProps = {
    workspaceName: 'Test Workspace',
    isCollapsed: false,
    onToggle: vi.fn(),
    projectCount: 5,
    activeCount: 3,
    completedCount: 2,
  };

  it('should render workspace name', () => {
    render(<WorkspaceHeader {...defaultProps} />);
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();
  });

  it('should show project count', () => {
    render(<WorkspaceHeader {...defaultProps} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<WorkspaceHeader {...defaultProps} onToggle={onToggle} />);

    const toggleButton = screen.getByText('Test Workspace').closest('button');
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalled();
  });

  it('should show collapsed state', () => {
    render(<WorkspaceHeader {...defaultProps} isCollapsed={true} />);
    // When collapsed, chevron points right (ChevronRight icon)
    const header = screen.getByText('Test Workspace').closest('button');
    expect(header).toBeInTheDocument();
  });
});

describe('SpaceSection', () => {
  const mockSpace = {
    id: 'space-1',
    name: 'Active Projects',
    lists: [
      { id: 'list-1', name: 'Project A', project: { project_name: 'project-a' } },
      { id: 'list-2', name: 'Project B', project: { project_name: 'project-b' } },
    ],
  };

  const defaultProps = {
    space: mockSpace,
    isExpanded: true,
    onToggle: vi.fn(),
    activeListId: null,
    onSelectList: vi.fn(),
  };

  it('should render space name', () => {
    render(<SpaceSection {...defaultProps} />);
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
  });

  it('should render lists when expanded', () => {
    render(<SpaceSection {...defaultProps} isExpanded={true} />);
    expect(screen.getByText('Project A')).toBeInTheDocument();
    expect(screen.getByText('Project B')).toBeInTheDocument();
  });

  it('should hide lists when collapsed', () => {
    const { container } = render(<SpaceSection {...defaultProps} isExpanded={false} />);
    // Lists are hidden via max-h-0, not removed from DOM
    const listContainer = container.querySelector('.max-h-0');
    expect(listContainer).toBeInTheDocument();
  });

  it('should call onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<SpaceSection {...defaultProps} onToggle={onToggle} />);

    const toggleButton = screen.getByText('Active Projects').closest('button');
    fireEvent.click(toggleButton);

    expect(onToggle).toHaveBeenCalled();
  });

  it('should highlight active list', () => {
    render(<SpaceSection {...defaultProps} activeListId="list-1" />);
    const activeButton = screen.getByText('Project A').closest('button');
    expect(activeButton).toHaveClass('bg-purple-600');
  });

  it('should call onSelectList when list clicked', () => {
    const onSelectList = vi.fn();
    render(<SpaceSection {...defaultProps} onSelectList={onSelectList} />);

    const listButton = screen.getByText('Project A').closest('button');
    fireEvent.click(listButton);

    expect(onSelectList).toHaveBeenCalledWith(mockSpace.lists[0]);
  });
});

describe('SidebarFooter', () => {
  it('should show connected status', () => {
    render(<SidebarFooter connected={true} />);
    expect(screen.getByText(/Connected/i)).toBeInTheDocument();
  });

  it('should show disconnected status', () => {
    render(<SidebarFooter connected={false} />);
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
  });
});
