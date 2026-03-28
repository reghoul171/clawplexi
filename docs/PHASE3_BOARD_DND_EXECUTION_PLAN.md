# Phase 3: Board View Drag & Drop - Execution Plan

**Document Type:** Implementation Plan  
**Date:** 2026-03-28  
**Status:** Ready for Implementation  
**Author:** Planner Agent

---

## Overview

This document provides a prioritized, sequenced task list for implementing the Phase 3 Board View Drag & Drop feature. Tasks are ordered by dependencies, with clear testing checkpoints and rollback strategies.

---

## Task Summary

| Phase | Tasks | Est. Time | Risk Level |
|-------|-------|-----------|------------|
| Phase 0: Prerequisites | 3 tasks | 15 min | Low |
| Phase 1: Backend | 4 tasks | 45 min | Medium |
| Phase 2: Frontend Foundation | 5 tasks | 30 min | Low |
| Phase 3: Frontend DnD Core | 5 tasks | 60 min | Medium |
| Phase 4: Integration | 3 tasks | 20 min | Low |
| Phase 5: Testing | 5 tasks | 30 min | Medium |
| **Total** | **25 tasks** | **~3.5 hrs** | - |

---

## Phase 0: Prerequisites (15 min)

### Task 0.1: Install @dnd-kit Dependencies

**Priority:** P0 - Blocking  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Files:** None (package.json modified)

**Command:**
```bash
cd ~/openclaw-pm-dashboard/frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Verification:**
```bash
# Check installation
cat package.json | grep @dnd-kit
# Should show three packages installed
```

**Rollback:**
```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### Task 0.2: Create Backup of Current BoardView

**Priority:** P0 - Blocking  
**Est. Effort:** 2 minutes  
**Risk:** None

**Files:**
- `frontend/src/components/BoardView.jsx` → `frontend/src/components/BoardView.backup.jsx`

**Command:**
```bash
cp ~/openclaw-pm-dashboard/frontend/src/components/BoardView.jsx \
   ~/openclaw-pm-dashboard/frontend/src/components/BoardView.backup.jsx
```

**Verification:**
```bash
ls -la ~/openclaw-pm-dashboard/frontend/src/components/BoardView.backup.jsx
```

**Rollback:**
```bash
# Restore original
cp ~/openclaw-pm-dashboard/frontend/src/components/BoardView.backup.jsx \
   ~/openclaw-pm-dashboard/frontend/src/components/BoardView.jsx
```

---

### Task 0.3: Create BoardView Folder Structure

**Priority:** P0 - Blocking  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Files to Create:**
```
frontend/src/components/BoardView/
├── index.jsx           # Main container (to be created in Phase 2)
├── BoardColumn.jsx     # (to be created in Phase 3)
├── StepCard.jsx        # (to be created in Phase 3)
├── DragOverlay.jsx     # (to be created in Phase 3)
├── ColumnHeader.jsx    # (to be created in Phase 3)
├── index.js            # Barrel export (to be created in Phase 2)
└── hooks/
    └── useStepDrag.js  # (to be created in Phase 2)
```

**Command:**
```bash
mkdir -p ~/openclaw-pm-dashboard/frontend/src/components/BoardView/hooks
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/index.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/BoardColumn.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/StepCard.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/DragOverlay.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/ColumnHeader.jsx
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/index.js
touch ~/openclaw-pm-dashboard/frontend/src/components/BoardView/hooks/useStepDrag.js
```

**Verification:**
```bash
find ~/openclaw-pm-dashboard/frontend/src/components/BoardView -type f
```

**Rollback:**
```bash
rm -rf ~/openclaw-pm-dashboard/frontend/src/components/BoardView/
```

---

## Phase 1: Backend Implementation (45 min)

### Task 1.1: Create projectState.js Helper

**Priority:** P0 - Blocking  
**Est. Effort:** 15 minutes  
**Risk:** Medium (file I/O)

**File to Create:** `backend/lib/projectState.js`

