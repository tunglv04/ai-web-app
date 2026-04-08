"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Upload, X, ImageIcon, Settings2, Trash2, Wand2, FolderPlus, FolderOpen, ChevronDown, RotateCcw, Brain, FileText, Save, Plus, Zap } from "lucide-react";
import { SYSTEM_INSTRUCTION, REFERENCE_IMAGE_ANALYSIS, BUILT_IN_PRESETS, PromptPreset } from "@/lib/prompts";

const MAX_REFERENCE_IMAGES = 14;
const WARN_REFERENCE_IMAGES = 8;

export type ImageGenerationConfig = {
  requestPrompt: string;
  negativePrompt: string;
  aspectRatio: "1:1" | "9:16" | "16:9";
  resolution: "1K" | "2K" | "3K" | "4K";
  count: number;
  referenceImages: string[];
  promptModel: string;
  imageModel: string;
  temperature: number;
  systemInstruction: string;
  referenceImageAnalysis: string;
  skipExpansion: boolean;
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
    count: 6,
    referenceImages: [],
    promptModel: "gemini-3.1-pro-preview",
    imageModel: "gemini-3-pro-image-preview",
    temperature: 0.3,
    systemInstruction: SYSTEM_INSTRUCTION,
    referenceImageAnalysis: REFERENCE_IMAGE_ANALYSIS,
    skipExpansion: false,
  };

  const [config, setConfig] = useState<ImageGenerationConfig>(initialConfig);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSystemInstruction, setShowSystemInstruction] = useState(false);
  const [showRefAnalysis, setShowRefAnalysis] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>("general");
  const [customPresets, setCustomPresets] = useState<PromptPreset[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
    // Load custom prompt presets
    try {
      const presets = window.localStorage.getItem("custom_prompt_presets");
      if (presets) {
        setCustomPresets(JSON.parse(presets));
      }
    } catch (e) { }
    // Load active preset ID
    try {
      const savedPresetId = window.localStorage.getItem("active_preset_id");
      if (savedPresetId) {
        setActivePresetId(JSON.parse(savedPresetId));
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
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // Shared helper to process image files from any source (upload, drop, paste)
  const processFiles = useCallback((files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newImages: string[] = [];
    let processed = 0;

    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
        }
        processed++;

        if (processed === imageFiles.length) {
          setConfig((prev) => {
            const remaining = MAX_REFERENCE_IMAGES - prev.referenceImages.length;
            if (remaining <= 0) return prev;

            // Filter out duplicates by comparing base64 strings
            const uniqueNewImages = newImages.filter(
              newImg => !prev.referenceImages.includes(newImg)
            );

            const imagesToAdd = uniqueNewImages.slice(0, remaining);
            if (imagesToAdd.length === 0) return prev;

            return { ...prev, referenceImages: [...prev.referenceImages, ...imagesToAdd] };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // --- Drag and Drop handlers ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  }, [processFiles]);

  // --- Clipboard paste handler ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        processFiles(imageFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [processFiles]);

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
    setConfig(prev => ({ ...prev, referenceImages: [...set.images].slice(0, MAX_REFERENCE_IMAGES) }));
  };

  // --- Prompt Preset Handlers ---
  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const applyPreset = (preset: PromptPreset) => {
    setActivePresetId(preset.id);
    setConfig(prev => ({
      ...prev,
      systemInstruction: preset.systemInstruction,
      referenceImageAnalysis: preset.referenceImageAnalysis,
    }));
    try {
      window.localStorage.setItem("active_preset_id", JSON.stringify(preset.id));
    } catch (e) { }
  };

  const handleSaveCustomPreset = () => {
    const presetName = prompt("Name this preset:", `Custom ${customPresets.length + 1}`);
    if (!presetName) return;

    const newPreset: PromptPreset = {
      id: `custom-${Date.now()}`,
      name: presetName,
      icon: "✏️",
      description: "Custom preset",
      systemInstruction: config.systemInstruction,
      referenceImageAnalysis: config.referenceImageAnalysis,
      builtIn: false,
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    setActivePresetId(newPreset.id);
    try {
      window.localStorage.setItem("custom_prompt_presets", JSON.stringify(updated));
      window.localStorage.setItem("active_preset_id", JSON.stringify(newPreset.id));
    } catch (e) {
      alert("Storage full! Please delete some presets.");
    }
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    try {
      window.localStorage.setItem("custom_prompt_presets", JSON.stringify(updated));
    } catch (e) { }
    if (activePresetId === id) {
      applyPreset(BUILT_IN_PRESETS[0]);
    }
  };

  const activePreset = allPresets.find(p => p.id === activePresetId) || BUILT_IN_PRESETS[0];

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
            Reference Images
            <span className="text-white/40 font-normal">({config.referenceImages.length}/{MAX_REFERENCE_IMAGES})</span>
          </label>
          <div className="flex items-center gap-2">
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
        </div>

        {/* Warning when approaching limit */}
        {config.referenceImages.length >= WARN_REFERENCE_IMAGES && config.referenceImages.length < MAX_REFERENCE_IMAGES && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-xs text-yellow-400">⚠️ {config.referenceImages.length} images — each image significantly increases token cost</span>
          </div>
        )}
        {config.referenceImages.length >= MAX_REFERENCE_IMAGES && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <span className="text-xs text-red-400">🚫 Maximum {MAX_REFERENCE_IMAGES} reference images reached. Remove some to add new ones.</span>
          </div>
        )}

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

        {/* Drop zone with drag-and-drop support */}
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative flex flex-wrap gap-4 p-3 rounded-2xl border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? "border-accent/70 bg-accent/10 shadow-[inset_0_0_30px_rgba(234,179,8,0.06)]"
              : "border-transparent"
          }`}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-accent/5 backdrop-blur-[2px] pointer-events-none">
              <Upload className="w-8 h-8 text-accent animate-bounce" />
              <span className="text-sm font-semibold text-accent mt-2">Drop images here</span>
              <span className="text-xs text-white/40 mt-1">PNG, JPG, WebP supported</span>
            </div>
          )}

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

          {config.referenceImages.length < MAX_REFERENCE_IMAGES && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent/50 hover:bg-white/5 transition-all text-white/50 hover:text-white group flex-shrink-0"
            >
              <Upload className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
            </div>
          )}
        </div>

        {/* Paste hint */}
        <p className="text-[11px] text-white/30 flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px]">⌘V</span>
          Paste from clipboard or drag &amp; drop images above
        </p>

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
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-accent" />
              Prompt
            </label>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, skipExpansion: !prev.skipExpansion }))}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                config.skipExpansion
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                  : "bg-accent/10 border-accent/30 text-accent"
              }`}
              title={config.skipExpansion ? "Using your prompt directly — no AI enhancement" : "AI will expand and enhance your prompt"}
            >
              <Zap className="w-3 h-3" />
              {config.skipExpansion ? "Direct Mode" : "AI Expand"}
            </button>
          </div>
          {config.skipExpansion && (
            <p className="text-[11px] text-orange-400/70 leading-relaxed">
              ⚡ Your prompt will be sent directly to the image model without AI enhancement. Write a detailed, descriptive prompt for best results.
            </p>
          )}
          <textarea
            value={config.requestPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, requestPrompt: e.target.value }))}
            placeholder={config.skipExpansion ? "Write your full, detailed prompt here..." : "Describe what you want to generate..."}
            rows={config.skipExpansion ? 6 : 4}
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

      {/* AI Instructions (Collapsible) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            AI Instructions
          </label>
          <button
            type="button"
            onClick={handleSaveCustomPreset}
            className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md transition-colors flex-shrink-0"
          >
            <Save className="w-3 h-3 text-accent" /> Save Preset
          </button>
        </div>

        {/* Preset Picker */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {allPresets.map(preset => (
            <div
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all flex-shrink-0 ${
                activePresetId === preset.id
                  ? "bg-accent/15 border-accent/40 shadow-[0_0_12px_rgba(234,179,8,0.1)]"
                  : "bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/20"
              }`}
              title={preset.description}
            >
              <span className="text-sm">{preset.icon}</span>
              <span className={`text-xs font-medium ${
                activePresetId === preset.id ? "text-accent" : "text-white/70"
              }`}>{preset.name}</span>
              {!preset.builtIn && (
                <button
                  type="button"
                  onClick={(e) => handleDeletePreset(preset.id, e)}
                  className="ml-0.5 p-0.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Active preset description */}
        <p className="text-[11px] text-white/40 leading-relaxed">{activePreset.description}</p>

        {/* System Instruction */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSystemInstruction(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/[0.07] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-accent/70" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">System Instruction</span>
              {config.systemInstruction !== activePreset.systemInstruction && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">Modified</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${showSystemInstruction ? 'rotate-180' : ''}`} />
          </button>
          {showSystemInstruction && (
            <div className="p-3 space-y-2 border-t border-white/5">
              <textarea
                value={config.systemInstruction}
                onChange={(e) => setConfig(prev => ({ ...prev, systemInstruction: e.target.value }))}
                rows={6}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-all resize-none custom-scrollbar font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">Controls how the AI enhances your prompts</p>
                {config.systemInstruction !== activePreset.systemInstruction && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, systemInstruction: activePreset.systemInstruction }))}
                    className="text-[10px] flex items-center gap-1 text-accent/70 hover:text-accent transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Preset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reference Image Analysis */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRefAnalysis(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/[0.07] transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-accent/70" />
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Reference Image Analysis</span>
              {config.referenceImageAnalysis !== activePreset.referenceImageAnalysis && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">Modified</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform duration-200 ${showRefAnalysis ? 'rotate-180' : ''}`} />
          </button>
          {showRefAnalysis && (
            <div className="p-3 space-y-2 border-t border-white/5">
              <textarea
                value={config.referenceImageAnalysis}
                onChange={(e) => setConfig(prev => ({ ...prev, referenceImageAnalysis: e.target.value }))}
                rows={8}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder:text-white/30 focus:outline-none focus:border-accent/50 transition-all resize-none custom-scrollbar font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/30">How the AI reads your reference images</p>
                {config.referenceImageAnalysis !== activePreset.referenceImageAnalysis && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, referenceImageAnalysis: activePreset.referenceImageAnalysis }))}
                    className="text-[10px] flex items-center gap-1 text-accent/70 hover:text-accent transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Preset
                  </button>
                )}
              </div>
            </div>
          )}
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
            {[1,2, 3, 4,6, 8, 10, 12].map((num) => (
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

        {/* Temperature */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50 uppercase tracking-widest font-bold">Temperature</span>
            <span className="text-sm font-mono font-bold text-accent">{config.temperature.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.temperature}
            onChange={(e) => setConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-[var(--accent)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(234,179,8,0.4)] [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:hover:shadow-[0_0_14px_rgba(234,179,8,0.6)]"
          />
          <div className="flex justify-between text-[10px] text-white/30 font-medium">
            <span>Focused</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            {config.temperature <= 0.3
              ? "Low temperature — the AI sticks closely to the most likely output. Best for consistent, predictable results."
              : config.temperature <= 0.6
                ? "Moderate temperature — a good balance between creativity and consistency."
                : "High temperature — the AI explores more creative and varied outputs. May produce unexpected results."}
          </p>
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
