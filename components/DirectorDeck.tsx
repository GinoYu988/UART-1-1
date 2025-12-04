

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';
import { AspectRatio, ImageSize, Asset, PageMode, CameraParams, CharacterParams, LightingPreset, GeneratedImage } from '../types';
import { Zap, Layers, Sparkles, User, Map, Box, ChevronDown, Save, ArrowLeftRight, ArrowUpDown, Scan, Monitor, Check, Lightbulb, SkipForward, Video, RefreshCw, PenTool, X } from 'lucide-react';

interface DirectorDeckProps {
  imageCount: number;
  setImageCount: (count: number) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  imageSize: ImageSize;
  setImageSize: (size: ImageSize) => void;
  prompt: string;
  setPrompt: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  onEnhancePrompt?: () => void;
  assets: Asset[];
  pageMode: PageMode;
  cameraParams?: CameraParams;
  setCameraParams?: (params: CameraParams) => void;
  characterParams?: CharacterParams;
  setCharacterParams?: (params: CharacterParams) => void;
  lightingPreset?: LightingPreset;
  setLightingPreset?: (preset: LightingPreset) => void;
  
  // Next Shot Props
  nextShotScript?: string;
  setNextShotScript?: (script: string) => void;
  nextShotConfig?: { size: string, angle: string };
  setNextShotConfig?: (cfg: { size: string, angle: string }) => void;
  onInferNextShotPrompt?: () => void;

  // Face Swap Props
  faceSwapTarget?: GeneratedImage | Asset | null;
  faceSwapSource?: Asset | null;
  onSetFaceSwapTarget?: () => void;
  onSetFaceSwapSource?: () => void;
  onUpdateFaceSwapTarget?: (dataUrl: string) => void; // New callback for saving masked image
  activeSelectionType?: 'image' | 'asset'; 
}

