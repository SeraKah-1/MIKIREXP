
import React from 'react';
import { Home, FolderOpen, Settings, Gamepad2, Users, Brain, Shuffle } from 'lucide-react';
import { AppView } from '../types';

interface NavigationProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onChangeView }) => {
  const tabs = [
    { id: AppView.GENERATOR, icon: Home, label: 'Home' },
    { id: AppView.VIRTUAL_ROOM, icon: Shuffle, label: 'Room Mixer' },
    { id: AppView.NEURO_SYNC, icon: Brain, label: 'Sync' },
    { id: AppView.MULTIPLAYER, icon: Users, label: 'Lobby' },
    { id: AppView.WORKSPACE, icon: FolderOpen, label: 'Files' },
    { id: AppView.SETTINGS, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="bg-theme-glass backdrop-blur-2xl border border-theme-border rounded-2xl shadow-2xl shadow-theme-primary/10 p-1.5 flex justify-between items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChangeView(tab.id as AppView)}
              className={`
                relative flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all duration-300
                ${isActive 
                  ? 'text-theme-primary bg-theme-primary/10' 
                  : 'text-theme-muted hover:text-theme-primary hover:bg-theme-glass'}
              `}
            >
              <div className={`relative ${isActive ? 'transform -translate-y-1' : ''} transition-transform duration-300`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-theme-primary rounded-full" />
                )}
              </div>
              <span className={`text-[9px] font-bold mt-1 ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'} transition-all duration-300`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
