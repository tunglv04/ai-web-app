"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, ArrowUp, ArrowDown, Sparkles, Loader2, Check, RotateCcw } from "lucide-react";
import { StyleGuide, STYLE_PRESETS } from "@/lib/types";
import { saveImage, getImageUrl, deleteImage, blobToBase64 } from "@/lib/client-storage";
import { resizeIfNeeded } from "@/lib/resize-client";
import { getApiKeyHeader } from "@/store/app-store";

interface StyleGuideInlineEditorProps {
  guide: StyleGuide;
  onSave: (guide: StyleGuide) => void;
}

function cloneGuide(guide: StyleGuide): StyleGuide {
  return JSON.parse(JSON.stringify(guide));
}

export function StyleGuideInlineEditor({ guide, onSave }: StyleGuideInlineEditorProps) {
  const [draft, setDraft] = useState<StyleGuide>(() => cloneGuide(guide));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // Track new image keys added in this draft session (for cleanup on discard)
  const addedKeysRef = useRef<string[]>([]);

  const rec = draft as unknown as Record<string, string[] | string>;
  const imageKeys = (rec._imageKeys as string[]) || draft.referenceImages;

  // Reset draft when the selected guide changes
  useEffect(() => {
    setDraft(cloneGuide(guide));
    setIsDirty(false);
    addedKeysRef.current = [];
  }, [guide.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraft = (partial: Partial<StyleGuide>) => {
    setDraft((prev) => ({ ...prev, ...partial }) as StyleGuide);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave(draft);
    setIsDirty(false);
    addedKeysRef.current = [];
  };

  const handleDiscard = async () => {
    // Clean up any newly added images from IndexedDB
    for (const key of addedKeysRef.current) {
      await deleteImage(key);
    }
    addedKeysRef.current = [];
    setDraft(cloneGuide(guide));
    setIsDirty(false);
  };

  const onDrop = useCallback(async (files: File[]) => {
    const newUrls: string[] = [];
    const newKeys: string[] = [];
    for (const f of files) {
      const file = await resizeIfNeeded(f);
      const key = `references/ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      await saveImage(key, blob);
      const url = await getImageUrl(key);
      newUrls.push(url);
      newKeys.push(key);
    }
    addedKeysRef.current.push(...newKeys);
    setDraft((prev) => {
      const prevRec = prev as unknown as Record<string, string[] | string>;
      const prevKeys = (prevRec._imageKeys as string[]) || prev.referenceImages;
      return {
        ...prev,
        referenceImages: [...prev.referenceImages, ...newUrls],
        _imageKeys: [...prevKeys, ...newKeys],
      } as StyleGuide;
    });
    setIsDirty(true);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
  });

  const handleRemoveImage = async (index: number) => {
    const keyToRemove = imageKeys[index];
    // If it was added in this session, clean it up immediately
    if (addedKeysRef.current.includes(keyToRemove)) {
      await deleteImage(keyToRemove);
      addedKeysRef.current = addedKeysRef.current.filter((k) => k !== keyToRemove);
    }
    setDraft((prev) => {
      const prevRec = prev as unknown as Record<string, string[] | string>;
      const prevKeys = (prevRec._imageKeys as string[]) || prev.referenceImages;
      return {
        ...prev,
        referenceImages: prev.referenceImages.filter((_, i) => i !== index),
        _imageKeys: prevKeys.filter((_, i) => i !== index),
      } as StyleGuide;
    });
    setIsDirty(true);
  };

  const handleMoveImage = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= draft.referenceImages.length) return;
    setDraft((prev) => {
      const prevRec = prev as unknown as Record<string, string[] | string>;
      const prevKeys = [...((prevRec._imageKeys as string[]) || prev.referenceImages)];
      const newUrls = [...prev.referenceImages];
      [newUrls[index], newUrls[target]] = [newUrls[target], newUrls[index]];
      [prevKeys[index], prevKeys[target]] = [prevKeys[target], prevKeys[index]];
      return { ...prev, referenceImages: newUrls, _imageKeys: prevKeys } as StyleGuide;
    });
    setIsDirty(true);
  };

  const handleAnalyzeStyle = async () => {
    if (draft.referenceImages.length === 0) return;
    setIsAnalyzing(true);
    try {
      const imagesBase64: string[] = [];
      for (const imgUrl of draft.referenceImages) {
        const response = await fetch(imgUrl);
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
      const updates: Partial<StyleGuide> = {};
      if (data.promptPrefix) updates.defaultPromptPrefix = data.promptPrefix;
      if (data.systemInstruction) updates.systemInstruction = data.systemInstruction;
      updateDraft(updates);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-72 border-l border-[var(--border)] bg-[var(--sidebar-bg)] z-10 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold truncate">{draft.name}</h3>
        {isDirty && (
          <span className="text-[10px] text-amber-400 font-medium ml-2 flex-shrink-0">Unsaved</span>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Reference images */}
        <div>
          <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1.5 block">
            Reference Images ({draft.referenceImages.length})
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {draft.referenceImages.map((img, i) => (
              <div key={`${i}-${imageKeys[i]}`} className="relative aspect-square rounded border border-[var(--border)] overflow-hidden group">
                {i === 0 && (
                  <span className="absolute top-0 left-0 bg-[var(--primary)] text-white text-[7px] font-bold px-0.5 rounded-br z-10 leading-none">1st</span>
                )}
                <img src={img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-0.5 transition-opacity">
                  <button onClick={() => handleMoveImage(i, "up")} disabled={i === 0} className="p-0.5 text-white/70 hover:text-white disabled:opacity-20"><ArrowUp size={12} /></button>
                  <button onClick={() => handleMoveImage(i, "down")} disabled={i === draft.referenceImages.length - 1} className="p-0.5 text-white/70 hover:text-white disabled:opacity-20"><ArrowDown size={12} /></button>
                  <button onClick={() => handleRemoveImage(i)} className="p-0.5 text-white/70 hover:text-red-400"><X size={12} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            <div
              {...getRootProps()}
              className={`flex-1 border border-dashed rounded-lg py-2 flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                isDragActive ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)] hover:border-[var(--muted)]"
              }`}
            >
              <input {...getInputProps()} />
              <Upload size={12} className="text-[var(--muted)]" />
              <span className="text-[10px] text-[var(--muted)]">Drop / paste</span>
            </div>
            {draft.referenceImages.length > 0 && (
              <button
                onClick={handleAnalyzeStyle}
                disabled={isAnalyzing}
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 disabled:opacity-50 text-[10px] px-2 border border-purple-400/30 rounded-lg"
              >
                {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Analyze
              </button>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1 block">Prompt Prefix</label>
          <textarea
            value={draft.defaultPromptPrefix}
            onChange={(e) => updateDraft({ defaultPromptPrefix: e.target.value })}
            placeholder="e.g. dark fantasy RPG style..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)]"
            rows={3}
          />
        </div>

        <div>
          <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1 block">Negative Prompt</label>
          <textarea
            value={draft.negativePrompt || ""}
            onChange={(e) => updateDraft({ negativePrompt: e.target.value })}
            placeholder="Things to exclude..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)]"
            rows={2}
          />
        </div>

        <div>
          <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1 block">System Instruction</label>
          <textarea
            value={draft.systemInstruction || ""}
            onChange={(e) => updateDraft({ systemInstruction: e.target.value })}
            placeholder="e.g. You are a game artist..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--foreground)] resize-none focus:outline-none focus:border-[var(--primary)]"
            rows={3}
          />
        </div>

        <div>
          <label className="text-[10px] text-[var(--muted)] uppercase tracking-wider mb-1 block">Style</label>
          <select
            value={draft.defaultSettings.style}
            onChange={(e) => updateDraft({ defaultSettings: { ...draft.defaultSettings, style: e.target.value } })}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--foreground)]"
          >
            {STYLE_PRESETS.map((s) => (
              <option key={s} value={s}>{s.replace("-", " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Save / Discard footer */}
      {isDirty && (
        <div className="p-3 border-t border-[var(--border)] flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3 py-2 rounded-lg text-xs font-medium"
          >
            <Check size={14} />
            Save
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center justify-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--muted)] text-[var(--muted)] hover:text-[var(--foreground)] px-3 py-2 rounded-lg text-xs"
          >
            <RotateCcw size={14} />
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