const LIGHTING_PRESETS: LightingPreset[] = [
    {
        id: 'rembrandt',
        name: '伦勃朗光 (Rembrandt)',
        description: 'Classic cinematic lighting with a triangle of light on the shadow side of the face.',
        svgContent: `
            <defs>
                <radialGradient id="rembrandtGrad" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" stop-color="#fff" />
                    <stop offset="100%" stop-color="#1a1a1a" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="30" fill="#333" />
            <path d="M 20 20 L 60 50 L 50 80 Z" fill="url(#rembrandtGrad)" opacity="0.8" />
            <path d="M 60 45 L 70 45 L 65 55 Z" fill="#eee" filter="blur(2px)" />
        `
    },
    {
        id: 'split',
        name: '侧光 (Split)',
        description: 'Dramatic high contrast lighting, splitting the face into light and dark halves.',
        svgContent: `
            <defs>
                <linearGradient id="splitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stop-color="#fff" />
                    <stop offset="50%" stop-color="#000" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="30" fill="url(#splitGrad)" />
        `
    },
    {
        id: 'rim',
        name: '边缘光 (Rim)',
        description: 'Backlight that highlights the outline of the subject, separating them from the background.',
        svgContent: `
             <defs>
                <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="85%" stop-color="#000" />
                    <stop offset="100%" stop-color="#fff" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="32" stroke="white" stroke-width="2" fill="#000" filter="blur(1px)" />
            <circle cx="50" cy="50" r="30" fill="#111" />
        `
    },
    {
        id: 'butterfly',
        name: '蝴蝶光 (Butterfly)',
        description: 'Paramount lighting. High frontal light creating a butterfly-shaped shadow under the nose. Glamorous.',
        svgContent: `
            <defs>
                <radialGradient id="butterflyGrad" cx="50%" cy="20%" r="80%">
                    <stop offset="0%" stop-color="#fff" />
                    <stop offset="100%" stop-color="#222" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#111" />
            <circle cx="50" cy="50" r="30" fill="url(#butterflyGrad)" />
            <path d="M 45 60 Q 50 65 55 60 L 50 55 Z" fill="#000" opacity="0.6" filter="blur(1px)" />
        `
    },
    {
        id: 'threepoint',
        name: '三点布光 (Three-Point)',
        description: 'Standard studio setup: Key light, Fill light, and Back light for depth and dimension.',
        svgContent: `
            <rect width="100" height="100" fill="#111" />
            <circle cx="50" cy="50" r="25" fill="#444" />
            <!-- Key Light (Bright) -->
            <path d="M 20 80 L 50 50" stroke="#fff" stroke-width="2" opacity="0.8" marker-end="url(#arrow)" />
            <circle cx="15" cy="85" r="5" fill="#fff" />
            <!-- Fill Light (Dim) -->
            <path d="M 80 80 L 50 50" stroke="#888" stroke-width="2" opacity="0.5" />
            <circle cx="85" cy="85" r="5" fill="#666" />
            <!-- Back Light (Rim) -->
            <path d="M 50 10 L 50 40" stroke="#fff" stroke-width="1" opacity="0.9" />
            <circle cx="50" cy="5" r="5" fill="#fff" />
        `
    },
    {
        id: 'noir',
        name: '黑色电影 (Film Noir)',
        description: 'Venetian blind style shadows, high contrast, mysterious and moody.',
        svgContent: `
            <defs>
                <linearGradient id="noirBase" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#000" />
                    <stop offset="100%" stop-color="#ccc" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="50" r="30" fill="url(#noirBase)" />
            <!-- Blinds slats -->
            <rect x="0" y="20" width="100" height="5" fill="black" opacity="0.9" />
            <rect x="0" y="35" width="100" height="5" fill="black" opacity="0.9" />
            <rect x="0" y="50" width="100" height="5" fill="black" opacity="0.9" />
            <rect x="0" y="65" width="100" height="5" fill="black" opacity="0.9" />
        `
    },
    {
        id: 'toplight',
        name: '顶光 (Top Light)',
        description: 'The Godfather style. Light directly from above, creating shadows over eyes.',
        svgContent: `
            <defs>
                <radialGradient id="topGrad" cx="50%" cy="0%" r="60%">
                    <stop offset="0%" stop-color="#fff" />
                    <stop offset="100%" stop-color="#000" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="55" r="30" fill="url(#topGrad)" />
            <!-- Eye shadows -->
            <rect x="35" y="45" width="10" height="5" fill="black" filter="blur(2px)" opacity="0.8"/>
            <rect x="55" y="45" width="10" height="5" fill="black" filter="blur(2px)" opacity="0.8"/>
        `
    },
    {
        id: 'under',
        name: '底光 (Under Lighting)',
        description: 'Horror style. Light from below, creating unnatural upward shadows.',
        svgContent: `
             <defs>
                <radialGradient id="underGrad" cx="50%" cy="100%" r="60%">
                    <stop offset="0%" stop-color="#fff" />
                    <stop offset="100%" stop-color="#000" />
                </radialGradient>
            </defs>
            <rect width="100" height="100" fill="#000" />
            <circle cx="50" cy="45" r="30" fill="url(#underGrad)" />
        `
    },
    {
        id: 'cyberpunk',
        name: '赛博霓虹 (Cyberpunk)',
        description: 'Dual lighting setup with contrasting Blue and Pink light sources.',
        svgContent: `
            <defs>
                <linearGradient id="cyberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#00f6ff" /> <!-- Cyan -->
                    <stop offset="100%" stop-color="#ff0055" /> <!-- Pink -->
                </linearGradient>
            </defs>
            <rect width="100" height="100" fill="#050510" />
            <circle cx="50" cy="50" r="22" fill="#222" />
            <path d="M 10 50 Q 30 50 50 50" stroke="#00f6ff" stroke-width="4" filter="blur(4px)" opacity="0.8"/>
            <path d="M 90 50 Q 70 50 50 50" stroke="#ff0055" stroke-width="4" filter="blur(4px)" opacity="0.8"/>
            <circle cx="50" cy="50" r="28" fill="url(#cyberGrad)" opacity="0.3" style="mix-blend-mode: overlay;" />
        `
    }
];

