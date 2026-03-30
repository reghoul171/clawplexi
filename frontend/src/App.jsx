import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ListView from './components/ListView';
import BoardView from './components/BoardView';
import TimelineView from './components/TimelineView';
import Tests from './components/Tests';
import ViewSwitcher from './components/ViewSwitcher';
import ErrorBoundary from './components/ErrorBoundary';
import { API_URL } from './config/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  // Initialize activeView from localStorage, default to 'list'
  const [activeView, setActiveView] = useState(() => {
    const stored = localStorage.getItem('pm-dashboard-active-view');
    return stored || 'list';
  });
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Persist activeView to localStorage
  useEffect(() => {
    localStorage.setItem('pm-dashboard-active-view', activeView);
  }, [activeView]);

  // Keyboard shortcuts for view switching (Alt+1/2/3/4)
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveView('list');
            break;
          case '2':
            e.preventDefault();
            setActiveView('board');
            break;
          case '3':
            e.preventDefault();
            setActiveView('timeline');
            break;
          case '4':
            e.preventDefault();
            setActiveView('tests');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchProjects = useCallback(() => {
    setLoading(true);
    setFetchError(null);

    fetch(`${API_URL}/api/projects`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
        setFetchError(null);
        // REST API works, so we have a working connection
        setConnected(true);
        setConnectionStatus('connected');
      })
      .catch(err => {
        console.error('Failed to fetch projects:', err);
        setFetchError(err.message || 'Failed to connect to server');
        setConnected(false);
        setConnectionStatus('disconnected');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProject]);

  useEffect(() => {
    // Fetch initial projects
    fetchProjects();

    // Setup WebSocket connection
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('Socket connected, waiting for initial_state...');
      setConnectionStatus('connecting');
      // Don't set connected=true yet - wait for initial_state
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', error => {
      console.log('Connection error:', error.message);
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    // Only set connected=true after receiving initial_state from server
    // This ensures the server actually responded with data
    socket.on('initial_state', initialProjects => {
      console.log('Received initial_state from server');
      setProjects(initialProjects);
      if (initialProjects.length > 0 && !activeProject) {
        setActiveProject(initialProjects[0]);
      }
      // NOW we can say we're truly connected
      setConnected(true);
      setConnectionStatus('connected');
    });

    socket.on('project_updated', updatedProject => {
      setProjects(prev => {
        const existing = prev.findIndex(p => p.project_name === updatedProject.project_name);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = updatedProject;
          return updated;
        }
        return [...prev, updatedProject];
      });

      if (activeProject?.project_name === updatedProject.project_name) {
        setActiveProject(updatedProject);
      }
    });

    socket.on('project_removed', ({ project_name }) => {
      setProjects(prev => prev.filter(p => p.project_name !== project_name));
      if (activeProject?.project_name === project_name) {
        setActiveProject(projects[0] || null);
      }
    });

    // Heartbeat mechanism - use socket.io's built-in ping/pong
    // If no data received for 30 seconds, consider disconnected
    let lastDataTime = Date.now();
    const heartbeatInterval = setInterval(() => {
      const timeSinceLastData = Date.now() - lastDataTime;
      // If socket thinks it's connected but no data for 30s, mark as disconnected
      if (socket.connected && timeSinceLastData > 30000) {
        console.log('Heartbeat timeout - no data for 30s');
        setConnected(false);
        setConnectionStatus('disconnected');
      }
    }, 10000);

    // Update last data time on any socket event
    const updateLastDataTime = () => {
      lastDataTime = Date.now();
    };
    socket.onAny(updateLastDataTime);

    return () => {
      clearInterval(heartbeatInterval);
      socket.offAny(updateLastDataTime);
      socket.disconnect();
    };
  }, [activeProject, fetchProjects, projects]);

  const handleRetry = () => {
    fetchProjects();
  };

  // Render the active view content
  const renderViewContent = () => {
    switch (activeView) {
      case 'list':
        return <ListView project={activeProject} />;
      case 'board':
        return <BoardView project={activeProject} />;
      case 'timeline':
        return <TimelineView project={activeProject} />;
      case 'tests':
        return <Tests project={activeProject} />;
      default:
        return <ListView project={activeProject} />;
    }
  };

  // Show error state with retry button
  if (fetchError && projects.length === 0) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-500/20 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-2">Unable to connect to the server.</p>
          <p className="text-sm text-gray-500 mb-6">{fetchError}</p>
          <button
            onClick={handleRetry}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onRetry={handleRetry}>
      <div className="flex h-screen bg-gray-900">
        <Sidebar
          projects={projects}
          activeProject={activeProject}
          onSelectProject={setActiveProject}
          connected={connected}
          onViewChange={setActiveView}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeProject ? (
            <>
              {/* Header with ViewSwitcher */}
              <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Project Name */}
                  <div className="flex items-center gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {activeProject.project_name}
                      </h1>
                      <span className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                        {activeProject.editor_used}
                      </span>
                    </div>
                  </div>

                  {/* ViewSwitcher */}
                  <ViewSwitcher activeView={activeView} onViewChange={setActiveView} />

                  {/* Connection Status */}
                  <div className="flex items-center gap-2" data-testid="connection-status">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        connectionStatus === 'connected'
                          ? 'bg-green-500'
                          : connectionStatus === 'connecting'
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-red-500'
                      }`}
                    ></span>
                    <span className="text-sm text-gray-400" data-testid="connection-text">
                      {connectionStatus === 'connected'
                        ? 'Connected'
                        : connectionStatus === 'connecting'
                          ? 'Connecting...'
                          : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </header>

              {/* View Content */}
              <div className="flex-1 overflow-auto p-6" data-testid={`view-${activeView}`}>
                {renderViewContent()}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl text-gray-400">No projects found</h2>
                <p className="text-gray-500 mt-2">
                  Add a .project_state.json file to your workspace directory
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
