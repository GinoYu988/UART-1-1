import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Settings, Trash2, Edit3, ArrowLeft, 
  Wand2, ChevronDown, X, FileText, ArrowUp, ArrowDown, LayoutList, ChevronUp
} from 'lucide-react';
import { Button } from './Button';
import { dbService } from '../services/db';

// --- Types ---
interface ScriptProject {
  id: string;
  title: string;
  summary: string;
  lastModified: string;
}

interface Scene {
  id: string;
  scriptId: string; // Foreign Key for DB
  number: number;
  intExt: '内' | '外';
  location: string;
  time: '日' | '夜' | '黄昏' | '黎明';
  title: string;
  content: string;
}

export const ScriptPhase: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [scripts, setScripts] = useState<ScriptProject[]>([]);
  const [activeScript, setActiveScript] = useState<ScriptProject | null>(null);
  
  // Editor State
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  // Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectSummary, setProjectSummary] = useState('');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active Scene Helper
  const activeScene = scenes.find(s => s.id === activeSceneId);

  // --- DB Loading Effects ---
  
  // 1. Load Scripts on Mount
  useEffect(() => {
    const loadScripts = async () => {
      try {
        const loadedScripts = await dbService.getAll<ScriptProject>(dbService.stores.SCRIPTS);
        // Sort by last modified desc
        loadedScripts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
        setScripts(loadedScripts);
      } catch (e) {
        console.error("Failed to load scripts", e);
      }
    };
    loadScripts();
  }, []);

  // 2. Load Scenes when entering a script
  useEffect(() => {
    if (view === 'editor' && activeScript) {
      const loadScenes = async () => {
        try {
          const loadedScenes = await dbService.getByIndex<Scene>(
            dbService.stores.SCENES, 
            'scriptId', 
            activeScript.id
          );
          loadedScenes.sort((a, b) => a.number - b.number);
          setScenes(loadedScenes);
          if (loadedScenes.length > 0) setActiveSceneId(loadedScenes[0].id);
        } catch (e) {
          console.error("Failed to load scenes", e);
        }
      };
      loadScenes();
    }
  }, [view, activeScript]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [activeScene?.content, view]);

  // --- Handlers ---
  const handleEditScript = (script: ScriptProject) => {
    setActiveScript(script);
    setView('editor');
    // State clearing is handled by the useEffect above when view changes
  };

  const handleOpenCreateModal = () => {
      setIsEditingProject(false);
      setProjectTitle('');
      setProjectSummary('');
      setShowProjectModal(true);
  };

  const handleOpenSettingsModal = (script?: ScriptProject) => {
      const targetScript = script || activeScript;
      if (!targetScript) return;
      
      if (script) setActiveScript(script); 

      setIsEditingProject(true);
      setProjectTitle(targetScript.title);
      setProjectSummary(targetScript.summary);
      setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    if (!projectTitle.trim()) return;

    let updatedScript: ScriptProject;

    if (isEditingProject && activeScript) {
         updatedScript = {
            ...activeScript,
            title: projectTitle,
            summary: projectSummary,
            lastModified: new Date().toISOString().split('T')[0]
         };
         setScripts(prev => prev.map(s => s.id === activeScript.id ? updatedScript : s));
         setActiveScript(updatedScript);
    } else {
        updatedScript = {
            id: crypto.randomUUID(),
            title: projectTitle,
            summary: projectSummary,
            lastModified: new Date().toISOString().split('T')[0]
        };
        setScripts(prev => [updatedScript, ...prev]);
    }
    
    // DB Save
    await dbService.put(dbService.stores.SCRIPTS, updatedScript);

    setShowProjectModal(false);
    setProjectTitle('');
    setProjectSummary('');
  };

  const handleDeleteScript = async (id: string) => {
      // 1. Delete Scenes associated
      const scriptScenes = await dbService.getByIndex<Scene>(dbService.stores.SCENES, 'scriptId', id);
      for (const scene of scriptScenes) {
          await dbService.delete(dbService.stores.SCENES, scene.id);
      }
      
      // 2. Delete Script
      await dbService.delete(dbService.stores.SCRIPTS, id);

      setScripts(prev => prev.filter(s => s.id !== id));
      if (activeScript?.id === id) {
          setActiveScript(null);
          setView('list');
      }
  };

  const handleAddScene = async () => {
    if (!activeScript) return;
    const newScene: Scene = {
      id: crypto.randomUUID(),
      scriptId: activeScript.id,
      number: scenes.length + 1,
      intExt: '内',
      location: '',
      time: '日',
      title: '',
      content: ''
    };
    
    // DB Save
    await dbService.put(dbService.stores.SCENES, newScene);

    const newScenes = [...scenes, newScene];
    setScenes(newScenes);
    setActiveSceneId(newScene.id);
  };

  const handleSceneChange = async (field: keyof Scene, value: string) => {
    if (!activeSceneId) return;
    
    const updatedScenes = scenes.map(s => {
        if (s.id === activeSceneId) {
            return { ...s, [field]: value };
        }
        return s;
    });
    setScenes(updatedScenes);

    // DB Update (Debounce could be added here for performance, but simple await is fine for now)
    const activeS = updatedScenes.find(s => s.id === activeSceneId);
    if (activeS) {
        await dbService.put(dbService.stores.SCENES, activeS);
    }
  };

  const handleAddNextScene = async () => {
      if (!activeSceneId || !activeScript) {
          handleAddScene();
          return;
      }
      
      const currentIndex = scenes.findIndex(s => s.id === activeSceneId);
      const newScene: Scene = {
          id: crypto.randomUUID(),
          scriptId: activeScript.id,
          number: 0, // Placeholder
          intExt: '内',
          location: '',
          time: '日',
          title: '',
          content: ''
      };
      
      const newScenes = [...scenes];
      newScenes.splice(currentIndex + 1, 0, newScene);
      
      // Renumber and Save All affected
      const renumbered = newScenes.map((s, idx) => ({ ...s, number: idx + 1 }));
      setScenes(renumbered);
      setActiveSceneId(newScene.id);

      // DB Bulk Update (Loop for now)
      for (const s of renumbered) {
          await dbService.put(dbService.stores.SCENES, s);
      }
  };

  const handleMoveScene = async (id: string, direction: 'up' | 'down', e?: React.MouseEvent) => {
      e?.stopPropagation();
      const index = scenes.findIndex(s => s.id === id);
      if (index === -1) return;
      if (direction === 'up' && index === 0) return;
      if (direction === 'down' && index === scenes.length - 1) return;
      
      const newScenes = [...scenes];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap
      [newScenes[index], newScenes[targetIndex]] = [newScenes[targetIndex], newScenes[index]];
      
      // Renumber
      const renumbered = newScenes.map((s, idx) => ({ ...s, number: idx + 1 }));
      setScenes(renumbered);

      // DB Update
      for (const s of renumbered) {
          await dbService.put(dbService.stores.SCENES, s);
      }
  };

  const handleDeleteScene = async () => {
      if (!activeSceneId) return;
      const index = scenes.findIndex(s => s.id === activeSceneId);
      const sceneToDeleteId = activeSceneId;
      
      // DB Delete
      await dbService.delete(dbService.stores.SCENES, sceneToDeleteId);

      const newScenes = scenes.filter(s => s.id !== activeSceneId);
      
      // Renumber
      const renumbered = newScenes.map((s, idx) => ({ ...s, number: idx + 1 }));
      setScenes(renumbered);
      
      // Update DB for renumbered items
      for (const s of renumbered) {
          await dbService.put(dbService.stores.SCENES, s);
      }
      
      if (renumbered.length > 0) {
          const nextIndex = Math.min(index, renumbered.length - 1);
          setActiveSceneId(renumbered[nextIndex].id);
      } else {
          setActiveSceneId(null);
      }
  };

  // --- RENDER: LIST VIEW ---
  if (view === 'list') {
    return (
      <div className="flex flex-col h-full w-full bg-cine-black text-zinc-300 relative font-sans transition-colors duration-300">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-cine-border bg-cine-dark flex-shrink-0">
          <div className="flex items-center gap-4">
             <span className="text-cine-text-muted text-xs font-bold uppercase tracking-widest">剧本拆解中心 (SCRIPT BREAKDOWN)</span>
          </div>
          <Button variant="accent" size="sm" onClick={handleOpenCreateModal} className="gap-2">
            <Plus size={14} /> 新增
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-4">
            {scripts.map(script => (
              <div key={script.id} className="bg-cine-panel rounded-xl border border-cine-border p-6 flex items-center justify-between hover:border-cine-accent/50 hover:bg-zinc-900 dark:hover:bg-zinc-900 hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-lg group-hover:text-cine-accent group-hover:border-cine-accent/30 transition-colors">
                        {script.title.substring(0,1)}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-200 dark:text-zinc-200 text-zinc-800 mb-1 group-hover:text-cine-accent dark:group-hover:text-white transition-colors">{script.title}</h3>
                        <p className="text-zinc-500 text-sm">{script.summary || '暂无简介'}</p>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-6 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-zinc-600 font-mono mr-4">{script.lastModified}</span>
                    <button onClick={() => handleEditScript(script)} className="flex items-center gap-1.5 text-zinc-400 hover:text-cine-accent font-medium text-sm transition-colors">
                        <Edit3 size={14} /> 编写
                    </button>
                    <div className="w-px h-4 bg-zinc-800"></div>
                    <button onClick={() => handleOpenSettingsModal(script)} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 font-medium text-sm transition-colors">
                        <Settings size={14} /> 设置
                    </button>
                    <div className="w-px h-4 bg-zinc-800"></div>
                    <button 
                        onClick={() => handleDeleteScript(script.id)}
                        className="flex items-center gap-1.5 text-zinc-500 hover:text-red-500 font-medium text-sm transition-colors"
                    >
                        <Trash2 size={14} /> 删除
                    </button>
                 </div>
              </div>
            ))}
            
            {scripts.length === 0 && (
                <div className="text-center py-20 text-zinc-600">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>暂无剧本，点击右上角新增</p>
                </div>
            )}
          </div>
        </div>

        {/* Project Create/Edit Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-cine-panel rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl border border-cine-border scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-cine-border pb-4">
                <h3 className="text-lg font-bold text-zinc-200 dark:text-zinc-200 text-zinc-800">{isEditingProject ? '编辑剧本项目' : '新建剧本项目'}</h3>
                <button onClick={() => setShowProjectModal(false)} className="text-zinc-500 hover:text-zinc-300">
                   <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Project Title</label>
                   <input 
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      placeholder="输入剧本标题..."
                      className="w-full bg-zinc-900 border border-cine-border rounded-lg px-4 py-3 text-sm text-zinc-200 focus:border-cine-accent outline-none placeholder:text-zinc-600 transition-colors"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Summary (Optional)</label>
                   <textarea 
                      value={projectSummary}
                      onChange={(e) => setProjectSummary(e.target.value)}
                      placeholder="一句话故事简介..."
                      className="w-full bg-zinc-900 border border-cine-border rounded-lg px-4 py-3 text-sm text-zinc-200 focus:border-cine-accent outline-none placeholder:text-zinc-600 resize-none h-24 transition-colors"
                   />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                 <Button variant="ghost" onClick={() => setShowProjectModal(false)}>取消</Button>
                 <Button variant="accent" onClick={handleSaveProject}>{isEditingProject ? '保存修改' : '立即创建'}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- RENDER: EDITOR VIEW ---
  return (
    <div className="flex h-full w-full bg-cine-black text-zinc-300 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Sidebar: Scene List */}
      <div className="w-64 border-r border-cine-border bg-cine-dark flex flex-col flex-shrink-0 transition-colors duration-300">
          <div className="h-16 flex items-center gap-3 px-4 border-b border-cine-border flex-shrink-0">
             <button onClick={() => setView('list')} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-all">
                <ArrowLeft size={16} />
             </button>
             <h2 className="text-sm font-bold text-zinc-200 dark:text-zinc-200 text-zinc-800 truncate" title={activeScript?.title}>{activeScript?.title}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
             <div className="px-2 py-1 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Scene List</div>
             {scenes.map((scene) => (
                <div 
                   key={scene.id}
                   onClick={() => setActiveSceneId(scene.id)}
                   className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                      activeSceneId === scene.id 
                      ? 'bg-cine-accent text-white shadow-md' 
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                   }`}
                >
                   {/* Reorder Buttons */}
                   <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                           onClick={(e) => handleMoveScene(scene.id, 'up', e)}
                           className="p-0.5 hover:bg-black/20 rounded text-inherit"
                           title="Move Up"
                       >
                           <ChevronUp size={8} />
                       </button>
                       <button 
                           onClick={(e) => handleMoveScene(scene.id, 'down', e)}
                           className="p-0.5 hover:bg-black/20 rounded text-inherit"
                           title="Move Down"
                       >
                           <ChevronDown size={8} />
                       </button>
                   </div>

                   <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${activeSceneId === scene.id ? 'bg-white/20' : 'bg-zinc-800'}`}>
                      {scene.number}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{scene.title || '无标题场次'}</div>
                      <div className={`text-[10px] truncate opacity-70`}>
                         {scene.intExt} • {scene.location || '未知地点'} • {scene.time}
                      </div>
                   </div>
                </div>
             ))}

             <button 
                onClick={handleAddScene}
                className="w-full mt-2 py-2 border border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/30 transition-all flex items-center justify-center gap-2 text-xs"
             >
                <Plus size={12} /> Add Scene
             </button>
          </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-cine-black transition-colors duration-300 relative">
          
          {/* Top Bar: Scene Metadata */}
          {activeScene ? (
             <div className="h-16 px-8 border-b border-cine-border flex items-center justify-between bg-cine-panel z-10">
                 <div className="flex items-center gap-4 flex-1">
                     <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-cine-border">
                        <select 
                            value={activeScene.intExt}
                            onChange={(e) => handleSceneChange('intExt', e.target.value)}
                            className="bg-transparent text-xs text-zinc-300 font-bold px-2 py-1 outline-none cursor-pointer"
                        >
                            <option value="内">内 INT.</option>
                            <option value="外">外 EXT.</option>
                        </select>
                     </div>

                     <input 
                        value={activeScene.location}
                        onChange={(e) => handleSceneChange('location', e.target.value)}
                        placeholder="场景地点 (LOCATION)"
                        className="bg-transparent text-sm font-bold text-zinc-200 dark:text-zinc-200 text-zinc-800 placeholder:text-zinc-600 outline-none w-48 border-b border-transparent focus:border-cine-accent transition-colors"
                     />

                     <div className="flex items-center gap-2 bg-zinc-900 rounded-lg p-1 border border-cine-border">
                        <select 
                            value={activeScene.time}
                            onChange={(e) => handleSceneChange('time', e.target.value)}
                            className="bg-transparent text-xs text-zinc-300 font-bold px-2 py-1 outline-none cursor-pointer"
                        >
                            <option value="日">日 DAY</option>
                            <option value="夜">夜 NIGHT</option>
                            <option value="黄昏">黄昏 DUSK</option>
                            <option value="黎明">黎明 DAWN</option>
                        </select>
                     </div>
                     
                     <div className="w-px h-6 bg-cine-border mx-2"></div>

                     <input 
                        value={activeScene.title}
                        onChange={(e) => handleSceneChange('title', e.target.value)}
                        placeholder="场次标题 (Scene Title)"
                        className="flex-1 bg-transparent text-sm text-zinc-300 dark:text-zinc-300 text-zinc-700 placeholder:text-zinc-600 outline-none border-b border-transparent focus:border-cine-accent transition-colors"
                     />
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" onClick={() => handleOpenSettingsModal()} className="text-zinc-500">
                         <Settings size={14} />
                     </Button>
                 </div>
             </div>
          ) : (
             <div className="h-16 border-b border-cine-border bg-cine-panel"></div>
          )}

          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
              {activeScene ? (
                  <div className="max-w-3xl mx-auto min-h-[500px] bg-cine-panel border border-cine-border shadow-lg rounded-xl p-8 md:p-12 relative transition-colors duration-300">
                      <div className="absolute top-4 right-4 text-xs font-mono text-zinc-300 bg-zinc-900 px-2 py-1 rounded opacity-50">
                          SCENE {activeScene.number}
                      </div>
                      <textarea
                          ref={textareaRef}
                          value={activeScene.content}
                          onChange={(e) => handleSceneChange('content', e.target.value)}
                          placeholder="在此处输入剧本内容..."
                          className="w-full h-full bg-transparent resize-none outline-none text-base leading-loose font-mono text-zinc-300 dark:text-zinc-300 text-zinc-800 placeholder:text-zinc-700/30"
                          spellCheck={false}
                      />
                  </div>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                      <LayoutList size={48} className="opacity-20 mb-4" />
                      <p>Select or create a scene to start writing</p>
                  </div>
              )}
          </div>

          {/* Bottom Toolbar (Fixed) */}
          {activeScene && (
              <div className="h-14 bg-cine-panel border-t border-cine-border absolute bottom-0 left-0 right-0 px-6 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                       <Button variant="secondary" size="sm" onClick={handleAddNextScene} className="text-xs gap-2">
                           <Plus size={12} /> 增加下一场 (Add Next)
                       </Button>
                       <div className="w-px h-4 bg-cine-border mx-2"></div>
                       <Button variant="ghost" size="sm" onClick={() => handleMoveScene(activeScene.id, 'up')} title="Move Scene Up" disabled={scenes[0]?.id === activeScene.id}>
                           <ArrowUp size={14} />
                       </Button>
                       <Button variant="ghost" size="sm" onClick={() => handleMoveScene(activeScene.id, 'down')} title="Move Scene Down" disabled={scenes[scenes.length-1]?.id === activeScene.id}>
                           <ArrowDown size={14} />
                       </Button>
                  </div>
                  
                  <Button variant="ghost" size="sm" onClick={handleDeleteScene} className="text-zinc-500 hover:text-red-500 hover:bg-red-500/10">
                      <Trash2 size={14} className="mr-2"/> 删除当前场 (Delete Scene)
                  </Button>
              </div>
          )}
      </div>

    </div>
  );
};