**Implementation:**
```javascript
const fs = require('fs').promises;
const path = require('path');

/**
 * Read a project's .project_state.json file
 * @param {string} projectPath - Path to project directory
 * @returns {Promise<Object|null>} - Project state or null if not found
 */
async function readProjectState(projectPath) {
  const stateFile = path.join(projectPath, '.project_state.json');
  
  try {
    const content = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Update a project's .project_state.json file
 * @param {string} projectPath - Path to project directory
 * @param {Object} updates - Fields to update (merged with existing)
 * @returns {Promise<Object>} - Updated state
 */
async function updateProjectState(projectPath, updates) {
  const stateFile = path.join(projectPath, '.project_state.json');
  
  // Read existing state
  const existing = await readProjectState(projectPath);
  if (!existing) {
    throw new Error(`Project state not found at ${projectPath}`);
  }
  
  // Merge updates
  const updatedState = { ...existing, ...updates };
  
  // Write back atomically
  const tempFile = `${stateFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(updatedState, null, 2));
  await fs.rename(tempFile, stateFile);
  
  return updatedState;
}

/**
 * Update step status in implementation plan
 * @param {string} projectPath - Path to project directory
 * @param {string|number} stepId - Step identifier
 * @param {string} newStatus - New status ('pending'|'in_progress'|'done')
 * @returns {Promise<Object>} - Updated implementation_plan
 */
async function updateStepStatus(projectPath, stepId, newStatus) {
  const state = await readProjectState(projectPath);
  if (!state) {
    throw new Error('Project state not found');
  }
  
  const stepIndex = state.implementation_plan.findIndex(
    s => String(s.step) === String(stepId)
  );
  
  if (stepIndex === -1) {
    throw new Error(`Step ${stepId} not found`);
  }
  
  const previousStatus = state.implementation_plan[stepIndex].status;
  
  const updatedPlan = state.implementation_plan.map(step =>
    String(step.step) === String(stepId)
      ? { ...step, status: newStatus }
      : step
  );
  
  await updateProjectState(projectPath, { implementation_plan: updatedPlan });
  
  return {
    updatedPlan,
    previousStatus,
    stepId
  };
}

module.exports = {
  readProjectState,
  updateProjectState,
  updateStepStatus
};
```

**Verification:**
```bash
# Check file exists and has correct exports
node -e "const ps = require('./lib/projectState'); console.log(Object.keys(ps))"
# Should output: [ 'readProjectState', 'updateProjectState', 'updateStepStatus' ]
```

**Testing Checkpoint:**
- Unit test the helper functions with a sample .project_state.json file

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/backend/lib/projectState.js
```

---

### Task 1.2: Add WebSocket Handler for step_status_update

**Priority:** P0 - Blocking  
**Est. Effort:** 15 minutes  
**Risk:** Medium

**File to Modify:** `backend/server.js`

**Location:** Inside `io.on('connection', ...)` block (around line 430)

**Code to Add:**
```javascript
// Add after: socket.on('disconnect', ...) handler

// Step status update via WebSocket
socket.on('step_status_update', async (data) => {
  const { projectName, stepId, newStatus, previousStatus } = data;
  
  console.log(`[Socket] Step status update: ${projectName} step ${stepId} -> ${newStatus}`);
  
  try {
    // Get project from database
    const project = await db.getProject(projectName);
    
    if (!project) {
      return socket.emit('step_status_error', {
        projectName,
        stepId,
        error: 'Project not found',
        previousStatus
      });
    }
    
    // Use project path if available, otherwise construct it
    const projectPath = project.path || path.join(paths.projectsDir, projectName);
    
    // Update step status in file
    const result = await updateStepStatus(projectPath, stepId, newStatus);
    
    // Update database
    const updatedProject = {
      ...project,
      implementation_plan: result.updatedPlan
    };
    await db.upsertProject(updatedProject, projectPath);
    
    // Broadcast to ALL clients (including sender)
    io.emit('project_updated', updatedProject);
    
    console.log(`[Socket] Step ${stepId} updated to ${newStatus} in ${projectName}`);
    
  } catch (error) {
    console.error('[Socket] Step status update error:', error);
    
    socket.emit('step_status_error', {
      projectName,
      stepId,
      error: error.message,
      previousStatus
    });
  }
});
```

