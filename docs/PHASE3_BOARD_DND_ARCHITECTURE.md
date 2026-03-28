# Phase 3: Board View Drag & Drop Architecture

**Document Type:** Architecture Decision Record  
**Date:** 2026-03-28  
**Status:** Implemented  
**Author:** Architect Agent

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Component Architecture](#1-component-architecture)
3. [State Management](#2-state-management)
4. [Backend Integration](#3-backend-integration)
5. [UX Decisions](#4-ux-decisions)
6. [File Structure](#5-recommended-file-structure)
7. [Diagrams](#6-diagrams)
8. [Implementation Checklist](#7-implementation-checklist)

---

## Executive Summary

This document defines the architecture for implementing an interactive Kanban board with drag & drop functionality in the PM Dashboard. The design follows existing project patterns (modular components, WebSocket real-time updates, optimistic UI updates) and integrates with the existing @dnd-kit library ecosystem.

**Key Decisions:**
| Area | Decision |
|------|----------|
| Components | Folder-based with index.js barrel export (matches `Overview/` pattern) |
| State | Local drag state + optimistic updates + WebSocket sync |
| Backend | New WebSocket event + REST fallback + file system update |
| UX | Drag handle + 200ms animations + rollback on failure |

---

## 1. Component Architecture

### Decision: Create `BoardView/` folder with sub-components

**Rationale:**
- Follows existing `Overview/` and `Sidebar/` patterns in the codebase
- BoardView is complex enough to warrant separation (estimated 400+ lines)
- Improves testability and maintainability
- Enables code splitting if needed

### Component Hierarchy

```
BoardView/
├── index.jsx              # Main container, orchestrates drag context
├── BoardColumn.jsx        # Droppable column container
├── StepCard.jsx           # Draggable card component
├── DragOverlay.jsx        # Custom drag preview
├── ColumnHeader.jsx       # Column header with count
├── index.js               # Barrel export
└── hooks/
    └── useStepDrag.js     # Custom hook for drag logic
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `BoardView/index.jsx` | DndContext setup, state management, WebSocket integration |
| `BoardColumn.jsx` | Drop zone, handles drag-over styling, renders StepCards |
| `StepCard.jsx` | Draggable element, handles drag handle, displays step info |
| `DragOverlay.jsx` | Custom drag preview with elevation and shadow |
| `ColumnHeader.jsx` | Status icon, title, count badge |
| `useStepDrag.js` | Encapsulates drag start/end logic, optimistic updates |

### Component Interface Design

```jsx
// BoardView/index.jsx - Main Props
interface BoardViewProps {
  project: Project;           // From App.jsx
  onStepUpdate?: (step: Step) => void;  // Optional callback
}

// BoardColumn.jsx
interface BoardColumnProps {
  id: string;                 // 'pending' | 'in_progress' | 'done'
  title: string;
  steps: Step[];
  icon: React.ComponentType;
  iconColor: string;
  borderColor: string;
  bgColor: string;
}

// StepCard.jsx
interface StepCardProps {
  step: Step;
  isDragging: boolean;
  dragHandleProps?: object;
}

// ColumnHeader.jsx
interface ColumnHeaderProps {
  title: string;
  count: number;
  icon: React.ComponentType;
  iconColor: string;
}
```

---

## 2. State Management

### Decision: Local drag state + optimistic updates + WebSocket sync

**Rationale:**
- Drag operations need instant feedback (no network latency acceptable)
- Existing pattern: WebSocket events for server-originated updates
- Optimistic updates provide better UX; rollback on failure
- No need for global state manager (project data already in App.jsx)

### State Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.jsx                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  projects[]  │  activeProject  │  setProjects()         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    BoardView/index.jsx                   │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │  Local Drag State (useStepDrag hook)            │    │    │
│  │  │  - activeId: string | null                      │    │    │
│  │  │  - overId: string | null                        │    │    │
│  │  │  - optimisticSteps: Step[]                      │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Optimistic Update Strategy

```javascript
// useStepDrag.js - Custom hook
function useStepDrag(project, socket) {
  const [optimisticSteps, setOptimisticSteps] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const stepId = active.id;
    const newStatus = over.id; // Column ID = status
    
    // 1. Optimistic update (instant UI feedback)
    const originalSteps = project.implementation_plan;
    const updatedSteps = originalSteps.map(step => 
      step.step === stepId ? { ...step, status: newStatus } : step
    );
    
    setOptimisticSteps(updatedSteps);
    setIsUpdating(true);
    
    // 2. Emit to server
    socket.emit('step_status_update', {
      projectName: project.project_name,
      stepId,
      newStatus,
      previousStatus: originalSteps.find(s => s.step === stepId)?.status
    });
    
    // 3. Wait for confirmation with timeout
    // 4. Rollback on failure
  }, [project, socket]);

  return {
    steps: optimisticSteps ?? project.implementation_plan,
    isUpdating,
    error,
    handleDragEnd
  };
}
```

### Rollback Strategy

```javascript
// On WebSocket failure or timeout
const handleUpdateFailure = (error, originalSteps) => {
  setOptimisticSteps(null); // Revert to server state
  setError(error);
  
  // Show toast notification
  showToast({
    type: 'error',
    message: 'Failed to update step status. Changes reverted.',
    action: 'Retry',
    onAction: () => retryUpdate()
  });
};
```

---

## 3. Backend Integration

### Decision: New WebSocket event + REST fallback + file system update

**Rationale:**
- Existing pattern: WebSocket events for real-time updates (`project_updated`, `task_completed`)
- REST endpoint needed for resilience and for clients without WebSocket
- Server already watches `.project_state.json` files, but we need to UPDATE them

### New WebSocket Event

```javascript
// Client → Server
socket.emit('step_status_update', {
  projectName: string,     // Project identifier
  stepId: string | number, // Step number
  newStatus: 'pending' | 'in_progress' | 'done',
  previousStatus: string   // For rollback
});

// Server → Client (success)
socket.emit('step_status_updated', {
  projectName: string,
  stepId: string | number,
  newStatus: string,
  updatedAt: ISO8601 string,
  success: true
});

// Server → Client (failure)
socket.emit('step_status_error', {
  projectName: string,
  stepId: string | number,
  error: string,
  previousStatus: string   // For client rollback
});
```

### New REST Endpoint

```javascript
// backend/server.js

/**
 * PATCH /api/projects/:name/steps/:stepId/status
 * Update step status
 */
app.patch('/api/projects/:name/steps/:stepId/status', async (req, res) => {
  const { name, stepId } = req.params;
  const { status } = req.body;
  
  if (!['pending', 'in_progress', 'done'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    // 1. Get project from database
    const project = await db.getProject(name);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 2. Update step status
    const updatedPlan = project.implementation_plan.map(step => 
      String(step.step) === String(stepId) 
        ? { ...step, status } 
        : step
    );
    
    // 3. Write to .project_state.json
    await updateProjectState(project.path, { implementation_plan: updatedPlan });
    
    // 4. Update database
    await db.upsertProject({ ...project, implementation_plan: updatedPlan }, project.path);
    
    // 5. Broadcast update
    io.emit('project_updated', { ...project, implementation_plan: updatedPlan });
    
    res.json({ success: true, step: { step: stepId, status } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### File System Update Helper

```javascript
// backend/lib/projectState.js (NEW FILE)

const fs = require('fs').promises;
const path = require('path');

/**
 * Update a project's .project_state.json file
 */
async function updateProjectState(projectPath, updates) {
  const stateFile = path.join(projectPath, '.project_state.json');
  
  // Read existing state
  const content = await fs.readFile(stateFile, 'utf8');
  const state = JSON.parse(content);
  
  // Merge updates
  const updatedState = { ...state, ...updates };
  
  // Write back
  await fs.writeFile(stateFile, JSON.stringify(updatedState, null, 2));
  
  return updatedState;
}

module.exports = { updateProjectState };
```

### WebSocket Handler Addition

```javascript
// backend/server.js - Add to io.on('connection')

socket.on('step_status_update', async (data) => {
  const { projectName, stepId, newStatus, previousStatus } = data;
  
  try {
    // Delegate to REST handler logic
    const project = await db.getProject(projectName);
    
    if (!project) {
      return socket.emit('step_status_error', {
        projectName,
        stepId,
        error: 'Project not found',
        previousStatus
      });
    }
    
    const updatedPlan = project.implementation_plan.map(step => 
      String(step.step) === String(stepId) 
        ? { ...step, status: newStatus } 
        : step
    );
    
    await updateProjectState(project.path, { implementation_plan: updatedPlan });
    await db.upsertProject({ ...project, implementation_plan: updatedPlan }, project.path);
    
    // Broadcast to all clients
    io.emit('project_updated', { ...project, implementation_plan: updatedPlan });
    
    // Confirm to sender
    socket.emit('step_status_updated', {
      projectName,
      stepId,
      newStatus,
      updatedAt: new Date().toISOString(),
      success: true
    });
    
  } catch (error) {
    socket.emit('step_status_error', {
      projectName,
      stepId,
      error: error.message,
      previousStatus
    });
  }
});
```

---

## 4. UX Decisions

### Decision Matrix

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Draggable area | **Drag handle** | Prevents accidental drags, follows Kanban conventions, enables text selection |
| Animation duration | **200ms** | Fast enough to feel snappy, slow enough to see movement |
| Easing function | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard Material Design ease-out |
| Drop failure | **Rollback + toast** | Clear feedback, automatic recovery |
| Column styling during drag-over | **Border highlight + subtle glow** | Visual feedback without being distracting |
| Empty column drop | **Allowed** | All columns can receive drops |
| Cross-column movement | **Animated** | Card animates from source to target column |

### Animation Specifications

```css
/* Tailwind CSS classes for animations */
.step-card {
  @apply transition-all duration-200 ease-out;
}

.step-card.dragging {
  @apply opacity-50 scale-105;
}

.column-drop-zone {
  @apply transition-all duration-150;
}

.column-drop-zone.drag-over {
  @apply ring-2 ring-blue-400 ring-opacity-50 bg-blue-500/5;
}

.drag-preview {
  @apply shadow-xl rotate-3 scale-105;
  animation: float 200ms ease-out;
}

@keyframes float {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.05) rotate(3deg); }
}
```

### Drag Handle Design

```jsx
// StepCard.jsx
<div className="group relative">
  {/* Drag handle - visible on hover */}
  <div 
    className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
               cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-300
               transition-opacity duration-150"
    {...dragHandleProps}
  >
    <GripVertical className="w-4 h-4" />
  </div>
  
  {/* Card content */}
  <div className="pl-6">
    <span className="text-xs font-mono text-gray-500">Step {step.step}</span>
    <p className="text-sm text-white">{step.task}</p>
  </div>
</div>
```

### Column Drop Feedback

```jsx
// BoardColumn.jsx
<div
  className={`
    flex-1 min-w-[280px] rounded-xl border overflow-hidden
    transition-all duration-150
    ${isOver ? 'ring-2 ring-blue-400/50 bg-blue-500/5' : ''}
    ${borderColor}
  `}
>
  {/* ... */}
</div>
```

### Toast Notification (on failure)

```jsx
// Toast component (minimal implementation)
<div className="fixed bottom-4 right-4 z-50 animate-slide-up">
  <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-center gap-3">
    <AlertCircle className="w-5 h-5 text-red-400" />
    <span className="text-sm text-white">Failed to update step status</span>
    <button className="text-red-300 hover:text-white text-sm underline">
      Retry
    </button>
  </div>
</div>
```

---

## 5. Recommended File Structure

```
frontend/src/
├── components/
│   ├── BoardView/
│   │   ├── index.jsx           # Main container with DndContext
│   │   ├── BoardColumn.jsx     # Droppable column
│   │   ├── StepCard.jsx        # Draggable card
│   │   ├── DragOverlay.jsx     # Custom drag preview
│   │   ├── ColumnHeader.jsx    # Column header
│   │   ├── index.js            # Barrel export
│   │   └── hooks/
│   │       └── useStepDrag.js  # Drag logic + optimistic updates
│   ├── BoardView.jsx           # TEMP: Keep old as backup, remove after
│   └── ... (other components)
├── hooks/
│   ├── useStepDrag.js          # DEPRECATED: Moved to BoardView/hooks/
│   └── useTesterAgent.js
├── utils/
│   └── ...
└── config/
    └── api.js

backend/
├── lib/
│   ├── config.js
│   ├── database.js
│   ├── paths.js
│   ├── sync.js
│   └── projectState.js         # NEW: File system update helper
├── server.js                   # MODIFIED: Add WebSocket handlers + REST endpoint
└── ...
```

---

## 6. Diagrams

### Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              App.jsx                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        BoardView (index.jsx)                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                     DndContext                               │  │  │
│  │  │  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │  │  │
│  │  │  │  BoardColumn    │ │  BoardColumn    │ │  BoardColumn   │ │  │  │
│  │  │  │  id="pending"   │ │  id="in_progress│ │  id="done"     │ │  │  │
│  │  │  │  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌──────────┐  │ │  │  │
│  │  │  │  │ColumnHead │  │ │  │ColumnHead │  │ │  │ColumnHead│  │ │  │  │
│  │  │  │  └───────────┘  │ │  └───────────┘  │ │  └──────────┘  │ │  │  │
│  │  │  │  ┌───────────┐  │ │  ┌───────────┐  │ │  ┌──────────┐  │ │  │  │
│  │  │  │  │ StepCard  │  │ │  │ StepCard  │  │ │  │ StepCard │  │ │  │  │
│  │  │  │  │ draggable │  │ │  │ draggable │  │ │  │draggable │  │ │  │  │
│  │  │  │  └───────────┘  │ │  └───────────┘  │ │  └──────────┘  │ │  │  │
│  │  │  │  ┌───────────┐  │ │                 │ │                │ │  │  │
│  │  │  │  │ StepCard  │  │ │                 │ │                │ │  │  │
│  │  │  │  └───────────┘  │ │                 │ │                │ │  │  │
│  │  │  └─────────────────┘ └─────────────────┘ └────────────────┘ │  │  │
│  │  │                                                               │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────┐ │  │  │
│  │  │  │                   DragOverlay                            │ │  │  │
│  │  │  │           (Custom drag preview element)                  │ │  │  │
│  │  │  └─────────────────────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            USER DRAGS CARD                                │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 1. DND-KIT: onDragEnd(event)                                              │
│    - active.id = step being dragged                                       │
│    - over.id = target column (status)                                     │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 2. useStepDrag.handleDragEnd()                                            │
│    - Calculate optimisticSteps (immediate UI update)                      │
│    - setOptimisticSteps(updatedSteps)                                     │
│    - setIsUpdating(true)                                                  │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 3. WEBSOCKET: socket.emit('step_status_update', {...})                    │
│    { projectName, stepId, newStatus, previousStatus }                     │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────┐   ┌───────────────────────────────────────┐
│ 4a. SERVER: Update file       │   │ 4b. SERVER: Broadcast update          │
│     .project_state.json       │   │     io.emit('project_updated', ...)   │
│     implementation_plan       │   │     to ALL connected clients          │
└───────────────────────────────┘   └───────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. CLIENT: socket.on('project_updated')                                   │
│    - App.jsx updates projects state                                       │
│    - BoardView receives new project prop                                  │
│    - setOptimisticSteps(null) // Clear, use server state                 │
│    - setIsUpdating(false)                                                 │
└──────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────┐
                    │ FAILURE PATH                          │
                    └───────────────────────┬───────────────┘
                                            │
                                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 4c. SERVER: socket.emit('step_status_error', {...})                       │
│     - Error message, previousStatus for rollback                          │
└─────────────────────────────────────┬────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ 5. CLIENT: socket.on('step_status_error')                                 │
│    - setOptimisticSteps(null) // Rollback to original                    │
│    - setShowErrorToast(true)                                              │
│    - setIsUpdating(false)                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

### API Contract Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          WEBSOCKET EVENTS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT → SERVER                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Event: 'step_status_update'                                        │ │
│  │  Payload: {                                                         │ │
│  │    projectName: string,      // Required                           │ │
│  │    stepId: string | number,  // Required - step number             │ │
│  │    newStatus: string,        // Required - 'pending'|'in_progress' │ │
│  │    previousStatus: string    // Required - for rollback            │ │
│  │  }                                                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  SERVER → CLIENT (Success)                                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Event: 'project_updated' (existing - reuse)                        │ │
│  │  Payload: Project (full object with updated implementation_plan)    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  SERVER → CLIENT (Error)                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Event: 'step_status_error'                                         │ │
│  │  Payload: {                                                         │ │
│  │    projectName: string,                                             │ │
│  │    stepId: string | number,                                         │ │
│  │    error: string,            // Error message                       │ │
│  │    previousStatus: string    // For client rollback                 │ │
│  │  }                                                                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          REST ENDPOINT                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PATCH /api/projects/:name/steps/:stepId/status                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  Request Body:                                                      │ │
│  │  { "status": "pending" | "in_progress" | "done" }                   │ │
│  │                                                                     │ │
│  │  Response (200):                                                    │ │
│  │  {                                                                  │ │
│  │    "success": true,                                                 │ │
│  │    "step": { "step": 1, "status": "in_progress" }                   │ │
│  │  }                                                                  │ │
│  │                                                                     │ │
│  │  Response (400):                                                    │ │
│  │  { "error": "Invalid status. Must be: pending, in_progress, done" } │ │
│  │                                                                     │ │
│  │  Response (404):                                                    │ │
│  │  { "error": "Project not found" }                                   │ │
│  │                                                                     │ │
│  │  Response (500):                                                    │ │
│  │  { "error": "Failed to update project state" }                      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Checklist

### Dependencies to Install

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Frontend Tasks

- [ ] Create `BoardView/` folder structure
- [ ] Implement `BoardView/index.jsx` with DndContext
- [ ] Implement `BoardColumn.jsx` with useDroppable
- [ ] Implement `StepCard.jsx` with useDraggable
- [ ] Implement `DragOverlay.jsx` for custom preview
- [ ] Implement `ColumnHeader.jsx`
- [ ] Create `useStepDrag.js` custom hook
- [ ] Add barrel export in `index.js`
- [ ] Update `App.jsx` to use new BoardView
- [ ] Add CSS animations for drag states
- [ ] Add toast notification component for errors

### Backend Tasks

- [ ] Create `lib/projectState.js` helper
- [ ] Add `step_status_update` WebSocket handler
- [ ] Add `step_status_error` WebSocket event
- [ ] Add `PATCH /api/projects/:name/steps/:stepId/status` endpoint
- [ ] Update database with new step status
- [ ] Write to `.project_state.json` file

### Testing Tasks

- [ ] Test drag between columns
- [ ] Test optimistic update displays immediately
- [ ] Test WebSocket connection updates UI
- [ ] Test REST endpoint directly
- [ ] Test error handling and rollback
- [ ] Test concurrent drag operations
- [ ] Test offline behavior (WebSocket disconnected)

---

## Appendix: @dnd-kit Integration Notes

### Required Imports

```javascript
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

import { CSS } from '@dnd-kit/utilities';
```

### Basic Setup Pattern

```javascript
function BoardView({ project }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Handle drop
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {/* Columns */}
      <DragOverlay>
        {/* Custom preview */}
      </DragOverlay>
    </DndContext>
  );
}
```

---

*Document Version: 1.0.0*  
*Created: 2026-03-28*  
*Status: Ready for Planner*