// --- Internal Mask Editor Component ---
const MaskEditor: React.FC<{ imageUrl: string; onSave: (url: string) => void; onCancel: () => void }> = ({ imageUrl, onSave, onCancel }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isDrawing, setIsDrawing] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        if (imgLoaded && imageRef.current && canvasRef.current) {
            const img = imageRef.current;
            const cvs = canvasRef.current;
            cvs.width = img.naturalWidth;
            cvs.height = img.naturalHeight;
        }
    }, [imgLoaded]);

    const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current || !imageRef.current) return { x: 0, y: 0 };
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.lineWidth = brushSize * (canvasRef.current!.width / 800);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
    };
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) { ctx.lineTo(x, y); ctx.stroke(); }
    };
    const stopDrawing = () => setIsDrawing(false);

    const handleSave = () => {
        if (!imageRef.current || !canvasRef.current) return;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageRef.current.naturalWidth;
        tempCanvas.height = imageRef.current.naturalHeight;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(imageRef.current, 0, 0);
            ctx.drawImage(canvasRef.current, 0, 0);
            onSave(tempCanvas.toDataURL('image/png'));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                <PenTool size={16} /> 编辑绿色遮罩 (Edit Mask)
            </h3>
            <div className="relative border border-zinc-700 shadow-2xl max-h-[70vh]">
                <img ref={imageRef} src={imageUrl} className="max-h-[70vh] object-contain" onLoad={() => setImgLoaded(true)} />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                />
            </div>
            <div className="mt-6 flex items-center gap-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">Brush Size</span>
                <input type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-32 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent"/>
                <div className="w-px h-6 bg-zinc-700 mx-2"></div>
                <Button onClick={onCancel} variant="ghost" size="sm">取消</Button>
                <Button onClick={handleSave} variant="accent" size="sm" className="gap-2"><Save size={14}/> 保存遮罩</Button>
            </div>
        </div>
    );
};


