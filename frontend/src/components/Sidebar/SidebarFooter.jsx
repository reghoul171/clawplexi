import { Wifi, WifiOff, Settings, User } from 'lucide-react';

function SidebarFooter({ connected, onSettingsClick }) {
  return (
    <div className="p-3 border-t border-gray-700 bg-gray-800/50">
      {/* Connection status */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <User className="w-3.5 h-3.5" />
          <span>Workspace</span>
        </button>
        
        <div className="flex items-center gap-1.5">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs text-green-400">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400">Offline</span>
            </>
          )}
        </div>
      </div>
      
      {/* Connection indicator bar */}
      <div className={`mt-2 h-0.5 rounded-full transition-colors duration-300 ${
        connected ? 'bg-green-500/50' : 'bg-red-500/50'
      }`} />
    </div>
  );
}

export default SidebarFooter;