**Also Add Import at Top:**
```javascript
// Add with other lib imports (around line 20)
const { updateStepStatus } = require('./lib/projectState');
```

**Verification:**
- Server starts without errors
- WebSocket connection still works

**Testing Checkpoint:**
- Use WebSocket client to emit 'step_status_update' and verify response

**Rollback:**
- Remove the added socket handler
- Remove the import statement

---

### Task 1.3: Add REST Endpoint PATCH /api/projects/:name/steps/:stepId/status

**Priority:** P1 - Important (fallback for WebSocket)  
**Est. Effort:** 15 minutes  
**Risk:** Low

**File to Modify:** `backend/server.js`

**Location:** After existing API routes (around line 350, before socket.io section)

**Code to Add:**
```javascript
/**
 * PATCH /api/projects/:name/steps/:stepId/status
 * Update step status via REST API
 */
app.patch('/api/projects/:name/steps/:stepId/status', async (req, res) => {
  const { name, stepId } = req.params;
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['pending', 'in_progress', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }
  
  try {
    // Get project
    const project = await db.getProject(name);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Find step in implementation plan
    const stepExists = project.implementation_plan?.some(
      s => String(s.step) === String(stepId)
    );
    
    if (!stepExists) {
      return res.status(404).json({ error: `Step ${stepId} not found` });
    }
    
    // Update step status
    const updatedPlan = project.implementation_plan.map(step =>
      String(step.step) === String(stepId)
        ? { ...step, status }
        : step
    );
    
    // Update project
    const projectPath = project.path || path.join(paths.projectsDir, name);
    
    // Update file if path exists
    try {
      await updateProjectState(projectPath, { implementation_plan: updatedPlan });
    } catch (fileError) {
      console.warn('[API] Could not update project file:', fileError.message);
      // Continue with database update only
    }
    
    // Update database
    const updatedProject = { ...project, implementation_plan: updatedPlan };
    await db.upsertProject(updatedProject, projectPath);
    
    // Broadcast via WebSocket
    io.emit('project_updated', updatedProject);
    
    // Return success
    res.json({
      success: true,
      step: { step: stepId, status },
      project: updatedProject
    });
    
  } catch (error) {
    console.error('[API] Error updating step status:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Also Add Import:**
```javascript
// Add with other lib imports if not already added
const { updateProjectState } = require('./lib/projectState');
```

**Verification:**
```bash
# Test the endpoint
curl -X PATCH http://localhost:3001/api/projects/<project_name>/steps/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

**Testing Checkpoint:**
- Test with valid status values
- Test with invalid status (should return 400)
- Test with non-existent project (should return 404)
- Test with non-existent step (should return 404)

**Rollback:**
- Remove the added route
- Remove the import statement if only used here

---

### Task 1.4: Add step_status_error WebSocket Event Documentation

**Priority:** P2 - Nice to have  
**Est. Effort:** 5 minutes  
**Risk:** None

**File to Create:** `backend/docs/websocket-events.md`

**Content:**
```markdown
# WebSocket Events

## Client → Server

### step_status_update
Update the status of an implementation step.

**Payload:**
```json
{
  "projectName": "string",
  "stepId": "string|number",
  "newStatus": "pending|in_progress|done",
  "previousStatus": "string"
}
```

## Server → Client

### step_status_error
Sent when step status update fails.

**Payload:**
```json
{
  "projectName": "string",
  "stepId": "string|number",
  "error": "string",
  "previousStatus": "string"
}
```

### project_updated (existing)
Broadcast when project data changes, including step status updates.
```

---

## Phase 2: Frontend Foundation (30 min)

