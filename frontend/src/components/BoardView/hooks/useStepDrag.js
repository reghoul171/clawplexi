import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../../config/api';

/**
 * Custom hook for handling step drag operations with optimistic updates
 *
 * Design: REST API is the PRIMARY transport for updates (more reliable through tunnels/proxies).
 * Socket.io is used ONLY for receiving real-time updates from the server.
 * 
 * @param {Object} project - Current project data
 * @param {Function} onProjectUpdate - Callback to update parent project state (optional)
 */
export function useStepDrag(project, onProjectUpdate) {
  const [optimisticSteps, setOptimisticSteps] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);
  const pendingUpdateRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Initialize socket connection for receiving updates ONLY
  useEffect(() => {
    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    // Listen for errors
    socketRef.current.on('step_status_error', data => {
      console.error('[useStepDrag] Server reported update error:', data.error);
      // Don't rollback here - REST API call already handles success/failure
    });

    // Listen for project updates from server (broadcast to all clients)
    socketRef.current.on('project_updated', updatedProject => {
      if (updatedProject.project_name === project?.project_name) {
        console.log('[useStepDrag] Received project update from server');
        // Clear optimistic state since server confirmed
        if (pendingUpdateRef.current) {
          setOptimisticSteps(null);
          setIsUpdating(false);
          isUpdatingRef.current = false;
          pendingUpdateRef.current = null;
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [project?.project_name]);

  /**
   * Handle drag end event - ALWAYS uses REST API for reliability
   * @param {Object} event - dnd-kit drag end event
   */
  const handleDragEnd = useCallback(
    event => {
      const { active, over } = event;

      console.log('[useStepDrag] Drag end:', { active: active?.id, over: over?.id });

      // No drop target or same position
      if (!over) {
        console.log('[useStepDrag] No drop target, ignoring');
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
        console.log('[useStepDrag] Status unchanged, skipping');
        return;
      }

      console.log('[useStepDrag] Updating step', stepId, 'from', previousStatus, 'to', newStatus);

      // 1. Optimistic update - immediate UI feedback
      const updatedSteps = currentSteps.map(step =>
        String(step.step) === String(stepId) ? { ...step, status: newStatus } : step
      );

      setOptimisticSteps(updatedSteps);
      setIsUpdating(true);
      isUpdatingRef.current = true;
      setError(null);
      pendingUpdateRef.current = { stepId, newStatus };

      // 2. ALWAYS use REST API as primary transport (reliable through tunnels)
      console.log('[useStepDrag] Sending update via REST API');
      fetch(
        `${API_URL}/api/projects/${encodeURIComponent(project.project_name)}/steps/${stepId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      )
        .then(res => {
          if (!res.ok) {
            return res.json().then(data => {
              throw new Error(data.error || `HTTP ${res.status}`);
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('[useStepDrag] REST update successful');
          setIsUpdating(false);
          isUpdatingRef.current = false;
          pendingUpdateRef.current = null;
          
          // Update parent state with server response (works even if WebSocket fails)
          if (onProjectUpdate && data.project) {
            onProjectUpdate(data.project);
          }
          // Clear optimistic state after parent is updated
          setOptimisticSteps(null);
        })
        .catch(err => {
          console.error('[useStepDrag] REST update failed:', err);
          setError(err.message);
          setOptimisticSteps(null); // Rollback on failure
          setIsUpdating(false);
          isUpdatingRef.current = false;
          pendingUpdateRef.current = null;
        });
    },
    [project, optimisticSteps, onProjectUpdate]
  );

  /**
   * Handle quick status change (from dropdown, not drag)
   * @param {Object} step - The step object to update
   * @param {string} newStatus - The new status value
   */
  const handleStatusChange = useCallback(
    (step, newStatus) => {
      const stepId = step.step;
      const previousStatus = step.status;

      // Skip if status unchanged
      if (previousStatus === newStatus) {
        console.log('[useStepDrag] Status unchanged, skipping');
        return;
      }

      console.log(
        '[useStepDrag] Quick status change for step',
        stepId,
        'from',
        previousStatus,
        'to',
        newStatus
      );

      // 1. Optimistic update
      const currentSteps = optimisticSteps ?? project?.implementation_plan ?? [];
      const updatedSteps = currentSteps.map(s =>
        String(s.step) === String(stepId) ? { ...s, status: newStatus } : s
      );

      setOptimisticSteps(updatedSteps);
      setIsUpdating(true);
      isUpdatingRef.current = true;
      setError(null);
      pendingUpdateRef.current = { stepId, newStatus };

      // 2. REST API call
      fetch(
        `${API_URL}/api/projects/${encodeURIComponent(project.project_name)}/steps/${stepId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      )
        .then(res => {
          if (!res.ok) {
            return res.json().then(data => {
              throw new Error(data.error || `HTTP ${res.status}`);
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('[useStepDrag] Quick status update successful');
          setIsUpdating(false);
          isUpdatingRef.current = false;
          pendingUpdateRef.current = null;
          
          // Update parent state with server response
          if (onProjectUpdate && data.project) {
            onProjectUpdate(data.project);
          }
          setOptimisticSteps(null);
        })
        .catch(err => {
          console.error('[useStepDrag] Quick status update failed:', err);
          setError(err.message);
          setOptimisticSteps(null);
          setIsUpdating(false);
          isUpdatingRef.current = false;
          pendingUpdateRef.current = null;
        });
    },
    [project, optimisticSteps, onProjectUpdate]
  );

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
    // Quick status change handler
    handleStatusChange,
    // Error handler
    clearError,
  };
}

export default useStepDrag;
