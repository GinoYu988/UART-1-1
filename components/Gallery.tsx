import React, { useState, useRef, useEffect } from 'react';
import { GeneratedImage, PageMode } from '../types';
import { Trash2, LayoutGrid, List, Download, Archive, Info, X, Send, User, Map, Lightbulb, Clapperboard, PenTool, Check, Save, PanelRightClose, PanelRightOpen, Square } from 'lucide-react';
import { Button } from './Button';

interface GalleryProps {
  images: GeneratedImage[];
  onSelect: (image: GeneratedImage) => void;
  selectedId: string | undefined;
  onDelete: (id: string) => void;
  onDownloadAll: () => void;
  emptyState?: React.ReactNode;
  title?: string;
  onSendToPage?: (image: GeneratedImage, targetPage: PageMode) => void;
  onAddImage?: (image: GeneratedImage) => void;
  isInspectorVisible?: boolean;
  onToggleInspector?: () => void;
  isInspectorAvailable?: boolean;
}

type ViewMode = 'grid' | 'table';
type ToolType = 'brush' | 'rect';

export const Gallery: React.FC<GalleryProps> = ({
  images,
  onSelect,
  selectedId,
  onDelete,
  onDownloadAll,
  emptyState,
  title,
  onSendToPage,
  onAddImage,
  isInspectorVisible,
  onToggleInspector,
  isInspectorAvailable
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Painting State
  const [isPainting, setIsPainting] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Refs for drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ref to store the canvas state before the current stroke (for undoing rect preview)
  const snapshotRef = useRef<ImageData | null>(null);
  const startPosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // Initialize canvas when entering painting mode
  useEffect(() => {
    if (previewImage && imageRef.current && canvasRef.current) {
        // Set canvas resolution to match natural image size for high fidelity
        const img = imageRef.current;
        const cvs = canvasRef.current;
        if (cvs.width !== img.naturalWidth || cvs.height !== img.naturalHeight) {
             cvs.width = img.naturalWidth;
             cvs.height = img.naturalHeight;
             const ctx = cvs.getContext('2d');
             if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
        }
    }
  }, [previewImage, isPainting]);

  const handleImageClick = (img: GeneratedImage) => {
      onSelect(img); 
      setPreviewImage(img);
      setIsPainting(false); // Reset painting state on open
      setActiveTool('brush'); // Reset tool
  };

  const toggleDropdown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setOpenDropdownId(prev => prev === id ? null : id);
  };

  const handleSendAction = (e: React.MouseEvent, img: GeneratedImage, target: PageMode) => {
      e.stopPropagation();
      if (onSendToPage) {
          onSendToPage(img, target);
      }
      setOpenDropdownId(null);
  };

  // --- Drawing Logic ---

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !imageRef.current) return { x: 0, y: 0 };
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // Calculate scale because displayed size might be different from natural size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
      };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPainting) return;
      setIsDrawing(true);
      const { x, y } = getCoordinates(e);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
          // Save snapshot for Rect tool (to clear preview on each move)
          snapshotRef.current = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          startPosRef.current = { x, y };

          ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // Green semi-transparent
          ctx.lineWidth = brushSize * (canvasRef.current!.width / 1000); // Scale brush relative to image size
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (activeTool === 'brush') {
            ctx.beginPath();
            ctx.moveTo(x, y);
          }
      }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !isPainting) return;
      const { x, y } = getCoordinates(e);
      const ctx = canvasRef.current?.getContext('2d');
      
      if (ctx) {
          if (activeTool === 'brush') {
              ctx.lineTo(x, y);
              ctx.stroke();
          } else if (activeTool === 'rect' && snapshotRef.current) {
              // Restore the canvas to state before this drag started
              ctx.putImageData(snapshotRef.current, 0, 0);
              
              // Draw the new rectangle
              const startX = startPosRef.current.x;
              const startY = startPosRef.current.y;
              const width = x - startX;
              const height = y - startY;

              ctx.beginPath();
              ctx.rect(startX, startY, width, height);
              ctx.stroke();
          }
      }
  };

  const stopDrawing = () => {
      setIsDrawing(false);
      // Snapshot is automatically "committed" because we simply stop restoring the old one
  };

  const handleSaveComposite = async () => {
      if (!previewImage || !canvasRef.current || !imageRef.current || !onAddImage) return;

      // Create a temporary canvas to composite image + mask
      const width = imageRef.current.naturalWidth;
      const height = imageRef.current.naturalHeight;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) return;

      // 1. Draw original image
      ctx.drawImage(imageRef.current, 0, 0);

      // 2. Draw mask from painting canvas
      ctx.drawImage(canvasRef.current, 0, 0);

      // 3. Export
      const dataUrl = tempCanvas.toDataURL('image/png');
      
      // 4. Create new generated image object
      const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: dataUrl,
          prompt: `[MASKED] ${previewImage.prompt}`,
          aspectRatio: previewImage.aspectRatio,
          timestamp: Date.now()
      };

      onAddImage(newImage);
      setPreviewImage(null); // Close preview or switch to new image
  };

  return (
    <div className="flex flex-col h-full bg-black relative selection:bg-cine-accent selection:text-black" onClick={() => setOpenDropdownId(null)}>
      {/* Header / Toolbar */}
      <div className="absolute top-0 left-0 right-0 h-16 px-6 flex items-center justify-end z-20 bg-gradient-to-b from-black via-black/90 to-transparent pointer-events-none">
         
         {/* Right Side Controls */}
         <div className="flex items-center gap-2 pointer-events-auto">
             
             {/* Item Count Display (Moved from left) */}
             {title && (
                <span className="text-cine-text-muted text-[10px] uppercase tracking-[0.2em] font-mono font-bold mr-4">
                    {images.length} ITEMS
                </span>
             )}

             {/* View Toggles */}
             <div className="flex bg-zinc-900/80 rounded-sm p-0.5 border border-zinc-800 backdrop-blur-sm mr-4">
                 <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-[1px] transition-all ${viewMode === 'grid' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="网格视图"
                 >
                     <LayoutGrid size={14} />
                 </button>
                 <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-[1px] transition-all ${viewMode === 'table' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title="列表视图"
                 >
                     <List size={14} />
                 </button>
                 
                 {/* Inspector Toggle Button */}
                 {isInspectorAvailable && onToggleInspector && (
                     <>
                        <div className="w-px bg-zinc-700 mx-1 my-1"></div>
                        <button
                            onClick={onToggleInspector}
                            className={`p-1.5 rounded-[1px] transition-all text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700`}
                            title={isInspectorVisible ? "隐藏信息面板" : "显示信息面板"}
                        >
                            {isInspectorVisible ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                        </button>
                     </>
                 )}
             </div>

             {images.length > 0 && (
                 <Button variant="ghost" size="sm" onClick={onDownloadAll} className="flex items-center gap-2 border border-zinc-800 bg-black/50 backdrop-blur hover:bg-zinc-800 text-[10px] h-8">
                     <Archive size={12} />
                     <span className="uppercase tracking-wider">批量下载 ZIP</span>
                 </Button>
             )}
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8 pt-20 custom-scrollbar">
        {images.length === 0 ? (
            emptyState || (
                <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-3">
                    <Info className="w-10 h-10 opacity-20" />
                    <p className="text-xs uppercase tracking-widest font-mono">暂无渲染内容</p>
                </div>
            )
        ) : (
            <>
                {viewMode === 'grid' ? (
                    // GRID VIEW - Adjusted for Larger Images
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
                        {images.map((img) => (
                            <div 
                                key={img.id} 
                                className={`group relative bg-zinc-900 border transition-all duration-300 cursor-zoom-in overflow-visible rounded-md shadow-lg ${
                                    selectedId === img.id 
                                    ? 'border-cine-accent ring-1 ring-cine-accent/50 shadow-[0_0_20px_-5px_rgba(214,0,28,0.3)]' 
                                    : 'border-zinc-800 hover:border-zinc-500 hover:shadow-xl'
                                }`}
                                style={{ aspectRatio: img.aspectRatio.replace(':', '/') }}
                                onClick={() => handleImageClick(img)}
                            >
                                <img 
                                    src={img.url} 
                                    alt="render" 
                                    className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${selectedId === img.id ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}`}
                                />
                                
                                {img.fullGridUrl && (
                                    <div className="absolute top-3 right-3 z-10 pointer-events-none">
                                        <div className="w-2 h-2 bg-cine-accent shadow-[0_0_8px_rgba(214,0,28,0.8)] rounded-full" title="Grid Slice"></div>
                                    </div>
                                )}

                                {/* Hover Overlay Actions */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between pointer-events-none">
                                    <div className="self-start pointer-events-auto relative">
                                        {onSendToPage && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => toggleDropdown(e, img.id)}
                                                    className={`p-2 rounded-full backdrop-blur-md border transition-colors ${openDropdownId === img.id ? 'bg-cine-accent text-white border-cine-accent' : 'bg-black/50 text-white border-white/20 hover:bg-cine-accent hover:border-cine-accent'}`}
                                                    title="发送至工作流"
                                                >
                                                    <Send size={14} />
                                                </button>
                                                {openDropdownId === img.id && (
                                                    <div className="absolute top-full left-0 mt-2 w-40 bg-cine-dark border border-cine-border rounded-lg shadow-2xl overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-100">
                                                        <div className="py-1">
                                                            <div className="px-3 py-1.5 text-[9px] text-cine-text-muted font-bold uppercase tracking-wider border-b border-cine-border/50">发送至工作台</div>
                                                            <button onClick={(e) => handleSendAction(e, img, 'character')} className="w-full text-left px-3 py-2 text-[10px] text-zinc-300 hover:bg-cine-accent hover:text-white flex items-center gap-2 transition-colors">
                                                                <User size={12}/> 人物造型
                                                            </button>
                                                            <button onClick={(e) => handleSendAction(e, img, 'scene')} className="w-full text-left px-3 py-2 text-[10px] text-zinc-300 hover:bg-cine-accent hover:text-white flex items-center gap-2 transition-colors">
                                                                <Map size={12}/> 场景设计
                                                            </button>
                                                            <button onClick={(e) => handleSendAction(e, img, 'lighting')} className="w-full text-left px-3 py-2 text-[10px] text-zinc-300 hover:bg-cine-accent hover:text-white flex items-center gap-2 transition-colors">
                                                                <Lightbulb size={12}/> 灯光设计
                                                            </button>
                                                            <button onClick={(e) => handleSendAction(e, img, 'storyboard')} className="w-full text-left px-3 py-2 text-[10px] text-zinc-300 hover:bg-cine-accent hover:text-white flex items-center gap-2 transition-colors">
                                                                <Clapperboard size={12}/> 故事板
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pointer-events-auto">
                                        <span className="text-[10px] text-zinc-300 font-mono tracking-wider bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">{img.aspectRatio}</span>
                                        <button 
                                            className="text-zinc-400 hover:text-red-500 transition-colors p-1.5 hover:bg-white/10 rounded-full"
                                            onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                                            title="删除"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // TABLE VIEW
                    <div className="space-y-4 max-w-6xl mx-auto pb-10">
                        {images.map((img) => (
                             <div 
                                key={img.id}
                                onClick={() => handleImageClick(img)}
                                className={`group flex flex-col sm:flex-row gap-6 p-4 bg-zinc-900/20 border rounded-sm transition-all cursor-zoom-in ${
                                    selectedId === img.id 
                                    ? 'border-cine-accent bg-zinc-900/40' 
                                    : 'border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/30'
                                }`}
                             >
                                 <div 
                                    className="flex-shrink-0 bg-black border border-zinc-800 relative overflow-visible h-[280px] w-auto max-w-[45%] self-start rounded-sm"
                                    style={{ aspectRatio: img.aspectRatio.replace(':', '/') }}
                                 >
                                     <img src={img.url} alt="render" className="w-full h-full object-cover" />
                                     {onSendToPage && (
                                         <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <div className="relative">
                                                 <button
                                                     onClick={(e) => toggleDropdown(e, img.id)}
                                                     className={`p-1.5 rounded-full backdrop-blur-md border transition-colors ${openDropdownId === img.id ? 'bg-cine-accent text-white border-cine-accent' : 'bg-black/50 text-white border-white/20 hover:bg-cine-accent hover:border-cine-accent'}`}
                                                 >
                                                     <Send size={12} />
                                                 </button>
                                             </div>
                                         </div>
                                     )}
                                 </div>

                                 <div className="flex-1 flex flex-col min-w-0 py-1">
                                     <div className="flex items-start justify-between mb-3">
                                         <div className="space-y-1">
                                             <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">ID: {img.id.substring(0, 8)}</div>
                                             <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                                                 {new Date(img.timestamp).toLocaleTimeString()} • <span className="text-zinc-300">{img.aspectRatio}</span>
                                             </div>
                                         </div>
                                         <div className="flex gap-2">
                                             <a 
                                                href={img.url} 
                                                download={`cinescout-${img.id}.png`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-700 rounded-sm transition-all bg-zinc-900"
                                                title="下载图片"
                                             >
                                                 <Download size={14} />
                                             </a>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                                                className="p-2 text-zinc-500 hover:text-red-500 border border-transparent hover:border-red-900/30 rounded-sm transition-all bg-zinc-900"
                                                title="删除"
                                             >
                                                 <Trash2 size={14} />
                                             </button>
                                         </div>
                                     </div>
                                     
                                     <div className="flex-1 bg-black/40 border border-zinc-800/50 p-4 rounded-sm overflow-hidden group-hover:border-zinc-700 transition-colors">
                                         <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest block mb-2">生成提示词</span>
                                         <p className="text-zinc-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                                             {img.prompt}
                                         </p>
                                     </div>
                                 </div>
                             </div>
                        ))}
                    </div>
                )}
            </>
        )}

        {/* FULLSCREEN LIGHTBOX & EDITOR */}
        {previewImage && (
            <div 
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300 cursor-default"
                onClick={() => setPreviewImage(null)}
            >
                {/* Editor Container */}
                <div 
                    ref={containerRef}
                    className="relative flex items-center justify-center max-w-full max-h-[80vh] p-8 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Underlying Image */}
                    <img 
                        ref={imageRef}
                        src={previewImage.url} 
                        alt="Preview" 
                        className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm select-none"
                        draggable={false}
                    />

                    {/* Canvas Overlay for Painting */}
                    <canvas
                        ref={canvasRef}
                        className={`absolute inset-0 w-full h-full cursor-crosshair ${isPainting ? 'pointer-events-auto z-20' : 'pointer-events-none z-0'}`}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                    />
                </div>

                {/* Toolbar */}
                <div 
                    className="mt-6 flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 p-2 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Paint Toggle (Main Switch) */}
                    <button 
                        onClick={() => setIsPainting(!isPainting)}
                        className={`p-3 rounded-xl transition-all ${isPainting ? 'bg-cine-accent text-white shadow-lg shadow-cine-accent/20' : 'text-zinc-400 hover:text-white hover:bg-white/10'}`}
                        title="进入编辑模式 (Edit Mode)"
                    >
                        <PenTool size={20} />
                    </button>

                    {isPainting && (
                        <div className="flex items-center gap-2 pl-2 border-l border-zinc-700 animate-in slide-in-from-left-4 fade-in">
                            {/* Brush Tool */}
                            <button
                                onClick={() => setActiveTool('brush')}
                                className={`p-2 rounded-lg transition-all ${activeTool === 'brush' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                                title="画笔 (Brush)"
                            >
                                <PenTool size={16} />
                            </button>

                            {/* Rect Tool */}
                            <button
                                onClick={() => setActiveTool('rect')}
                                className={`p-2 rounded-lg transition-all ${activeTool === 'rect' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
                                title="矩形框 (Rectangle)"
                            >
                                <Square size={16} />
                            </button>

                            {/* Brush Size Slider */}
                             <div className="flex items-center gap-3 px-2 border-l border-zinc-700 ml-2">
                                 <span className="text-[10px] text-zinc-500 font-mono uppercase">Size</span>
                                 <input 
                                    type="range" min="5" max="100" 
                                    value={brushSize} 
                                    onChange={(e) => setBrushSize(Number(e.target.value))}
                                    className="w-24 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                                 />
                             </div>
                        </div>
                    )}

                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>

                    {/* Action Buttons */}
                    {onAddImage && isPainting && (
                        <button 
                            onClick={handleSaveComposite}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors"
                        >
                            <Save size={16} /> 保存副本 (SAVE COPY)
                        </button>
                    )}

                    <a 
                        href={previewImage.url} 
                        download={`cinescout-${previewImage.id}.png`}
                        className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        title="下载"
                    >
                        <Download size={20} />
                    </a>
                    <button 
                        onClick={() => { onDelete(previewImage.id); setPreviewImage(null); }}
                        className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        title="删除"
                    >
                        <Trash2 size={20} />
                    </button>
                    
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                    
                    <button 
                        onClick={() => setPreviewImage(null)}
                        className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="absolute bottom-6 left-6 max-w-xl opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-zinc-500 text-[10px] font-mono leading-relaxed">{previewImage.prompt}</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};