### Task 2.1: Create ColumnHeader Component

**Priority:** P1 - Needed by BoardColumn  
**Est. Effort:** 10 minutes  
**Risk:** Low

**File to Create:** `frontend/src/components/BoardView/ColumnHeader.jsx`

**Implementation:**
```jsx
/**
 * ColumnHeader - Header for Kanban columns
 * Displays icon, title, and count badge
 */
function ColumnHeader({ title, count, icon: Icon, iconColor }) {
  return (
    <div className="px-4 py-3 border-b border-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
          {count}
        </span>
      </div>
    </div>
  );
}

export default ColumnHeader;
```

**Verification:**
- File exists
- No syntax errors (check with `npm run build`)

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/ColumnHeader.jsx
```

---

### Task 2.2: Create useStepDrag Hook

**Priority:** P1 - Core logic  
**Est. Effort:** 15 minutes  
**Risk:** Medium

**File to Create:** `frontend/src/components/BoardView/hooks/useStepDrag.js`

**Implementation:**
```jsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../../config/api';

/**
 * Custom hook for handling step drag operations with optimistic updates
 * @param {Object} project - Current project data
 * @returns {Object} - Drag handlers and state
 */
export function useStepDrag(project) {
  const [optimisticSteps, setOptimisticSteps] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const timeoutRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(API_URL);
    
    // Listen for errors
    socketRef.current.on('step_status_error', (data) => {
      console.error('[useStepDrag] Update failed:', data.error);
      setError(data.error);
      setOptimisticSteps(null); // Rollback
      setIsUpdating(false);
    });
    
    // Listen for project updates (confirmation)
    socketRef.current.on('project_updated', (updatedProject) => {
      if (updatedProject.project_name === project?.project_name) {
        // Server confirmed - clear optimistic state
        setOptimisticSteps(null);
        setIsUpdating(false);
      }
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [project?.project_name]);

  /**
   * Handle drag end event
   * @param {Object} event - dnd-kit drag end event
   */
  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    
    // No drop target or same position
    if (!over || active.id === over.id) {
      return;
    }
    
    const stepId = active.id;
    const newStatus = over.id; // Column ID = status
    
    // Find current step and its previous status
    const currentSteps = optimisticSteps ?? project?.implementation_plan ?? [];
    const currentStep = currentSteps.find(s => String(s.step) === String(stepId));
    
    if (!currentStep) {
      console.error('[useStepDrag] Step not found:', stepId);
      return;
    }
    
    const previousStatus = currentStep.status;
    
    // Skip if status unchanged
    if (previousStatus === newStatus) {
      return;
    }
    
    // 1. Optimistic update - immediate UI feedback
    const updatedSteps = currentSteps.map(step =>
      String(step.step) === String(stepId)
        ? { ...step, status: newStatus }
        : step
    );
    
    setOptimisticSteps(updatedSteps);
    setIsUpdating(true);
    setError(null);
    
    // 2. Emit to server via WebSocket
    if (socketRef.current) {
      socketRef.current.emit('step_status_update', {
        projectName: project.project_name,
        stepId,
        newStatus,
        previousStatus
      });
    }
    
    // 3. Set timeout for rollback if no response
    timeoutRef.current = setTimeout(() => {
      if (isUpdating) {
        console.warn('[useStepDrag] Timeout - rolling back');
        setOptimisticSteps(null);
        setError('Update timed out');
        setIsUpdating(false);
      }
    }, 5000);
    
  }, [project, optimisticSteps, isUpdating]);

  /**
   * Retry failed update
   */
  const retry = useCallback(() => {
    setError(null);
    // The last optimistic update was rolled back, user needs to drag again
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Current steps (optimistic or from server)
    steps: optimisticSteps ?? project?.implementation_plan ?? [],
    // Loading state
    isUpdating,
    // Error state
    error,
    // Drag handler
    handleDragEnd,
    // Error handlers
    retry,
    clearError
  };
}

