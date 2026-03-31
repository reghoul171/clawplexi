import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../../config/api';

/**
 * Custom hook for handling step editing with REST API (primary) + WebSocket for real-time sync
 * @param {Object} project - Current project data
 * @param {Function} onProjectUpdate - Callback to update parent project state
 * @returns {Object} - Editor state and handlers
 */
export function useStepEditor(project, onProjectUpdate) {
  const [editingStep, setEditingStep] = useState(null);
  const [editForm, setEditForm] = useState({ task: '', status: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  // Initialize socket for receiving updates only
  useEffect(() => {
    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('step_update_error', data => {
      console.error('[useStepEditor] Update failed:', data.error);
      setError(data.error);
      setIsSaving(false);
    });

    // Listen for project updates (broadcast to all clients after any change)
    socketRef.current.on('project_updated', updatedProject => {
      if (updatedProject.project_name === project?.project_name) {
        console.log('[useStepEditor] Received project update from server');
        // Close modal and reset state
        setEditingStep(null);
        setEditForm({ task: '', status: '', notes: '' });
        setIsSaving(false);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [project?.project_name]);

  const startEdit = useCallback(step => {
    setEditingStep(step.step);
    setEditForm({
      task: step.task,
      status: step.status || 'pending',
      notes: step.notes || '',
    });
    setError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingStep(null);
    setEditForm({ task: '', status: '', notes: '' });
    setError(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingStep || !project) return;

    setIsSaving(true);
    setError(null);

    // Use REST API as primary transport (reliable through tunnels)
    try {
      const response = await fetch(
        `${API_URL}/api/projects/${encodeURIComponent(project.project_name)}/steps/${editingStep}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update step');
      }

      const result = await response.json();
      console.log('[useStepEditor] REST update successful:', result);

      // Update parent state with server response (works even if WebSocket fails)
      if (onProjectUpdate && result.project) {
        onProjectUpdate(result.project);
      }

      // Close modal after successful save
      setEditingStep(null);
      setEditForm({ task: '', status: '', notes: '' });
      setIsSaving(false);
    } catch (err) {
      console.error('[useStepEditor] REST update failed:', err);
      setError(err.message);
      setIsSaving(false);
    }
  }, [editingStep, editForm, project, onProjectUpdate]);

  return {
    editingStep,
    editForm,
    setEditForm,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving,
    error,
  };
}

export default useStepEditor;
