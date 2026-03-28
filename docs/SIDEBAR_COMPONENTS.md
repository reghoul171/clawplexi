# Sidebar Components Documentation

## Overview

The Sidebar is a ClickUp-style hierarchical navigation component that transforms flat project data into a collapsible Workspace → Spaces → Lists structure.

**Location:** `frontend/src/components/Sidebar/`

---

## Component Hierarchy

```
Sidebar (index.jsx)
├── WorkspaceHeader.jsx    # Workspace name + stats + collapse toggle
├── SpaceSection.jsx       # Collapsible space group (one per project)
│   └── ListTree.jsx       # Individual list item (nested)
└── SidebarFooter.jsx      # Connection status indicator
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA TRANSFORMATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Flat Projects Array                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [{                                                                   │   │
│  │   project_name: "MyProject",                                        │   │
│  │   progress_percentage: 75,                                          │   │
│  │   implementation_plan: [{step, task, status}, ...],                 │   │
│  │   tests_generated: [{name, status}, ...],                           │   │
│  │   decision_tree: [{question, decision}, ...]                        │   │
│  │ }]                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│                        transformToWorkspace()                               │
│                       (utils/transformProjects.js)                          │
│                                    │                                        │
│                                    ▼                                        │
│  Workspace Object                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ {                                                                    │   │
│  │   name: "PM Dashboard",                                             │   │
│  │   spaces: [                                                         │   │
│  │     {                                                               │   │
│  │       id: "space-MyProject",                                        │   │
│  │       name: "MyProject",                                            │   │
│  │       icon: "FolderKanban",                                         │   │
│  │       color: "text-purple-400",                                     │   │
│  │       lists: [                                                      │   │
│  │         { id: "impl-MyProject", name: "Implementation", ... },     │   │
│  │         { id: "tests-MyProject", name: "Tests", ... },             │   │
│  │         { id: "decisions-MyProject", name: "Decisions", ... }      │   │
│  │       ],                                                            │   │
│  │       progress: 75,                                                 │   │
│  │       editor: "cursor"                                              │   │
│  │     }                                                               │   │
│  │   ],                                                                │   │
│  │   totalProjects: 5,                                                 │   │
│  │   activeProjects: 3,                                                │   │
│  │   completedProjects: 2                                              │   │
│  │ }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Sidebar (index.jsx)

**Purpose:** Main container component that orchestrates the entire sidebar navigation.

**Location:** `components/Sidebar/index.jsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projects` | `Array<Project>` | Yes | Flat list of project objects from API |
| `activeProject` | `Project \| null` | No | Currently selected project |
| `onSelectProject` | `(project: Project) => void` | Yes | Callback when a project is selected |
| `connected` | `boolean` | Yes | WebSocket connection status |

#### State

| State | Type | Initial | Description |
|-------|------|---------|-------------|
| `workspaceCollapsed` | `boolean` | `false` | Whether the workspace content is collapsed |
| `expandedSpaces` | `Set<string>` | `new Set()` | Set of expanded space IDs |

#### Usage Example

```jsx
import Sidebar from './components/Sidebar';

function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [connected, setConnected] = useState(false);
  
  return (
    <div className="flex">
      <Sidebar
        projects={projects}
        activeProject={activeProject}
        onSelectProject={setActiveProject}
        connected={connected}
      />
      <main>{/* Main content */}</main>
    </div>
  );
}
```

---

### 2. WorkspaceHeader.jsx

**Purpose:** Displays workspace name, project statistics, and provides collapse toggle.

**Location:** `components/Sidebar/WorkspaceHeader.jsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `workspaceName` | `string` | Yes | Display name of the workspace |
| `isCollapsed` | `boolean` | Yes | Whether workspace content is collapsed |
| `onToggle` | `() => void` | Yes | Callback to toggle collapse state |
| `projectCount` | `number` | Yes | Total number of projects |
| `activeCount` | `number` | Yes | Number of active (in-progress) projects |
| `completedCount` | `number` | Yes | Number of completed projects |

#### Usage Example

```jsx
import WorkspaceHeader from './WorkspaceHeader';

<WorkspaceHeader
  workspaceName="PM Dashboard"
  isCollapsed={false}
  onToggle={() => setCollapsed(!collapsed)}
  projectCount={10}
  activeCount={7}
  completedCount={3}
/>
```

#### Features

- Building icon with purple background
- Shows active and completed counts in subtitle
- Displays total project count badge
- Expandable stats panel showing Active/Done cards
- Chevron indicator for collapse state

---

### 3. SpaceSection.jsx

**Purpose:** Renders a collapsible group of lists representing a single project/space.

**Location:** `components/Sidebar/SpaceSection.jsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `space` | `Space` | Yes | Space object with lists |
| `isExpanded` | `boolean` | Yes | Whether this space is expanded |
| `onToggle` | `() => void` | Yes | Callback to toggle expansion |
| `activeListId` | `string \| null` | Yes | ID of currently active list |
| `onSelectList` | `(list: List) => void` | Yes | Callback when a list is selected |

#### Space Interface

```typescript
interface Space {
  id: string;              // e.g., "space-MyProject"
  name: string;            // Display name
  icon: string;            // Icon name from lucide-react
  color: string;           // Tailwind color class
  lists: List[];           // Array of list items
  progress: number;        // Overall progress percentage
  editor: string;          // Editor used for this project
}
```

#### Usage Example

```jsx
import SpaceSection from './SpaceSection';