export const DirectorDeck: React.FC<DirectorDeckProps> = ({
  imageCount,
  setImageCount,
  aspectRatio,
  setAspectRatio,
  imageSize,
  setImageSize,
  prompt,
  setPrompt,
  onGenerate,
  isGenerating,
  onEnhancePrompt,
  assets,
  pageMode,
  cameraParams,
  setCameraParams,
  characterParams,
  setCharacterParams,
  lightingPreset,
  setLightingPreset,
  nextShotScript,
  setNextShotScript,
  nextShotConfig,
  setNextShotConfig,
  onInferNextShotPrompt,
  faceSwapTarget,
  faceSwapSource,
  onSetFaceSwapTarget,
  onSetFaceSwapSource,
  onUpdateFaceSwapTarget,
  activeSelectionType
}) => {
  // Mention State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // Mask Editor State
  const [showMaskEditor, setShowMaskEditor] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  
  // Filter assets based on query
  const mentionableAssets = assets.filter(a => a.isEnabled && a.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  // Sync scroll between textarea and backdrop
  const handleScroll = () => {
      if (textareaRef.current && backdropRef.current) {
          backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const cursorPos = e.target.selectionStart;
      setPrompt(val);
      setCursorPosition(cursorPos);

      // Simple detection: find the last '@' before cursor
      const textBeforeCursor = val.substring(0, cursorPos);
      const lastAt = textBeforeCursor.lastIndexOf('@');
      
      if (lastAt !== -1) {
         // Check if there are spaces between @ and cursor (invalid mention)
         const textAfterAt = textBeforeCursor.substring(lastAt + 1);
         if (!textAfterAt.includes(' ')) {
             setShowMentions(true);
             setMentionQuery(textAfterAt);
             return;
         }
      }
      setShowMentions(false);
  };

  const insertMention = (asset: Asset) => {
      if (!textareaRef.current) return;
      
      const textBeforeCursor = prompt.substring(0, cursorPosition);
      const lastAt = textBeforeCursor.lastIndexOf('@');
      const textAfterCursor = prompt.substring(cursorPosition);
      
      // Construct new prompt: Text before @ + @Name + space + Text after cursor
      const newPrompt = prompt.substring(0, lastAt) + `@${asset.name} ` + textAfterCursor;
      
      setPrompt(newPrompt);
      setShowMentions(false);
      
      // Restore focus and cursor
      setTimeout(() => {
          textareaRef.current?.focus();
          const newCursorPos = lastAt + asset.name.length + 2; // +2 for @ and space
          textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
  };

  const handleCameraChange = (key: keyof CameraParams, value: number) => {
      if (setCameraParams && cameraParams) {
          setCameraParams({ ...cameraParams, [key]: value });
      }
  };

  const toggleCharacterOption = (category: keyof CharacterParams, value: string) => {
    if (!characterParams || !setCharacterParams) return;
    const currentList = characterParams[category];
    const newList = currentList.includes(value) 
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
    
    setCharacterParams({ ...characterParams, [category]: newList });
  };

  const handleNextShotConfig = (key: 'size' | 'angle', value: string) => {
      if (setNextShotConfig && nextShotConfig) {
          setNextShotConfig({ ...nextShotConfig, [key]: value });
      }
  };

  // Render highlighted text for backdrop
  const renderHighlightedPrompt = () => {
    // Regex to find words starting with @
    const parts = prompt.split(/(@\S+)/g);
    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            // Check if it matches a known asset (optional, but good for accuracy)
            // For now, highlight any @word to match user request "orange"
            return <span key={index} className="text-orange-500 font-bold">{part}</span>;
        }
        return <span key={index}>{part}</span>;
    });
  };

  // Logic to determine if generate is disabled
  let isGenerateDisabled = isGenerating;
  if (pageMode === 'scene') {
       // Scene: prompt optional
  } else if (pageMode === 'character') {
       const hasCharSelection = characterParams && (
        characterParams.views.length > 0 || 
        characterParams.shots.length > 0 || 
        characterParams.expressions.length > 0
       );
       isGenerateDisabled = isGenerating || !hasCharSelection;
  } else if (pageMode === 'lighting') {
       isGenerateDisabled = isGenerating || !lightingPreset;
  } else if (pageMode === 'faceswap') {
       isGenerateDisabled = isGenerating || !faceSwapTarget || !faceSwapSource;
  } else {
       isGenerateDisabled = isGenerating || !prompt.trim();
  }

  const renderPlaceholder = (icon: React.ElementType, label: string) => (
      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1 bg-black/40">
          {React.createElement(icon, { size: 16 })}
          <span className="text-[9px] uppercase">{label}</span>
      </div>
  );

  const renderToggle = (
    label: string, 
    category: keyof CharacterParams, 
    value: string, 
    params: CharacterParams | undefined, 
    onToggle: (category: keyof CharacterParams, value: string) => void
  ) => {
    const isSelected = params?.[category]?.includes(value);
    return (
        <button
            onClick={() => onToggle(category, value)}
            className={`flex-1 w-full py-1.5 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                isSelected
                ? 'bg-cine-accent text-white border-cine-accent'
                : 'bg-black/40 text-zinc-500 border-zinc-800 hover:text-white'
            }`}
        >
            {label}
        </button>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 select-none relative">
      
      {/* MASK EDITOR OVERLAY */}
      {showMaskEditor && faceSwapTarget && onUpdateFaceSwapTarget && (
          <MaskEditor 
            imageUrl={'url' in faceSwapTarget ? faceSwapTarget.url : faceSwapTarget.previewUrl}
            onSave={(url) => { onUpdateFaceSwapTarget(url); setShowMaskEditor(false); }}
            onCancel={() => setShowMaskEditor(false)}
          />
      )}

      <div className="flex items-center justify-between mt-0">
         <span className="text-cine-text-muted text-xs font-bold tracking-wide">参数设置 SETTINGS</span>
         {isGenerating && (
             <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-cine-accent rounded-full animate-pulse"></div>
                 <span className="text-[10px] text-cine-accent font-medium">Processing</span>
             </div>
         )}
      </div>

      {/* Control Group */}
      <div className="space-y-3 bg-cine-panel p-3 rounded-2xl border border-cine-border">
        
        {/* === SCENE MODE (UPDATED: Extreme Ranges) === */}
        {pageMode === 'scene' && cameraParams && (
             <div className="flex flex-col gap-4 py-2">
                 {/* Row 1: Pan (Horizontal) -180 to 180 */}
                 <div className="space-y-1">
                     <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ArrowLeftRight size={10}/> 左盘 (L)</span>
                        <span className="text-cine-accent font-mono">{cameraParams.pan}°</span>
                        <span>右盘 (R)</span>
                     </div>
                     <div className="relative flex items-center h-4">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600"></div>
                        <input type="range" min="-180" max="180" value={cameraParams.pan} onChange={(e) => handleCameraChange('pan', Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent z-10" />
                     </div>
                 </div>
                 {/* Row 2: Tilt (Vertical) -90 to 90 */}
                 <div className="space-y-1">
                     <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><ArrowUpDown size={10}/> 俯视 (DOWN)</span>
                        <span className="text-cine-accent font-mono">{cameraParams.tilt}°</span>
                        <span>仰视 (UP)</span>
                     </div>
                     <div className="relative flex items-center h-4">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600"></div>
                        <input type="range" min="-90" max="90" value={cameraParams.tilt} onChange={(e) => handleCameraChange('tilt', Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent z-10" />
                     </div>
                 </div>
                 {/* Row 3: Distance -100 to 100 */}
                 <div className="space-y-1">
                     <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Scan size={10}/> 极近 (MACRO)</span>
                        <span className="text-cine-accent font-mono">
                            {cameraParams.distance < -50 ? 'Extreme CU' : cameraParams.distance > 50 ? 'Extreme Long' : cameraParams.distance === 0 ? 'Medium' : 'Shot'}
                        </span>
                        <span>极远 (SAT)</span>
                     </div>
                     <div className="relative flex items-center h-4">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600"></div>
                        <input type="range" min="-100" max="100" value={cameraParams.distance} onChange={(e) => handleCameraChange('distance', Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent z-10" />
                     </div>
                 </div>
                 {/* Row 4: FOV/Lens -100 to 100 */}
                 <div className="space-y-1">
                     <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Monitor size={10}/> 鱼眼 (12mm)</span>
                        <span className="text-cine-accent font-mono">
                            {cameraParams.fov < -50 ? 'Ultra Wide' : cameraParams.fov > 50 ? 'Super Tele' : 'Standard'}
                        </span>
                        <span>超长焦 (800mm)</span>
                     </div>
                     <div className="relative flex items-center h-4">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600"></div>
                        <input type="range" min="-100" max="100" value={cameraParams.fov} onChange={(e) => handleCameraChange('fov', Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent z-10" />
                     </div>
                 </div>
             </div>
        )}

        {/* === CHARACTER MODE === */}
        {pageMode === 'character' && (
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">三视图 (Views)</span>
                    <div className="flex gap-2">
                        {renderToggle("正面 (Front)", "views", "front", characterParams, toggleCharacterOption)}
                        {renderToggle("侧面 (Side)", "views", "side", characterParams, toggleCharacterOption)}
                        {renderToggle("背面 (Back)", "views", "back", characterParams, toggleCharacterOption)}
                    </div>
                </div>
                 <div className="space-y-1.5">
                    <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">专业视角 (Pro Angles)</span>
                    <div className="grid grid-cols-3 gap-2">
                        {renderToggle("半侧45° (3/4 Side)", "views", "3/4_side", characterParams, toggleCharacterOption)}
                        {renderToggle("背侧 (Rear 3/4)", "views", "3/4_back", characterParams, toggleCharacterOption)}
                        {renderToggle("过肩 (OTS)", "views", "ots", characterParams, toggleCharacterOption)}
                    </div>
                </div>
                 <div className="space-y-1.5">
                    <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">电影景别 (Shots)</span>
                    <div className="flex gap-2">
                        {renderToggle("全景 (Wide)", "shots", "wide", characterParams, toggleCharacterOption)}
                        {renderToggle("中景 (Medium)", "shots", "medium", characterParams, toggleCharacterOption)}
                        {renderToggle("特写 (Close)", "shots", "close", characterParams, toggleCharacterOption)}
                    </div>
                </div>
                <div className="space-y-1.5">
                    <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">表情特写 (Expressions)</span>
                    <div className="grid grid-cols-4 gap-2">
                        {renderToggle("喜", "expressions", "happy", characterParams, toggleCharacterOption)}
                        {renderToggle("怒", "expressions", "angry", characterParams, toggleCharacterOption)}
                        {renderToggle("哀", "expressions", "sad", characterParams, toggleCharacterOption)}
                        {renderToggle("乐", "expressions", "joy", characterParams, toggleCharacterOption)}
                    </div>
                </div>
            </div>
        )}

        {/* === LIGHTING MODE === */}
        {pageMode === 'lighting' && setLightingPreset && (
            <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-2">
                     <Lightbulb size={12} className="text-cine-accent"/>
                     <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">布光预设库 (LIGHTING PRESETS)</span>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                     {LIGHTING_PRESETS.map((p) => (
                         <button
                            key={p.id}
                            onClick={() => setLightingPreset(p)}
                            className={`group relative aspect-square rounded-xl border transition-all overflow-hidden flex flex-col items-center justify-center ${
                                lightingPreset?.id === p.id
                                ? 'border-cine-accent bg-cine-accent/10 shadow-[0_0_10px_rgba(214,0,28,0.3)]'
                                : 'border-zinc-800 bg-black/40 hover:border-zinc-600 hover:bg-black/60'
                            }`}
                         >
                             <div 
                                className="w-16 h-16 mb-2 opacity-80 group-hover:opacity-100 transition-opacity"
                                dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${p.svgContent}</svg>` }}
                             />
                             <div className={`text-[9px] font-bold text-center px-1 ${lightingPreset?.id === p.id ? 'text-white' : 'text-zinc-500'}`}>
                                 {p.name}
                             </div>
                         </button>
                     ))}
                 </div>
            </div>
        )}

        {/* === FACE SWAP MODE === */}
        {pageMode === 'faceswap' && (
            <div className="space-y-4">
                 {/* Slot 1: Target Image */}
                 <div className="space-y-2">
                     <div className="flex items-center justify-between">
                         <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">1. 底图 (带绿色遮罩)</span>
                         <span className="text-[8px] text-zinc-500">TARGET</span>
                     </div>
                     <div className="flex gap-2 h-16">
                         <div className="w-16 h-16 bg-black border border-cine-border rounded-lg overflow-hidden shrink-0 relative group">
                             {faceSwapTarget ? (
                                 <>
                                    <img 
                                        src={'url' in faceSwapTarget ? faceSwapTarget.url : faceSwapTarget.previewUrl} 
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" 
                                        alt="Target" 
                                    />
                                    <button 
                                        onClick={() => setShowMaskEditor(true)}
                                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <PenTool size={16} className="text-white drop-shadow-md" />
                                    </button>
                                 </>
                             ) : renderPlaceholder(PenTool, "Empty")}
                         </div>
                         <div className="flex-1 flex flex-col justify-center gap-1">
                             <Button 
                                size="sm" 
                                variant="secondary"
                                className="w-full text-[10px] py-1 h-7"
                                onClick={onSetFaceSwapTarget}
                                disabled={!activeSelectionType}
                             >
                                 将选中图片设为底图
                             </Button>
                             {faceSwapTarget && (
                                <Button
                                    size="sm"
                                    variant="primary"
                                    className="w-full text-[10px] py-1 h-7 bg-cine-accent hover:bg-cine-accent-hover text-white border-none"
                                    onClick={() => setShowMaskEditor(true)}
                                >
                                    <PenTool size={10} className="mr-1"/> 编辑遮罩 (Edit Mask)
                                </Button>
                             )}
                         </div>
                     </div>
                 </div>

                 <div className="w-full h-px bg-zinc-800/50"></div>

                 {/* Slot 2: Source Face */}
                 <div className="space-y-2">
                     <div className="flex items-center justify-between">
                         <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">2. 替换形象 (参考脸)</span>
                         <span className="text-[8px] text-zinc-500">SOURCE FACE</span>
                     </div>
                     <div className="flex gap-2 h-16">
                         <div className="w-16 h-16 bg-black border border-cine-border rounded-lg overflow-hidden shrink-0">
                             {faceSwapSource ? (
                                 <img src={faceSwapSource.previewUrl} className="w-full h-full object-cover" alt="Source" />
                             ) : renderPlaceholder(User, "Empty")}
                         </div>
                         <div className="flex-1 flex flex-col justify-center">
                             <Button 
                                size="sm" 
                                variant="secondary"
                                className="w-full text-[10px] py-1 h-8"
                                onClick={onSetFaceSwapSource}
                                disabled={activeSelectionType !== 'asset'}
                             >
                                 将选中素材设为脸模
                             </Button>
                         </div>
                     </div>
                 </div>
            </div>
        )}

        {/* ... (Next Shot, Default Mode code preserved) ... */}
        {pageMode === 'nextshot' && nextShotConfig && (
            <div className="space-y-4">
                 <div className="flex items-center gap-2 mb-1">
                     <SkipForward size={12} className="text-cine-accent"/>
                     <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">下一镜剧本 (NEXT ACTION)</span>
                 </div>
                 <textarea
                    value={nextShotScript}
                    onChange={(e) => setNextShotScript && setNextShotScript(e.target.value)}
                    placeholder="描述下一镜中发生的动作..."
                    className="w-full h-20 bg-black/30 border border-cine-border rounded-lg p-2 text-[10px] text-zinc-300 focus:border-cine-accent outline-none resize-none font-sans"
                 />
                 
                 <div className="space-y-2">
                     <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">景别选择 (Shot Size)</span>
                     <div className="flex gap-2">
                        {['Wide', 'Medium', 'Close-up'].map((size) => (
                            <button
                                key={size}
                                onClick={() => handleNextShotConfig('size', size)}
                                className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                                    nextShotConfig.size === size
                                    ? 'bg-cine-accent text-white border-cine-accent'
                                    : 'bg-black/40 text-zinc-500 border-zinc-800 hover:text-white'
                                }`}
                            >
                                {size}
                            </button>
                        ))}
                     </div>
                 </div>

                 <div className="space-y-2">
                     <span className="text-[9px] text-cine-text-muted font-bold uppercase tracking-wider">拍摄角度 (Camera Angle)</span>
                     <div className="flex gap-2">
                        {['Eye-Level', 'Low', 'High'].map((angle) => (
                            <button
                                key={angle}
                                onClick={() => handleNextShotConfig('angle', angle)}
                                className={`flex-1 py-1.5 text-[9px] font-bold uppercase rounded-lg border transition-all ${
                                    nextShotConfig.angle === angle
                                    ? 'bg-cine-accent text-white border-cine-accent'
                                    : 'bg-black/40 text-zinc-500 border-zinc-800 hover:text-white'
                                }`}
                            >
                                {angle}
                            </button>
                        ))}
                     </div>
                 </div>

                 <Button 
                    variant="primary" 
                    size="sm"
                    className="w-full gap-2 border border-cine-border/50 bg-gradient-to-r from-zinc-800 to-zinc-900"
                    onClick={onInferNextShotPrompt}
                    disabled={!nextShotScript?.trim() || isGenerating}
                 >
                     <Sparkles size={12} className={isGenerating ? "animate-spin" : ""} />
                     AI 智能推导提示词
                 </Button>
            </div>
        )}

        {/* === DEFAULT MODE: IMAGE COUNT === */}
        {pageMode === 'storyboard' && (
             <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">生成数量 (1-9)</span>
                </div>
                <div className="flex items-center gap-4 bg-black/30 p-2 rounded-xl border border-cine-border/50">
                    <input 
                      type="range" min="1" max="9" step="1"
                      value={imageCount}
                      onChange={(e) => setImageCount(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cine-accent" 
                    />
                    <input
                      type="number" min="1" max="9"
                      value={imageCount}
                      onChange={(e) => setImageCount(Number(e.target.value))}
                      className="w-8 h-6 bg-transparent text-xs text-white text-center font-mono border-none focus:ring-0 appearance-none"
                    />
                </div>
             </div>
        )}

        {/* === ASPECT RATIO SELECTOR === */}
        {/* Visible for Storyboard, Scene, AND Lighting (for feedback) */}
        {(pageMode === 'storyboard' || pageMode === 'scene' || pageMode === 'lighting') && (
            <div className="space-y-2">
                <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">画幅比例 (ASPECT RATIO)</span>
                <div className="grid grid-cols-3 gap-2">
                    {Object.entries(AspectRatio).map(([key, value]) => (
                        <button
                            key={key}
                            onClick={() => setAspectRatio(value as AspectRatio)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                aspectRatio === value 
                                ? 'bg-cine-accent text-white border-cine-accent' 
                                : 'bg-black/40 text-zinc-500 border-zinc-800 hover:text-white'
                            }`}
                        >
                             <div 
                                className="border border-current mb-1 opacity-80"
                                style={{ 
                                    width: '18px', 
                                    height: value === AspectRatio.WIDE ? '10px' : value === AspectRatio.PORTRAIT ? '24px' : '18px' 
                                }}
                             ></div>
                             <span className="text-[9px] font-mono">{value}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

         {/* === Resolution Option for ALL modes === */}
         <div className="space-y-2">
             <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">分辨率 (RESOLUTION)</span>
             <div className="relative">
                 <select 
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as ImageSize)}
                    className="w-full bg-black/30 border border-cine-border rounded-xl text-[10px] text-zinc-300 px-3 py-2 appearance-none focus:border-cine-accent outline-none font-mono"
                 >
                     {Object.entries(ImageSize).map(([key, value]) => (
                         <option key={key} value={value}>{value}</option>
                     ))}
                 </select>
                 <ChevronDown size={12} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500 pointer-events-none" />
             </div>
         </div>

        {/* === PROMPT INPUT (Used in Storyboard, Scene, Lighting, FaceSwap) === */}
        {pageMode !== 'nextshot' && (
             <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-cine-text-muted font-bold uppercase tracking-wider">
                         {pageMode === 'faceswap' ? '替换表情/描述 (可选)' : '画面描述 PROMPT'}
                    </span>
                    <button 
                        onClick={onEnhancePrompt} 
                        disabled={isGenerating || !prompt.trim()}
                        className="flex items-center gap-1 text-[9px] text-cine-accent hover:text-white transition-colors disabled:opacity-50"
                    >
                        <Sparkles size={10} />
                        <span>AI 优化</span>
                    </button>
                </div>
                
                <div className="relative group">
                    <textarea 
                        ref={textareaRef}
                        value={prompt}
                        onChange={handlePromptChange}
                        onScroll={handleScroll}
                        className="w-full h-32 bg-transparent border border-cine-border rounded-xl p-3 text-[11px] text-zinc-300 focus:border-cine-accent focus:ring-0 resize-none font-mono leading-relaxed z-10 relative"
                        placeholder={pageMode === 'faceswap' ? "例如: happy smile, cinematic lighting..." : "描述画面内容、构图、光影气氛... (支持输入 @ 调用素材)"}
                        spellCheck={false}
                    />
                    
                    {/* Backdrop for syntax highlighting (Mentions) */}
                    <div 
                        ref={backdropRef}
                        className="absolute inset-0 p-3 text-[11px] font-mono leading-relaxed text-transparent pointer-events-none whitespace-pre-wrap overflow-hidden z-0"
                        aria-hidden="true"
                    >
                        {renderHighlightedPrompt()}
                    </div>

                    {/* Mention Autocomplete Dropdown */}
                    {showMentions && mentionableAssets.length > 0 && (
                        <div className="absolute left-0 bottom-full mb-2 w-full bg-cine-dark border border-cine-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2">
                             <div className="px-3 py-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider border-b border-cine-border/50 bg-black/20">
                                 引用素材 Reference
                             </div>
                             <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                 {mentionableAssets.map(asset => (
                                     <button
                                        key={asset.id}
                                        onClick={() => insertMention(asset)}
                                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-cine-accent hover:text-white transition-colors text-left group/item"
                                     >
                                         <div className="w-6 h-6 rounded bg-black border border-zinc-700 overflow-hidden shrink-0">
                                             <img src={asset.previewUrl} className="w-full h-full object-cover" alt={asset.name} />
                                         </div>
                                         <div className="flex flex-col">
                                             <span className="text-[10px] font-bold text-zinc-300 group-hover/item:text-white">{asset.name}</span>
                                             <span className="text-[8px] text-zinc-600 group-hover/item:text-white/70 uppercase">{asset.category}</span>
                                         </div>
                                     </button>
                                 ))}
                             </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        <Button 
            variant="accent" 
            size="lg" 
            className="w-full h-12 text-sm font-bold uppercase tracking-widest shadow-xl shadow-cine-accent/20 hover:shadow-cine-accent/40 transition-all duration-300"
            onClick={onGenerate}
            disabled={isGenerateDisabled}
        >
            {isGenerating ? (
                <div className="flex items-center gap-2">
                    <Zap size={16} className="animate-spin" />
                    <span>RENDERING...</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Zap size={16} fill="currentColor" />
                    <span>GENERATE SHOT</span>
                </div>
            )}
        </Button>

      </div>
    </div>
  );
};