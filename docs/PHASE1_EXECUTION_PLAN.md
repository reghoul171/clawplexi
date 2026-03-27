# Phase 1: Sidebar Overhaul - Detailed Execution Plan

## Overview

Transform the current flat project list sidebar into a ClickUp-style hierarchical collapsible navigation with Workspace → Spaces → Lists structure.

**Timeline:** 2-3 days  
**Complexity:** Medium  
**Dependencies:** None (foundation for subsequent phases)

---

## Current State Analysis

### Existing Sidebar (`Sidebar.jsx`)
- Flat list of projects
- Single-level navigation
- Progress bar per project
- WebSocket connection status

### Data Model
Current project schema:
```json
{
  "project_name": "String",
  "editor_used": "String",
  "progress_percentage": "Number",
  "implementation_plan": [...],
  "decision_tree": [...],
  "tests_generated": [...]
}
```

---

## Target Architecture

### New Sidebar Structure
```
Workspace (collapsible header)
├── Space: Development (collapsible)
│   ├── List: Implementation Tasks
│   ├── List: Bug Fixes
│   └── List: Code Review
├── Space: Planning (collapsible)
│   ├── List: Milestones
│   └── List: Decisions
└── Space: Testing (collapsible)
    ├── List: Unit Tests
    └── List: Integration Tests
```

### Component Hierarchy
```
Sidebar/
├── index.jsx              # Main sidebar container
├── WorkspaceHeader.jsx    # Workspace name + collapse toggle
├── SpaceSection.jsx       # Collapsible space group
├── ListTree.jsx           # Individual list item
└── SidebarFooter.jsx      # Connection status
```

---

## Implementation Steps

### Step 1: Create Sidebar Component Directory Structure (30 min)

**Files to create:**
```
frontend/src/components/Sidebar/
├── index.jsx
├── WorkspaceHeader.jsx
├── SpaceSection.jsx
├── ListTree.jsx
└── SidebarFooter.jsx
```

**Action:**
```bash
mkdir -p ~/openclaw-pm-dashboard/frontend/src/components/Sidebar
touch ~/openclaw-pm-dashboard/frontend/src/components/Sidebar/index.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/Sidebar/WorkspaceHeader.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/Sidebar/SpaceSection.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/Sidebar/ListTree.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/Sidebar/SidebarFooter.jsx
```

---

### Step 2: Implement WorkspaceHeader Component (1 hour)

**Purpose:** Display workspace name with collapse/expand toggle

**Props:**
```jsx
{
  workspaceName: string,      // e.g., "My Workspace"
  isCollapsed: boolean,       // Expansion state
  onToggle: () => void,       // Toggle callback
  projectCount: number        // Number of projects
}
```

**Behavior:**
- Click header to collapse/expand entire sidebar content
- Show workspace icon (Building2 or FolderOpen)
- Display project count badge
- Smooth collapse animation

**Implementation notes:**
- Use `lucide-react` for icons (already in dependencies)
- Use Tailwind `transition-all duration-200` for animations
- Store collapse state in parent component

---

### Step 3: Implement SpaceSection Component (1.5 hours)

**Purpose:** Collapsible group of lists within a space

**Props:**
```jsx
{
  space: {
    id: string,
    name: string,             // e.g., "Development"
    icon: string,             // Icon name from lucide
    color: string,            // Tailwind color class
    lists: Array<List>
  },
  isExpanded: boolean,
  onToggle: () => void,
  activeListId: string | null,
  onSelectList: (list) => void
}
```

**Behavior:**
- Space name with colored icon
- Chevron rotation on expand/collapse
- Animated height transition for list reveal
- Click anywhere on header to toggle

**Icon mapping:**
```javascript
const spaceIcons = {
  development: 'Code2',
  planning: 'Calendar',
  testing: 'FlaskConical',
  design: 'Palette',
  deployment: 'Rocket'
};
```

---

### Step 4: Implement ListTree Component (1 hour)

**Purpose:** Individual list item within a space

**Props:**
```jsx
{
  list: {
    id: string,
    name: string,             // e.g., "Implementation Tasks"
    itemCount: number,        // Number of tasks
    completedCount: number,   // Completed tasks
    status: 'done' | 'in_progress' | 'pending'
  },
  isActive: boolean,
  onClick: () => void
}
```

**Behavior:**
- Indented under space section
- Status indicator dot (colored by status)
- Task count badge
- Hover highlight effect
- Active state styling (blue background)

---

### Step 5: Implement SidebarFooter Component (30 min)

**Purpose:** Connection status and settings

**Props:**
```jsx
{
  connected: boolean,
  onSettingsClick?: () => void
}
```

**Behavior:**
- WebSocket connection indicator
- "Connected"/"Disconnected" text
- Optional settings gear icon

---

### Step 6: Create Data Transformation Layer (1.5 hours)

**Purpose:** Transform flat project data into hierarchical structure

**New utility file:** `frontend/src/utils/transformWorkspace.js`

**Function signature:**
```javascript
/**
 * Transform flat project list into workspace structure
 * @param {Array} projects - Flat list of projects
 * @returns {Object} Workspace structure with spaces and lists
 */
export function transformToWorkspace(projects) {
  // Group projects by inferred space
  // Create list items from implementation_plan
  // Return normalized structure
}
```

**Grouping logic:**
1. Each project becomes a "List" under the "Development" space
2. Implementation steps with status become task counts
3. Tests go under "Testing" space
4. Decision tree items go under "Planning" space

