
import React, { useState, useEffect, useRef } from 'react';
import { 
  ListVideo, Filter, Plus, Search, MoreHorizontal, 
  ArrowLeft, Calendar, User, MapPin, Image as ImageIcon, 
  Trash2, Settings, ChevronDown, Clapperboard, Sparkles, X, Wand2,
  ListPlus, Upload, Check, Grid, LayoutGrid, Table as TableIcon,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from './Button';
import { breakdownScriptToShots, fileToBase64 } from '../services/geminiService';
import { dbService } from '../services/db';
import { GeneratedImage } from '../types';

// --- Types ---

interface ShotListProject {
  id: string;
  title: string;
  relatedScript: string;
  relatedScene: string;
  director: string;
  date: string;
  shotCount: number;
}

interface Shot {
  id: string;
  projectId: string; // Foreign Key for DB
  number: string; // 1A, 1B etc.
  order: number;  // Sort order
  size: string;   // MCU, WS
  angle: string;  // Eye-level
  movement: string; // Pan, Tilt
  description: string;
  dialogue: string;
  characters: string;
  sceneElement: string; // Props or specific set details
  keyframeUrl?: string; // Link to Storyboard image
}

// Interfaces duplicated from ScriptPhase to ensure type safety when fetching
interface ScriptProject {
  id: string;
  title: string;
  summary: string;
  lastModified: string;
}

interface Scene {
  id: string;
  scriptId: string;
  number: number;
  intExt: '内' | '外';
  location: string;
  time: '日' | '夜' | '黄昏' | '黎明';
  title: string;
  content: string;
}

export const ShotListPhase: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  // Sub-view for Editor: Table vs Board
  const [editorMode, setEditorMode] = useState<'table' | 'board'>('table');
  
  const [projects, setProjects] = useState<ShotListProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  
  // Real Data State for Modal
  const [allScripts, setAllScripts] = useState<ScriptProject[]>([]);
  const [availableScenes, setAvailableScenes] = useState<Scene[]>([]);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
      script: '',
      scene: '',
      director: ''
  });

  // AI Modal State
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('请根据以下故事章节的内容创建分镜头列表，注意同一个拍摄场景的摄影机、人物的位置和朝向需要保持一致性，以下是故事内容：');
  const [aiScriptContent, setAiScriptContent] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Keyframe Selection Modal State
  const [showKeyframeModal, setShowKeyframeModal] = useState(false);
  const [activeShotIdForImage, setActiveShotIdForImage] = useState<string | null>(null);
  const [storyboardImages, setStoryboardImages] = useState<GeneratedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  // --- DB Effects ---

  // 1. Load Projects and Scripts on Mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load Shot Projects
        const loadedProjects = await dbService.getAll<ShotListProject>(dbService.stores.SHOT_PROJECTS);
        loadedProjects.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setProjects(loadedProjects);

        // Load Scripts (for dropdown)
        const loadedScripts = await dbService.getAll<ScriptProject>(dbService.stores.SCRIPTS);
        loadedScripts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        setAllScripts(loadedScripts);

      } catch (e) {
        console.error("Failed to load data", e);
      }
    };
    loadData();
  }, []);

  // 2. Load Shots when entering a project
  useEffect(() => {
    if (view === 'editor' && activeProjectId) {
      const loadShots = async () => {
        try {
          const loadedShots = await dbService.getByIndex<Shot>(
            dbService.stores.SHOTS, 
            'projectId', 
            activeProjectId
          );
          // Sort by order field if it exists, otherwise fallback to index/creation
          loadedShots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setShots(loadedShots);
        } catch (e) {
          console.error("Failed to load shots", e);
        }
      };
      loadShots();
    }
  }, [view, activeProjectId]);

  // --- Handlers ---

  const handleOpenCreate = () => {
      setNewProjectForm({ script: '', scene: '', director: '' });
      setAvailableScenes([]); // Reset scenes
      setShowCreateModal(true);
  };

  const handleScriptSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const scriptTitle = e.target.value;
    setNewProjectForm(prev => ({ ...prev, script: scriptTitle, scene: '' }));
    
    const script = allScripts.find(s => s.title === scriptTitle);
    if (script) {
        try {
            const scenes = await dbService.getByIndex<Scene>(dbService.stores.SCENES, 'scriptId', script.id);
            scenes.sort((a, b) => a.number - b.number);
            setAvailableScenes(scenes);
        } catch (error) {
            console.error("Failed to fetch scenes", error);
            setAvailableScenes([]);
        }
    } else {
        setAvailableScenes([]);
    }
  };

  const handleCreateProject = async () => {
      // Must have script and scene selected
      if (!newProjectForm.script || !newProjectForm.scene) return;
      
      // Auto-generate title from script and scene
      const autoTitle = `${newProjectForm.script} - ${newProjectForm.scene}`;

      const newProject: ShotListProject = {
          id: crypto.randomUUID(),
          title: autoTitle,
          relatedScript: newProjectForm.script,
          relatedScene: newProjectForm.scene,
          director: newProjectForm.director || 'Unknown',
          date: new Date().toISOString().split('T')[0],
          shotCount: 0
      };

      // DB Save
      await dbService.put(dbService.stores.SHOT_PROJECTS, newProject);

      setProjects([newProject, ...projects]);
      setShowCreateModal(false);
      
      // Auto enter editor
      setActiveProjectId(newProject.id);
      setShots([]); 
      setView('editor');
      setEditorMode('table');
  };

  const handleEnterProject = (project: ShotListProject) => {
      setActiveProjectId(project.id);
      setView('editor');
      setEditorMode('table');
  };

  const handleAddShot = async () => {
      if (!activeProjectId) return;
      const newShot: Shot = {
          id: crypto.randomUUID(),
          projectId: activeProjectId,
          number: (shots.length + 1).toString(),
          order: shots.length, // Append to end
          size: '',
          angle: '',
          movement: '',
          description: '',
          dialogue: '',
          characters: '',
          sceneElement: '',
          keyframeUrl: ''
      };

      // DB Save
      await dbService.put(dbService.stores.SHOTS, newShot);
      
      // Update Project Shot Count
      const updatedProject = { ...activeProject!, shotCount: shots.length + 1 };
      await dbService.put(dbService.stores.SHOT_PROJECTS, updatedProject);
      setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));

      setShots([...shots, newShot]);
  };

  const handleInsertShot = async (index: number) => {
      if (!activeProjectId) return;

      const newShot: Shot = {
          id: crypto.randomUUID(),
          projectId: activeProjectId,
          number: '', // User to fill
          order: 0, // Placeholder
          size: '',
          angle: '',
          movement: '',
          description: '',
          dialogue: '',
          characters: '',
          sceneElement: '',
          keyframeUrl: ''
      };

      const newShots = [...shots];
      // Insert after the current index
      newShots.splice(index + 1, 0, newShot);

      // Re-calculate order for everyone
      const reorderedShots = newShots.map((s, idx) => ({ ...s, order: idx }));
      setShots(reorderedShots);

      // Batch Update DB
      for (const s of reorderedShots) {
          await dbService.put(dbService.stores.SHOTS, s);
      }
      
      // Update Project Count
      const updatedProject = { ...activeProject!, shotCount: reorderedShots.length };
      await dbService.put(dbService.stores.SHOT_PROJECTS, updatedProject);
      setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
  };

  const updateShot = async (id: string, field: keyof Shot, value: string) => {
      const updatedShots = shots.map(s => s.id === id ? { ...s, [field]: value } : s);
      setShots(updatedShots);

      const shotToUpdate = updatedShots.find(s => s.id === id);
      if (shotToUpdate) {
          await dbService.put(dbService.stores.SHOTS, shotToUpdate);
      }
  };

  const handleMoveShot = async (index: number, direction: 'prev' | 'next') => {
      if (direction === 'prev' && index === 0) return;
      if (direction === 'next' && index === shots.length - 1) return;

      const newShots = [...shots];
      const targetIndex = direction === 'prev' ? index - 1 : index + 1;
      
      // Swap
      [newShots[index], newShots[targetIndex]] = [newShots[targetIndex], newShots[index]];
      
      // Re-order
      const reorderedShots = newShots.map((s, idx) => ({ ...s, order: idx }));
      setShots(reorderedShots);

      // DB Update
      for (const s of reorderedShots) {
          await dbService.put(dbService.stores.SHOTS, s);
      }
  };

  // --- Keyframe Logic ---

  const handleOpenKeyframeModal = async (shotId: string) => {
      setActiveShotIdForImage(shotId);
      try {
          // Load images for the gallery picker
          const imgs = await dbService.getAll<GeneratedImage>(dbService.stores.IMAGES);
          setStoryboardImages(imgs.sort((a,b) => b.timestamp - a.timestamp));
          setShowKeyframeModal(true);
      } catch (e) {
          console.error("Failed to load gallery images", e);
      }
  };

  const handleSelectKeyframe = async (url: string) => {
      if (!activeShotIdForImage) return;
      await updateShot(activeShotIdForImage, 'keyframeUrl', url);
      setShowKeyframeModal(false);
      setActiveShotIdForImage(null);
  };

  const handleUploadKeyframe = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && activeShotIdForImage) {
          const file = e.target.files[0];
          try {
              const base64 = await fileToBase64(file);
              const dataUrl = `data:${file.type};base64,${base64}`;
              await updateShot(activeShotIdForImage, 'keyframeUrl', dataUrl);
              setShowKeyframeModal(false);
          } catch (err) {
              console.error("Upload failed", err);
          }
      }
  };

  const handleDeleteShot = async (id: string) => {
      await dbService.delete(dbService.stores.SHOTS, id);
      
      const remainingShots = shots.filter(s => s.id !== id);
      
      // Re-order remaining shots to close the gap
      const reorderedShots = remainingShots.map((s, idx) => ({ ...s, order: idx }));
      setShots(reorderedShots);

      // Update DB for reordered
      for (const s of reorderedShots) {
          await dbService.put(dbService.stores.SHOTS, s);
      }
      
      if (activeProjectId) {
         const updatedProject = { ...activeProject!, shotCount: reorderedShots.length };
         await dbService.put(dbService.stores.SHOT_PROJECTS, updatedProject);
         setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));
      }
  };

  // AI Handlers
  const handleOpenAIModal = async () => {
      // Auto-fill logic
      if (activeProject && activeProject.relatedScript !== '未关联' && activeProject.relatedScene !== '未关联') {
          try {
              // Find script by title (Using title is not ideal but matches current architecture)
              const script = allScripts.find(s => s.title === activeProject.relatedScript);
              if (script) {
                  // Fetch scenes
                  const scenes = await dbService.getByIndex<Scene>(dbService.stores.SCENES, 'scriptId', script.id);
                  // Find scene. The format stored in relatedScene is "场 {number} - {title}"
                  const scene = scenes.find(s => {
                      const val = `场 ${s.number} - ${s.title}`;
                      return val === activeProject.relatedScene;
                  });
                  
                  if (scene) {
                      setAiScriptContent(scene.content || '');
                  } else {
                      // Fallback: match just by number if title changed
                      const match = activeProject.relatedScene.match(/场 (\d+)/);
                      if (match) {
                          const num = parseInt(match[1]);
                          const fallbackScene = scenes.find(s => s.number === num);
                          if (fallbackScene) setAiScriptContent(fallbackScene.content || '');
                      }
                  }
              }
          } catch (e) {
              console.error("Auto-fetch content failed", e);
          }
      }
      setShowAIModal(true);
  };

  const handleAIGenerate = async () => {
      if (!aiScriptContent.trim() || !activeProjectId) return;
      
      setIsProcessingAI(true);
      try {
          const generatedShots = await breakdownScriptToShots(aiPrompt, aiScriptContent);
          
          // Map response to Shot interface
          const currentLength = shots.length;
          const newShots: Shot[] = generatedShots.map((s: any, idx: number) => ({
              id: crypto.randomUUID(),
              projectId: activeProjectId,
              number: s.number || '',
              order: currentLength + idx,
              size: s.size || '',
              angle: s.angle || '',
              movement: s.movement || '',
              description: s.description || '',
              dialogue: s.dialogue || '',
              characters: s.characters || '',
              sceneElement: s.sceneElement || '',
              keyframeUrl: ''
          }));
          
          // DB Bulk Insert
          for (const s of newShots) {
              await dbService.put(dbService.stores.SHOTS, s);
          }
          
          // Update Count
          const updatedProject = { ...activeProject!, shotCount: shots.length + newShots.length };
          await dbService.put(dbService.stores.SHOT_PROJECTS, updatedProject);
          setProjects(prev => prev.map(p => p.id === activeProjectId ? updatedProject : p));

          setShots(prev => [...prev, ...newShots]);
          setShowAIModal(false);
          setAiScriptContent(''); 
      } catch (error) {
          console.error("Failed to breakdown script", error);
          alert("AI 拆解失败，请检查 API Key 或重试。");
      } finally {
          setIsProcessingAI(false);
      }
  };

  // --- Render: List View ---
  if (view === 'list') {
      return (
        <div className="flex flex-col h-full w-full bg-cine-black text-zinc-300 font-sans relative">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-cine-border bg-cine-dark flex-shrink-0">
                <span className="text-cine-text-muted text-xs font-bold uppercase tracking-widest">镜头拆解表 (SHOT LIST)</span>
                <div className="flex gap-3">
                     <div className="relative">
                         <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
                         <input className="bg-zinc-900 border border-cine-border rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-300 focus:border-cine-accent outline-none w-48 transition-all" placeholder="搜索项目..." />
                     </div>
                     <Button variant="accent" size="sm" onClick={handleOpenCreate} className="gap-2">
                        <Plus size={14} /> 新建拆解
                     </Button>
                </div>
            </div>

            {/* Project Grid */}
            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.map(project => (
                        <div 
                            key={project.id}
                            onClick={() => handleEnterProject(project)}
                            className="bg-cine-panel border border-cine-border rounded-xl p-5 cursor-pointer hover:border-cine-accent/50 hover:bg-zinc-900/50 hover:-translate-y-1 transition-all group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-10 h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-cine-accent transition-colors">
                                    <ListVideo size={20} />
                                </div>
                                <button className="text-zinc-600 hover:text-white transition-colors p-1"><MoreHorizontal size={16}/></button>
                            </div>
                            
                            <h3 className="text-sm font-bold text-zinc-200 mb-1 truncate" title={project.title}>{project.title}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-4">
                                <span className="bg-zinc-800/50 px-1.5 py-0.5 rounded border border-zinc-800 truncate max-w-[100px]">{project.relatedScript}</span>
                                <span className="text-zinc-600">•</span>
                                <span>{project.shotCount} Shots</span>
                            </div>

                            <div className="space-y-2 border-t border-zinc-800/50 pt-3">
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Clapperboard size={12} className="text-zinc-600"/>
                                    <span className="truncate">{project.relatedScene}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <User size={12} className="text-zinc-600"/>
                                    <span>{project.director}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                    <Calendar size={12} className="text-zinc-600"/>
                                    <span>{project.date}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Add New Card (Visual) */}
                    <button 
                        onClick={handleOpenCreate}
                        className="border border-dashed border-zinc-800 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-cine-accent hover:border-cine-accent/30 hover:bg-cine-accent/5 transition-all"
                    >
                        <Plus size={32} />
                        <span className="text-xs font-bold uppercase tracking-wider">Create New List</span>
                    </button>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-cine-panel rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl border border-cine-border scale-100 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                            <h3 className="text-lg font-bold text-white">新建镜头表项目</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-zinc-500 hover:text-white"><Settings size={18}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Project Title Input REMOVED - Auto Generated */}

                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">关联剧本 Script</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full appearance-none bg-zinc-900 border border-cine-border rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-cine-accent outline-none"
                                            value={newProjectForm.script}
                                            onChange={handleScriptSelect}
                                        >
                                            <option value="">选择剧本...</option>
                                            {allScripts.map(s => <option key={s.id} value={s.title}>{s.title}</option>)}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-zinc-500 font-bold uppercase">关联场次 Scene</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full appearance-none bg-zinc-900 border border-cine-border rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-cine-accent outline-none"
                                            value={newProjectForm.scene}
                                            onChange={(e) => setNewProjectForm({...newProjectForm, scene: e.target.value})}
                                            disabled={availableScenes.length === 0}
                                        >
                                            <option value="">{availableScenes.length > 0 ? '选择场次...' : '无可用场次'}</option>
                                            {availableScenes.map(s => (
                                                <option key={s.id} value={`场 ${s.number} - ${s.title}`}>
                                                    场 {s.number} - {s.title || '无标题'} ({s.location}/{s.time})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-2 top-2.5 text-zinc-500 pointer-events-none"/>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase">导演/摄影 Director/DoP</label>
                                <input 
                                    className="w-full bg-zinc-900 border border-cine-border rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-cine-accent outline-none" 
                                    placeholder="Optional"
                                    value={newProjectForm.director}
                                    onChange={(e) => setNewProjectForm({...newProjectForm, director: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>取消</Button>
                            <Button variant="accent" onClick={handleCreateProject} disabled={!newProjectForm.script || !newProjectForm.scene}>创建项目</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- Render: Editor View ---
  return (
    <div className="flex flex-col h-full w-full bg-cine-black text-zinc-300 font-sans relative">
        {/* Editor Header */}
        <div className="h-14 bg-cine-dark border-b border-cine-border flex items-center justify-between px-6 flex-shrink-0 z-10">
             <div className="flex items-center gap-4">
                 <button onClick={() => setView('list')} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                     <ArrowLeft size={18} />
                 </button>
                 <div className="h-6 w-px bg-zinc-800 mx-1"></div>
                 <div>
                     <h2 className="text-sm font-bold text-zinc-200">{activeProject?.title}</h2>
                     <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                         <span className="text-cine-accent">{activeProject?.relatedScript}</span>
                         <span>/</span>
                         <span>{activeProject?.relatedScene}</span>
                     </div>
                 </div>
             </div>

             {/* Center Tools: View Switcher */}
             <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                <button 
                    onClick={() => setEditorMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                        editorMode === 'table' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <TableIcon size={12} /> 表格 Table
                </button>
                <button 
                    onClick={() => setEditorMode('board')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${
                        editorMode === 'board' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <LayoutGrid size={12} /> 故事板 Board
                </button>
             </div>

             <div className="flex gap-2">
                 <Button 
                    variant="accent" 
                    size="sm" 
                    onClick={handleOpenAIModal}
                    className="bg-gradient-to-r from-purple-900/50 to-cine-accent/50 border border-purple-500/30 text-purple-100 hover:text-white"
                >
                    <Sparkles size={14} className="mr-1.5"/> AI 智能拆解脚本
                 </Button>
                 <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white border border-zinc-800"><Settings size={14} className="mr-1"/> 设置</Button>
                 <Button variant="accent" size="sm" onClick={() => {}} className="bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700">导出 PDF</Button>
             </div>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-black/20">
            {editorMode === 'table' ? (
                // --- TABLE VIEW ---
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-cine-panel text-[10px] uppercase text-zinc-500 font-mono font-bold sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="p-3 border-b border-cine-border border-r border-zinc-800/50 w-12 text-center">#</th>
                            <th className="p-3 border-b border-cine-border border-r border-zinc-800/50 w-40">镜头参数 (Specs)</th>
                            <th className="p-3 border-b border-cine-border border-r border-zinc-800/50 w-64">镜头描述 (Description)</th>
                            <th className="p-3 border-b border-cine-border border-r border-zinc-800/50 w-48">台词 (Dialogue)</th>
                            <th className="p-3 border-b border-cine-border border-r border-zinc-800/50 w-32">角色/场景</th>
                            <th className="p-3 border-b border-cine-border w-40 text-center">分镜关键帧 (Keyframe)</th>
                            <th className="p-3 border-b border-cine-border w-16 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs text-zinc-300">
                        {shots.map((shot, index) => (
                            <tr key={shot.id} className="group border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                {/* Number */}
                                <td className="p-2 border-r border-zinc-800/50 text-center font-mono text-zinc-500 group-hover:text-white">
                                    <input 
                                        value={shot.number} 
                                        onChange={(e) => updateShot(shot.id, 'number', e.target.value)}
                                        className="w-full text-center bg-transparent focus:text-cine-accent outline-none font-bold"
                                    />
                                </td>

                                {/* Specs (Combined) */}
                                <td className="p-2 border-r border-zinc-800/50 align-top">
                                    <div className="flex flex-col gap-1.5">
                                        <input 
                                            value={shot.size} 
                                            onChange={(e) => updateShot(shot.id, 'size', e.target.value)}
                                            placeholder="景别 (Size)" 
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] focus:border-cine-accent outline-none text-center font-mono"
                                        />
                                        <input 
                                            value={shot.angle} 
                                            onChange={(e) => updateShot(shot.id, 'angle', e.target.value)}
                                            placeholder="机位 (Angle)" 
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] focus:border-cine-accent outline-none text-center font-mono"
                                        />
                                        <input 
                                            value={shot.movement} 
                                            onChange={(e) => updateShot(shot.id, 'movement', e.target.value)}
                                            placeholder="运镜 (Move)" 
                                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1 text-[10px] focus:border-cine-accent outline-none text-center font-mono"
                                        />
                                    </div>
                                </td>

                                {/* Description */}
                                <td className="p-2 border-r border-zinc-800/50 align-top">
                                    <textarea 
                                        value={shot.description}
                                        onChange={(e) => updateShot(shot.id, 'description', e.target.value)}
                                        className="w-full h-20 bg-transparent resize-none outline-none placeholder:text-zinc-700 leading-relaxed custom-scrollbar"
                                        placeholder="输入画面描述..."
                                    />
                                </td>

                                {/* Dialogue */}
                                <td className="p-2 border-r border-zinc-800/50 align-top">
                                    <textarea 
                                        value={shot.dialogue}
                                        onChange={(e) => updateShot(shot.id, 'dialogue', e.target.value)}
                                        className="w-full h-20 bg-transparent resize-none outline-none placeholder:text-zinc-700 leading-relaxed text-cine-text-muted italic custom-scrollbar"
                                        placeholder="台词内容..."
                                    />
                                </td>

                                {/* Cast/Scene */}
                                <td className="p-2 border-r border-zinc-800/50 align-top">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-1">
                                            <User size={10} className="text-zinc-600"/>
                                            <input 
                                                value={shot.characters}
                                                onChange={(e) => updateShot(shot.id, 'characters', e.target.value)}
                                                className="flex-1 bg-transparent border-b border-zinc-800 focus:border-cine-accent outline-none text-[10px]"
                                                placeholder="角色"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin size={10} className="text-zinc-600"/>
                                            <input 
                                                value={shot.sceneElement}
                                                onChange={(e) => updateShot(shot.id, 'sceneElement', e.target.value)}
                                                className="flex-1 bg-transparent border-b border-zinc-800 focus:border-cine-accent outline-none text-[10px]"
                                                placeholder="场景/道具"
                                            />
                                        </div>
                                    </div>
                                </td>

                                {/* Keyframe Image Slot */}
                                <td className="p-2 border-r border-zinc-800/50 align-middle">
                                    <div 
                                        onClick={() => handleOpenKeyframeModal(shot.id)}
                                        className="w-32 aspect-video bg-black border border-dashed border-zinc-800 rounded-lg mx-auto flex items-center justify-center cursor-pointer hover:border-cine-accent hover:bg-cine-accent/5 transition-all group/img relative overflow-hidden"
                                    >
                                        {shot.keyframeUrl ? (
                                            <img src={shot.keyframeUrl} className="w-full h-full object-cover" alt="Keyframe" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-zinc-600 group-hover/img:text-cine-accent">
                                                <ImageIcon size={16} />
                                                <span className="text-[9px] uppercase font-bold">关联/上传</span>
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="p-2 align-middle text-center">
                                    <div className="flex flex-col gap-2 items-center justify-center">
                                        <button 
                                            onClick={() => handleInsertShot(index)}
                                            className="p-1.5 text-zinc-500 hover:text-cine-accent hover:bg-cine-accent/10 rounded transition-colors"
                                            title="在下方插入新镜头 (Insert Shot Below)"
                                        >
                                            <ListPlus size={14} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteShot(shot.id)}
                                            className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                            title="删除 (Delete)"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        
                        {/* Add Button Row */}
                        <tr>
                            <td colSpan={7} className="p-2">
                                <button 
                                    onClick={handleAddShot}
                                    className="w-full py-3 border border-dashed border-zinc-800 rounded-lg text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
                                >
                                    <Plus size={14} /> Add New Shot at End
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            ) : (
                // --- BOARD VIEW ---
                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {shots.map((shot, index) => (
                            <div key={shot.id} className="group bg-cine-panel border border-cine-border rounded-xl overflow-hidden hover:border-cine-accent/50 transition-all hover:shadow-lg flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-black/20">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-cine-accent font-mono">#{shot.number}</span>
                                        <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                            {shot.size || 'SIZE'}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                            {shot.angle || 'ANGLE'}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteShot(shot.id)}
                                        className="text-zinc-600 hover:text-red-500 transition-colors"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                                
                                {/* Image Area */}
                                <div 
                                    className="aspect-video w-full bg-black relative group/img cursor-pointer"
                                    onClick={() => handleOpenKeyframeModal(shot.id)}
                                >
                                    {shot.keyframeUrl ? (
                                        <img src={shot.keyframeUrl} className="w-full h-full object-cover" alt="shot"/>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                                            <ImageIcon size={24} className="opacity-20"/>
                                            <span className="text-[10px] uppercase font-bold tracking-widest">Link Image</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-xs font-bold border border-white/50 px-3 py-1 rounded-full backdrop-blur-sm">更换图片 Change</span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-3 flex-1 flex flex-col gap-2">
                                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-3 min-h-[3rem]">
                                        {shot.description || <span className="text-zinc-600 italic">No description...</span>}
                                    </p>
                                    {shot.dialogue && (
                                        <p className="text-[10px] text-zinc-500 italic border-l-2 border-zinc-700 pl-2 line-clamp-2">
                                            "{shot.dialogue}"
                                        </p>
                                    )}
                                </div>

                                {/* Footer / Ordering */}
                                <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/30 flex justify-between items-center">
                                    <button 
                                        onClick={() => handleMoveShot(index, 'prev')}
                                        disabled={index === 0}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                        title="向前移动"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-[9px] text-zinc-600 font-mono">SEQ: {index + 1}</span>
                                    <button 
                                        onClick={() => handleMoveShot(index, 'next')}
                                        disabled={index === shots.length - 1}
                                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                                        title="向后移动"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card */}
                        <button 
                            onClick={handleAddShot}
                            className="aspect-video rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-3 text-zinc-600 hover:text-cine-accent hover:border-cine-accent/50 hover:bg-cine-accent/5 transition-all"
                        >
                            <Plus size={32} />
                            <span className="text-xs font-bold uppercase tracking-wider">Add Shot</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Keyframe Selection Modal */}
        {showKeyframeModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-cine-panel rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-2xl border border-cine-border scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4 flex-shrink-0">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImageIcon size={18} className="text-cine-accent"/> 关联关键帧图像
                        </h3>
                        <button onClick={() => setShowKeyframeModal(false)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                        {/* Section 1: Upload */}
                        <div className="col-span-1 border-r border-zinc-800 pr-6 flex flex-col gap-4">
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Upload size={14} /> 本地上传
                            </h4>
                            <div 
                                className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-cine-accent hover:bg-cine-accent/5 transition-all group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    hidden 
                                    accept="image/*"
                                    onChange={handleUploadKeyframe}
                                />
                                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={24} className="text-zinc-500 group-hover:text-cine-accent"/>
                                </div>
                                <span className="text-xs text-zinc-500 font-medium group-hover:text-zinc-300">点击上传图片</span>
                            </div>
                        </div>

                        {/* Section 2: Select from Storyboard */}
                        <div className="col-span-2 flex flex-col gap-4 min-h-0">
                             <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Grid size={14} /> 从故事板选择 (Generated Images)
                            </h4>
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/30 rounded-xl border border-zinc-800 p-4">
                                {storyboardImages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                                        <Clapperboard size={32} className="opacity-20"/>
                                        <p className="text-xs">暂无生成的故事板图片</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3">
                                        {storyboardImages.map(img => (
                                            <div 
                                                key={img.id}
                                                onClick={() => handleSelectKeyframe(img.url)}
                                                className="aspect-video bg-black rounded-lg border border-zinc-800 overflow-hidden cursor-pointer hover:border-cine-accent hover:ring-2 hover:ring-cine-accent/50 transition-all relative group"
                                            >
                                                <img src={img.url} className="w-full h-full object-cover" alt="storyboard" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <Check size={24} className="text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* AI Breakdown Modal */}
        {showAIModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-cine-panel rounded-2xl w-full max-w-2xl p-6 space-y-6 shadow-2xl border border-cine-border scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-4 flex-shrink-0">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Sparkles size={18} className="text-purple-400"/> AI 智能脚本拆解
                        </h3>
                        <button onClick={() => setShowAIModal(false)} className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-800 rounded-full transition-colors"><X size={20} /></button>
                    </div>

                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                         <div className="bg-purple-900/10 border border-purple-500/20 p-4 rounded-xl text-xs text-purple-200/80 leading-relaxed">
                            <span className="font-bold text-purple-400">智能助手：</span> 我将根据您提供的剧本内容，自动分析并生成专业的分镜头列表，包含景别、运镜、画面描述等信息。
                         </div>

                         <div className="space-y-2">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">AI 提示词 (Prompt)</label>
                            <textarea 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full bg-zinc-900 border border-cine-border rounded-lg p-3 text-xs text-zinc-300 focus:border-cine-accent outline-none resize-none h-20 placeholder:text-zinc-700"
                            />
                         </div>

                         <div className="space-y-2 flex-1 flex flex-col">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">剧本内容 (Script Content)</label>
                            <textarea 
                                value={aiScriptContent}
                                onChange={(e) => setAiScriptContent(e.target.value)}
                                className="w-full bg-zinc-900 border border-cine-border rounded-lg p-3 text-sm text-zinc-200 focus:border-cine-accent outline-none resize-none min-h-[200px] flex-1 font-mono leading-relaxed placeholder:text-zinc-700"
                                placeholder="请在此粘贴需要拆解的剧本内容..."
                            />
                         </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800 flex-shrink-0">
                        <Button variant="ghost" onClick={() => setShowAIModal(false)}>取消</Button>
                        <Button 
                            variant="accent" 
                            onClick={handleAIGenerate} 
                            disabled={!aiScriptContent.trim() || isProcessingAI}
                            className="bg-purple-600 hover:bg-purple-500 border-purple-500/50 w-40"
                        >
                            {isProcessingAI ? (
                                <span className="flex items-center gap-2"><Wand2 size={14} className="animate-spin"/> 分析拆解中...</span>
                            ) : (
                                <span className="flex items-center gap-2"><Sparkles size={14}/> 开始智能拆解</span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};