export default useStepDrag;
```

**Verification:**
- File exists
- Hook exports correct interface

**Testing Checkpoint:**
- Console logs appear when dragging
- Socket connection established

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/hooks/useStepDrag.js
```

---

### Task 2.3: Create StepCard Component

**Priority:** P1 - Needed by BoardColumn  
**Est. Effort:** 10 minutes  
**Risk:** Low

**File to Create:** `frontend/src/components/BoardView/StepCard.jsx`

**Implementation:**
```jsx
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/**
 * StepCard - Draggable card for implementation steps
 */
function StepCard({ step, isDragging }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform
  } = useDraggable({
    id: String(step.step),
    data: {
      step,
      status: step.status
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative p-3 bg-gray-700/50 rounded-lg border border-gray-600/50
        hover:border-gray-500 transition-all duration-200
        ${isDragging ? 'ring-2 ring-blue-400/50 shadow-lg' : ''}
      `}
    >
      {/* Drag handle */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 
                   opacity-0 group-hover:opacity-100
                   cursor-grab active:cursor-grabbing p-1 
                   text-gray-500 hover:text-gray-300
                   transition-opacity duration-150"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      {/* Card content */}
      <div className="pl-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-gray-500">
            Step {step.step}
          </span>
        </div>
        <p className="text-sm text-white">{step.task}</p>
        
        {/* Show status badge if different from column */}
        {step.status && (
          <span className={`
            inline-block mt-2 text-xs px-2 py-0.5 rounded
            ${step.status === 'done' ? 'bg-green-900/50 text-green-300' : ''}
            ${step.status === 'in_progress' ? 'bg-yellow-900/50 text-yellow-300' : ''}
            ${step.status === 'pending' ? 'bg-gray-600 text-gray-300' : ''}
          `}>
            {step.status}
          </span>
        )}
      </div>
    </div>
  );
}

export default StepCard;
```

**Verification:**
- File exists
- useDraggable imported from @dnd-kit/core

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/StepCard.jsx
```

---

### Task 2.4: Create DragOverlay Component

**Priority:** P2 - Enhancement  
**Est. Effort:** 5 minutes  
**Risk:** Low

**File to Create:** `frontend/src/components/BoardView/DragOverlay.jsx`

**Implementation:**
```jsx
import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';

/**
 * Custom drag overlay for step cards
 * Shows a styled preview when dragging
 */
function StepDragOverlay({ activeStep }) {
  if (!activeStep) return null;

  return (
    <DndDragOverlay>
      <div className="
        p-3 bg-gray-600 rounded-lg border border-blue-400/50
        shadow-xl rotate-3 scale-105
        pointer-events-none
      ">
        <div className="pl-6">
          <span className="text-xs font-mono text-gray-400">
            Step {activeStep.step}
          </span>
          <p className="text-sm text-white mt-1">{activeStep.task}</p>
        </div>
      </div>
    </DndDragOverlay>
  );
}

export default StepDragOverlay;
```

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/DragOverlay.jsx
```

---

### Task 2.5: Create Barrel Export

**Priority:** P1 - Required for imports  
**Est. Effort:** 2 minutes  
**Risk:** None

**File to Create:** `frontend/src/components/BoardView/index.js`

**Implementation:**
```javascript
export { default as BoardColumn } from './BoardColumn';
export { default as StepCard } from './StepCard';
export { default as ColumnHeader } from './ColumnHeader';
export { default as StepDragOverlay } from './DragOverlay';
export { default as useStepDrag } from './hooks/useStepDrag';
export { default } from './index.jsx';
```

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/index.js
```

---

## Phase 3: Frontend DnD Core (60 min)

### Task 3.1: Create BoardColumn Component

**Priority:** P0 - Core component  
**Est. Effort:** 20 minutes  
**Risk:** Medium

**File to Create:** `frontend/src/components/BoardView/BoardColumn.jsx`

