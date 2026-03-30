import { useMemo } from 'react';
import { normalizeProject } from '../utils/normalizeProject';
import {
  HeroSection,
  StatsGrid,
  ProgressBar,
  TechStackBadges,
  SystemArchitectureDiagram,
  QuickStats,
} from './Overview/index.js';

/**
 * Overview tab with modular components.
 * Layout: Hero → Stats Grid → Progress → Tech Stack → Dev Flow → Quick Stats
 */

function Overview({ project }) {
  // Normalize project data with defaults
  const normalizedProject = useMemo(() => normalizeProject(project), [project]);

  // Derive stats from implementation plan
  const completedSteps = useMemo(() => {
    return normalizedProject.implementation_plan.filter(s => s.status === 'done').length;
  }, [normalizedProject.implementation_plan]);

  const totalSteps = normalizedProject.implementation_plan.length;

  if (!normalizedProject) {
    return <div className="text-center text-gray-400 py-12">No project data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <HeroSection
        projectName={normalizedProject.project_name}
        projectDescription={normalizedProject.project_description}
        repositoryUrl={normalizedProject.repository_url}
        editorUsed={normalizedProject.editor_used}
      />

      {/* Stats Grid */}
      <StatsGrid
        teamSize={normalizedProject.team_size}
        linesOfCode={normalizedProject.lines_of_code}
        startDate={normalizedProject.start_date}
        progressPercentage={normalizedProject.progress_percentage}
        decisionTree={normalizedProject.decision_tree}
      />

      {/* Progress Bar */}
      <ProgressBar
        percentage={normalizedProject.progress_percentage}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
      />

      {/* Tech Stack Badges (only if tech_stack exists) */}
      {normalizedProject.tech_stack.length > 0 && (
        <TechStackBadges techStack={normalizedProject.tech_stack} />
      )}

      {/* System Architecture Diagram */}
      <SystemArchitectureDiagram
        decisionTree={normalizedProject.decision_tree}
        techStack={normalizedProject.tech_stack}
      />

      {/* Quick Stats */}
      <QuickStats implementationPlan={normalizedProject.implementation_plan} />
    </div>
  );
}

export default Overview;