<SpaceSection
  space={{
    id: 'space-my-project',
    name: 'My Project',
    icon: 'FolderKanban',
    color: 'text-purple-400',
    lists: [...],
    progress: 50,
    editor: 'cursor'
  }}
  isExpanded={expandedSpaces.has('space-my-project')}
  onToggle={() => toggleSpace('space-my-project')}
  activeListId="impl-my-project"
  onSelectList={(list) => handleSelectList(list)}
/>
```

#### Supported Icons

The component maps icon names to lucide-react components:

| Icon Name | Component | Use Case |
|-----------|-----------|----------|
| `FolderKanban` | FolderKanban | Default project |
| `Code2` | Code2 | Development projects |
| `FlaskConical` | FlaskConical | Testing projects |
| `Lightbulb` | Lightbulb | Ideas/planning |
| `FileText` | FileText | Documentation |
| `Rocket` | Rocket | Deployment |
| `Palette` | Palette | Design projects |

---

### 4. ListTree.jsx

**Purpose:** Renders a single list item with status indicator and progress bar.

**Location:** `components/Sidebar/ListTree.jsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `list` | `List` | Yes | List object with status info |
| `isActive` | `boolean` | Yes | Whether this list is currently selected |
| `onClick` | `() => void` | Yes | Callback when list is clicked |

#### List Interface

```typescript
interface List {
  id: string;              // e.g., "impl-MyProject"
  name: string;            // Display name (e.g., "Implementation")
  itemCount: number;       // Total items in list
  completedCount: number;  // Completed items
  status: 'done' | 'in_progress' | 'pending';
  project: Project;        // Reference to original project
}
```

#### Status Configuration

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| `done` | CheckCircle2 | green-400 | All items completed |
| `in_progress` | Clock | blue-400 | Some items completed |
| `pending` | Circle | gray-400 | No items completed |

#### Usage Example

```jsx
import ListTree from './ListTree';

<ListTree
  list={{
    id: 'impl-my-project',
    name: 'Implementation',
    itemCount: 10,
    completedCount: 7,
    status: 'in_progress',
    project: projectObject
  }}
  isActive={activeListId === 'impl-my-project'}
  onClick={() => onSelectList(list)}
/>
```

---

### 5. SidebarFooter.jsx

**Purpose:** Displays connection status and workspace settings at the bottom of the sidebar.

**Location:** `components/Sidebar/SidebarFooter.jsx`

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `connected` | `boolean` | Yes | WebSocket connection status |
| `onSettingsClick` | `() => void` | No | Callback for settings button click |

#### Usage Example

```jsx
import SidebarFooter from './SidebarFooter';

<SidebarFooter
  connected={true}
  onSettingsClick={() => openSettings()}
/>
```

#### Features

- User/Workspace button
- Connection status with icon (Wifi/WifiOff)
- Color-coded status text (green/red)
- Colored indicator bar at bottom

---

## Data Transformation Utility

### transformProjects.js

**Location:** `utils/transformProjects.js`

#### Functions

##### `transformToWorkspace(projects)`

Transforms a flat array of projects into a hierarchical workspace structure.

**Parameters:**
- `projects: Array<Project>` - Flat list of project objects

**Returns:** `Workspace` object with structure:

```typescript
interface Workspace {
  name: string;           // Always "PM Dashboard"
  spaces: Space[];        // Array of space objects
  totalProjects: number;  // Count of all projects
  activeProjects: number; // Count of incomplete projects
  completedProjects: number; // Count of completed projects
}
```

**List Generation Logic:**

For each project, the function generates up to 3 lists:

| List Type | Source Data | ID Format |
|-----------|-------------|-----------|
| Implementation | `implementation_plan` array | `impl-{projectName}` |
| Tests | `tests_generated` array | `tests-{projectName}` |
| Decisions | `decision_tree` array | `decisions-{projectName}` |

If no data exists, a default "Main" list is created.

##### `findProjectByListId(projects, listId)`

Finds the original project from a list ID.

**Parameters:**
- `projects: Array<Project>` - Flat list of projects
- `listId: string` - The list ID to look up

**Returns:** `Project | null`

**ID Format:** `{type}-{projectName}` (e.g., `impl-MyProject`)

---

## Styling Conventions

All components use Tailwind CSS utility classes following these patterns:

### Colors
- Background: `bg-gray-800`, `bg-gray-700`
- Borders: `border-gray-700`
- Text: `text-white`, `text-gray-200`, `text-gray-400`, `text-gray-500`
- Accent: `text-purple-400`, `bg-purple-600`
- Status: `text-green-400` (done), `text-blue-400` (in_progress), `text-red-400` (error)

### Animations
- Transitions: `transition-all duration-200`
- Easing: `ease-in-out`
- Height collapse: `max-h-0` / `max-h-96` with overflow-hidden

### Layout
- Sidebar width: `w-72` (288px)
- Indentation: Lists use `pl-9` for indentation under spaces

---

## State Management

The Sidebar manages its own state internally:

```jsx
// Collapse state for entire workspace
const [workspaceCollapsed, setWorkspaceCollapsed] = useState(false);

// Set of expanded space IDs
const [expandedSpaces, setExpandedSpaces] = useState(() => new Set());
```

State updates use functional updates to ensure correctness:

```jsx
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
```

---

## Accessibility

- All interactive elements use semantic `<button>` elements
- Active states are visually distinct
- Focus states inherit Tailwind defaults
- Color contrast meets WCAG guidelines for dark theme

---

## Future Enhancements

1. **Persist collapse state** to localStorage
2. **Add "Create Space"** functionality
3. **Add "Create List"** functionality
4. **Drag-to-reorder** spaces and lists (Phase 3)
5. **Workspace switcher** (multi-workspace support)
6. **Favorites/pinned lists** at top
7. **Keyboard navigation** support
