

import React, { useRef, useState } from 'react';
import { X, Film, Image as ImageIcon, Plus, Check, User, Map, Box, Lightbulb, SkipForward, RefreshCw } from 'lucide-react';
import { Asset, AssetCategory, PageMode } from '../types';

interface AssetBayProps {
  assets: Asset[];
  onAddAsset: (files: FileList, category: AssetCategory) => void;
  onRemoveAsset: (id: string) => void;
  onSelectAsset: (asset: Asset) => void;
  onToggleAsset: (id: string) => void;
  onRenameAsset: (id: string, name: string) => void;
  selectedAssetId?: string;
  pageMode: PageMode;
}

const CategorySection: React.FC<{
  title: string;
  category: AssetCategory;
  icon: React.ElementType;
  assets: Asset[];
  onAdd: (files: FileList, category: AssetCategory) => void;
  onRemove: (id: string) => void;
  onSelect: (asset: Asset) => void;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
  selectedAssetId?: string;
  isLargeView: boolean;
}> = ({ title, category, icon: Icon, assets, onAdd, onRemove, onSelect, onToggle, onRename, selectedAssetId, isLargeView }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-cine-text-muted px-1">
                <Icon size={12} className="text-cine-accent" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
                <span className="text-[9px] bg-cine-border text-cine-text-muted px-1.5 rounded-full font-mono">{assets.length}</span>
            </div>
            
            {/* Dynamic Grid: 2 columns for Large View (Scene/Character/Lighting), 5 columns for others (Compact) */}
            <div className={`grid ${isLargeView ? 'grid-cols-2 gap-3' : 'grid-cols-5 gap-1.5'}`}>
                {/* Add Button */}
                <div 
                    className="aspect-square border border-dashed border-cine-border bg-cine-panel/30 rounded-md hover:border-cine-accent hover:bg-cine-accent/5 transition-all cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                    title="上传素材"
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        multiple 
                        accept="image/*,video/*"
                        onChange={(e) => e.target.files && onAdd(e.target.files, category)}
                    />
                    <Plus className={`text-cine-text-muted group-hover:text-cine-accent transition-colors ${isLargeView ? 'w-6 h-6' : 'w-3.5 h-3.5'}`} />
                </div>

                {assets.map((asset) => (
                    <div key={asset.id} className="flex flex-col space-y-0.5">
                         <div 
                            onClick={() => onSelect(asset)}
                            className={`relative group aspect-square bg-cine-black rounded-md overflow-hidden cursor-pointer transition-all border ${
                                selectedAssetId === asset.id 
                                ? 'border-cine-accent shadow-[0_0_8px_-3px_rgba(214,0,28,0.4)]' 
                                : 'border-cine-border hover:border-zinc-500'
                            }`}
                        >
                            <img src={asset.previewUrl} alt="asset" className={`w-full h-full object-cover transition-opacity ${asset.isEnabled ? 'opacity-100' : 'opacity-40 grayscale'}`} />
                            
                            {/* Checkbox (Toggle Enable) */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); onToggle(asset.id); }}
                                className={`absolute top-0.5 right-0.5 rounded-full flex items-center justify-center border transition-all z-10 ${
                                    isLargeView ? 'w-5 h-5' : 'w-3 h-3'
                                } ${
                                    asset.isEnabled 
                                    ? 'bg-cine-accent border-cine-accent text-white' 
                                    : 'bg-black/60 border-zinc-500 text-transparent hover:border-zinc-300'
                                }`}
                            >
                                <Check size={isLargeView ? 10 : 6} strokeWidth={3} />
                            </div>

                            {/* Remove Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(asset.id); }} 
                                className={`absolute top-0.5 left-0.5 text-white bg-black/60 hover:bg-red-500 rounded-full transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm flex items-center justify-center ${
                                    isLargeView ? 'w-5 h-5' : 'p-0.5'
                                }`}
                            >
                                <X size={isLargeView ? 10 : 6} />
                            </button>
                        </div>
                        
                        {/* Naming Input */}
                        <input 
                            type="text" 
                            value={asset.name}
                            onChange={(e) => onRename(asset.id, e.target.value)}
                            placeholder="命名..."
                            className={`bg-transparent border-b border-transparent hover:border-cine-border focus:border-cine-accent text-zinc-400 focus:text-white w-full px-0.5 focus:outline-none placeholder:text-zinc-800 font-mono text-center truncate transition-colors ${
                                isLargeView ? 'text-[10px] py-1' : 'text-[8px] py-0'
                            }`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AssetBay: React.FC<AssetBayProps> = (props) => {
  const [isDragging, setIsDragging] = useState(false);

  const isSceneMode = props.pageMode === 'scene';
  const isCharacterMode = props.pageMode === 'character';
  const isLightingMode = props.pageMode === 'lighting';
  const isNextShotMode = props.pageMode === 'nextshot';
  const isFaceSwapMode = props.pageMode === 'faceswap';
  
  // "Large View" applies to these modes
  const isLargeView = isSceneMode || isCharacterMode || isLightingMode || isNextShotMode || isFaceSwapMode;

  // Group assets by category
  const chars = props.assets.filter(a => a.category === 'character');
  const scenes = props.assets.filter(a => a.category === 'scene');
  const propsAssets = props.assets.filter(a => a.category === 'prop');
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Logic adjustment: Context-aware default category
      let defaultCategory: AssetCategory = 'character';
      if (isSceneMode) defaultCategory = 'scene';
      else if (isCharacterMode) defaultCategory = 'character';
      else if (isLightingMode) defaultCategory = 'character';
      else if (isNextShotMode) defaultCategory = 'scene';
      else if (isFaceSwapMode) defaultCategory = 'character';
      
      props.onAddAsset(e.dataTransfer.files, defaultCategory); 
    }
  };

  // Prepare props mapping for CategorySection
  const sectionProps = {
      onAdd: props.onAddAsset,
      onRemove: props.onRemoveAsset,
      onSelect: props.onSelectAsset,
      onToggle: props.onToggleAsset,
      onRename: props.onRenameAsset,
      selectedAssetId: props.selectedAssetId,
      isLargeView: isLargeView
  };

  // Determine Title
  let bayTitle = '素材库 ASSETS';
  if (isCharacterMode) bayTitle = '角色库 ROLE LIBRARY';
  if (isSceneMode) bayTitle = '场景库 SCENE LIBRARY';
  if (isLightingMode) bayTitle = '原图上传 SOURCE';
  if (isNextShotMode) bayTitle = '上一镜参考 (PREVIOUS SHOT)';
  if (isFaceSwapMode) bayTitle = '换脸素材 (FACE SWAP ASSETS)';

  return (
    <div 
        className={`flex flex-col h-full transition-colors duration-200 rounded-2xl ${isDragging ? 'bg-cine-panel/50 ring-2 ring-cine-accent' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <div className="flex items-center justify-between px-1 mb-3">
         <span className="text-cine-text-muted text-xs font-bold tracking-wide">
             {bayTitle}
         </span>
      </div>

      <div className="pr-1 overflow-y-auto custom-scrollbar h-full space-y-6">
        
        {/* CHARACTER SECTION */}
        {(isCharacterMode || isLightingMode || isFaceSwapMode || (!isSceneMode && !isCharacterMode && !isLightingMode && !isNextShotMode && !isFaceSwapMode)) && (
            <CategorySection 
                title={isLightingMode ? "人物 / CHARACTER" : isFaceSwapMode ? "人物 / SOURCE FACES" : "角色 / CAST"} 
                category="character" 
                icon={User} 
                assets={chars} 
                {...sectionProps} 
            />
        )}

        {/* SCENE SECTION */}
        {(isSceneMode || isLightingMode || isNextShotMode || isFaceSwapMode || (!isSceneMode && !isCharacterMode && !isLightingMode && !isFaceSwapMode)) && (
            <CategorySection 
                title={isFaceSwapMode ? "底图 / TARGET IMAGES" : "场景 / SCENE"} 
                category="scene" 
                icon={isNextShotMode ? SkipForward : isFaceSwapMode ? RefreshCw : Map} 
                assets={scenes} 
                {...sectionProps} 
            />
        )}

        {/* PROP SECTION: Show ONLY in Standard Mode */}
        {(!isSceneMode && !isCharacterMode && !isLightingMode && !isNextShotMode && !isFaceSwapMode) && (
            <CategorySection 
                title="道具 / PROP" 
                category="prop" 
                icon={Box} 
                assets={propsAssets} 
                {...sectionProps} 
            />
        )}
      </div>
    </div>
  );
};