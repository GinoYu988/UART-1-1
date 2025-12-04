
import React, { useState, useEffect } from 'react';
import { AssetBay } from './components/AssetBay';
import { DirectorDeck } from './components/DirectorDeck';
import { Canvas, WorkflowConfig } from './components/Canvas';
import { CharacterBoard, SceneBoard, LightingBoard, NextShotBoard, FaceSwapBoard } from './components/Boards';
import { Inspector } from './components/Inspector';
import { GlobalNav } from './components/GlobalNav';
import { Dashboard } from './components/Dashboard';
import { ScriptPhase } from './components/ScriptPhase';
import { ShotListPhase } from './components/ShotListPhase';
import { LandingPage } from './components/LandingPage';
import { Asset, GeneratedImage, AspectRatio, ImageSize, AssetCategory, PageMode, CameraParams, CharacterParams, LightingPreset, AppPhase } from './types';
import { generateMultiViewGrid, fileToBase64, enhancePrompt, analyzeAsset, ReferenceImageData, dataURLtoFile, inferNextShotPrompt } from './services/geminiService';
import { AlertCircle, X, ChevronDown, Layout } from 'lucide-react';
import { dbService } from './services/db';
// @ts-ignore
import JSZip from 'jszip';

const App: React.FC = () => {
  // --- App Phase State (Default to Intro) ---
  const [appPhase, setAppPhase] = useState<AppPhase>('intro');

  // --- Storyboard State ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>('storyboard');
  
  // Selection State (Shared between Lightbox/Assets and Inspector)
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>(undefined);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  
  // Inspector Visibility State
  const [isInspectorVisible, setIsInspectorVisible] = useState(true);
  
  // Generation Settings
  const [imageCount, setImageCount] = useState<number>(4); // Default 4 images
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.WIDE);
  const [imageSize, setImageSize] = useState<ImageSize>(ImageSize.FHD_1080P); // Default to 1080p
  const [prompt, setPrompt] = useState<string>('');
  
  // Camera Settings (For Scene Mode)
  const [cameraParams, setCameraParams] = useState<CameraParams>({
    pan: 0, tilt: 0, distance: 0, fov: 0
  });

  // Character Settings (For Character Mode)
  const [characterParams, setCharacterParams] = useState<CharacterParams>({
      views: [], shots: [], expressions: []
  });

  // Lighting Settings
  const [lightingPreset, setLightingPreset] = useState<LightingPreset | undefined>(undefined);

  // Next Shot Settings
  const [nextShotScript, setNextShotScript] = useState<string>('');
  const [nextShotConfig, setNextShotConfig] = useState<{ size: string, angle: string }>({ size: 'Medium', angle: 'Eye-Level' });
  
  // Face Swap Settings
  const [faceSwapTarget, setFaceSwapTarget] = useState<GeneratedImage | Asset | null>(null);
  const [faceSwapSource, setFaceSwapSource] = useState<Asset | null>(null);

  // Processing Flags
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(''); // Detailed loading state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // --- Effects ---

  // 1. Load Assets & Images from DB on Mount
  useEffect(() => {
    const loadData = async () => {
        try {
            // Seed Demo Data if empty
            await dbService.seedDemoData();

            // Load Images (Base64 is fine)
            const loadedImages = await dbService.getAll<GeneratedImage>(dbService.stores.IMAGES);
            setImages(loadedImages.sort((a,b) => b.timestamp - a.timestamp));

            // Load Assets (Need to regenerate ObjectURLs)
            const loadedAssets = await dbService.getAll<Asset>(dbService.stores.ASSETS);
            const processedAssets = loadedAssets.map(a => ({
                ...a,
                previewUrl: URL.createObjectURL(a.file) // Re-create blob URL
            }));
            setAssets(processedAssets);

        } catch (e) {
            console.error("DB Load Error", e);
        }
    };
    loadData();
  }, []);
  
  // Clear selection when switching pages to avoid context confusion
  useEffect(() => {
    setSelectedAssetId(undefined);
    setSelectedImageId(undefined);
  }, [pageMode]);

  // --- Helpers ---
  const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
      const ratio = width / height;
      const map = [
          { r: 1, ar: AspectRatio.SQUARE },
          { r: 4/3, ar: AspectRatio.STANDARD },
          { r: 3/4, ar: AspectRatio.PORTRAIT },
          { r: 16/9, ar: AspectRatio.WIDE },
          { r: 9/16, ar: AspectRatio.MOBILE },
          { r: 21/9, ar: AspectRatio.CINEMA },
      ];
      // Find closest supported ratio
      return map.reduce((prev, curr) => 
        Math.abs(curr.r - ratio) < Math.abs(prev.r - ratio) ? curr : prev
      ).ar;
  };

  // --- Handlers ---

  const handleImageCountChange = (count: number) => {
    setImageCount(count);
  };

  const handleAddAsset = async (files: FileList, category: AssetCategory) => {
    const newAssets: Asset[] = [];
    
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const name = file.name.split('.')[0].substring(0, 10); 
      const newAsset: Asset = {
        id: crypto.randomUUID(),
        file,
        previewUrl: url,
        type: file.type.startsWith('video') ? 'video' : 'image',
        category: category,
        name: name,
        isEnabled: true, 
        sourcePage: pageMode 
      };
      newAssets.push(newAsset);
    });

    // Update State
    setAssets((prev) => [...prev, ...newAssets]);
    if (newAssets.length > 0) handleSelectAsset(newAssets[0]);

    // DB Update
    for (const a of newAssets) {
        await dbService.put(dbService.stores.ASSETS, a);
    }
  };

  // NEW: Handler to add a generated/edited image back to the list
  const handleAddGeneratedImage = async (newImage: GeneratedImage) => {
      setImages(prev => [newImage, ...prev]);
      handleSelectImage(newImage);
      // DB Update
      await dbService.put(dbService.stores.IMAGES, newImage);
  };

  const handleRemoveAsset = async (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (selectedAssetId === id) setSelectedAssetId(undefined);
    // DB Update
    await dbService.delete(dbService.stores.ASSETS, id);
  };

  const handleToggleAsset = async (id: string) => {
      setAssets(prev => prev.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a));
      // DB Update (Optimistic)
      const asset = assets.find(a => a.id === id);
      if (asset) {
          await dbService.put(dbService.stores.ASSETS, { ...asset, isEnabled: !asset.isEnabled });
      }
  };

  const handleRenameAsset = async (id: string, name: string) => {
      setAssets(prev => prev.map(a => a.id === id ? { ...a, name: name } : a));
      // DB Update
      const asset = assets.find(a => a.id === id);
      if (asset) {
          await dbService.put(dbService.stores.ASSETS, { ...asset, name });
      }
  };

  const handleSelectAsset = (asset: Asset) => {
      setSelectedAssetId(asset.id);
      setSelectedImageId(undefined); // Deselect image when asset is selected
      setAnalysisResult('');
      setIsInspectorVisible(true); // Auto-open inspector

      // Auto-detect aspect ratio for Lighting Mode
      if (pageMode === 'lighting' && asset.type === 'image') {
          const img = new Image();
          img.onload = () => {
              const detectedAr = getClosestAspectRatio(img.width, img.height);
              setAspectRatio(detectedAr);
          };
          img.src = asset.previewUrl;
      }
  };

  const handleSelectImage = (image: GeneratedImage) => {
      setSelectedImageId(image.id);
      setSelectedAssetId(undefined); // Deselect asset when image is selected
      setAnalysisResult('');
      setIsInspectorVisible(true); // Auto-open inspector
  };

  const toggleInspector = () => {
      setIsInspectorVisible(prev => !prev);
  };

  const isInspectorAvailable = !!(selectedImageId || selectedAssetId);

  const handleApplyWorkflow = (config: WorkflowConfig) => {
      setAspectRatio(config.aspectRatio);
      setImageCount(config.imageCount);
      setPrompt(config.promptTemplate);
      setPageMode(config.targetPage); // Navigate to the sub-page
  };

  const handleSetFaceSwapTarget = () => {
    if (selectedImageId) {
        const img = images.find(i => i.id === selectedImageId);
        if (img) setFaceSwapTarget(img);
    } else if (selectedAssetId) {
        const asset = assets.find(a => a.id === selectedAssetId);
        if (asset) setFaceSwapTarget(asset);
    }
  };

  const handleSetFaceSwapSource = () => {
    if (selectedAssetId) {
        const asset = assets.find(a => a.id === selectedAssetId);
        if (asset) setFaceSwapSource(asset);
    }
  };

  const handleUpdateFaceSwapTarget = async (dataUrl: string) => {
      // Create a new GeneratedImage from the masked result
      const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: dataUrl,
          prompt: '[MASKED TARGET] ' + (faceSwapTarget ? ('id' in faceSwapTarget ? faceSwapTarget.id.substring(0,6) : '') : ''),
          aspectRatio: AspectRatio.WIDE,
          timestamp: Date.now()
      };
      
      // Add to gallery
      setImages(prev => [newImage, ...prev]);
      
      // Update the target
      setFaceSwapTarget(newImage);

      // DB Update
      await dbService.put(dbService.stores.IMAGES, newImage);
  };
  
  // NEW: Send generated image to another workspace as reference
  const handleSendImageToWorkspace = async (image: GeneratedImage, targetPage: PageMode) => {
      try {
          // 1. Convert Generated Image (DataURL) to File
          const fileName = `ref_${image.id.substring(0, 6)}.png`;
          const file = dataURLtoFile(image.url, fileName);
          
          // 2. Determine Asset Category based on target page
          let category: AssetCategory = 'character';
          if (targetPage === 'scene') category = 'scene';
          if (targetPage === 'storyboard') category = 'scene';
          if (targetPage === 'nextshot') category = 'scene';
          if (targetPage === 'faceswap') category = 'character';
          
          // 3. Create Asset
          const url = URL.createObjectURL(file);
          const newAsset: Asset = {
            id: crypto.randomUUID(),
            file,
            previewUrl: url,
            type: 'image',
            category: category,
            name: fileName.split('.')[0],
            isEnabled: true,
            sourcePage: targetPage // Assign to the target page's workspace
          };
          
          // 4. Update State
          setAssets((prev) => [...prev, newAsset]);
          
          // 5. Navigate and Select
          setPageMode(targetPage);
          // If we are sending to storyboard logic, we also need to ensure AppPhase is storyboard
          if (appPhase !== 'storyboard') setAppPhase('storyboard');
          
          // DB Update
          await dbService.put(dbService.stores.ASSETS, newAsset);

          // Small timeout to allow render, then select
          setTimeout(() => handleSelectAsset(newAsset), 100);
          
      } catch (e) {
          console.error("Failed to transfer image to workspace", e);
          setError("无法将图片发送到工作流。");
      }
  };

  const handleAnalyzeSelection = async (instructionPrompt: string) => {
    const assetToAnalyze = assets.find(a => a.id === selectedAssetId);
    const imageToAnalyze = images.find(i => i.id === selectedImageId);
    let base64Data = '';
    let mimeType = 'image/jpeg';
    if (assetToAnalyze) {
        try { base64Data = await fileToBase64(assetToAnalyze.file); mimeType = assetToAnalyze.file.type; } 
        catch (e) { setError("无法读取素材文件。"); return; }
    } else if (imageToAnalyze) { base64Data = imageToAnalyze.url.split(',')[1]; } 
    else { return; }
    setIsAnalyzing(true);
    try {
        const result = await analyzeAsset(base64Data, mimeType, instructionPrompt);
        setAnalysisResult(result);
    } catch (e: any) { handleError(e); } finally { setIsAnalyzing(false); }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true); 
    setLoadingMessage('AI 正在优化提示词...');
    try { const enhanced = await enhancePrompt(prompt); setPrompt(enhanced); } 
    catch (e) { console.error(e); } finally { setIsGenerating(false); setLoadingMessage(''); }
  };

  // Logic for Next Shot Prompt Inference
  const handleInferNextShotPrompt = async () => {
      // Find valid reference asset
      const activeAssets = assets.filter(a => a.isEnabled && a.sourcePage === pageMode);
      if (activeAssets.length === 0) {
          setError("请上传并选中一张‘上一镜’参考图。");
          return;
      }
      
      setIsGenerating(true);
      setLoadingMessage('正在分析画面并推导下一镜...');
      try {
          const prevAsset = activeAssets[0];
          const base64 = await fileToBase64(prevAsset.file);
          
          const inferredPrompt = await inferNextShotPrompt(
              base64, 
              prevAsset.file.type, 
              nextShotScript, 
              nextShotConfig.size, 
              nextShotConfig.angle
          );
          
          setPrompt(inferredPrompt);
      } catch (e: any) {
          handleError(e);
      } finally {
          setIsGenerating(false);
          setLoadingMessage('');
      }
  };

  const getCameraPrompt = (params: CameraParams) => {
      const parts = [];

      // PAN (-180 to 180)
      if (params.pan < -150) parts.push(`180° Camera Pan Left (Reverse Angle/Turnaround)`);
      else if (params.pan > 150) parts.push(`180° Camera Pan Right (Reverse Angle/Turnaround)`);
      else if (params.pan < -90) parts.push(`Hard Pan Left (${Math.abs(params.pan)} degrees)`);
      else if (params.pan > 90) parts.push(`Hard Pan Right (${params.pan} degrees)`);
      else if (params.pan !== 0) parts.push(`Camera Pan ${params.pan < 0 ? 'Left' : 'Right'} ${Math.abs(params.pan)}°`);
      else parts.push("Center Frame");

      // TILT (-90 to 90)
      if (params.tilt > 60) parts.push(`90° Top-Down Overhead Shot (God's Eye View)`);
      else if (params.tilt < -60) parts.push(`90° Extreme Low Angle Looking Up (Worm's Eye View)`);
      else if (params.tilt > 30) parts.push(`High Angle Shot (${params.tilt}°)`);
      else if (params.tilt < -30) parts.push(`Low Angle Shot (${Math.abs(params.tilt)}°)`);
      else parts.push("Eye Level");

      // DISTANCE (-100 to 100)
      if (params.distance < -80) parts.push("Extreme Macro Close-up (Detail)");
      else if (params.distance < -50) parts.push("Extreme Close-up (ECU)");
      else if (params.distance < -20) parts.push("Close-up (CU)");
      else if (params.distance > 80) parts.push("Satellite View / Extreme Establishing Shot");
      else if (params.distance > 50) parts.push("Extreme Long Shot (ELS)");
      else if (params.distance > 20) parts.push("Full Shot / Wide Shot");
      else parts.push("Medium Shot");

      // FOV (-100 to 100) -> 12mm to 800mm
      if (params.fov < -80) parts.push("Fisheye Lens (12mm Distortion)");
      else if (params.fov < -50) parts.push("Ultra Wide Angle Lens (16mm)");
      else if (params.fov < -20) parts.push("Wide Angle Lens (24mm-35mm)");
      else if (params.fov > 80) parts.push("Super Telephoto Lens (800mm Compression)");
      else if (params.fov > 50) parts.push("Telephoto Lens (200mm)");
      else if (params.fov > 20) parts.push("Portrait Lens (85mm)");
      else parts.push("Standard Lens (50mm)");

      return `[CAMERA DIRECTIVES: ${parts.join(' | ')}]`;
  };

  // Helper to convert SVG string to Base64 Image
  const svgToImageBase64 = (svgString: string): Promise<string> => {
      return new Promise((resolve, reject) => {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">${svgString}</svg>`;
          const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.fillStyle = 'black'; // Background for preset
                  ctx.fillRect(0,0, 512, 512);
                  ctx.drawImage(img, 0, 0, 512, 512);
                  const pngData = canvas.toDataURL('image/png').split(',')[1];
                  resolve(pngData);
              } else {
                  reject(new Error("Canvas context failed"));
              }
              URL.revokeObjectURL(url);
          };
          img.onerror = () => reject(new Error("SVG rasterization failed"));
          img.src = url;
      });
  };

  const handleGenerate = async () => {
    setError(null);
    
    // STRICT FILTER: Only use assets that belong to the current page mode
    const activeAssets = assets.filter(a => a.isEnabled && a.sourcePage === pageMode);
    const imageAssets = activeAssets.filter(a => a.type === 'image');
    
    // Validation
    if (pageMode !== 'scene' && pageMode !== 'character' && pageMode !== 'lighting' && pageMode !== 'nextshot' && pageMode !== 'faceswap' && !prompt.trim()) {
        setError("请输入提示词。"); return;
    }

    setIsGenerating(true);
    setLoadingMessage('正在初始化生成任务...');

    try {
      const referenceImages: ReferenceImageData[] = await Promise.all(
        imageAssets.map(async (asset) => ({
            data: await fileToBase64(asset.file),
            mimeType: asset.file.type,
            label: `${asset.category.toUpperCase()}: ${asset.name}`
        }))
      );
      const timestamp = Date.now();

      // --- 1. CHARACTER MODE ---
      if (pageMode === 'character') {
           // ... (Previous Character logic preserved) ...
           const { views, shots, expressions } = characterParams;
          let taskCount = 0;
          if (views.length > 0) taskCount++;
          if (shots.length > 0) taskCount++;
          if (expressions.length > 0) taskCount++;

          if (taskCount === 0) {
              setError("请至少选择一个生成角度/景别/表情。");
              setIsGenerating(false);
              return;
          }

          let currentTask = 1;
          if (views.length > 0) {
              setLoadingMessage(`正在生成: 视图/视角 (${currentTask}/${taskCount})...`);
              
              // Map view keys to prompt descriptions
              const viewNames = views.map(v => {
                  if (v === 'front') return 'Front View';
                  if (v === 'side') return 'Side Profile';
                  if (v === 'back') return 'Back View';
                  if (v === '3/4_side') return 'Cinematic 3/4 Side Angle (Half-Body)';
                  if (v === '3/4_back') return 'Cinematic Rear 3/4 Angle';
                  if (v === 'ots') return 'Over-The-Shoulder (OTS) Shot';
                  return v;
              }).join(', ');

              const count = views.length;
              const rows = 1; const cols = count; 
              const viewPrompt = `Character Design Reference Sheet. MANDATORY LAYOUT: ${count} vertical panels showing ${viewNames}. Neutral lighting, flat studio background. ${prompt}`;
              await generateAndAddImage(viewPrompt, rows, cols, count, AspectRatio.PORTRAIT, referenceImages, timestamp, "视图 (Views)");
              currentTask++;
          }
          if (shots.length > 0) {
              setLoadingMessage(`正在生成: 电影景别 (${currentTask}/${taskCount})...`);
              const shotNames = shots.map(s => s === 'wide' ? 'Wide Angle Shot' : s === 'medium' ? 'Medium Shot' : 'Extreme Close-up').join(', ');
              const count = shots.length;
              const rows = 1; const cols = count;
              const shotPrompt = `Cinematic Character Photography. MANDATORY LAYOUT: ${count} panels showing distinct camera distances: ${shotNames}. Dramatic lighting, 8k. ${prompt}`;
              await generateAndAddImage(shotPrompt, rows, cols, count, AspectRatio.WIDE, referenceImages, timestamp + 1, "景别 (Shots)");
              currentTask++;
          }
          if (expressions.length > 0) {
              setLoadingMessage(`正在生成: 表情特写 (${currentTask}/${taskCount})...`);
              const expNames = expressions.join(', ');
              const count = expressions.length;
              let rows = 1; let cols = count;
              if (count === 4) { rows = 2; cols = 2; }
              const expPrompt = `Character Facial Expression Sheet. MANDATORY LAYOUT: ${count} panels showing facial expressions: ${expNames}. Focus strictly on the face. ${prompt}`;
              await generateAndAddImage(expPrompt, rows, cols, count, AspectRatio.SQUARE, referenceImages, timestamp + 2, "表情 (Faces)");
          }
      } 
      
      // --- 2. SCENE MODE ---
      else if (pageMode === 'scene') {
          setLoadingMessage('正在渲染场景...');
          const cameraInstruction = getCameraPrompt(cameraParams);
          const effectivePrompt = `${cameraInstruction}\n${prompt}`;
          await generateAndAddImage(effectivePrompt, 1, 1, 1, aspectRatio, referenceImages, timestamp, "场景 (Scene)");
      } 

      // --- 3. LIGHTING MODE ---
      else if (pageMode === 'lighting') {
          if (!lightingPreset) {
              setError("请选择一个布光预设。"); setIsGenerating(false); return;
          }
          if (referenceImages.length === 0) {
              setError("请上传一张原图 (Source Image) 用于重打光。"); setIsGenerating(false); return;
          }

          setLoadingMessage('正在应用布光方案...');
          
          // Rasterize SVG Preset
          const presetBase64 = await svgToImageBase64(lightingPreset.svgContent);
          
          // Auto-detect and enforce aspect ratio from source
          const sourceAsset = imageAssets[0];
          const sourceBase64 = await fileToBase64(sourceAsset.file);
          const img = new Image();
          img.src = `data:${sourceAsset.file.type};base64,${sourceBase64}`;
          await new Promise((resolve) => { img.onload = resolve; });
          const targetAr = getClosestAspectRatio(img.width, img.height);
          
          // Construct Payload: Source Image + Preset Diagram
          const lightingRefs: ReferenceImageData[] = [
              referenceImages[0], // The User's Source Image
              { data: presetBase64, mimeType: 'image/png', label: 'LIGHTING_SCHEMATIC' } // The Preset
          ];

          const lightingPrompt = `CINEMATIC RELIGHTING TASK:
          1. Analyze the 'LIGHTING_SCHEMATIC' image to understand the light direction, shadow falloff, and color temperature.
          2. Apply EXACTLY this lighting scheme to the SOURCE image.
          3. STRICTLY MAINTAIN the original composition, character pose, and environment details of the SOURCE image. Only change the lighting.
          4. Output a high-fidelity, photorealistic result.
          User Note: ${prompt}`;

          await generateAndAddImage(lightingPrompt, 1, 1, 1, targetAr, lightingRefs, timestamp, `灯光 (${lightingPreset.name})`);
      }

      // --- 4. NEXT SHOT MODE ---
      else if (pageMode === 'nextshot') {
          setLoadingMessage('正在生成下一镜...');
          // Just use standard generation, but with only the prev image as reference
          // The prompt should have been inferred already
          await generateAndAddImage(prompt, 1, 1, 1, aspectRatio, referenceImages, timestamp, "下一镜 (Next Shot)");
      }

      // --- 5. FACE SWAP MODE ---
      else if (pageMode === 'faceswap') {
          if (!faceSwapTarget || !faceSwapSource) {
              setError("请设置底图 (Target) 和替换形象 (Source)");
              setIsGenerating(false);
              return;
          }
          setLoadingMessage('正在进行人脸替换...');

          // Prepare Base64s
          const targetBase64 = 'url' in faceSwapTarget ? faceSwapTarget.url.split(',')[1] : await fileToBase64(faceSwapTarget.file);
          const sourceBase64 = await fileToBase64(faceSwapSource.file);

          const refs = [
              { data: targetBase64, mimeType: 'image/png', label: 'TARGET_WITH_MASK' },
              { data: sourceBase64, mimeType: faceSwapSource.file.type, label: 'SOURCE_FACE' }
          ];

          const fsPrompt = `FACE SWAP / INPAINTING TASK:
          Input 1 [TARGET_WITH_MASK] contains a GREEN MASK.
          Input 2 [SOURCE_FACE] contains the reference identity.
          Task: Replace the masked area in Input 1 with the face from Input 2.
          - Strictly maintain the original composition of Input 1.
          - Match lighting, skin tone, and perspective of Input 1.
          - Apply the following expression/mood: ${prompt || "Neutral, matching context"}.`;

          await generateAndAddImage(fsPrompt, 1, 1, 1, aspectRatio, refs, timestamp, "换脸 (Face Swap)");
      }

      // --- 6. STANDARD MODE (Updated for Square Grid Aspect Ratio Consistency) ---
      else {
          setLoadingMessage(`正在生成 ${imageCount} 张画面...`);
          // Enforce square grid logic to maintain Aspect Ratio
          let rows = 1; let cols = 1;
          if (imageCount === 1) { rows = 1; cols = 1; }
          else if (imageCount <= 4) { rows = 2; cols = 2; } // Force 2x2 for 2, 3, 4 images
          else { rows = 3; cols = 3; } // Force 3x3 for 5+ images
          
          await generateAndAddImage(prompt, rows, cols, imageCount, aspectRatio, referenceImages, timestamp, pageMode.toUpperCase());
      }

    } catch (err: any) { handleError(err); } 
    finally { setIsGenerating(false); setLoadingMessage(''); }
  };

  const generateAndAddImage = async (genPrompt: string, rows: number, cols: number, count: number, ar: AspectRatio, refs: ReferenceImageData[], idBase: number, labelPrefix: string) => {
      const result = await generateMultiViewGrid(genPrompt, rows, cols, count, ar, imageSize, refs);
      const slices = result.slices.slice(0, count);
      const newImages: GeneratedImage[] = slices.map((url, index) => ({
          id: crypto.randomUUID(), url, fullGridUrl: result.fullImage, prompt: `[${labelPrefix}] ${genPrompt.substring(0, 50)}...`, aspectRatio: ar, timestamp: idBase
      }));
      setImages(prev => [...newImages, ...prev]);
      if (newImages.length > 0) handleSelectImage(newImages[0]);
      
      // DB Save
      for (const img of newImages) {
          await dbService.put(dbService.stores.IMAGES, img);
      }
  };

  const handleError = (err: any) => {
      let message = err.message || "未知错误";
      if (message.includes("API key") || message.includes("403")) { message = "需要 API Key 权限。"; 
      // @ts-ignore
      if (window.aistudio) window.aistudio.openSelectKey(); }
      setError(message);
  };
  
  const handleDeleteImage = async (id: string) => { 
      setImages(prev => prev.filter(img => img.id !== id)); 
      if (selectedImageId === id) setSelectedImageId(undefined); 
      // DB Delete
      await dbService.delete(dbService.stores.IMAGES, id);
  };
  
  const handleDownloadBatch = async () => { 
    if (images.length === 0) return;
    const zip = new JSZip();
    images.forEach((img, i) => {
        const base64Data = img.url.split(',')[1];
        zip.file(`shot_${i+1}_${img.id.substring(0,6)}.png`, base64Data, {base64: true});
    });
    const content = await zip.generateAsync({type:"blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `filmplus_batch_${Date.now()}.zip`;
    link.click();
  };

  const activeImage = images.find(i => i.id === selectedImageId) || null;
  const activeAsset = assets.find(a => a.id === selectedAssetId) || null;

  // Render Content Switch
  const renderContent = () => {
      // Pass the new handler 'onAddImage' and visibility props to children
      const commonProps = { 
          images, 
          onSelect: handleSelectImage, 
          selectedId: selectedImageId, 
          onDelete: handleDeleteImage, 
          onDownloadAll: handleDownloadBatch, 
          onSendToPage: handleSendImageToWorkspace,
          onAddImage: handleAddGeneratedImage,
          isInspectorVisible,
          onToggleInspector: toggleInspector,
          isInspectorAvailable
      };
      switch (pageMode) {
          case 'character': return <CharacterBoard {...commonProps} />;
          case 'scene': return <SceneBoard {...commonProps} />;
          case 'lighting': return <LightingBoard {...commonProps} />;
          case 'nextshot': return <NextShotBoard {...commonProps} />;
          case 'faceswap': return <FaceSwapBoard {...commonProps} />;
          case 'storyboard': default: return <Canvas {...commonProps} onApplyWorkflow={handleApplyWorkflow} />;
      }
  };

  const getPageTitle = (mode: PageMode) => {
      switch(mode) {
          case 'character': return '人物造型';
          case 'scene': return '场景设计';
          case 'lighting': return '灯光设计';
          case 'nextshot': return '下一镜溶图';
          case 'faceswap': return '人物换脸';
          case 'storyboard': return '故事板中心';
          default: return 'Studio';
      }
  };

  // FILTERED ASSETS: Only pass assets belonging to the current page to children components
  const visibleAssets = assets.filter(a => a.sourcePage === pageMode);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-cine-black text-zinc-300 font-sans selection:bg-cine-accent selection:text-black">
      
      {/* LEVEL 1: GLOBAL NAVIGATION */}
      <GlobalNav currentPhase={appPhase} onPhaseChange={setAppPhase} />

      {/* LEVEL 2: CONTENT AREA */}
      <div className="flex-1 flex min-w-0 h-full">
        
        {/* CASE 0: INTRO / LANDING PAGE */}
        {appPhase === 'intro' && <LandingPage onNavigate={setAppPhase} />}

        {/* CASE A: DASHBOARD PHASE */}
        {appPhase === 'dashboard' && <Dashboard onNavigate={setAppPhase} />}

        {/* CASE B: SCRIPT PHASE */}
        {appPhase === 'script' && <ScriptPhase />}

        {/* CASE C: SHOTLIST PHASE */}
        {appPhase === 'shotlist' && <ShotListPhase />}

        {/* CASE D: STORYBOARD PHASE (The Original Layout) */}
        {appPhase === 'storyboard' && (
           <>
              {/* Secondary Sidebar (Asset Bay & Director Deck) - ONLY visible in Storyboard phase */}
              <aside className="w-[340px] flex flex-col border-r border-cine-border bg-cine-dark z-20 shadow-2xl flex-shrink-0 animate-in slide-in-from-left-4 duration-300">
                <div className="p-4 border-b border-cine-border bg-black/20">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                       <Layout size={12}/> 故事板工作台 Storyboard Workspace
                    </span>
                </div>

                <div className="flex-1 flex flex-col px-4 gap-4 overflow-y-auto custom-scrollbar pt-4">
                    <div className="flex-1 min-h-[150px] shrink-1">
                        <AssetBay 
                            assets={visibleAssets} 
                            onAddAsset={handleAddAsset} 
                            onRemoveAsset={handleRemoveAsset} 
                            onSelectAsset={handleSelectAsset}
                            onToggleAsset={handleToggleAsset}
                            onRenameAsset={handleRenameAsset}
                            selectedAssetId={selectedAssetId}
                            pageMode={pageMode}
                        />
                    </div>
                    <div className="flex-shrink-0 pb-6">
                        <DirectorDeck 
                            imageCount={imageCount} setImageCount={handleImageCountChange}
                            aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                            imageSize={imageSize} setImageSize={setImageSize}
                            prompt={prompt} setPrompt={setPrompt}
                            onGenerate={handleGenerate} isGenerating={isGenerating}
                            onEnhancePrompt={handleEnhancePrompt} 
                            assets={visibleAssets}
                            pageMode={pageMode}
                            cameraParams={cameraParams} setCameraParams={setCameraParams}
                            characterParams={characterParams} setCharacterParams={setCharacterParams}
                            lightingPreset={lightingPreset} setLightingPreset={setLightingPreset}
                            nextShotScript={nextShotScript} setNextShotScript={setNextShotScript}
                            nextShotConfig={nextShotConfig} setNextShotConfig={setNextShotConfig}
                            onInferNextShotPrompt={handleInferNextShotPrompt}
                            faceSwapTarget={faceSwapTarget}
                            faceSwapSource={faceSwapSource}
                            onSetFaceSwapTarget={handleSetFaceSwapTarget}
                            onSetFaceSwapSource={handleSetFaceSwapSource}
                            onUpdateFaceSwapTarget={handleUpdateFaceSwapTarget}
                            activeSelectionType={selectedImageId ? 'image' : selectedAssetId ? 'asset' : undefined}
                        />
                    </div>
                </div>
              </aside>

              {/* Main Canvas Area */}
              <main className="flex-1 relative bg-black flex flex-col min-w-0">
                
                {/* Workflow Dropdown Navigation (Top Left) */}
                <div className="absolute top-4 left-6 z-50">
                    <div className="relative group pt-2">
                        <button className="flex items-center gap-2 bg-cine-dark border border-cine-border hover:border-cine-accent text-white px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md transition-all">
                            <Layout size={14} className="text-cine-accent" />
                            <span className="text-xs font-bold uppercase tracking-wider min-w-[80px] text-left">{getPageTitle(pageMode)}</span>
                            <ChevronDown size={12} className="text-zinc-500 group-hover:text-white" />
                        </button>
                        <div className="absolute top-full left-0 w-48 hidden group-hover:block animate-in fade-in zoom-in-95 duration-100 pt-2">
                            <div className="bg-cine-dark border border-cine-border rounded-xl shadow-2xl overflow-hidden">
                                <div className="py-1">
                                    <button onClick={() => setPageMode('storyboard')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>故事板中心</span>{pageMode === 'storyboard' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                    <div className="h-px bg-cine-border mx-2 my-1"></div>
                                    <button onClick={() => setPageMode('character')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>人物造型</span>{pageMode === 'character' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                    <button onClick={() => setPageMode('scene')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>场景设计</span>{pageMode === 'scene' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                    <button onClick={() => setPageMode('lighting')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>灯光设计</span>{pageMode === 'lighting' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                    <button onClick={() => setPageMode('nextshot')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>下一镜溶图</span>{pageMode === 'nextshot' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                    <button onClick={() => setPageMode('faceswap')} className="w-full text-left px-4 py-2 text-xs hover:bg-cine-accent hover:text-white text-zinc-300 transition-colors flex items-center justify-between"><span>人物换脸</span>{pageMode === 'faceswap' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {renderContent()}
                
                {isGenerating && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-500">
                        <div className="relative">
                            <div className="w-20 h-20 border-t-2 border-b-2 border-cine-accent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 border border-cine-accent/20 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-white font-bold text-lg tracking-tight">正在渲染画面</p>
                            <p className="text-cine-accent font-mono text-xs uppercase tracking-widest opacity-80">{loadingMessage || 'Processing...'}</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="absolute bottom-8 left-8 z-50 bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm flex gap-3 items-center animate-in slide-in-from-bottom-5 max-w-md shadow-2xl backdrop-blur-md">
                        <AlertCircle size={20} className="shrink-0 text-red-500" /><span className="flex-1 font-medium">{error}</span><button onClick={() => setError(null)} className="hover:bg-red-500/20 p-1 rounded-full transition-colors"><X size={16} /></button>
                    </div>
                )}
              </main>

              {/* Inspector (Conditionally rendered) */}
              {(selectedImageId || selectedAssetId) && isInspectorVisible && (
                <div className="w-[360px] border-l border-cine-border bg-cine-dark z-30 shadow-2xl flex flex-col transition-all duration-300">
                    <Inspector 
                        selectedImage={activeImage}
                        selectedAsset={activeAsset}
                        onClose={() => { setSelectedImageId(undefined); setSelectedAssetId(undefined); }}
                        onAnalyze={handleAnalyzeSelection}
                        isAnalyzing={isAnalyzing}
                        analysisResult={analysisResult}
                    />
                </div>
              )}
           </>
        )}

      </div>
    </div>
  );
};

export default App;
