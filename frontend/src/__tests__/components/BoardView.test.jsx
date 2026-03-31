import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => (
    <div data-testid="dnd-context">
      {children}
    </div>
  ),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  closestCenter: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(() => 'translate(0, 0)'),
    },
  },
}));

vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    useDraggable: vi.fn(() => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
    })),
    useDroppable: vi.fn(() => ({
      setNodeRef: vi.fn(),
      isOver: false,
    })),
  };
});

// Mock lucide-react with all icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    // Override specific icons if needed for test assertions
  };
});

// Mock hooks
vi.mock('../../components/BoardView/hooks/useStepDrag', () => ({
  useStepDrag: () => ({
    steps: [
      { step: 1, task: 'Task 1', status: 'pending' },
      { step: 2, task: 'Task 2', status: 'in_progress' },
      { step: 3, task: 'Task 3', status: 'done' },
    ],
    handleDragEnd: vi.fn(),
    handleStatusChange: vi.fn(),
    isUpdating: false,
    error: null,
    clearError: vi.fn(),
  }),
}));

vi.mock('../../components/BoardView/hooks/useStepEditor', () => ({
  useStepEditor: () => ({
    editingStep: null,
    editForm: {},
    setEditForm: vi.fn(),
    startEdit: vi.fn(),
    cancelEdit: vi.fn(),
    saveEdit: vi.fn(),
    isSaving: false,
    error: null,
  }),
}));

// Import after mocks
import BoardView from '../../components/BoardView';
import StepCard from '../../components/BoardView/StepCard';
import BoardColumn from '../../components/BoardView/BoardColumn';
import { TaskStatusBadge } from '../../components/BoardView/TaskStatusBadge';

describe('BoardView', () => {
  const mockProject = {
    project_name: 'test-project',
    implementation_plan: [
      { step: 1, task: 'Task 1', status: 'pending' },
      { step: 2, task: 'Task 2', status: 'in_progress' },
      { step: 3, task: 'Task 3', status: 'done' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without project', () => {
    render(<BoardView project={null} />);
    expect(screen.getByText('No project selected')).toBeInTheDocument();
  });

  it('should render board with project', () => {
    render(<BoardView project={mockProject} />);
    expect(screen.getByTestId('board-view')).toBeInTheDocument();
  });

  it('should render board header', () => {
    render(<BoardView project={mockProject} />);
    expect(screen.getByText('Board View')).toBeInTheDocument();
  });

  it('should show drag instructions', () => {
    render(<BoardView project={mockProject} />);
    expect(screen.getByText(/Drag cards between columns/i)).toBeInTheDocument();
  });

  it('should render three columns', () => {
    render(<BoardView project={mockProject} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});

describe('StepCard', () => {
  const mockStep = {
    step: 1,
    task: 'Test task description',
    status: 'pending',
  };

  it('should render step task', () => {
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
      />
    );
    expect(screen.getByText('Test task description')).toBeInTheDocument();
  });

  it('should have correct data-testid', () => {
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
      />
    );
    expect(screen.getByTestId('step-card-1')).toBeInTheDocument();
  });

  it('should show edit button when onEdit provided', () => {
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
        onEdit={vi.fn()}
      />
    );
    expect(screen.getByTitle('Edit step')).toBeInTheDocument();
  });

  it('should show delete button when onDelete provided', () => {
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByTitle('Delete step')).toBeInTheDocument();
  });

  it('should call onEdit when edit button clicked', async () => {
    const onEdit = vi.fn();
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
        onEdit={onEdit}
      />
    );

    const editButton = screen.getByTitle('Edit step');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockStep);
  });

  it('should call onDelete when delete button clicked', async () => {
    const onDelete = vi.fn();
    render(
      <StepCard
        step={mockStep}
        isDragging={false}
        totalSteps={3}
        stepIndex={0}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByTitle('Delete step');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockStep);
  });
});

describe('BoardColumn', () => {
  const mockSteps = [
    { step: 1, task: 'Task 1', status: 'pending' },
    { step: 2, task: 'Task 2', status: 'pending' },
  ];

  it('should render column title', () => {
    render(
      <BoardColumn
        id="pending"
        title="Pending"
        steps={mockSteps}
        icon={() => <span>Icon</span>}
        iconColor="text-gray-400"
        borderColor="border-gray-600"
        bgColor="bg-gray-700/30"
        activeId={null}
        totalSteps={5}
      />
    );
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should show step count', () => {
    render(
      <BoardColumn
        id="pending"
        title="Pending"
        steps={mockSteps}
        icon={() => <span>Icon</span>}
        iconColor="text-gray-400"
        borderColor="border-gray-600"
        bgColor="bg-gray-700/30"
        activeId={null}
        totalSteps={5}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('TaskStatusBadge', () => {
  it('should render pending status', () => {
    render(<TaskStatusBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('should render in_progress status', () => {
    render(<TaskStatusBadge status="in_progress" />);
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('should render done status', () => {
    render(<TaskStatusBadge status="done" />);
    expect(screen.getByText(/done/i)).toBeInTheDocument();
  });

  it('should render unknown status as unknown', () => {
    render(<TaskStatusBadge status="unknown" />);
    // Component shows the status as-is if not in statusConfig
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it('should apply size classes', () => {
    const { container } = render(<TaskStatusBadge status="done" size="sm" />);
    expect(container.firstChild).toHaveClass('text-xs');
  });
});
