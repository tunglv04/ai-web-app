import { create } from "zustand";
import { GeneratedAsset, StyleGuide, SpriteSheet, GenerationSettings, DEFAULT_SETTINGS } from "../lib/types";
import { saveData, loadData, getApiKey, saveImage, getImageUrl, deleteImage, base64ToBlob } from "../lib/client-storage";

interface AppState {
  assets: GeneratedAsset[];
  styleGuides: StyleGuide[];
  spriteSheets: SpriteSheet[];
  settings: GenerationSettings;
  isGenerating: boolean;
  selectedStyleGuideId: string | null;
  initialized: boolean;

  init: () => Promise<void>;
  addAssetFromApi: (apiResult: {
    id: string;
    prompt: string;
    imageBase64: string;
    thumbnailBase64: string;
    settings: GenerationSettings;
    createdAt: string;
    refinedFrom?: string;
    feedback?: string;
  }) => Promise<GeneratedAsset>;
  addAsset: (asset: GeneratedAsset) => void;
  setAssets: (assets: GeneratedAsset[]) => void;
  removeAsset: (id: string) => Promise<void>;
  updateAsset: (id: string, partial: Partial<GeneratedAsset>) => void;
  addStyleGuide: (guide: StyleGuide) => void;
  updateStyleGuide: (guide: StyleGuide) => void;
  removeStyleGuide: (id: string) => void;
  setStyleGuides: (guides: StyleGuide[]) => void;
  addSpriteSheet: (sheet: SpriteSheet) => void;
  setSpriteSheets: (sheets: SpriteSheet[]) => void;
  updateSettings: (partial: Partial<GenerationSettings>) => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedStyleGuideId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  assets: [],
  styleGuides: [],
  spriteSheets: [],
  settings: { ...DEFAULT_SETTINGS },
  isGenerating: false,
  selectedStyleGuideId: null,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    const settings = loadData<GenerationSettings>("settings", DEFAULT_SETTINGS);
    const storedAssets = loadData<GeneratedAsset[]>("history", []);
    const styleGuides = loadData<StyleGuide[]>("styleguides", []);
    const spriteSheets = loadData<SpriteSheet[]>("spritesheets", []);

    // Resolve blob URLs for all assets
    const assets: GeneratedAsset[] = [];
    for (const asset of storedAssets) {
      const outputUrl = await getImageUrl(asset.outputPath);
      const thumbUrl = await getImageUrl(asset.thumbnailPath);
      if (outputUrl && thumbUrl) {
        assets.push({
          ...asset,
          outputPath: outputUrl,
          thumbnailPath: thumbUrl,
          // Store original keys for later IndexedDB access
          _imageKey: asset.outputPath as string,
          _thumbKey: asset.thumbnailPath as string,
        } as GeneratedAsset);
      }
    }

    // Resolve blob URLs for style guide reference images
    const resolvedGuides: StyleGuide[] = [];
    for (const guide of styleGuides) {
      const resolvedImages: string[] = [];
      for (const imgKey of guide.referenceImages) {
        const url = await getImageUrl(imgKey);
        if (url) resolvedImages.push(url);
      }
      resolvedGuides.push({ ...guide, referenceImages: resolvedImages, _imageKeys: guide.referenceImages } as StyleGuide);
    }

