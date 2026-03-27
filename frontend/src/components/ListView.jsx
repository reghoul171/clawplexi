import { useMemo } from 'react';
import { Info, GitBranch, Code2 } from 'lucide-react';
import CollapsibleSection from './CollapsibleSection';
import Overview from './Overview';
import DecisionTree from './DecisionTree';
import Implementation from './Implementation';
import { normalizeProject } from '../utils/normalizeProject';

/**
 * List View - Merges Overview, DecisionTree, and Implementation
 * as collapsible sections for a consolidated view.
 */
function ListView({ project }) {
  // Normalize project data with defaults
  const normalizedProject = useMemo(() => normalizeProject(project), [project]);

  if (!normalizedProject) {
    return (
      <div className="text-center text-gray-400 py-12">
        No project data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Section - Default expanded */}
      <CollapsibleSection
        id="list-overview"
        title="Overview"
        icon={<Info className="w-5 h-5" />}
        defaultExpanded={true}
      >
        <div className="pt-4">
          <Overview project={normalizedProject} />
        </div>
      </CollapsibleSection>

      {/* Decision Tree Section - Default collapsed */}
      <CollapsibleSection
        id="list-decision-tree"
        title="Decision Tree"
        icon={<GitBranch className="w-5 h-5" />}
        defaultExpanded={false}
      >
        <div className="pt-4">
          <DecisionTree project={normalizedProject} />
        </div>
      </CollapsibleSection>

      {/* Implementation Section - Default expanded */}
      <CollapsibleSection
        id="list-implementation"
        title="Implementation Plan"
        icon={<Code2 className="w-5 h-5" />}
        defaultExpanded={true}
      >
        <div className="pt-4">
          <Implementation project={normalizedProject} />
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default ListView;