**Example transformation:**
```javascript
// Input: ProjectAlpha
{
  project_name: "ProjectAlpha",
  implementation_plan: [
    { step: "1", task: "Setup", status: "done" },
    { step: "2", task: "Build API", status: "in_progress" },
    { step: "3", task: "Test", status: "pending" }
  ]
}

// Output: Workspace structure
{
  spaces: [
    {
      id: 'dev-projectalpha',
      name: 'ProjectAlpha',
      icon: 'Code2',
      color: 'text-blue-400',
      lists: [
        {
          id: 'impl-projectalpha',
          name: 'Implementation',
          itemCount: 3,
          completedCount: 1,
          status: 'in_progress'
        }
      ]
    }
  ]
}
```

---

### Step 7: Create Sidebar Main Container (1.5 hours)

**File:** `frontend/src/components/Sidebar/index.jsx`

**Props:**
```jsx
{
  projects: Array,
  activeProject: Object | null,
  onSelectProject: (project) => void,
  connected: boolean
}
```

**State:**
```jsx
const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);
const [expandedSpaces, setExpandedSpaces] = useState(new Set());
```

**Behavior:**
- Render WorkspaceHeader at top
- Map through spaces → SpaceSection
- Track expanded spaces in state
- Handle list selection → map back to project
- Render SidebarFooter at bottom

---

### Step 8: Create Sidebar Styles (30 min)

**Approach:** Use Tailwind utility classes (existing pattern)

**Key style patterns:**
```css
/* Sidebar container */
.w-72 bg-gray-800 border-r border-gray-700 flex flex-col

/* Space section header */
.px-3 py-2 text-gray-300 hover:bg-gray-700 rounded-lg cursor-pointer

/* List item */
pl-8 pr-3 py-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50

/* Active list item */
bg-blue-600 text-white

/* Collapse animation */
transition-all duration-200 ease-in-out
```

---

### Step 9: Update App.jsx Integration (1 hour)

**Changes to `App.jsx`:**

1. Import new Sidebar:
```jsx
import Sidebar from './components/Sidebar';
// Remove old: import Sidebar from './components/Sidebar.jsx';
```

2. Pass required props:
```jsx
<Sidebar
  projects={projects}
  activeProject={activeProject}
  onSelectProject={setActiveProject}
  connected={connected}
/>
```

3. No changes to data fetching logic (transformation happens inside Sidebar)

---

### Step 10: Testing & Polish (1.5 hours)

**Manual testing checklist:**
- [ ] Sidebar renders with workspace header
- [ ] Spaces expand/collapse correctly
- [ ] List items show correct status indicators
- [ ] Active project highlights correctly
- [ ] Collapse state persists during session
- [ ] Smooth animations on all interactions
- [ ] Responsive behavior (if needed)
- [ ] Dark mode colors consistent

**Edge cases:**
- Empty project list
- Single project
- Long project names (truncate)
- Very long list names

---

## File Structure After Phase 1

```
frontend/src/
├── components/
│   ├── Sidebar/
│   │   ├── index.jsx           # Main container (NEW)
│   │   ├── WorkspaceHeader.jsx # Workspace header (NEW)
│   │   ├── SpaceSection.jsx    # Space group (NEW)
│   │   ├── ListTree.jsx        # List item (NEW)
│   │   └── SidebarFooter.jsx   # Footer (NEW)
│   ├── Sidebar.jsx             # OLD - Keep for rollback
│   ├── Overview/
│   │   └── ... (existing)
│   └── ... (other existing)
├── utils/
│   ├── transformWorkspace.js   # Data transformation (NEW)
│   └── ... (existing)
└── App.jsx                     # Updated imports
```

---

## Rollback Plan

1. Old `Sidebar.jsx` remains in `components/` directory
2. App.jsx import can be reverted to old component
3. No database or backend changes in Phase 1
4. No dependency changes in Phase 1

---

## Success Criteria

- [ ] Hierarchical navigation renders correctly
- [ ] All existing functionality preserved (project selection, connection status)
- [ ] Smooth expand/collapse animations
- [ ] Status indicators visible at list level
- [ ] No console errors
- [ ] Build succeeds without warnings
- [ ] Manual testing checklist complete

---

## Future Considerations (Post-Phase 1)

1. **Persist collapse state** to localStorage
2. **Add "Create Space"** functionality
3. **Add "Create List"** functionality
4. **Drag-to-reorder** spaces and lists
5. **Workspace switcher** (multi-workspace support)
6. **Favorites/pinned lists** at top

---

## Estimated Time Breakdown

| Step | Task | Time |
|------|------|------|
| 1 | Directory structure | 30 min |
| 2 | WorkspaceHeader | 1 hr |
| 3 | SpaceSection | 1.5 hr |
| 4 | ListTree | 1 hr |
| 5 | SidebarFooter | 30 min |
| 6 | Data transformation | 1.5 hr |
| 7 | Main container | 1.5 hr |
| 8 | Styles | 30 min |
| 9 | App integration | 1 hr |
| 10 | Testing & polish | 1.5 hr |
| **Total** | | **10.5 hrs** |

**With buffer for iteration/debugging: 2-3 days**

---

## Dependencies

### Already Installed
- `lucide-react` - Icons
- `tailwindcss` - Styling
- `react` - Core

### Not Required for Phase 1
- `@dnd-kit/*` - Required in Phase 3 only

---

## Next Steps After Phase 1 Complete

1. Move to Phase 2: View Switcher
2. Create `ViewSwitcher.jsx` component
3. Replace tab navigation with view mode toggle
4. Prepare for Phase 3: Board View + DnD
