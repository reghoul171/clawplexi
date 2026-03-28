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
  const pendingUpdateRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(API_URL);
    
    // Listen for errors
    socketRef.current.on('step_status_error', (data) => {
      console.error('[useStepDrag] Update failed:', data.error);
      setError(data.error);
      setOptimisticSteps(null); // Rollback
      setIsUpdating(false);
      isUpdatingRef.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    });
    
    // Listen for project updates (confirmation)
    socketRef.current.on('project_updated', (updatedProject) => {
      if (updatedProject.project_name === project?.project_name && pendingUpdateRef.current) {
        console.log('[useStepDrag] Server confirmed update');
        // Server confirmed - clear optimistic state
        setOptimisticSteps(null);
        setIsUpdating(false);
        isUpdatingRef.current = false;
        pendingUpdateRef.current = null;
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
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
      String(step.step) === String(stepId)
        ? { ...step, status: newStatus }
        : step
    );
    
    setOptimisticSteps(updatedSteps);
    setIsUpdating(true);
    isUpdatingRef.current = true;
    setError(null);
    pendingUpdateRef.current = { stepId, newStatus };
    
    // 2. Emit to server via WebSocket
    if (socketRef.current && socketRef.current.connected) {
      console.log('[useStepDrag] Emitting step_status_update via socket');
      socketRef.current.emit('step_status_update', {
        projectName: project.project_name,
        stepId,
        newStatus,
        previousStatus
      });
    } else {
      // Fallback to REST API if socket not connected
      console.log('[useStepDrag] Socket not connected, using REST fallback');
      fetch(`${API_URL}/api/projects/${encodeURIComponent(project.project_name)}/steps/${stepId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            throw new Error(data.error);
          }
          console.log('[useStepDrag] REST update successful');
          setOptimisticSteps(null);
          setIsUpdating(false);
        })
        .catch(err => {
          console.error('[useStepDrag] REST update failed:', err);
          setError(err.message);
          setOptimisticSteps(null); // Rollback
          setIsUpdating(false);
        });
      return;
    }
    
    // 3. Set timeout for rollback if no response
    timeoutRef.current = setTimeout(() => {
      if (isUpdatingRef.current && pendingUpdateRef.current) {
        console.warn('[useStepDrag] Timeout - rolling back');
        setOptimisticSteps(null);
        setError('Update timed out');
        setIsUpdating(false);
        isUpdatingRef.current = false;
        pendingUpdateRef.current = null;
      }
    }, 5000);
    
  }, [project, optimisticSteps, isUpdating]);

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
    // Error handler
    clearError
  };
}

export default useStepDrag;
