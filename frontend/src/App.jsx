import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import DecisionTree from './components/DecisionTree';
import Tests from './components/Tests';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Fetch initial projects
    fetch(`${API_URL}/api/projects`)
      .then(res => res.json())
      .then(data => {
        setProjects(data);
        if (data.length > 0 && !activeProject) {
          setActiveProject(data[0]);
        }
      })
      .catch(err => console.error('Failed to fetch projects:', err));

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
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'decision-tree', label: 'Decision Tree' },
    { id: 'tests', label: 'Tests' }
  ];

  return (
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
  );
}

export default App;
