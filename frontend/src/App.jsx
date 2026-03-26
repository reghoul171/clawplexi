import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import DecisionTree from './components/DecisionTree';
import Tests from './components/Tests';
import ErrorBoundary from './components/ErrorBoundary';
import { API_URL } from './config/api';

function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [connected, setConnected] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [loading, setLoading] = useState(true);

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
      })
      .catch(err => {
        console.error('Failed to fetch projects:', err);
        setFetchError(err.message || 'Failed to connect to server');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeProject]);

  useEffect(() => {
    // Fetch initial projects
    fetchProjects();

    // Setup WebSocket connection
    const socket = io(API_URL);

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    });

    socket.on('initial_state', (initialProjects) => {
      setProjects(initialProjects);
      if (initialProjects.length > 0 && !activeProject) {
        setActiveProject(initialProjects[0]);
      }
    });

    socket.on('project_updated', (updatedProject) => {
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

    return () => socket.disconnect();
  }, [activeProject, fetchProjects, projects]);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'decision-tree', label: 'Decision Tree' },
    { id: 'tests', label: 'Tests' }
  ];

  const handleRetry = () => {
    fetchProjects();
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
          <h2 className="text-xl font-semibold text-white mb-2">
            Connection Error
          </h2>
          <p className="text-gray-400 mb-2">
            Unable to connect to the server.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {fetchError}
          </p>
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
        />
        
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeProject ? (
            <>
              <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{activeProject.project_name}</h1>
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
                      {activeProject.editor_used}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-400">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </header>

              <nav className="bg-gray-800 border-b border-gray-700 px-6">
                <div className="flex space-x-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'text-blue-400 border-b-2 border-blue-400'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="flex-1 overflow-auto p-6">
                {activeTab === 'overview' && <Overview project={activeProject} />}
                {activeTab === 'decision-tree' && <DecisionTree project={activeProject} />}
                {activeTab === 'tests' && <Tests project={activeProject} />}
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
