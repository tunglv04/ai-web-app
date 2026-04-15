export interface GenerationSettings {
  width: number;
  height: number;
  transparent: boolean;
  style: string;
  model: string;
  autoEnhance: boolean;
  negativePrompt?: string;
  temperature: number;
  numberOfImages: number;
}

export interface GeneratedAsset {
  id: string;
  prompt: string;
  referenceImagePath?: string;
  styleGuideId?: string;
  settings: GenerationSettings;
  outputPath: string;
  thumbnailPath: string;
  refinedFrom?: string;
  feedback?: string;
  approved?: boolean;
  createdAt: string;
}

export interface StyleGuide {
  id: string;
  name: string;
  referenceImages: string[];
  defaultPromptPrefix: string;
  negativePrompt: string;
  systemInstruction: string;
  defaultSettings: {
    style: string;
  };
  createdAt: string;
}

export interface SpriteSheet {
  id: string;
  name: string;
  assets: string[];
  grid: {
    columns: number;
    rows: number;
    frameWidth: number;
    frameHeight: number;
    padding: number;
  };
  outputPath: string;
  createdAt: string;
}

export const STYLE_PRESETS = [
  "pixel-art",
  "hand-drawn",
  "flat-vector",
  "realistic",
  "custom",
] as const;

export type StylePreset = (typeof STYLE_PRESETS)[number];

export interface ModelOption {
  id: string;
  label: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export const DEFAULT_SETTINGS: GenerationSettings = {
  width: 512,
  height: 512,
  transparent: true,
  style: "hand-drawn",
  model: "gemini-3.1-flash",
  autoEnhance: true,
  temperature: 0.5,
  numberOfImages: 1,
};
