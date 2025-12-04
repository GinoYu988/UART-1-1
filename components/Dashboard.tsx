
import React, { useEffect, useState } from 'react';
import { AppPhase, GeneratedImage, Asset } from '../types';
import { FileText, ListVideo, Clapperboard, ChevronRight, Activity, Clock, Users } from 'lucide-react';
import { Button } from './Button';
import { dbService } from '../services/db';

interface DashboardProps {
  onNavigate: (phase: AppPhase) => void;
}

// Local interfaces for DB data
interface ScriptProject { id: string; }
interface Scene { id: string; content: string; }
interface ShotListProject { id: string; }
interface Shot { id: string; }

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState({
      script: { projectCount: 0, sceneCount: 0, wordCount: 0 },
      shotlist: { projectCount: 0, shotCount: 0 },
      storyboard: { imageCount: 0, assetCount: 0 }
  });

  useEffect(() => {
      const loadStats = async () => {
          try {
              // Fetch Script Data
              const scripts = await dbService.getAll<ScriptProject>(dbService.stores.SCRIPTS);
              const scenes = await dbService.getAll<Scene>(dbService.stores.SCENES);
              const totalWords = scenes.reduce((acc, s) => acc + (s.content?.length || 0), 0);

              // Fetch Shot List Data
              const shotProjects = await dbService.getAll<ShotListProject>(dbService.stores.SHOT_PROJECTS);
              const shots = await dbService.getAll<Shot>(dbService.stores.SHOTS);

              // Fetch Storyboard Data
              const images = await dbService.getAll<GeneratedImage>(dbService.stores.IMAGES);
              const assets = await dbService.getAll<Asset>(dbService.stores.ASSETS);

              setStats({
                  script: {
                      projectCount: scripts.length,
                      sceneCount: scenes.length,
                      wordCount: totalWords
                  },
                  shotlist: {
                      projectCount: shotProjects.length,
                      shotCount: shots.length
                  },
                  storyboard: {
                      imageCount: images.length,
                      assetCount: assets.length
                  }
              });
          } catch (e) {
              console.error("Dashboard failed to load stats", e);
          }
      };
      loadStats();
  }, []);

  // Format large numbers
  const formatNumber = (num: number) => {
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num.toString();
  };

  return (
    <div className="flex-1 h-full bg-cine-black overflow-y-auto custom-scrollbar p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-end justify-between border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">影加加AI短剧制作中台</h1>
            <p className="text-zinc-500 text-sm font-mono">PROJECT: THE LAST STARLIGHT • ID: 2025-AX9</p>
          </div>
          <div className="flex gap-4 text-xs font-mono text-zinc-400">
             <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                <Clock size={14} className="text-cine-accent"/>
                <span>ETA: 14 DAYS</span>
             </div>
             <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                <Users size={14} className="text-cine-accent"/>
                <span>TEAM: 4 ACTIVE</span>
             </div>
          </div>
        </div>

        {/* Phase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Phase 1: Script */}
            <div className="bg-cine-panel border border-cine-border rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-600 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText size={100} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">剧本拆分</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">PHASE 01</span>
                    </div>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>总项目数</span>
                        <span className="text-white font-mono">{stats.script.projectCount} Projects</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000" 
                            style={{ width: stats.script.projectCount > 0 ? '100%' : '5%' }}
                        ></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">{stats.script.sceneCount}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Total Scenes</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">{formatNumber(stats.script.wordCount)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Total Words</div>
                        </div>
                    </div>
                </div>

                <Button variant="secondary" className="w-full justify-between group-hover:bg-blue-500/10 group-hover:text-blue-400 group-hover:border-blue-500/50" onClick={() => onNavigate('script')}>
                    <span>进入剧本工作台</span>
                    <ChevronRight size={14} />
                </Button>
            </div>

            {/* Phase 2: Shot List */}
            <div className="bg-cine-panel border border-cine-border rounded-2xl p-6 relative overflow-hidden group hover:border-zinc-600 transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ListVideo size={100} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                        <ListVideo size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">脚本拆解</h3>
                        <span className="text-[10px] text-zinc-500 font-mono">PHASE 02</span>
                    </div>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>总拆解列表</span>
                        <span className="text-white font-mono">{stats.shotlist.projectCount} Lists</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                         <div 
                            className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-1000" 
                            style={{ width: stats.shotlist.projectCount > 0 ? '100%' : '5%' }}
                        ></div>
                    </div>
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">{stats.shotlist.shotCount}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Total Shots</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">{(stats.shotlist.shotCount * 0.2).toFixed(0)}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Est. Minutes</div>
                        </div>
                    </div>
                </div>

                <Button variant="secondary" className="w-full justify-between group-hover:bg-purple-500/10 group-hover:text-purple-400 group-hover:border-purple-500/50" onClick={() => onNavigate('shotlist')}>
                    <span>进入脚本工作台</span>
                    <ChevronRight size={14} />
                </Button>
            </div>

            {/* Phase 3: Storyboard */}
            <div className="bg-cine-panel border border-cine-accent/50 rounded-2xl p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(214,0,28,0.1)] hover:border-cine-accent transition-all">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clapperboard size={100} />
                </div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-cine-accent flex items-center justify-center text-white shadow-lg shadow-cine-accent/30">
                        <Clapperboard size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">故事板生成</h3>
                        <span className="text-[10px] text-cine-accent font-mono">PHASE 03 (ACTIVE)</span>
                    </div>
                </div>
                
                <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>素材库资源</span>
                        <span className="text-white font-mono">{stats.storyboard.assetCount} Assets</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-cine-accent shadow-[0_0_10px_rgba(214,0,28,0.5)] transition-all duration-1000" 
                            style={{ width: stats.storyboard.imageCount > 0 ? '100%' : '5%' }}
                        ></div>
                    </div>
                     <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">{stats.storyboard.imageCount}</div>
                            <div className="text-[9px] text-zinc-500 uppercase">Generated</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-zinc-800">
                            <div className="text-2xl font-bold text-white mb-1">
                                {stats.shotlist.shotCount > 0 
                                    ? Math.max(0, stats.shotlist.shotCount - stats.storyboard.imageCount) 
                                    : '-'}
                            </div>
                            <div className="text-[9px] text-zinc-500 uppercase">Remaining</div>
                        </div>
                    </div>
                </div>

                <Button variant="accent" className="w-full justify-between" onClick={() => onNavigate('storyboard')}>
                    <span>进入故事板中心</span>
                    <ChevronRight size={14} />
                </Button>
            </div>

        </div>

        {/* Activity Feed Placeholder */}
        <div className="border-t border-zinc-800 pt-8">
            <h3 className="text-cine-text-muted text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} /> 最近动态 Activity
            </h3>
            <div className="bg-cine-panel border border-cine-border rounded-xl p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 py-2 border-b border-zinc-800/50 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-zinc-700"></div>
                        <span className="text-xs text-zinc-500 font-mono">10:4{i} AM</span>
                        <span className="text-sm text-zinc-300">System <span className="text-white">auto-saved</span> project data to local database.</span>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};
