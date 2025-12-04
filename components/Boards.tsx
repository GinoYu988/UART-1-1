


import React from 'react';
import { Gallery } from './Gallery';
import { GeneratedImage, PageMode } from '../types';
import { User, Map, Lightbulb, SkipForward, RefreshCw } from 'lucide-react';

interface BoardProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  selectedId: string | undefined;
  onDelete: (id: string) => void;
  onDownloadAll: () => void;
  onSendToPage?: (image: GeneratedImage, targetPage: PageMode) => void;
  onAddImage?: (image: GeneratedImage) => void;
  isInspectorVisible?: boolean;
  onToggleInspector?: () => void;
  isInspectorAvailable?: boolean;
}

// Character Design Board
export const CharacterBoard: React.FC<BoardProps> = (props) => {
  return (
    <Gallery 
        {...props} 
        title="人物造型设计 (CHARACTER DESIGN)" 
        emptyState={
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <User className="w-8 h-8 opacity-50 text-cine-accent" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest font-mono text-zinc-400">人物造型工作区</p>
                    <p className="text-[10px] text-zinc-600">在右侧选择工作流或开始生成角色设计图</p>
                </div>
            </div>
        }
    />
  );
};

// Scene Design Board
export const SceneBoard: React.FC<BoardProps> = (props) => {
  return (
    <Gallery 
        {...props} 
        title="场景概念设计 (SCENE DESIGN)"
        emptyState={
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <Map className="w-8 h-8 opacity-50 text-cine-accent" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest font-mono text-zinc-400">场景设计工作区</p>
                    <p className="text-[10px] text-zinc-600">开始构建宏大的电影场景与环境</p>
                </div>
            </div>
        }
    />
  );
};

// Lighting Design Board
export const LightingBoard: React.FC<BoardProps> = (props) => {
  return (
    <Gallery 
        {...props} 
        title="影视灯光设计 (LIGHTING DESIGN)"
        emptyState={
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <Lightbulb className="w-8 h-8 opacity-50 text-cine-accent" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest font-mono text-zinc-400">灯光研习工作区</p>
                    <p className="text-[10px] text-zinc-600">模拟不同的电影布光方案</p>
                </div>
            </div>
        }
    />
  );
};

// Next Shot Board
export const NextShotBoard: React.FC<BoardProps> = (props) => {
  return (
    <Gallery 
        {...props} 
        title="下一镜溶图 (NEXT SHOT GENERATION)"
        emptyState={
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <SkipForward className="w-8 h-8 opacity-50 text-cine-accent" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest font-mono text-zinc-400">下一镜溶图工作区</p>
                    <p className="text-[10px] text-zinc-600">选择上一镜参考图，推导生成连贯的新镜头</p>
                </div>
            </div>
        }
    />
  );
};

// Face Swap Board
export const FaceSwapBoard: React.FC<BoardProps> = (props) => {
  return (
    <Gallery 
        {...props} 
        title="人物换脸 (FACE SWAP)"
        emptyState={
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                    <RefreshCw className="w-8 h-8 opacity-50 text-cine-accent" />
                </div>
                <div className="text-center space-y-1">
                    <p className="text-xs uppercase tracking-widest font-mono text-zinc-400">智能换脸工作区</p>
                    <p className="text-[10px] text-zinc-600">上传底图与参考脸，使用绿色遮罩进行精准替换</p>
                </div>
            </div>
        }
    />
  );
};