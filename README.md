# AI Project Manager Dashboard

A real-time dashboard for visualizing project states maintained by AI agents. Built with Node.js, Express, Socket.io, React, and Tailwind CSS.

## Quick Links

- [Migration Guide](docs/ARCHITECTURE.md#migration-guide) - How to migrate your data between machines

## Features

- **Real-time Updates**: WebSocket-powered live updates when project states change
- **File Watching**: Automatically detects changes to `.project_state.json` files
- **Decentralized Data**: Each project maintains its own state file
- **Decision Tree Visualization**: Mermaid.js powered decision tree rendering
- **Test Results Dashboard**: Visual overview of generated test results
- **Overview Dashboard**: Rich project overview with stats, tech stack badges, and system architecture visualization
- **Docker Ready**: Easy deployment with Docker Compose
- **Portable Architecture**: SQLite-based persistence with Git sync for cross-machine migration
- **OpenClaw Integration**: Seamless integration with OpenClaw ecosystem

## Overview Tab

The Overview tab provides a comprehensive project dashboard with the following sections:

### Hero Section
Displays the project name, description, and a link to the repository (if configured).

### Stats Grid
Six key metrics displayed in a grid layout:
- **Team Size** - Number of team members
- **Lines of Code** - Project size metric
- **Start Date** - When the project began
- **Last Updated** - Most recent state change
- **Days Active** - Duration since start date
- **Current Phase** - Auto-calculated development phase

### Tech Stack Badges
Color-coded technology badges showing the project's tech stack. Supports common technologies with distinct colors for easy identification.

### System Architecture Diagram
A Mermaid.js graph visualization showing the project's technical architecture derived from the `decision_tree`. Decisions are automatically grouped into architectural layers based on their `node_id` prefix:

| Prefix | Layer | Description |
|--------|-------|-------------|
| `SEC-*` | Security | Security-related decisions (authentication, authorization, encryption) |
| `AUTH-*` | Security | Authentication and authorization decisions |
| `TECH-*` | Data | Technology and data layer decisions |
| `DB-*` | Data | Database and storage decisions |
| `API-*` | API | API design and endpoint decisions |
| `ARCH-*` | Architecture | Core architectural patterns and structure |
| `DEPLOY-*` | Infrastructure | Deployment and DevOps decisions |
| `INFRA-*` | Infrastructure | Infrastructure and cloud resources |

The diagram renders as a top-to-bottom flow (`graph TB`) with nodes styled by layer:
- **Security Layer** (red) - Top of diagram
- **Data Layer** (blue) - Data storage and technology
- **API Layer** (green) - Interface definitions
- **Architecture Layer** (purple) - Core patterns
- **Infrastructure Layer** (orange) - Deployment resources

If no decision tree data is available, the component falls back to rendering a tech stack diagram or displays a placeholder.

### Quick Stats
Shows counts of implementation tasks:
- ✅ Completed tasks
- 🔄 In-progress tasks
- ⏳ Pending tasks

## Sidebar Navigation (Phase 1)

The dashboard features a ClickUp-style hierarchical sidebar for intuitive project navigation.

### Hierarchy Structure

```
Workspace
├── Space (Project)
│   ├── List: Implementation
│   ├── List: Tests
│   └── List: Decisions
├── Space (Project)
│   └── ...
└── ...
```

| Level | Description |
|-------|-------------|
| **Workspace** | Top-level container showing all projects with aggregate stats |
| **Space** | Each project becomes a collapsible space with its own icon and color |
| **List** | Navigation items within a space (Implementation, Tests, Decisions) |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `Sidebar` | `frontend/src/components/Sidebar/index.jsx` | Main container orchestrating all sidebar components |
| `WorkspaceHeader` | `frontend/src/components/Sidebar/WorkspaceHeader.jsx` | Collapsible header with workspace stats (total/active/completed projects) |
| `SpaceSection` | `frontend/src/components/Sidebar/SpaceSection.jsx` | Collapsible project group with chevron toggle |
| `ListTree` | `frontend/src/components/Sidebar/ListTree.jsx` | Navigation items with status indicators and progress bars |
| `SidebarFooter` | `frontend/src/components/Sidebar/SidebarFooter.jsx` | WebSocket connection status indicator |
| `transformToWorkspace` | `frontend/src/utils/transformProjects.js` | Utility transforming flat project list into hierarchy |

### Features

#### Collapsible Sections
- **Workspace Header**: Click to collapse/expand entire sidebar content
- **Space Sections**: Click chevron to expand/collapse individual projects

#### Status Indicators
Each list item displays a color-coded status:
| Status | Color | Condition |
|--------|-------|-----------|
| Done | Green | Progress = 100% |
| In Progress | Yellow/Blue | 0% < Progress < 100% |
| Pending | Gray | Progress = 0% |

#### Progress Bars
- Visual progress bar on each list item
- Shows completion percentage relative to total items
- Animated fill for smooth updates

#### Real-time Updates
- Sidebar reflects project changes instantly via WebSocket
- Connection status shown in footer (green = connected, red = disconnected)

### Data Transformation

The `transformToWorkspace` utility converts flat project data into the sidebar hierarchy:

```javascript
// Input: Flat project list
[
  { project_name: "ProjectA", progress_percentage: 75, ... },
  { project_name: "ProjectB", progress_percentage: 100, ... }
]

// Output: Workspace hierarchy
{
  name: "PM Dashboard",
  spaces: [
    {
      id: "space-ProjectA",
      name: "ProjectA",
      lists: [
        { id: "impl-ProjectA", name: "Implementation", status: "in_progress", ... },
        { id: "tests-ProjectA", name: "Tests", ... },
        { id: "decisions-ProjectA", name: "Decisions", ... }
      ]
    },
    ...
  ],
  totalProjects: 2,
  activeProjects: 1,
  completedProjects: 1
}
```

### Design Philosophy

The sidebar follows ClickUp's design patterns:
- Clean, minimal interface with dark theme
- Intuitive collapse/expand interactions
- Clear visual hierarchy with indentation
- Status-at-a-glance with color coding

## View Switcher (Phase 2)

The dashboard features a view switcher in the header that allows switching between different visualization modes for project data.

### Available Views

| View | Icon | Description | Keyboard Shortcut |
|------|------|-------------|-------------------|
| **List** | 📋 | Comprehensive list view with collapsible sections | `Alt+1` |
| **Board** | 📊 | Kanban-style board view | `Alt+2` |
| **Timeline** | 📅 | Timeline visualization | `Alt+3` |
| **Tests** | 🧪 | Test results dashboard | `Alt+4` |

### View Persistence

The active view is automatically saved to `localStorage` and restored on page reload. No need to reselect your preferred view each time.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| `ViewSwitcher` | `frontend/src/components/ViewSwitcher.jsx` | Icon button group for view selection |
| `ListView` | `frontend/src/components/ListView.jsx` | Merged view with collapsible sections |
| `BoardView` | `frontend/src/components/BoardView.jsx` | Kanban board (Phase 3 placeholder) |
| `TimelineView` | `frontend/src/components/TimelineView.jsx` | Timeline visualization (Phase 3 placeholder) |
| `CollapsibleSection` | `frontend/src/components/CollapsibleSection.jsx` | Reusable animated collapsible wrapper |

### ListView Sections

The ListView consolidates the previous Overview tab content and decision tree into a single scrollable view with collapsible sections:

| Section | Content |
|---------|---------|
| **Overview** | Hero section, stats grid, tech stack badges, system architecture diagram |
| **Decision Tree** | Mermaid.js visualization of architecture decisions |
| **Implementation** | Implementation plan with step-by-step progress tracking |

Each section can be collapsed/expanded by clicking the section header. The collapsible state is managed internally with smooth CSS transitions.

### CollapsibleSection Component

A reusable wrapper component for creating collapsible UI sections:

```jsx
<CollapsibleSection title="Section Title" defaultOpen={true}>
  {/* Content goes here */}
</CollapsibleSection>
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | Required | Section header text |
| `defaultOpen` | Boolean | `true` | Initial expanded state |
| `children` | Node | Required | Content to wrap |

### Phase 3 Placeholders

The Board and Timeline views currently display placeholder content indicating they are "Coming in Phase 3". These placeholders include:

- **BoardView**: Preview mockup of a Kanban board layout with "To Do", "In Progress", and "Done" columns
- **TimelineView**: Preview mockup of a timeline with milestone markers

### Header Layout

The header now uses a three-zone layout:
1. **Left**: Project selector / title
2. **Center**: ViewSwitcher component
3. **Right**: User actions / settings

### Keyboard Navigation

Power users can quickly switch views using keyboard shortcuts:
- Press `Alt+1` for List view
- Press `Alt+2` for Board view
- Press `Alt+3` for Timeline view
- Press `Alt+4` for Tests view

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the dashboard
open http://localhost:5173
```

### Option 2: Local Development

```bash
# Install dependencies for all packages
npm run install:all

# Start both backend and frontend in development mode
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on port 3001
npm run dev:frontend  # Frontend on port 5173
```

## Configuration

Edit `.env` in the root directory:

```env
WORKSPACE_DIR=./mock_workspace
BACKEND_PORT=3001
FRONTEND_PORT=5173
```

### CLI Tool

The dashboard includes a CLI for management:

```bash
# Start the server
node backend/bin/pm-dashboard.js start

# Check status
node backend/bin/pm-dashboard.js status

# Export state for migration
node backend/bin/pm-dashboard.js export -o backup.json

# Import state
node backend/bin/pm-dashboard.js import backup.json

# Manage configuration
node backend/bin/pm-dashboard.js config list
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full CLI reference.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PM_DASHBOARD_PORT` | 3001 | Server port |
| `PM_DASHBOARD_PROJECTS_DIR` | `~/.openclaw/shared-project` | Projects directory |
| `PM_DASHBOARD_STATE_FILE` | `~/.openclaw/pm-dashboard/state.db` | SQLite database path |
| `PM_DASHBOARD_SYNC_ENABLED` | true | Enable Git sync |

## How It Works

### Architecture

```
openclaw-pm-dashboard/
├── backend/                 # Node.js + Express + Socket.io server
│   ├── server.js           # Main server with chokidar file watcher
│   └── package.json
├── frontend/               # React + Vite + Tailwind dashboard
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.jsx        # Main app with WebSocket integration
│   │   └── main.jsx
│   └── package.json
├── mock_workspace/         # Sample project data
│   └── ProjectAlpha/
│       └── .project_state.json
├── docker-compose.yml
└── .env
```

### File Watching

The backend uses `chokidar` to watch for `.project_state.json` files in the workspace directory. When a file is created, modified, or deleted, the server:

1. Parses and validates the JSON
2. Updates its in-memory state
3. Emits a WebSocket event to all connected clients
4. The frontend updates in real-time

## Project State Schema

OpenClaw (or any AI agent) should write `.project_state.json` files with this schema:

### Required Fields

```json
{
  "project_name": "String",
  "editor_used": "String",
  "progress_percentage": "Number (0-100)",
  "implementation_plan": [
    {
      "step": "String",
      "task": "String",
      "status": "done | in_progress | pending"
    }
  ],
  "decision_tree": [
    {
      "node_id": "String",
      "decision": "String",
      "chosen": "String",
      "reason": "String"
    }
  ],
  "tests_generated": [
    {
      "test_name": "String",
      "status": "passing | failing",
      "file": "String"
    }
  ]
}
```

### Optional Fields (Overview Tab Enhancement)

The following optional fields enhance the Overview tab display:

```json
{
  "project_description": "String - Brief description of the project",
  "repository_url": "String - GitHub/repository URL for the project",
  "tech_stack": ["String", "Array of technology names"],
  "team_size": "Number - Number of team members",
  "lines_of_code": "Number - Total lines of code",
  "start_date": "String - ISO date format (YYYY-MM-DD)"
}
```

### Extended Example

```json
{
  "project_name": "MyProject",
  "project_description": "A modern web application for task management",
  "repository_url": "https://github.com/user/myproject",
  "editor_used": "Claude Code",
  "progress_percentage": 45,
  "tech_stack": ["React", "Node.js", "PostgreSQL", "Tailwind CSS"],
  "team_size": 3,
  "lines_of_code": 12500,
  "start_date": "2025-01-15",
  "implementation_plan": [
    {"step": "1", "task": "Initialize project", "status": "done"},
    {"step": "2", "task": "Build core features", "status": "in_progress"},
    {"step": "3", "task": "Add testing", "status": "pending"}
  ],
  "decision_tree": [],
  "tests_generated": []
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project_name` | String | Yes | Unique identifier for the project |
| `editor_used` | String | Yes | The editor/IDE being used (displayed as a badge) |
| `progress_percentage` | Number | Yes | Overall completion percentage (0-100) |
| `implementation_plan` | Array | Yes | List of implementation steps with status |
| `decision_tree` | Array | Yes | Architecture/tech decisions made during development |
| `tests_generated` | Array | Yes | Generated tests and their current status |
| `project_description` | String | No | Brief description shown in Hero section |
| `repository_url` | String | No | Link to GitHub or other repository |
| `tech_stack` | Array[String] | No | List of technologies for badge display |
| `team_size` | Number | No | Number of team members |
| `lines_of_code` | Number | No | Project size metric |
| `start_date` | String | No | ISO date for calculating days active and current phase |

### Backward Compatibility

The dashboard handles both old and new schema formats. If your `.project_state.json` files were created with a `metadata` wrapper object, the `normalizeProject.js` utility extracts optional fields from `metadata` as a fallback.

## Usage for AI Agents (OpenClaw)

When working on a project, OpenClaw should:

1. **Create** a `.project_state.json` in the project directory
2. **Update** it whenever progress is made
3. **Track** implementation steps as they're completed
4. **Document** key decisions in the decision tree
5. **Record** generated tests and their status

### Example: Creating a Project State

```bash
# Create project directory
mkdir -p mock_workspace/MyProject

# Create state file
cat > mock_workspace/MyProject/.project_state.json << 'EOF'
{
  "project_name": "MyProject",
  "editor_used": "Claude Code",
  "progress_percentage": 0,
  "implementation_plan": [
    {"step": "1", "task": "Initialize project", "status": "in_progress"},
    {"step": "2", "task": "Build features", "status": "pending"}
  ],
  "decision_tree": [],
  "tests_generated": []
}
EOF
```

The dashboard will automatically detect the new project and display it.

### Example: Updating Progress

```bash
# Update the state file as work progresses
# The dashboard will update in real-time
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all tracked projects |
| `/api/projects/:name` | GET | Get a specific project by name |
| `/api/health` | GET | Health check endpoint |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `initial_state` | Server → Client | Sent on connection with all current projects |
| `project_updated` | Server → Client | Emitted when a project file changes |
| `project_removed` | Server → Client | Emitted when a project file is deleted |

## Development

### Adding a New Project

Simply create a new directory under `mock_workspace/` (or your configured workspace) with a `.project_state.json` file. The dashboard will automatically pick it up.

### Testing Real-time Updates

1. Open the dashboard in your browser
2. Edit `mock_workspace/ProjectAlpha/.project_state.json`
3. Save the file - the dashboard updates instantly

## Troubleshooting

### WebSocket Connection Issues

If the dashboard shows "Disconnected":
- Check that the backend is running on port 3001
- Verify CORS settings in `backend/server.js`
- Check browser console for connection errorsdocs/ARCHITECTURE.md

### Projects Not Appearing

- Verify the `WORKSPACE_DIR` in `.env`
- Check that `.project_state.json` files exist in subdirectories
- Validate JSON schema matches the expected format

## Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Comprehensive documentation of the portable architecture, configuration, database schema, CLI reference, and migration guide
- **[Portable Architecture Design](docs/PORTABLE_ARCHITECTURE.md)** - Design decisions and detailed architecture specification
- **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Step-by-step implementation walkthrough

## License

MIT
