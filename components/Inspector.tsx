
import React, { useState, useEffect } from 'react';
import { GeneratedImage, Asset } from '../types';
import { Download, Copy, Maximize2, Wand2, X, MessageSquare, Info, Link, FileText, ListVideo, RefreshCw, Check } from 'lucide-react';
import { Button } from './Button';
import { dbService } from '../services/db';

// Define localized types to avoid circular dependency issues if types.ts isn't perfect, 
// though ideally these come from types.ts or ShotListPhase.
interface ScriptProject {
  id: string;
  title: string;
}

interface Scene {
  id: string;
  scriptId: string;
  number: number;
  title: string;
}

interface ShotListProject {
  id: string;
  relatedScript: string;
  relatedScene: string;
}

interface Shot {
  id: string;
  number: string;
  size: string;
  angle: string;
  description: string;
  keyframeUrl?: string;
  order: number;
}

interface InspectorProps {
  selectedImage: GeneratedImage | null;
  selectedAsset: Asset | null;
  onClose: () => void;
  onAnalyze: (prompt: string) => void;
  isAnalyzing: boolean;
  analysisResult?: string;
}

export const Inspector: React.FC<InspectorProps> = ({ 
  selectedImage, 
  selectedAsset, 
  onClose,
  onAnalyze,
  isAnalyzing,
  analysisResult
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'analyze'>('view');
  const [analysisPrompt, setAnalysisPrompt] = useState("分析这张图片的构图、灯光和电影风格。");
  const [showFullGrid, setShowFullGrid] = useState(false);

  // --- Linked Shot List State ---
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScriptTitle, setSelectedScriptTitle] = useState('');
  const [selectedSceneName, setSelectedSceneName] = useState('');
  const [previewShots, setPreviewShots] = useState<Shot[]>([]);
  const [isLoadingShots, setIsLoadingShots] = useState(false);

  // Reset state when selection changes
  useEffect(() => {
    setShowFullGrid(false);
    setActiveTab('view');
    // We don't reset script/scene selection automatically to allow persistent context,
    // unless the user specifically wants to clear it.
  }, [selectedImage?.id, selectedAsset?.id]);

  // Load Scripts on Mount
  useEffect(() => {
      const fetchScripts = async () => {
          try {
              const data = await dbService.getAll<ScriptProject>(dbService.stores.SCRIPTS);
              setScripts(data);
          } catch (e) {
              console.error("Inspector: Failed to load scripts", e);
          }
      };
      fetchScripts();
  }, []);

  const handleScriptChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const title = e.target.value;
      setSelectedScriptTitle(title);
      setSelectedSceneName('');
      setPreviewShots([]);
      setScenes([]);

      if (!title) return;

      // Find script ID to get scenes
      const script = scripts.find(s => s.title === title);
      if (script) {
          const loadedScenes = await dbService.getByIndex<Scene>(dbService.stores.SCENES, 'scriptId', script.id);
          loadedScenes.sort((a, b) => a.number - b.number);
          setScenes(loadedScenes);
      }
  };

  const handleSceneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const sceneName = e.target.value;
      setSelectedSceneName(sceneName);
      setPreviewShots([]);

      if (!sceneName || !selectedScriptTitle) return;
      
      setIsLoadingShots(true);
      try {
          // Find the ShotListProject that matches Script + Scene
          const projects = await dbService.getAll<ShotListProject>(dbService.stores.SHOT_PROJECTS);
          const project = projects.find(p => p.relatedScript === selectedScriptTitle && p.relatedScene === sceneName);
          
          if (project) {
              const shots = await dbService.getByIndex<Shot>(dbService.stores.SHOTS, 'projectId', project.id);
              shots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              setPreviewShots(shots);
          }
      } catch (error) {
          console.error("Inspector: Failed to load linked shots", error);
      } finally {
          setIsLoadingShots(false);
      }
  };

  const activeItem = selectedImage || selectedAsset;
  
  // Determine display URL (Full grid or single slice/asset)
  const displayUrl = selectedImage 
    ? (showFullGrid && selectedImage.fullGridUrl ? selectedImage.fullGridUrl : selectedImage.url)
    : selectedAsset?.previewUrl;

  const handleLinkShot = async (shot: Shot) => {
      if (!displayUrl) return;

      // Use the single image URL for linking, prefer sliced/preview url over full grid
      const urlToLink = selectedImage ? selectedImage.url : selectedAsset?.previewUrl;

      if (!urlToLink) return;

      const updatedShot = { ...shot, keyframeUrl: urlToLink };
      
      try {
          // Update DB
          await dbService.put(dbService.stores.SHOTS, updatedShot);
          
          // Update Local State
          setPreviewShots(prev => prev.map(s => s.id === shot.id ? updatedShot : s));
      } catch (error) {
          console.error("Failed to link shot", error);
      }
  };

  if (!activeItem) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3 p-8 text-center border-l border-cine-border bg-cine-dark">
        <Info className="w-8 h-8 opacity-20" />
        <p className="font-mono text-xs uppercase tracking-widest">未选择对象 NO SELECTION</p>
        <p className="text-[10px] text-zinc-700">请选择一个素材或渲染结果以查看详情。</p>
      </div>
    );
  }

  // Current URL used for comparison
  const currentLinkUrl = selectedImage ? selectedImage.url : selectedAsset?.previewUrl;

  return (
    <div className="h-full flex flex-col border-l border-cine-border bg-cine-dark animate-in slide-in-from-right-4 duration-200 w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cine-border bg-cine-panel flex-shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-cine-text-muted text-[10px] uppercase tracking-widest font-mono">图片信息 (IMAGE INFO)</span>
            {selectedImage?.fullGridUrl && (
                <span className="bg-cine-accent/10 text-cine-accent text-[9px] px-1.5 py-0.5 rounded border border-cine-accent/20">GRID 源图</span>
            )}
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={14} />
        </button>
      </div>

      {/* Main Preview Area (Big Picture) */}
      <div className="relative aspect-video bg-black border-b border-cine-border flex items-center justify-center overflow-hidden group flex-shrink-0">
         {displayUrl && (
             <img src={displayUrl} alt="Inspector View" className="max-w-full max-h-full object-contain" />
         )}
         
         {/* Grid Toggle Overlay */}
         {selectedImage?.fullGridUrl && (
             <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={() => setShowFullGrid(!showFullGrid)}
                    className="bg-black/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded border border-zinc-700 hover:border-cine-accent flex items-center gap-1"
                 >
                    <Maximize2 size={10} />
                    {showFullGrid ? "查看单帧" : "查看完整 Grid"}
                 </button>
             </div>
         )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cine-border flex-shrink-0">
          <button 
            onClick={() => setActiveTab('view')}
            className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-wider transition-colors ${activeTab === 'view' ? 'text-cine-accent border-b-2 border-cine-accent bg-cine-accent/5' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            详情 DETAILS
          </button>
          <button 
            onClick={() => setActiveTab('analyze')}
            className={`flex-1 py-3 text-[10px] font-mono uppercase tracking-wider transition-colors ${activeTab === 'analyze' ? 'text-cine-accent border-b-2 border-cine-accent bg-cine-accent/5' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            AI 智能分析
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20">
        
        {activeTab === 'view' && (
            <div className="p-5 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Metadata */}
                <div className="space-y-3">
                    <h3 className="text-cine-text-muted text-xs font-bold uppercase tracking-wide">元数据</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-mono text-zinc-500">
                        <div className="flex flex-col">
                            <span className="uppercase text-zinc-600 mb-0.5">类型</span>
                            <span className="text-zinc-300">{selectedImage ? '渲染图' : '参考素材'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="uppercase text-zinc-600 mb-0.5">格式</span>
                            <span className="text-zinc-300">
                                {selectedImage ? selectedImage.aspectRatio : 'Original'}
                            </span>
                        </div>
                        <div className="flex flex-col col-span-2">
                            <span className="uppercase text-zinc-600 mb-0.5">ID</span>
                            <span className="text-zinc-300 truncate font-mono select-all">{activeItem.id}</span>
                        </div>
                    </div>
                </div>

                {/* Prompt Section */}
                {selectedImage && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                             <h3 className="text-cine-text-muted text-xs font-bold uppercase tracking-wide">提示词</h3>
                             <button 
                                onClick={() => navigator.clipboard.writeText(selectedImage.prompt)}
                                className="text-zinc-500 hover:text-cine-accent transition-colors"
                             >
                                 <Copy size={12} />
                             </button>
                        </div>
                        <div className="p-3 bg-black border border-cine-border rounded-lg">
                            <p className="text-zinc-400 text-xs leading-relaxed font-mono">{selectedImage.prompt}</p>
                        </div>
                    </div>
                )}
                
                {/* Linked Shot List Section (NEW) */}
                <div className="space-y-3 pt-4 border-t border-cine-border">
                    <div className="flex items-center gap-2">
                        <Link size={12} className="text-cine-accent" />
                        <h3 className="text-cine-text-muted text-xs font-bold uppercase tracking-wide">关联分镜表 (LINKED SHOT LIST)</h3>
                    </div>
                    
                    {/* Selectors */}
                    <div className="grid grid-cols-2 gap-2">
                         <div className="space-y-1">
                             <label className="text-[9px] text-zinc-600 font-bold uppercase">剧本 Script</label>
                             <select 
                                value={selectedScriptTitle}
                                onChange={handleScriptChange}
                                className="w-full bg-black border border-cine-border rounded px-2 py-1.5 text-[10px] text-zinc-300 focus:border-cine-accent outline-none"
                             >
                                 <option value="">选择剧本...</option>
                                 {scripts.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
                             </select>
                         </div>
                         <div className="space-y-1">
                             <label className="text-[9px] text-zinc-600 font-bold uppercase">场次 Scene</label>
                             <select 
                                value={selectedSceneName}
                                onChange={handleSceneChange}
                                disabled={!selectedScriptTitle}
                                className="w-full bg-black border border-cine-border rounded px-2 py-1.5 text-[10px] text-zinc-300 focus:border-cine-accent outline-none disabled:opacity-50"
                             >
                                 <option value="">选择场次...</option>
                                 {scenes.map(s => <option key={s.id} value={`场 ${s.number} - ${s.title}`}>{`场 ${s.number} - ${s.title}`}</option>)}
                             </select>
                         </div>
                    </div>

                    {/* Read-only Preview Table */}
                    <div className="bg-black/40 border border-zinc-800 rounded-lg overflow-hidden min-h-[100px]">
                        {isLoadingShots ? (
                            <div className="p-4 flex justify-center text-zinc-600 text-[10px]">
                                <RefreshCw size={14} className="animate-spin mr-2"/> 加载分镜表...
                            </div>
                        ) : previewShots.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-900/50 text-[9px] text-zinc-500 uppercase font-mono">
                                    <tr>
                                        <th className="p-2 border-b border-zinc-800 font-medium">#</th>
                                        <th className="p-2 border-b border-zinc-800 font-medium w-16">画面</th>
                                        <th className="p-2 border-b border-zinc-800 font-medium">描述</th>
                                        <th className="p-2 border-b border-zinc-800 font-medium text-center w-20">关联 (Link)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[10px] text-zinc-300">
                                    {previewShots.map((shot, idx) => {
                                        const isLinked = currentLinkUrl && shot.keyframeUrl === currentLinkUrl;
                                        return (
                                            <tr key={shot.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-white/5 transition-colors">
                                                <td className="p-2 font-mono text-zinc-500 align-middle">{shot.number || idx + 1}</td>
                                                <td className="p-2 text-zinc-400 font-mono text-[9px] align-middle">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span>{shot.size}</span>
                                                        <span>{shot.angle}</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 leading-relaxed opacity-90 align-middle max-w-[120px]">
                                                    {shot.description || '无描述'}
                                                </td>
                                                <td className="p-2 align-middle text-center">
                                                    {isLinked ? (
                                                        <div className="flex items-center justify-center gap-1 text-[9px] text-cine-accent font-bold bg-cine-accent/10 py-1 rounded border border-cine-accent/30">
                                                            <Check size={10} /> 已关联
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => handleLinkShot(shot)}
                                                            className="w-full h-6 text-[9px] px-1 hover:border-cine-accent hover:text-white"
                                                        >
                                                            确认关联
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-6 flex flex-col items-center justify-center text-zinc-600 gap-2">
                                <ListVideo size={16} className="opacity-20" />
                                <span className="text-[9px] font-mono uppercase">暂无关联数据</span>
                                <span className="text-[8px] text-zinc-700 text-center px-4">请在上方选择对应的剧本与场次以预览分镜表</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                     <a 
                        href={displayUrl} 
                        download={`cinescout-${activeItem.id}.png`}
                        className="flex-1"
                     >
                         <Button variant="secondary" size="sm" className="w-full gap-2 border-cine-border hover:border-cine-accent/50 text-zinc-400 hover:text-white">
                             <Download size={12} /> 下载文件
                         </Button>
                     </a>
                </div>
            </div>
        )}

        {activeTab === 'analyze' && (
             <div className="p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-full flex flex-col">
                <div className="space-y-2 flex-shrink-0">
                    <label className="text-cine-text-muted text-xs font-bold uppercase tracking-wide">指令</label>
                    <textarea 
                        value={analysisPrompt}
                        onChange={(e) => setAnalysisPrompt(e.target.value)}
                        className="w-full bg-black border border-cine-border rounded-lg p-3 text-xs text-zinc-300 focus:border-cine-accent focus:ring-0 resize-none font-mono min-h-[80px]"
                        placeholder="询问 Gemini 对这张图片的分析..."
                    />
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-full gap-2 bg-cine-panel hover:bg-zinc-800 border border-cine-border"
                        onClick={() => onAnalyze(analysisPrompt)}
                        disabled={isAnalyzing}
                    >
                         {isAnalyzing ? <Wand2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
                         {isAnalyzing ? '分析中...' : '运行智能分析'}
                    </Button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col space-y-2">
                    <label className="text-cine-text-muted text-xs font-bold uppercase tracking-wide">分析结果</label>
                    <div className="flex-1 bg-black border border-cine-border rounded-lg p-4 overflow-y-auto custom-scrollbar">
                        {analysisResult ? (
                            <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{analysisResult}</p>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                                <Sparkles size={16} className="opacity-20" />
                                <span className="text-[10px] font-mono">AI 分析结果将显示在此处</span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

// Simple icon for placeholder
const Sparkles = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
);
