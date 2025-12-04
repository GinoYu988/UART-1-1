
export enum AspectRatio {
  SQUARE = '1:1',
  STANDARD = '4:3',
  PORTRAIT = '3:4',
  WIDE = '16:9',
  MOBILE = '9:16',
  CINEMA = '21:9'
}

export enum ImageSize {
  HD_720P = '720p',
  FHD_1080P = '1080p',
  K2 = '2K',
  K4 = '4K'
}

export interface GeneratedImage {
  id: string;
  url: string;
  fullGridUrl?: string;
  prompt: string;
  aspectRatio: string;
  timestamp: number;
}

export type AssetCategory = 'character' | 'scene' | 'prop';

export type PageMode = 'storyboard' | 'character' | 'scene' | 'lighting' | 'nextshot' | 'faceswap';

export type AppPhase = 'intro' | 'dashboard' | 'script' | 'shotlist' | 'storyboard';

export interface Asset {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  analysis?: string;
  // New fields for categorization and referencing
  category: AssetCategory;
  name: string;
  isEnabled: boolean;
  sourcePage: PageMode; // Tracks which workspace the asset belongs to
}

export type InspectorTab = 'details' | 'analysis';

export interface CameraParams {
  pan: number;      // -50 to 50 (Left <-> Right)
  tilt: number;     // -50 to 50 (Down <-> Up)
  distance: number; // 0 to 100 (Close <-> Far)
  fov: number;      // 0 to 100 (Tele <-> Wide)
}

export interface CharacterParams {
  views: string[];       // ['front', 'side', 'back']
  shots: string[];       // ['wide', 'medium', 'close']
  expressions: string[]; // ['happy', 'angry', 'sad', 'joy']
}

export interface LightingPreset {
  id: string;
  name: string;
  description: string;
  svgContent: string; // The SVG path/content
}
