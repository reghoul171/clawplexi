import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ListView from '../../components/ListView';

describe('ListView Component', () => {
  it('should render no data message when project is null', () => {
    render(<ListView project={null} />);
    expect(screen.getByText('No project data available')).toBeInTheDocument();
  });

  it('should render no data message when project is undefined', () => {
    render(<ListView project={undefined} />);
    expect(screen.getByText('No project data available')).toBeInTheDocument();
  });

  it('should render list view with project data', () => {
    const project = {
      project_name: 'test-project',
      progress_percentage: 50,
      implementation_plan: [{ step: '1', task: 'Setup', status: 'done' }],
      decision_tree: [],
      tests_generated: [],
    };

    render(<ListView project={project} />);

    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    // Use getAllBy since 'Overview' and 'Decision Tree' may appear multiple times
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Decision Tree').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Implementation Plan').length).toBeGreaterThan(0);
  });

  it('should render project name in overview section', () => {
    const project = {
      project_name: 'my-awesome-project',
      progress_percentage: 75,
      implementation_plan: [],
      decision_tree: [],
      tests_generated: [],
    };

    render(<ListView project={project} />);

    // The project name should appear in the HeroSection
    expect(screen.getByText('my-awesome-project')).toBeInTheDocument();
  });
});
