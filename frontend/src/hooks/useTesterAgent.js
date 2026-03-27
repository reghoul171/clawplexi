import { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config/api';

/**
 * Custom hook for spawning tester agent actions with async task tracking
 */
export function useTesterAgent() {
  const [loading, setLoading] = useState({
    createTests: false,
    runTests: false,
    generateReport: false,
  });
  
  const [pendingTasks, setPendingTasks] = useState({});
  const [completedTasks, setCompletedTasks] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);

  // Setup socket listeners for task events
  useEffect(() => {
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[useTesterAgent] Connected to WebSocket');
    });

    socket.on('task_started', (task) => {
      console.log('[useTesterAgent] Task started:', task);
      setPendingTasks(prev => ({
        ...prev,
        [task.taskId]: {
          ...task,
          progress: 0,
          message: task.message || 'Starting...'
        }
      }));
    });

    socket.on('task_progress', (update) => {
      console.log('[useTesterAgent] Task progress:', update);
      setPendingTasks(prev => {
        if (prev[update.taskId]) {
          return {
            ...prev,
            [update.taskId]: {
              ...prev[update.taskId],
              progress: update.progress,
              message: update.message,
              status: update.status || 'running'
            }
          };
        }
        return prev;
      });
    });

    socket.on('task_completed', (result) => {
      console.log('[useTesterAgent] Task completed:', result);
      
      // Remove from pending
      setPendingTasks(prev => {
        const updated = { ...prev };
        delete updated[result.taskId];
        return updated;
      });
      
      // Add to completed
      setCompletedTasks(prev => [result, ...prev.slice(0, 9)]);
      
      // Set as last result
      setLastResult(result);
      
      // Update loading state
      const actionKey = mapTypeToKey(result.type);
      setLoading(prev => ({ ...prev, [actionKey]: false }));
    });

    socket.on('disconnect', () => {
      console.log('[useTesterAgent] Disconnected from WebSocket');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const spawnTester = useCallback(async (action, projectName) => {
    const endpoint = `/api/tester/${action}`;
    const actionKey = mapActionToKey(action);
    
    setLoading(prev => ({ ...prev, [actionKey]: true }));
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action}`);
      }
      
      // Store task ID for tracking
      if (data.taskId) {
        setPendingTasks(prev => ({
          ...prev,
          [data.taskId]: {
            taskId: data.taskId,
            type: action,
            projectName,
            status: 'pending',
            progress: 0,
            message: 'Task initiated...'
          }
        }));
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(prev => ({ ...prev, [actionKey]: false }));
      throw err;
    }
  }, []);

  const createTests = useCallback((projectName) => {
    return spawnTester('create-tests', projectName);
  }, [spawnTester]);

  const runTests = useCallback((projectName) => {
    return spawnTester('run-tests', projectName);
  }, [spawnTester]);

  const generateReport = useCallback((projectName) => {
    return spawnTester('generate-report', projectName);
  }, [spawnTester]);

  const clearError = useCallback(() => setError(null), []);
  const clearResult = useCallback(() => setLastResult(null), []);
  const dismissTask = useCallback((taskId) => {
    setCompletedTasks(prev => prev.filter(t => t.taskId !== taskId));
  }, []);

  return {
    loading,
    pendingTasks,
    completedTasks,
    error,
    lastResult,
    createTests,
    runTests,
    generateReport,
    clearError,
    clearResult,
    dismissTask,
  };
}

function mapActionToKey(action) {
  const mapping = {
    'create-tests': 'createTests',
    'run-tests': 'runTests',
    'generate-report': 'generateReport',
  };
  return mapping[action] || action;
}

function mapTypeToKey(type) {
  const mapping = {
    'create-tests': 'createTests',
    'run-tests': 'runTests',
    'generate-report': 'generateReport',
  };
  return mapping[type] || type;
}

export default useTesterAgent;
