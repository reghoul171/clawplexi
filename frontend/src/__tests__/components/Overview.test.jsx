import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Overview from '../../components/Overview';

describe('Overview Component', () => {
  it('should render no data message when project is null', () => {
    render(<Overview project={null} />);
    expect(screen.getByText('No project data available')).toBeInTheDocument();
  });

  it('should render no data message when project is undefined', () => {
    render(<Overview project={undefined} />);
    expect(screen.getByText('No project data available')).toBeInTheDocument();
  });

  it('should render overview with project data', () => {
    const project = {
      project_name: 'test-project',
      project_description: 'A test project description',
      progress_percentage: 50,
      implementation_plan: [
        { step: '1', task: 'Setup', status: 'done' },
        { step: '2', task: 'Development', status: 'in_progress' },
      ],
      decision_tree: [],
      tech_stack: ['React', 'Node.js'],
    };

    render(<Overview project={project} />);

    expect(screen.getByText('test-project')).toBeInTheDocument();
    expect(screen.getByText('A test project description')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    const project = {
      project_name: 'progress-test',
      progress_percentage: 75,
      implementation_plan: [],
      decision_tree: [],
      tech_stack: [],
    };

    render(<Overview project={project} />);

    // Progress percentage appears multiple times (in StatsGrid and ProgressBar)
    const progressElements = screen.getAllByText('75%');
    expect(progressElements.length).toBeGreaterThan(0);
  });

  it('should render tech stack badges when present', () => {
    const project = {
      project_name: 'tech-test',
      progress_percentage: 0,
      implementation_plan: [],
      decision_tree: [],
      tech_stack: ['React', 'Node.js', 'SQLite'],
    };

    render(<Overview project={project} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('SQLite')).toBeInTheDocument();
  });

  it('should not render tech stack section when empty', () => {
    const project = {
      project_name: 'no-tech-test',
      progress_percentage: 0,
      implementation_plan: [],
      decision_tree: [],
      tech_stack: [],
    };

    render(<Overview project={project} />);

    // Tech Stack section should not be visible
    expect(screen.queryByText('Tech Stack')).not.toBeInTheDocument();
  });

  it('should display completed and total steps in progress bar', () => {
    const project = {
      project_name: 'steps-test',
      progress_percentage: 66,
      implementation_plan: [
        { step: '1', task: 'Setup', status: 'done' },
        { step: '2', task: 'Dev', status: 'done' },
        { step: '3', task: 'Test', status: 'in_progress' },
      ],
      decision_tree: [],
      tech_stack: [],
    };

    render(<Overview project={project} />);

    // Should show "2 of 3 steps completed"
    expect(screen.getByText('2 of 3 steps completed')).toBeInTheDocument();
  });
});
