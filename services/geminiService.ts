

import { GoogleGenAI, Type } from "@google/genai";
import { AspectRatio, ImageSize } from "../types";

// Helper to ensure API key selection for premium models
export const ensureApiKey = async () => {
  // @ts-ignore
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  }
};

const getClient = () => {
  // Always create a new client to pick up the potentially newly selected key
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Helper to slice a grid image into individual images
const sliceImageGrid = (base64Data: string, rows: number, cols: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const pieceWidth = Math.floor(w / cols);
      const pieceHeight = Math.floor(h / rows);
      
      const pieces: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = pieceWidth;
      canvas.height = pieceHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("无法获取画布上下文"));
        return;
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, pieceWidth, pieceHeight);
            // Source x, y, w, h -> Dest x, y, w, h
            ctx.drawImage(
                img, 
                c * pieceWidth, 
                r * pieceHeight, 
                pieceWidth, 
                pieceHeight, 
                0, 
                0, 
                pieceWidth, 
                pieceHeight
            );
            pieces.push(canvas.toDataURL('image/png'));
        }
      }
      resolve(pieces);
    };
    img.onerror = (e) => reject(new Error("无法加载图片进行切片"));
    img.src = base64Data;
  });
};

export interface ReferenceImageData {
  mimeType: string;
  data: string;
  label?: string; // e.g. "Character: Neo"
}

// Map UI resolution to API accepted values (1K, 2K, 4K)
const mapResolutionToApi = (size: ImageSize): string => {
  switch (size) {
    case ImageSize.HD_720P: return '1K';
    case ImageSize.FHD_1080P: return '2K'; // Use 2K for 1080p for better quality
    case ImageSize.K2: return '2K';
    case ImageSize.K4: return '4K';
    default: return '1K';
  }
};

export const generateMultiViewGrid = async (
  prompt: string,
  gridRows: number, // Calculated rows
  gridCols: number, // Calculated cols
  panelCount: number, // Exact number of images requested (1-9)
  aspectRatio: AspectRatio,
  imageSize: ImageSize,
  referenceImages: ReferenceImageData[] = []
): Promise<{ fullImage: string, slices: string[] }> => {
  await ensureApiKey();
  const ai = getClient();
  const model = 'gemini-3-pro-image-preview';
  
  const totalSlots = gridRows * gridCols;
  const gridType = `${gridRows}x${gridCols}`;

  // STRICT prompt engineering for grid generation
  const gridPrompt = `MANDATORY LAYOUT: Create a precise ${gridType} GRID containing exactly ${panelCount} distinct panels.
    - The output image MUST be a single image divided into a ${gridRows} (rows) by ${gridCols} (columns) matrix.
    - There must be EXACTLY ${gridRows} horizontal rows and ${gridCols} vertical columns.
    - You must fill exactly ${panelCount} panels with content. 
    ${panelCount < totalSlots ? `- Leave the remaining ${totalSlots - panelCount} panels empty or solid black.` : ''}
    - Each panel must be completely separated by a thin, distinct, solid black line.
    - DO NOT create a collage. DO NOT overlap images. DO NOT create random sizes. 
    - The grid structure must be perfectly aligned for slicing.

    Subject Content: "${prompt}"
    
    Styling Instructions:
    - Each panel shows the SAME subject/scene from a DIFFERENT angle or action (e.g., Front, Side, Back, Action, Close-up).
    - Maintain perfect consistency of the character/object across all panels.
    - Cinematic lighting, high fidelity, 8k resolution.
    
    Negative Constraints:
    - No text, no captions, no UI elements.
    - No watermarks.
    - No broken grid lines.`;

  const parts: any[] = [];
  
  // Add all reference images with their specific context
  for (const ref of referenceImages) {
    if (ref.label) {
       parts.push({ text: `REFERENCE ASSET [${ref.label}]:` });
    }
    parts.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.data
      }
    });
  }
  
  parts.push({ text: gridPrompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: mapResolutionToApi(imageSize) // Use mapped resolution
        }
      }
    });

    let fullImageBase64 = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        fullImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!fullImageBase64) throw new Error("未能生成 Grid 图片");

    // Slice the single high-res grid into separate base64 images
    const panels = await sliceImageGrid(fullImageBase64, gridRows, gridCols);
    
    // Return slices (trimming excess if slicing produces empty slots is handled by UI logic later, 
    // but here we return all valid slots from the grid structure)
    // Note: sliceImageGrid returns `gridRows * gridCols` items.
    return { fullImage: fullImageBase64, slices: panels };

  } catch (error) {
    console.error("Grid generation error:", error);
    throw error;
  }
};

export const inferNextShotPrompt = async (
    prevImageBase64: string,
    mimeType: string,
    nextScript: string,
    shotSize: string,
    angle: string
): Promise<string> => {
    await ensureApiKey();
    const ai = getClient();
    const model = 'gemini-2.5-flash';

    const prompt = `
    Role: Professional Storyboard Artist & Cinematographer.
    Task: Write a detailed Image Generation Prompt for the NEXT SHOT in a sequence.

    Input 1: Previous Shot (Image provided).
    Input 2: Next Shot Script/Action: "${nextScript}".
    Input 3: Required Camera Shot Size: "${shotSize}".
    Input 4: Required Camera Angle: "${angle}".

    Instructions:
    1. Analyze the Previous Shot to understand the art style, character appearance (clothing, features), environment, and lighting.
    2. Write a prompt for the NEW shot that maintains strict visual consistency with the Previous Shot.
    3. The new shot must depict the action described in the Script.
    4. The new shot must use the requested Shot Size and Angle.
    5. Output ONLY the raw prompt text. Do not add conversational filler.
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    { inlineData: { mimeType, data: prevImageBase64 } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Next shot inference error:", error);
        throw error;
    }
};

export const analyzeAsset = async (
  fileBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  await ensureApiKey();
  const ai = getClient();
  const model = 'gemini-3-pro-preview';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "无法获取分析结果。";
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
};

export const enhancePrompt = async (rawPrompt: string): Promise<string> => {
  await ensureApiKey();
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `You are a film director's assistant. Rewrite the following scene description into a detailed, cinematic image generation prompt. Focus on lighting, camera angle, texture, and mood. Keep it under 100 words. \n\nInput: "${rawPrompt}"`,
    });
    return response.text || rawPrompt;
  } catch (error) {
    console.error("Prompt enhancement error:", error);
    return rawPrompt;
  }
};

export const breakdownScriptToShots = async (
  instruction: string,
  scriptText: string
): Promise<any[]> => {
  await ensureApiKey();
  const ai = getClient();
  const model = 'gemini-2.5-flash';

  const fullPrompt = `${instruction}\n\n${scriptText}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.STRING, description: "镜头编号 (如 1A, 2, 3)" },
              size: { type: Type.STRING, description: "景别 (请使用中文填写，如：特写、中景、全景)" },
              angle: { type: Type.STRING, description: "拍摄角度 (请使用中文填写，如：平视、仰视、俯视)" },
              movement: { type: Type.STRING, description: "运镜方式 (请使用中文填写，如：固定、摇镜头、推拉)" },
              description: { type: Type.STRING, description: "画面内容视觉描述 (必须使用中文填写)" },
              dialogue: { type: Type.STRING, description: "台词 (保持剧本原文语言，不要翻译)" },
              characters: { type: Type.STRING, description: "出现的角色列表 (请使用中文)" },
              sceneElement: { type: Type.STRING, description: "关键道具或场景元素 (请使用中文)" },
            }
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Script breakdown error:", error);
    throw error;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  // @ts-ignore
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};
