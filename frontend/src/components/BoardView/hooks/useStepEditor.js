import { useState, useCallback, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../../../config/api';

/**
 * Custom hook for handling step editing with WebSocket sync
 * @param {Object} project - Current project data
 * @param {Function} onUpdate - Optional callback after successful update
 * @returns {Object} - Editor state and handlers
 */
export function useStepEditor(project, onUpdate) {
  const [editingStep, setEditingStep] = useState(null);
  const [editForm, setEditForm] = useState({ task: '', status: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(API_URL);
    
    socketRef.current.on('step_update_error', (data) => {
      console.error('[useStepEditor] Update failed:', data.error);
      setError(data.error);
      setIsSaving(false);
    });
    
    socketRef.current.on('step_updated', (data) => {
      if (data.projectName === project?.project_name) {
        console.log('[useStepEditor] Server confirmed update');
        setIsSaving(false);
      }
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [project?.project_name]);

  const startEdit = useCallback((step) => {
    setEditingStep(step.step);
    setEditForm({ 
      task: step.task, 
      status: step.status || 'pending',
      notes: step.notes || ''
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
    
    // Emit WebSocket event
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('step_update', {
        projectName: project.project_name,
        stepId: editingStep,
        updates: editForm
      });
    } else {
      // Fallback to REST API
      try {
        const response = await fetch(
          `${API_URL}/api/projects/${encodeURIComponent(project.project_name)}/steps/${editingStep}/status`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
          }
        );
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update step');
        }
        
        setIsSaving(false);
      } catch (err) {
        console.error('[useStepEditor] REST update failed:', err);
        setError(err.message);
        setIsSaving(false);
        return;
      }
    }

    if (onUpdate) onUpdate(editingStep, editForm);
    cancelEdit();
  }, [editingStep, editForm, project, onUpdate, cancelEdit]);

  return {
    editingStep,
    editForm,
    setEditForm,
    startEdit,
    cancelEdit,
    saveEdit,
    isSaving,
    error
  };
}

export default useStepEditor;
