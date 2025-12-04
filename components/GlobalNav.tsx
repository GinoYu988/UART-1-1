import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, FileText, ListVideo, Clapperboard, Settings, Moon, Sun, Monitor, LogOut } from 'lucide-react';
import { AppPhase } from '../types';

interface GlobalNavProps {
  currentPhase: AppPhase;
  onPhaseChange: (phase: AppPhase) => void;
}

export const GlobalNav: React.FC<GlobalNavProps> = ({ currentPhase, onPhaseChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const settingsRef = useRef<HTMLDivElement>(null);

  // Load theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('filmplus-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    // Close settings on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('filmplus-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    // setShowSettings(false); // Optional: keep open to see change
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '中台', tooltip: '制作总览 Dashboard' },
    { id: 'script', icon: FileText, label: '剧本', tooltip: '剧本拆分 Script Breakdown' },
    { id: 'shotlist', icon: ListVideo, label: '脚本', tooltip: '脚本拆解 Shot List' },
    { id: 'storyboard', icon: Clapperboard, label: '分镜', tooltip: '故事板生成 Storyboard' },
  ];

  return (
    <div className="w-16 h-full bg-cine-black border-r border-cine-border flex flex-col items-center py-6 gap-8 z-50 flex-shrink-0 relative">
      {/* Brand Logo (Clickable -> Intro Page) */}
      <button 
        onClick={() => onPhaseChange('intro')}
        className="w-10 h-10 flex items-center justify-center bg-cine-accent rounded-xl shadow-[0_0_15px_rgba(214,0,28,0.4)] mb-2 overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer"
        title="返回首页 Intro Page"
      >
         <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Column 1: White (Left) */}
            <path d="M 10 30 Q 30 30 30 10" stroke="white" strokeWidth="14" strokeLinecap="round" />
            <path d="M 10 60 Q 30 60 30 40" stroke="white" strokeWidth="14" strokeLinecap="round" />
            <path d="M 10 90 Q 30 90 30 70" stroke="white" strokeWidth="14" strokeLinecap="round" />
            
            {/* Column 2: Light Pink (Middle) - 60% Opacity */}
            <path d="M 40 30 Q 60 30 60 10" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.6" />
            <path d="M 40 60 Q 60 60 60 40" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.6" />
            <path d="M 40 90 Q 60 90 60 70" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.6" />

            {/* Column 3: Darker Pink (Right) - 30% Opacity */}
            <path d="M 70 30 Q 90 30 90 10" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.3" />
            <path d="M 70 60 Q 90 60 90 40" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.3" />
            <path d="M 70 90 Q 90 90 90 70" stroke="white" strokeWidth="14" strokeLinecap="round" opacity="0.3" />
         </svg>
      </button>

      {/* Nav Items */}
      <div className="flex flex-col gap-6 w-full items-center">
        {navItems.map((item) => {
          const isActive = currentPhase === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPhaseChange(item.id as AppPhase)}
              className={`group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-cine-accent text-white shadow-lg shadow-cine-accent/30' 
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
              title={item.tooltip}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              
              {/* Active Indicator Dot */}
              {isActive && (
                <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto relative" ref={settingsRef}>
        {showSettings && (
          <div className="absolute bottom-12 left-12 w-48 bg-cine-panel border border-cine-border rounded-xl shadow-2xl p-2 z-[60] animate-in slide-in-from-left-2 fade-in zoom-in-95">
             <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest px-2 py-1 mb-1">Settings</div>
             
             {/* Theme Toggle */}
             <button 
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors group"
             >
                <div className="flex items-center gap-2">
                   {theme === 'dark' ? <Moon size={14} className="text-purple-400" /> : <Sun size={14} className="text-orange-400" />}
                   <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
                {/* Visual Switch */}
                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${theme === 'dark' ? 'bg-zinc-700' : 'bg-zinc-300'}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`}></div>
                </div>
             </button>

             <div className="h-px bg-cine-border my-1"></div>
             
             <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors">
                 <Monitor size={14} />
                 <span>System Info</span>
             </button>
             <button onClick={() => onPhaseChange('intro')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:bg-red-900/20 hover:text-red-400 rounded-lg transition-colors">
                 <LogOut size={14} />
                 <span>Exit Studio</span>
             </button>
          </div>
        )}

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`w-10 h-10 flex items-center justify-center transition-colors rounded-xl ${showSettings ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'}`}
          title="设置 Settings"
        >
          <Settings size={20} className={showSettings ? 'animate-spin-slow' : ''} />
        </button>
      </div>
    </div>
  );
};