**Implementation:**
```jsx
import { useDroppable } from '@dnd-kit/core';
import ColumnHeader from './ColumnHeader';
import StepCard from './StepCard';

/**
 * BoardColumn - Droppable Kanban column
 */
function BoardColumn({
  id,
  title,
  steps,
  icon: Icon,
  iconColor,
  borderColor,
  bgColor,
  activeId
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      status: id
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 min-w-[280px] bg-gray-800/50 rounded-xl border overflow-hidden
        transition-all duration-150
        ${isOver ? 'ring-2 ring-blue-400/50 bg-blue-500/5' : ''}
        ${borderColor}
      `}
    >
      {/* Header */}
      <div className={bgColor}>
        <ColumnHeader
          title={title}
          count={steps.length}
          icon={Icon}
          iconColor={iconColor}
        />
      </div>
      
      {/* Cards container */}
      <div className="p-3 space-y-2 min-h-[200px] max-h-[400px] overflow-auto">
        {steps.map((step) => (
          <StepCard
            key={step.step}
            step={step}
            isDragging={String(step.step) === activeId}
          />
        ))}
        
        {steps.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No items</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BoardColumn;
```

**Verification:**
- useDroppable works correctly
- Column renders steps

**Testing Checkpoint:**
- Column shows "No items" when empty
- Column shows all assigned steps

**Rollback:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView/BoardColumn.jsx
```

---

### Task 3.2: Create Main BoardView Container

**Priority:** P0 - Core component  
**Est. Effort:** 25 minutes  
**Risk:** Medium

**File to Create:** `frontend/src/components/BoardView/index.jsx`

**Implementation:**
```jsx
import { useState, useMemo } from 'react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter
} from '@dnd-kit/core';
import { LayoutGrid, Kanban, Circle, Loader2, CheckCircle2 } from 'lucide-react';

import BoardColumn from './BoardColumn';
import StepDragOverlay from './DragOverlay';
import { useStepDrag } from './hooks/useStepDrag';

/**
 * BoardView - Interactive Kanban board with drag & drop
 */
function BoardView({ project }) {
  const [activeId, setActiveId] = useState(null);
  
  const { steps, handleDragEnd, isUpdating, error, clearError } = useStepDrag(project);

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group steps by status
  const columns = useMemo(() => {
    const pending = steps.filter(s => s.status === 'pending');
    const inProgress = steps.filter(s => s.status === 'in_progress');
    const done = steps.filter(s => s.status === 'done');
    
    return { pending, inProgress, done };
  }, [steps]);

  // Get active step for drag overlay
  const activeStep = useMemo(() => {
    if (!activeId) return null;
    return steps.find(s => String(s.step) === activeId);
  }, [activeId, steps]);

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(String(event.active.id));
  };

  // Handle drag end
  const onDragEnd = (event) => {
    setActiveId(null);
    handleDragEnd(event);
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
  };

  if (!project) {
    return (
      <div className="text-center text-gray-400 py-12">
        No project selected
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Kanban className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Board View</h2>
            <p className="text-purple-300 text-sm mt-1">
              Drag cards between columns to update status
            </p>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center justify-between">
          <span className="text-red-300">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Pending Column */}
          <BoardColumn
            id="pending"
            title="Pending"
            steps={columns.pending}
            icon={Circle}
            iconColor="text-gray-400"
            borderColor="border-gray-600"
            bgColor="bg-gray-700/30"
            activeId={activeId}
          />
          
          {/* In Progress Column */}
          <BoardColumn
            id="in_progress"
            title="In Progress"
            steps={columns.inProgress}
            icon={Loader2}
            iconColor="text-yellow-400"
            borderColor="border-yellow-600/50"
            bgColor="bg-yellow-900/20"
            activeId={activeId}
          />
          
          {/* Done Column */}
          <BoardColumn
            id="done"
            title="Completed"
            steps={columns.done}
            icon={CheckCircle2}
            iconColor="text-green-400"
            borderColor="border-green-600/50"
            bgColor="bg-green-900/20"
            activeId={activeId}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeStep && (
            <div className="p-3 bg-gray-600 rounded-lg border border-blue-400/50 shadow-xl rotate-3 scale-105 pointer-events-none">
              <div className="pl-6">
                <span className="text-xs font-mono text-gray-400">
                  Step {activeStep.step}
                </span>
                <p className="text-sm text-white mt-1">{activeStep.task}</p>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Loading indicator */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-blue-900/80 text-blue-300 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Updating...</span>
        </div>
      )}
    </div>
  );
}

export default BoardView;
```

**Verification:**
- Board renders with three columns
- Steps appear in correct columns
- Drag sensors configured

**Testing Checkpoint:**
- Can see the board
- Columns show correct step counts

**Rollback:**
- Replace with backup: `cp BoardView.backup.jsx BoardView.jsx`

---

### Task 3.3: Add CSS Animations

**Priority:** P2 - Enhancement  
**Est. Effort:** 5 minutes  
**Risk:** Low

**File to Modify:** `frontend/src/index.css` (or add to Tailwind config)

**Add to CSS:**
```css
/* Drag and drop animations */
.step-card {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.step-card.dragging {
  opacity: 0.5;
  transform: scale(1.05);
}

.column-drop-zone {
  transition: all 150ms ease-out;
}

.column-drop-zone.drag-over {
  ring-width: 2px;
  ring-color: rgba(59, 130, 246, 0.5);
  background-color: rgba(59, 130, 246, 0.05);
}

@keyframes float {
  0% { transform: scale(1) rotate(0deg); }
  100% { transform: scale(1.05) rotate(3deg); }
}

.drag-preview {
  animation: float 200ms ease-out;
}
```

---

### Task 3.4: Update StepCard with Status Badge

**Priority:** P2 - Enhancement  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Already included in Task 2.3 implementation.**

---

### Task 3.5: Add Toast Component for Errors

**Priority:** P2 - Enhancement  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Already integrated in Task 3.2. Can be extracted to a separate component if needed.**

---

## Phase 4: Integration (20 min)

### Task 4.1: Update App.jsx Import

**Priority:** P0 - Blocking  
**Est. Effort:** 2 minutes  
**Risk:** Low

**File to Modify:** `frontend/src/App.jsx`

**Change:**
```jsx
// Before
import BoardView from './components/BoardView';

// After (same import works - index.jsx is default)
import BoardView from './components/BoardView';
```

No change needed - the import path stays the same because we're using `index.jsx` in the `BoardView/` folder.

**Verification:**
- App loads without errors
- Board view tab works

---

### Task 4.2: Remove Backup File (After Testing)

**Priority:** P3 - Cleanup  
**Est. Effort:** 1 minute  
**Risk:** None

**Command:**
```bash
rm ~/openclaw-pm-dashboard/frontend/src/components/BoardView.backup.jsx
```

**Keep backup until Phase 5 testing is complete!**

---

### Task 4.3: Update Documentation

**Priority:** P3 - Cleanup  
**Est. Effort:** 10 minutes  
**Risk:** None

**File to Update:** `docs/PHASE3_BOARD_DND_ARCHITECTURE.md`

**Change Status from "Proposed" to "Implemented"**

---

## Phase 5: Testing (30 min)

### Task 5.1: Test Drag Between Columns

**Priority:** P0 - Critical  
**Est. Effort:** 10 minutes  
**Risk:** Medium

**Test Cases:**
1. Drag from Pending to In Progress
2. Drag from In Progress to Done
3. Drag from Done back to In Progress
4. Drag to same column (no action)
5. Rapid consecutive drags

**Expected Results:**
- Card moves immediately on drop
- Server receives update
- WebSocket broadcasts change
- All connected clients update

**How to Test:**
```
1. Open two browser tabs with dashboard
2. In Tab 1, drag a card from Pending to In Progress
3. Verify Tab 2 shows the same change
4. Check backend console for update logs
5. Refresh page and verify persistence
```

---

### Task 5.2: Test Optimistic Updates

**Priority:** P0 - Critical  
**Est. Effort:** 5 minutes  
**Risk:** Medium

**Test Cases:**
1. Drag card - should move immediately
2. Backend down - should still move, then show error
3. Slow network - should move, then sync

**Expected Results:**
- UI updates before server confirms
- Loading indicator shows during update
- Rollback on error with toast message

---

### Task 5.3: Test Error Handling

**Priority:** P1 - Important  
**Est. Effort:** 5 minutes  
**Risk:** Medium

**Test Cases:**
1. Disconnect backend, drag card - should show error
2. Invalid status value - should show error
3. Network timeout - should rollback

**Expected Results:**
- Error toast appears
- Card returns to original position
- "Retry" option available

---

### Task 5.4: Test REST Fallback

**Priority:** P2 - Nice to have  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Test Cases:**
```bash
# Direct REST API call
curl -X PATCH http://localhost:3001/api/projects/test-project/steps/1/status \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'
```

**Expected Results:**
- Returns success JSON
- WebSocket clients receive update
- File updated on disk

---

### Task 5.5: Test Accessibility

**Priority:** P2 - Nice to have  
**Est. Effort:** 5 minutes  
**Risk:** Low

**Test Cases:**
1. Keyboard navigation (Tab between cards)
2. Focus visible on drag handle
3. Screen reader announces status changes

---

## Rollback Strategy

### Full Rollback Procedure

If Phase 3 implementation fails completely:

```bash
# 1. Restore original BoardView
cp ~/openclaw-pm-dashboard/frontend/src/components/BoardView.backup.jsx \
   ~/openclaw-pm-dashboard/frontend/src/components/BoardView.jsx

# 2. Remove BoardView folder
rm -rf ~/openclaw-pm-dashboard/frontend/src/components/BoardView/

# 3. Remove backend changes
# - Remove projectState.js
rm ~/openclaw-pm-dashboard/backend/lib/projectState.js
# - Manually revert server.js changes (remove WebSocket handler and REST endpoint)

# 4. Uninstall dependencies
cd ~/openclaw-pm-dashboard/frontend
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# 5. Restart backend
cd ~/openclaw-pm-dashboard/backend
npm start
```

### Partial Rollback

If only certain features fail:

1. **DnD not working:** Keep backend, revert frontend to backup
2. **WebSocket issues:** Use REST fallback only
3. **File sync issues:** Update database only, skip file write

---

## Dependency Graph

```
Task 0.1 (npm install)
    │
    ▼
Task 0.2 (backup) ──┬──► Task 0.3 (folder structure)
                    │
                    ▼
              Task 1.1 (projectState.js)
                    │
                    ▼
              Task 1.2 (WebSocket handler)
                    │
                    ▼
              Task 1.3 (REST endpoint)
                    │
                    ▼
Task 2.1 (ColumnHeader) ──► Task 3.1 (BoardColumn)
                                  │
Task 2.2 (useStepDrag) ──────────┤
                                  │
Task 2.3 (StepCard) ─────────────┤
                                  │
Task 2.4 (DragOverlay) ──────────┤
                                  │
Task 2.5 (barrel export) ────────┤
                                  │
                                  ▼
                            Task 3.2 (BoardView container)
                                  │
                                  ▼
                            Task 4.1 (App.jsx)
                                  │
                                  ▼
                            Phase 5 (Testing)
```

---

## Success Criteria

Phase 3 is complete when:

- [ ] `@dnd-kit` packages installed
- [ ] Backend WebSocket handler working
- [ ] Backend REST endpoint working
- [ ] BoardView renders with three columns
- [ ] Drag and drop between columns works
- [ ] Optimistic updates show immediately
- [ ] Server syncs changes to file and database
- [ ] Error handling with rollback works
- [ ] Multiple clients stay in sync
- [ ] Keyboard accessibility works

---

*Document Version: 1.0.0*  
*Created: 2026-03-28*  
*Ready for Developer Agent*