    set({ assets, styleGuides: resolvedGuides, spriteSheets, settings, initialized: true });
  },

  addAssetFromApi: async (apiResult) => {
    const imageKey = `outputs/${apiResult.id}.png`;
    const thumbKey = `outputs/${apiResult.id}-thumb.png`;

    // Save images to IndexedDB
    await saveImage(imageKey, base64ToBlob(apiResult.imageBase64));
    await saveImage(thumbKey, base64ToBlob(apiResult.thumbnailBase64));

    // Create blob URLs
    const outputUrl = await getImageUrl(imageKey);
    const thumbUrl = await getImageUrl(thumbKey);

    const asset: GeneratedAsset = {
      id: apiResult.id,
      prompt: apiResult.prompt,
      settings: apiResult.settings,
      outputPath: outputUrl,
      thumbnailPath: thumbUrl,
      createdAt: apiResult.createdAt,
      ...(apiResult.refinedFrom ? { refinedFrom: apiResult.refinedFrom } : {}),
      ...(apiResult.feedback ? { feedback: apiResult.feedback } : {}),
      _imageKey: imageKey,
      _thumbKey: thumbKey,
    } as GeneratedAsset;

    set((state) => {
      const newAssets = [asset, ...state.assets];
      // Save to localStorage with storage keys (not blob URLs)
      persistAssets(newAssets);
      return { assets: newAssets };
    });

    return asset;
  },

  addAsset: (asset) =>
    set((state) => {
      const newAssets = [asset, ...state.assets];
      persistAssets(newAssets);
      return { assets: newAssets };
    }),

  setAssets: (assets) => {
    persistAssets(assets);
    set({ assets });
  },

  removeAsset: async (id) => {
    const state = get();
    const asset = state.assets.find((a) => a.id === id);
    if (asset) {
      const imageKey = (asset as unknown as Record<string, string>)._imageKey || asset.outputPath;
      const thumbKey = (asset as unknown as Record<string, string>)._thumbKey || asset.thumbnailPath;
      await deleteImage(imageKey);
      await deleteImage(thumbKey);
    }
    const newAssets = state.assets.filter((a) => a.id !== id);
    persistAssets(newAssets);
    set({ assets: newAssets });
  },

  updateAsset: (id, partial) =>
    set((state) => {
      const newAssets = state.assets.map((a) => (a.id === id ? { ...a, ...partial } : a));
      persistAssets(newAssets);
      return { assets: newAssets };
    }),

  addStyleGuide: (guide) =>
    set((state) => {
      const newGuides = [...state.styleGuides, guide];
      persistStyleGuides(newGuides);
      return { styleGuides: newGuides };
    }),

  updateStyleGuide: (guide) =>
    set((state) => {
      const newGuides = state.styleGuides.map((g) => (g.id === guide.id ? guide : g));
      persistStyleGuides(newGuides);
      return { styleGuides: newGuides };
    }),

  removeStyleGuide: (id) =>
    set((state) => {
      const newGuides = state.styleGuides.filter((g) => g.id !== id);
      persistStyleGuides(newGuides);
      return { styleGuides: newGuides };
    }),

  setStyleGuides: (styleGuides) => {
    persistStyleGuides(styleGuides);
    set({ styleGuides });
  },

  addSpriteSheet: (sheet) =>
    set((state) => {
      const newSheets = [...state.spriteSheets, sheet];
      saveData("spritesheets", newSheets);
      return { spriteSheets: newSheets };
    }),

  setSpriteSheets: (spriteSheets) => {
    saveData("spritesheets", spriteSheets);
    set({ spriteSheets });
  },

  updateSettings: (partial) =>
    set((state) => {
      const newSettings = { ...state.settings, ...partial };
      saveData("settings", newSettings);
      return { settings: newSettings };
    }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setSelectedStyleGuideId: (selectedStyleGuideId) => set({ selectedStyleGuideId }),
}));

// Persist assets to localStorage using IndexedDB keys (not blob URLs)
function persistAssets(assets: GeneratedAsset[]) {
  const clean = assets.map((a) => {
    const rec = a as unknown as Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _imageKey, _thumbKey, ...rest } = rec;
    return {
      ...rest,
      outputPath: _imageKey || a.outputPath,
      thumbnailPath: _thumbKey || a.thumbnailPath,
    };
  });
  saveData("history", clean);
}

// Persist style guides to localStorage using IndexedDB keys
function persistStyleGuides(guides: StyleGuide[]) {
  const clean = guides.map((g) => {
    const rec = g as unknown as Record<string, string[]>;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _imageKeys, ...rest } = rec;
    return {
      ...rest,
      referenceImages: _imageKeys || g.referenceImages,
    };
  });
  saveData("styleguides", clean);
}

// Helper to get API key for fetch headers
export function getApiKeyHeader(): Record<string, string> {
  const key = getApiKey();
  return key ? { "x-api-key": key } : {};
}
