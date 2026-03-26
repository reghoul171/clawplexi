import { useState, useCallback } from 'react';
import { API_URL } from '../config/api';

/**
 * Custom hook for spawning tester agent actions
 */
export function useTesterAgent() {
  const [loading, setLoading] = useState({
    createTests: false,
    runTests: false,
    generateReport: false,
  });
  
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);

  const spawnTester = useCallback(async (action, projectName) => {
    const endpoint = `/api/tester/${action}`;
    
    setLoading(prev => ({ ...prev, [mapActionToKey(action)]: true }));
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
      
      setLastResult(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [mapActionToKey(action)]: false }));
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

  return {
    loading,
    error,
    lastResult,
    createTests,
    runTests,
    generateReport,
    clearError,
    clearResult,
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

export default useTesterAgent;
