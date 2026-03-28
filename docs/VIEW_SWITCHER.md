# View Switcher - Phase 2 Documentation

## Overview
Transform tab-based navigation into a view switcher with List/Board/Timeline/Tests views.

## Components

### ViewSwitcher
**Location**: `src/components/ViewSwitcher.jsx`
**Purpose**: Icon-based view switcher with 4 options

**Props**:
- `activeView`: Current active view ('list' | 'board' | 'timeline' | 'tests')
- `onViewChange`: Callback when view changes

**Features**:
- Keyboard shortcuts: Alt+1/2/3/4
- Custom tooltips with shortcut hints
- Active state highlighting (blue background)

### ListView
**Location**: `src/components/ListView.jsx`
**Purpose**: Unified view with collapsible sections

**Collapsible Sections**:
1. Overview (default expanded)
2. Decision Tree (default collapsed)
3. Implementation Plan (default expanded)

### BoardView
**Location**: `src/components/BoardView/`
**Purpose**: Interactive Kanban board with drag & drop

**Subcomponents**:
- `index.jsx` - Main board with DndContext
- `BoardColumn.jsx` - Droppable column
- `StepCard.jsx` - Draggable card
- `ColumnHeader.jsx` - Column header
- `DragOverlay.jsx` - Drag preview
- `hooks/useStepDrag.js` - Drag logic with optimistic updates

**Features**:
- Drag & drop with @dnd-kit
- Optimistic updates with rollback
- WebSocket sync with REST fallback
- Status columns: Pending, In Progress, Done

### TimelineView
**Location**: `src/components/TimelineView.jsx`
**Purpose**: Timeline preview (coming soon placeholder)

### CollapsibleSection
**Location**: `src/components/CollapsibleSection.jsx`
**Purpose**: Reusable collapsible wrapper

**Features**:
- localStorage persistence
- Animated expand/collapse
- Optional badge prop

## Keyboard Shortcuts

| Shortcut | View |
|----------|------|
| Alt+1 | List |
| Alt+2 | Board |
| Alt+3 | Timeline |
| Alt+4 | Tests |

## State Persistence

- Active view: `localStorage['pm-dashboard-active-view']`
- Section states: `localStorage['collapsible-${id}']`
