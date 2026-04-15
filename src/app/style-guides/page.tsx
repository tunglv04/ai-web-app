"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Upload, Sparkles, Loader2, Info, ArrowLeft, ArrowRight } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { StyleGuide, STYLE_PRESETS } from "@/lib/types";
import { StyleGuideCard } from "@/components/style-guide-card";
import { useAppStore, getApiKeyHeader } from "@/store/app-store";
import { saveImage, getImageUrl, deleteImage, blobToBase64 } from "@/lib/client-storage";

export default function StyleGuidesPage() {
  const { styleGuides, init, addStyleGuide, updateStyleGuide, removeStyleGuide } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<StyleGuide | null>(null);
  const [name, setName] = useState("");
  const [promptPrefix, setPromptPrefix] = useState("");
  const [style, setStyle] = useState("pixel-art");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  // Each uploaded image: { key: indexedDB key, url: blob URL, file?: File for new uploads }
  const [uploadedImages, setUploadedImages] = useState<{ key: string; url: string }[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  const resetForm = () => {
    setName("");
    setPromptPrefix("");
    setNegativePrompt("");
    setSystemInstruction("");
    setStyle("pixel-art");
    setUploadedImages([]);
    setEditingGuide(null);
    setIsFormOpen(false);
  };

  const handleEdit = async (guide: StyleGuide) => {
    setEditingGuide(guide);
    setName(guide.name);
    setPromptPrefix(guide.defaultPromptPrefix);
    setNegativePrompt(guide.negativePrompt || "");
    setSystemInstruction(guide.systemInstruction || "");
    setStyle(guide.defaultSettings.style);
    // Reference images are already blob URLs in the store
    const rec = guide as unknown as Record<string, string[]>;
    const keys = rec._imageKeys || guide.referenceImages;
    const images = guide.referenceImages.map((url, i) => ({
      key: keys[i] || url,
      url,
    }));
    setUploadedImages(images);
    setIsFormOpen(true);
  };

  const handleNewGuide = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const onDrop = useCallback(async (files: File[]) => {
    const newImages: { key: string; url: string }[] = [];
    for (const file of files) {
      const key = `references/ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await saveImage(key, blob);
      const url = await getImageUrl(key);
      newImages.push({ key, url });
    }
    setUploadedImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
  });

  const handleAnalyzeStyle = async () => {
    if (uploadedImages.length === 0) return;
    setIsAnalyzing(true);

    try {
      // Read images from IndexedDB as base64
      const imagesBase64: string[] = [];
      for (const img of uploadedImages) {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        imagesBase64.push(base64);
      }

      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getApiKeyHeader() },
        body: JSON.stringify({ imagesBase64 }),
      });
      const data = await res.json();
      if (data.promptPrefix) setPromptPrefix(data.promptPrefix);
      if (data.systemInstruction) setSystemInstruction(data.systemInstruction);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;

    const guideData = {
      name,
      referenceImages: uploadedImages.map((img) => img.url),
      defaultPromptPrefix: promptPrefix,
      negativePrompt,
      systemInstruction,
      defaultSettings: { style },
      _imageKeys: uploadedImages.map((img) => img.key),
    };

    if (editingGuide) {
      updateStyleGuide({
        ...editingGuide,
        ...guideData,
      } as StyleGuide);
    } else {
      const guide: StyleGuide = {
        id: `guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...guideData,
        createdAt: new Date().toISOString(),
      } as StyleGuide;
      addStyleGuide(guide);
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    const guide = styleGuides.find((g) => g.id === id);
    if (guide) {
      const rec = guide as unknown as Record<string, string[]>;
      const keys = rec._imageKeys || [];
      for (const key of keys) {
        await deleteImage(key);
      }
    }
    removeStyleGuide(id);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveImage = (index: number, direction: "left" | "right") => {
    setUploadedImages((prev) => {
      const next = [...prev];
      const target = direction === "left" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Style Guides</h2>
        <button
          onClick={handleNewGuide}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> New Guide
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">
            {editingGuide ? "Edit Style Guide" : "New Style Guide"}
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Style guide name..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3"
          />

          <div {...getRootProps()} className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 mb-2 cursor-pointer hover:border-[var(--muted)] text-center">
            <input {...getInputProps()} />
            <Upload size={20} className="mx-auto mb-1 text-[var(--muted)]" />
            <p className="text-xs text-[var(--muted)]">Drop reference images here</p>
          </div>

          <div className="flex items-start gap-2 mb-3 px-1 py-2 rounded-md bg-[var(--sidebar-bg)]">
            <Info size={14} className="text-[var(--muted)] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--muted)] leading-relaxed">
              <p>Up to <strong className="text-[var(--foreground)]">14 reference images</strong> per guide (Gemini 3.1 Flash limit).</p>
              <p>Order matters — images listed first have <strong className="text-[var(--foreground)]">higher priority</strong>. Place your best references at the front.</p>
              {uploadedImages.length > 1 && (
                <p>Use the arrows to reorder.</p>
              )}
            </div>
          </div>

          {uploadedImages.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap items-start">
              {uploadedImages.map((img, i) => (
                <div key={img.key} className="flex flex-col items-center gap-1">
                  <div className="relative w-16 h-16 rounded border border-[var(--border)] overflow-hidden group">
                    {i === 0 && (
                      <span className="absolute top-0 left-0 bg-[var(--primary)] text-white text-[9px] font-bold px-1 py-0.5 rounded-br z-10 leading-none">
                        1st
                      </span>
                    )}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(i)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                    >
                      Remove
                    </button>
                  </div>
                  {uploadedImages.length > 1 && (
                    <div className="flex gap-0.5">
                      <button
                        onClick={() => handleMoveImage(i, "left")}
                        disabled={i === 0}
                        className="p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move left"
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <button
                        onClick={() => handleMoveImage(i, "right")}
                        disabled={i === uploadedImages.length - 1}
                        className="p-0.5 text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Move right"
                      >
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploadedImages.length > 0 && (
            <button
              onClick={handleAnalyzeStyle}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm mb-3"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isAnalyzing ? "Analyzing style..." : "Generate from images"}
            </button>
          )}

          <textarea
            value={promptPrefix}
            onChange={(e) => setPromptPrefix(e.target.value)}
            placeholder="Default prompt prefix (e.g. 'dark fantasy RPG style')..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3 resize-y min-h-[60px]"
          />
          <textarea
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="Negative prompt — things to exclude (e.g. 'realistic, photographic, blurry, text, watermark')..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3 resize-y min-h-[60px]"
          />
          <textarea
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            placeholder="System instruction (e.g. 'You are a game artist. Generate hand-drawn 2D game sprites with consistent line weight and muted colors.')..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3 resize-y min-h-[60px]"
          />
          <div className="flex gap-2 mb-3">
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)]"
            >
              {STYLE_PRESETS.map((s) => (
                <option key={s} value={s}>{s.replace("-", " ")}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm">
              {editingGuide ? "Save Changes" : "Create Guide"}
            </button>
            <button onClick={resetForm} className="bg-[var(--card-bg)] text-[var(--muted)] px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {styleGuides.map((guide) => (
          <StyleGuideCard key={guide.id} guide={guide} onDelete={handleDelete} onEdit={handleEdit} />
        ))}
      </div>

      {styleGuides.length === 0 && !isFormOpen && (
        <p className="text-[var(--muted)] text-sm text-center mt-8">
          No style guides yet. Create one to maintain consistent art across assets.
        </p>
      )}
    </div>
  );
}
