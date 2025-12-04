


import React from 'react';
import { GeneratedImage, AspectRatio, PageMode } from '../types';
import { User, Map, Lightbulb, Clapperboard, SkipForward, RefreshCw } from 'lucide-react';
import { Gallery } from './Gallery';

export interface WorkflowConfig {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    promptTemplate: string;
    aspectRatio: AspectRatio;
    imageCount: number;
    targetPage: PageMode;
}

interface CanvasProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  selectedId: string | undefined;
  onDelete: (id: string) => void;
  onDownloadAll: () => void;
  onApplyWorkflow: (config: WorkflowConfig) => void;
  onSendToPage?: (image: GeneratedImage, targetPage: PageMode) => void;
  onAddImage?: (image: GeneratedImage) => void;
  isInspectorVisible?: boolean;
  onToggleInspector?: () => void;
  isInspectorAvailable?: boolean;
}

export const Canvas: React.FC<CanvasProps> = ({ 
  images, 
  onSelect, 
  selectedId, 
  onDelete, 
  onDownloadAll,
  onApplyWorkflow,
  onSendToPage,
  onAddImage,
  isInspectorVisible,
  onToggleInspector,
  isInspectorAvailable
}) => {
  const WORKFLOWS: WorkflowConfig[] = [
      {
          id: 'char-design',
          title: '人物造型设计',
          description: '生成角色的三视图（正面、侧面、背面），包含面部特写与服装细节。',
          icon: User,
          promptTemplate: "Character Design Sheet: Full body view of [Character Name], wearing [Outfit], neutral lighting, solid background. Include Front view, Side view, and Close-up.",
          aspectRatio: AspectRatio.PORTRAIT,
          imageCount: 3,
          targetPage: 'character'
      },
      {
          id: 'scene-design',
          title: '场景概念设计',
          description: '构建宏大的电影场景、环境氛围图以及关键道具的空间关系。',
          icon: Map,
          promptTemplate: "Cinematic Environment Design: Establishing shot of [Location], highly detailed textures, atmospheric lighting, 8k resolution, wide angle.",
          aspectRatio: AspectRatio.WIDE,
          imageCount: 4,
          targetPage: 'scene'
      },
      {
          id: 'light-design',
          title: '影视灯光设计',
          description: '模拟不同的布光方案（伦勃朗光、侧逆光等）与色彩氛围。',
          icon: Lightbulb,
          promptTemplate: "Cinematic Lighting Study: Shot of [Subject] featuring [Lighting Style, e.g., Rembrandt lighting], volumetric fog, dramatic shadows, color grading.",
          aspectRatio: AspectRatio.WIDE,
          imageCount: 4,
          targetPage: 'lighting'
      },
      {
          id: 'face-swap',
          title: '人物换脸',
          description: '基于绿色遮罩（Inpainting Mask）将参考人物的面部特征精准替换到底图中。',
          icon: RefreshCw,
          promptTemplate: "Make expression: [Happy/Sad/Serious]...",
          aspectRatio: AspectRatio.WIDE,
          imageCount: 1,
          targetPage: 'faceswap'
      },
      {
          id: 'next-shot',
          title: '下一镜溶图',
          description: '基于上一镜画面，结合剧本推导生成连贯的下一镜头（Next Shot）。',
          icon: SkipForward,
          promptTemplate: "", // Prompt is inferred dynamically
          aspectRatio: AspectRatio.WIDE,
          imageCount: 1,
          targetPage: 'nextshot'
      },
      {
          id: 'storyboard',
          title: '分镜脚本制作',
          description: '将剧本文字转化为连续的视觉画面，推演镜头调度与构图。',
          icon: Clapperboard,
          promptTemplate: "Storyboard Sequence: \nPanel 1: [Action 1]\nPanel 2: [Action 2]\nPanel 3: [Action 3]\nCinematic composition, rough sketch style or photorealistic.",
          aspectRatio: AspectRatio.WIDE,
          imageCount: 4,
          targetPage: 'storyboard'
      }
  ];

  const emptyState = (
    <div className="h-full flex flex-col items-center justify-center p-10 select-none animate-in fade-in duration-500">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-cine-accent rounded-sm shadow-[0_0_15px_rgba(214,0,28,0.6)]"></div>
                故事板生成中心
            </h1>
            <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                选择一个工作流开始创作，或直接在左侧参数面板进行设置。
            </p>
        </div>

        {/* Recommended Workflows Section */}
        <div className="w-full max-w-6xl">
            <div className="flex items-center gap-3 mb-6">
                    <div className="h-px bg-zinc-800 flex-1"></div>
                    <span className="text-cine-text-muted text-xs font-bold uppercase tracking-widest">推荐工作流 WORKFLOWS</span>
                    <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {WORKFLOWS.map((wf) => (
                    <button 
                        key={wf.id}
                        onClick={() => onApplyWorkflow(wf)}
                        className="group relative flex flex-col items-start text-left p-5 bg-zinc-900/30 border border-zinc-800/60 rounded-xl hover:bg-zinc-900/60 hover:border-cine-accent transition-all duration-300 hover:shadow-xl hover:shadow-cine-accent/10 hover:-translate-y-1"
                    >
                        <div className="p-3 bg-black rounded-lg border border-zinc-800 text-zinc-400 group-hover:text-cine-accent group-hover:border-cine-accent/30 transition-colors mb-4 shadow-sm">
                            <wf.icon size={20} />
                        </div>
                        <h3 className="text-zinc-200 font-bold text-sm mb-2 group-hover:text-white transition-colors">{wf.title}</h3>
                        <p className="text-zinc-500 text-xs leading-relaxed group-hover:text-zinc-400 transition-colors line-clamp-3">
                            {wf.description}
                        </p>
                        
                        <div className="mt-auto pt-4 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                            <div className="text-[9px] font-mono text-cine-accent uppercase tracking-wider flex items-center gap-1">
                                点击应用预设 <span className="text-lg leading-none">→</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    </div>
  );

  return (
    <Gallery 
        images={images}
        onSelect={onSelect}
        selectedId={selectedId}
        onDelete={onDelete}
        onDownloadAll={onDownloadAll}
        title="故事板总览 (MASTER)"
        emptyState={emptyState}
        onSendToPage={onSendToPage}
        onAddImage={onAddImage}
        isInspectorVisible={isInspectorVisible}
        onToggleInspector={onToggleInspector}
        isInspectorAvailable={isInspectorAvailable}
    />
  );
};