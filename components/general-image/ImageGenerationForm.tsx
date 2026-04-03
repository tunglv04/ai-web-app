"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, Settings2, Trash2, Wand2, FolderPlus, FolderOpen } from "lucide-react";

export type ImageGenerationConfig = {
  requestPrompt: string;
  negativePrompt: string;
  aspectRatio: "1:1" | "9:16" | "16:9";
  resolution: "1K" | "2K" | "3K" | "4K";
  count: number;
  referenceImages: string[];
  promptModel: string;
  imageModel: string;
};

type SavedImageSet = {
  id: string;
  name: string;
  images: string[];
};

interface ImageGenerationFormProps {
  onGenerate: (config: ImageGenerationConfig) => void;
  isLoading: boolean;
}

export function ImageGenerationForm({ onGenerate, isLoading }: ImageGenerationFormProps) {
  const initialConfig: ImageGenerationConfig = {
    requestPrompt: "",
    negativePrompt: "",
    aspectRatio: "1:1",
    resolution: "1K",
    count: 1,
    referenceImages: [],
    promptModel: "gemini-3.1-pro-preview",
    imageModel: "gemini-3-pro-image-preview",
  };

  const [config, setConfig] = useState<ImageGenerationConfig>(initialConfig);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("general_image_config");
        if (saved) {
          const parsed = JSON.parse(saved);
          setConfig({ ...initialConfig, ...parsed, referenceImages: [] });
        }
      } catch (e) { }
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      const { referenceImages, ...saveableConfig } = config;
      window.localStorage.setItem("general_image_config", JSON.stringify(saveableConfig));
    }
  }, [config, isLoaded]);

  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [savedSets, setSavedSets] = useState<SavedImageSet[]>([]);

  // Load saved reference image sets from LocalStorage on mount
  useEffect(() => {
    try {
      const sets = window.localStorage.getItem("general_image_saved_sets");
      if (sets) {
        setSavedSets(JSON.parse(sets));
      }
    } catch (e) { }
  }, []);

  // Fetch available models on mount
  useEffect(() => {
    const fetchModels = async () => {
      const stored = window.localStorage.getItem("google_ai_studio_key");
      if (!stored) return;
      let parsedKey = stored;
      try { parsedKey = JSON.parse(stored); } catch (e) { }

      try {
        const res = await fetch("/api/models", {
          headers: { "x-google-api-key": parsedKey }
        });
        const data = await res.json();
        if (data.models) {
          setAvailableModels(data.models);
          // Prioritize exact stable models instead of fuzzy matching to avoid deprecated models
          const preferredModels = [
            "gemini-3.1-pro-preview",
            "gemini-3.1-flash-preview",
            "gemini-3-flash-preview",
            "gemini-2.0-flash",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
          ];
          setConfig(prev => {
            const isSavedValid = data.models.find((m: any) => m.name === `models/${prev.promptModel}`);
            if (isSavedValid) return prev;

            for (const pref of preferredModels) {
              if (data.models.find((m: any) => m.name === `models/${pref}`)) {
                return { ...prev, promptModel: pref };
              }
            }
            return prev;
          });
        }
      } catch (err) { }
    };
    fetchModels();
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newImages: string[] = [];
      let processed = 0;

      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
          }
          processed++;

          if (processed === files.length) {
            setConfig((prev) => {
              const updatedImages = [...prev.referenceImages, ...newImages];
              // Removed automatic localStorage save
              return { ...prev, referenceImages: updatedImages };
            });
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (indexToRemove: number) => {
    setConfig((prev) => {
      const updatedImages = prev.referenceImages.filter((_, idx) => idx !== indexToRemove);
      return { ...prev, referenceImages: updatedImages };
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveCurrentSet = () => {
    if (config.referenceImages.length === 0) return;
    const setName = prompt("Name this image set:", `Set ${savedSets.length + 1}`);
    if (!setName) return;

    const newSet: SavedImageSet = {
      id: Date.now().toString(),
      name: setName,
      images: [...config.referenceImages],
    };

    const updatedSets = [...savedSets, newSet];
    setSavedSets(updatedSets);
    try {
      window.localStorage.setItem("general_image_saved_sets", JSON.stringify(updatedSets));
    } catch (e) {
      alert("Storage full! Please delete some saved sets before saving new ones.");
    }
  };

  const handleDeleteSet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSets = savedSets.filter(s => s.id !== id);
    setSavedSets(updatedSets);
    try {
      window.localStorage.setItem("general_image_saved_sets", JSON.stringify(updatedSets));
    } catch (e) { }
  };

  const loadSet = (set: SavedImageSet) => {
    setConfig(prev => ({ ...prev, referenceImages: [...set.images] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(config);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 h-full">
      {/* Reference Image */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-accent" />
            Reference Images <span className="text-white/40 font-normal">(Optional)</span>
          </label>
          {config.referenceImages.length > 0 && (
            <button
              type="button"
              onClick={handleSaveCurrentSet}
              className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 flex-shrink-0 py-1 rounded-md transition-colors"
            >
              <FolderPlus className="w-3 h-3 text-accent" /> Save Set
            </button>
          )}
        </div>

        {savedSets.length > 0 && (
          <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar items-center">
            <span className="text-xs text-white/50 whitespace-nowrap"><FolderOpen className="inline w-3 h-3 mr-1" /> Saved Sets:</span>
            {savedSets.map(set => (
              <div
                key={set.id}
                onClick={() => loadSet(set)}
                className="group relative flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/20 hover:bg-accent/20 hover:border-accent/40 rounded-full cursor-pointer transition-all flex-shrink-0"
              >
                <div className="flex -space-x-2">
                  {set.images.slice(0, 3).map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt="preview" className="w-5 h-5 rounded-full object-cover border border-white/20" />
                  ))}
                  {set.images.length > 3 && (
                    <div className="w-5 h-5 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-[8px] font-bold z-10">
                      +{set.images.length - 3}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-white/90">{set.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSet(set.id, e)}
                  className="ml-1 p-0.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {config.referenceImages.map((imgSrc, idx) => (
            <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={`Reference ${idx}`}
                className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg backdrop-blur-sm transition-all shadow-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-24 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent/50 hover:bg-white/5 transition-all text-white/50 hover:text-white group flex-shrink-0"
          >
            <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
          </div>
        </div>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </section>

      {/* Prompts */}
      <section className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-accent" />
            Prompt
          </label>
          <textarea
            value={config.requestPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, requestPrompt: e.target.value }))}
            placeholder="Describe what you want to generate..."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all resize-none custom-scrollbar"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white/70">Negative Prompt <span className="text-white/40 font-normal">(Optional)</span></label>
          <input
            type="text"
            value={config.negativePrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, negativePrompt: e.target.value }))}
            placeholder="What to exclude (e.g. blurry, low quality)..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all text-sm"
          />
        </div>
      </section>

      {/* Settings Grid */}
      <section className="space-y-4">
        <label className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-accent" />
          Settings
        </label>

        {/* Model Selection */}
        <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 mb-4 text-sm mt-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Prompt Model (Text)</span>
            <select
              value={config.promptModel}
              onChange={(e) => setConfig(prev => ({ ...prev, promptModel: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent focus:outline-none appearance-none cursor-pointer"
            >
              {availableModels.length === 0 && (
                <option value={config.promptModel}>{config.promptModel}</option>
              )}
              {availableModels
                .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                .map(m => (
                  <option key={m.name} value={m.name.replace('models/', '')}>
                    {m.displayName || m.name.replace('models/', '')}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Image Model (Generation)</span>
            <select
              value={config.imageModel}
              onChange={(e) => setConfig(prev => ({ ...prev, imageModel: e.target.value }))}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-accent focus:outline-none appearance-none cursor-pointer"
            >
              {availableModels.length === 0 && (
                <option value={config.imageModel}>{config.imageModel}</option>
              )}
              {availableModels.map(m => (
                <option key={m.name} value={m.name.replace('models/', '')}>
                  {m.displayName || m.name.replace('models/', '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Aspect Ratio</span>
          <div className="grid grid-cols-3 gap-2">
            {(["1:1", "9:16", "16:9"] as const).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, aspectRatio: ratio }))}
                className={`py-2 px-3 rounded-lg border text-sm transition-all ${config.aspectRatio === ratio
                    ? "bg-accent/20 border-accent/50 text-accent"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                  }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div className="space-y-2">
          <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Resolution</span>
          <div className="grid grid-cols-4 gap-2">
            {(["1K", "2K", "3K", "4K"] as const).map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, resolution: res }))}
                className={`py-2 px-2 rounded-lg border text-sm transition-all ${config.resolution === res
                    ? "bg-accent/20 border-accent/50 text-accent"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                  }`}
              >
                {res}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="space-y-2">
          <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Images to generate</span>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, count: num }))}
                className={`py-2 px-2 rounded-lg border text-sm transition-all ${config.count === num
                    ? "bg-accent/20 border-accent/50 text-accent"
                    : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                  }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex-1" />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !config.requestPrompt.trim()}
        className="w-full bg-accent hover:bg-accent/90 text-black font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 mt-4 sticky bottom-0"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Generate Magic
          </>
        )}
      </button>

    </form>
  );
}
