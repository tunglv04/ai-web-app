"use client";

import { useState, useEffect } from "react";
import { Wand2, Loader2, Sparkles, AlertTriangle, X } from "lucide-react";
import { useAppStore, getApiKeyHeader } from "@/store/app-store";
import { ReferenceUpload } from "@/components/reference-upload";
import { ElementReferencesUpload, ElementReference } from "@/components/element-references-upload";
import { PromptEditor } from "@/components/prompt-editor";
import { GenerationSettings } from "@/components/generation-settings";
import { AssetGrid } from "@/components/asset-grid";
import { AssetDetailModal } from "@/components/asset-detail-modal";
import { GeneratedAsset } from "@/lib/types";
import { clearApiKey } from "@/lib/client-storage";
import { ApiErrorCode } from "@/lib/api-error";

const ENHANCE_MODELS = [
  { id: "gemini-3-pro-preview", label: "3 Pro" },
  { id: "gemini-2.5-pro", label: "2.5 Pro" },
  { id: "gemini-2.5-flash", label: "2.5 Flash" },
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [enhanceModel, setEnhanceModel] = useState("gemini-3-pro-preview");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [elementRefs, setElementRefs] = useState<ElementReference[]>([]);
  const [editInstructions, setEditInstructions] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);
  const [apiError, setApiError] = useState<{ message: string; code: ApiErrorCode } | null>(null);

  const {
    assets,
    init,
    addAssetFromApi,
    settings,
    updateSettings,
    styleGuides,
    selectedStyleGuideId,
    setSelectedStyleGuideId,
    isGenerating,
    setIsGenerating,
    removeAsset,
    updateAsset,
  } = useAppStore();

  useEffect(() => {
    init();
  }, [init]);

  const handleUpload = (file: File) => {
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
  };

  const handleClearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
    setElementRefs([]);
    setEditInstructions("");
  };

  const handleAddElements = (files: File[]) => {
    const newRefs = files.map((file) => ({
      id: `elem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      file,
      preview: URL.createObjectURL(file),
      label: "",
    }));
    setElementRefs((prev) => [...prev, ...newRefs]);
  };

  const handleRemoveElement = (id: string) => {
    setElementRefs((prev) => {
      const removed = prev.find((e) => e.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((e) => e.id !== id);
    });
  };

  const handleElementLabelChange = (id: string, label: string) => {
    setElementRefs((prev) =>
      prev.map((e) => (e.id === id ? { ...e, label } : e))
    );
  };

  const getGuideContext = () => {
    const guide = styleGuides.find((g) => g.id === selectedStyleGuideId);
    return {
      guide,
      mergedSettings: {
        ...settings,
        ...(guide?.defaultSettings || {}),
        ...(guide?.systemInstruction ? { systemInstruction: guide.systemInstruction } : {}),
        ...(guide?.negativePrompt ? { negativePrompt: guide.negativePrompt } : {}),
        ...(guide?.defaultPromptPrefix ? { styleGuidePrefix: guide.defaultPromptPrefix } : {}),
      },
    };
  };

  const checkResponse = async (response: Response) => {
    if (!response.ok) {
      const data = await response.json();
      setApiError({ message: data.error || "Request failed", code: data.code || "UNKNOWN" });
      return null;
    }
    return response.json();
  };

  const handleClearApiKey = () => {
    clearApiKey();
    window.location.reload();
  };

  const handleEnhance = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    setApiError(null);

    try {
      const { guide } = getGuideContext();
      const response = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getApiKeyHeader() },
        body: JSON.stringify({
          prompt,
          style: guide?.defaultSettings?.style || settings.style,
          negativePrompt: guide?.negativePrompt,
          systemInstruction: guide?.systemInstruction,
          styleGuidePrefix: guide?.defaultPromptPrefix,
          model: enhanceModel,
        }),
      });
      const data = await checkResponse(response);
      if (data) setEnhancedPrompt(data.enhanced);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setApiError(null);

    try {
      const promptToSend = enhancedPrompt || prompt;
      const { guide, mergedSettings } = getGuideContext();
      const finalSettings = {
        ...(enhancedPrompt ? { ...mergedSettings, autoEnhance: false } : mergedSettings),
        ...(selectedStyleGuideId ? { styleGuideId: selectedStyleGuideId } : {}),
      };

      const hasStyleImages = guide && guide.referenceImages.length > 0;
      const hasComposition = !!referenceFile;
      const hasElementRefs = elementRefs.length > 0;

      let response: Response;

      if (hasComposition || hasStyleImages) {
        const formData = new FormData();
        formData.append("prompt", promptToSend);
        formData.append("settings", JSON.stringify(finalSettings));

        if (referenceFile) {
          formData.append("composition", referenceFile);
        }

        if (guide && guide.referenceImages.length > 0) {
          for (const imgUrl of guide.referenceImages) {
            const refResponse = await fetch(imgUrl);
            const refBlob = await refResponse.blob();
            formData.append("styleImages", refBlob, "style.png");
          }
        }

        if (hasElementRefs) {
          const labels: string[] = [];
          for (const elem of elementRefs) {
            formData.append("elementImages", elem.file, "element.png");
            labels.push(elem.label || "unlabeled element");
          }
          formData.append("elementLabels", JSON.stringify(labels));
        }

        if (editInstructions.trim()) {
          formData.append("editInstructions", editInstructions.trim());
        }

        response = await fetch("/api/generate/img2img", {
          method: "POST",
          headers: getApiKeyHeader(),
          body: formData,
        });
      } else {
        response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getApiKeyHeader() },
          body: JSON.stringify({ prompt: promptToSend, settings: finalSettings }),
        });
      }

      const apiResult = await checkResponse(response);
      if (!apiResult) return;

      // Save to client storage
      const results = Array.isArray(apiResult) ? apiResult : [apiResult];
      for (const result of results) {
        await addAssetFromApi(result);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const [isRefining, setIsRefining] = useState(false);

  const handleRefine = async (assetId: string, feedback: string) => {
    const sourceAsset = assets.find((a) => a.id === assetId);
    if (!sourceAsset) return;
    setIsRefining(true);
    setApiError(null);

    try {
      const savedSettings = sourceAsset.settings;
      const guideId = (savedSettings as unknown as Record<string, unknown>).styleGuideId as string | undefined;
      const guide = guideId ? styleGuides.find((g) => g.id === guideId) : undefined;

      const formData = new FormData();
      formData.append("prompt", sourceAsset.prompt);
      formData.append("feedback", feedback);
      formData.append("settings", JSON.stringify(savedSettings));
      formData.append("refinedFrom", assetId);

      // Fetch source image from blob URL
      const imgResponse = await fetch(sourceAsset.outputPath);
      const imgBlob = await imgResponse.blob();
      formData.append("sourceImage", imgBlob, "source.png");

      if (guide && guide.referenceImages.length > 0) {
        for (const imgUrl of guide.referenceImages) {
          const refResponse = await fetch(imgUrl);
          const refBlob = await refResponse.blob();
          formData.append("styleImages", refBlob, "style.png");
        }
      }

      const response = await fetch("/api/generate/refine", {
        method: "POST",
        headers: getApiKeyHeader(),
        body: formData,
      });
      const apiResult = await checkResponse(response);
      if (!apiResult) return;

      const results = Array.isArray(apiResult) ? apiResult : [apiResult];
      for (const result of results) {
        await addAssetFromApi(result);
      }

      setSelectedAsset(null);
    } finally {
      setIsRefining(false);
    }
  };

  const handleVariations = async (assetId: string) => {
    setIsGenerating(true);
    setSelectedAsset(null);
    setApiError(null);
    try {
      const sourceAsset = assets.find((a) => a.id === assetId);
      if (!sourceAsset) return;

      const formData = new FormData();

      // Fetch source image from blob URL
      const imgResponse = await fetch(sourceAsset.outputPath);
      const imgBlob = await imgResponse.blob();
      formData.append("sourceImage", imgBlob, "source.png");
      formData.append("asset", JSON.stringify(sourceAsset));
      formData.append("count", "4");

      const response = await fetch("/api/generate/variations", {
        method: "POST",
        headers: getApiKeyHeader(),
        body: formData,
      });
      const results = await checkResponse(response);
      if (!results) return;

      for (const result of results) {
        await addAssetFromApi(result);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (assetId: string, approved: boolean) => {
    updateAsset(assetId, { approved });
    if (selectedAsset?.id === assetId) {
      setSelectedAsset({ ...selectedAsset, approved });
    }
  };

  const handleDelete = async (assetId: string) => {
    await removeAsset(assetId);
    setSelectedAsset(null);
  };

  return (
    <div>
      <div className="mb-6 border-b border-[var(--border)] pb-6">
        <div className="flex gap-4 items-start">
          <div className="flex flex-col gap-3 flex-shrink-0">
            <ReferenceUpload
              onUpload={handleUpload}
              currentImage={referencePreview}
              onClear={handleClearReference}
            />

            {referencePreview && (
              <ElementReferencesUpload
                elements={elementRefs}
                onAdd={handleAddElements}
                onRemove={handleRemoveElement}
                onLabelChange={handleElementLabelChange}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <PromptEditor value={prompt} onChange={(v) => { setPrompt(v); setEnhancedPrompt(null); }} />

            {referencePreview && (
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Edit instructions: e.g., Replace the mountain with the house. Replace each character with my characters. Remove the ghost in the background."
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none focus:outline-none focus:border-[var(--primary)]"
                rows={2}
              />
            )}

            {enhancedPrompt && (
              <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-[var(--muted)] uppercase tracking-wider">Enhanced Prompt</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPrompt(enhancedPrompt); setEnhancedPrompt(null); }}
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      Use as base
                    </button>
                    <button
                      onClick={() => setEnhancedPrompt(null)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <p className="text-sm text-[var(--foreground)]">{enhancedPrompt}</p>
              </div>
            )}

            <GenerationSettings
              settings={settings}
              onUpdate={updateSettings}
              styleGuides={styleGuides}
              selectedStyleGuideId={selectedStyleGuideId}
              onSelectStyleGuide={setSelectedStyleGuideId}
            />
            <div className="flex gap-2 items-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                {isGenerating ? "Generating..." : "Generate"}
              </button>

              <button
                onClick={handleEnhance}
                disabled={isEnhancing || !prompt.trim()}
                className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--border)] hover:border-[var(--muted)] disabled:opacity-50 text-[var(--foreground)] px-4 py-2.5 rounded-lg text-sm"
              >
                {isEnhancing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isEnhancing ? "Enhancing..." : "Enhance"}
              </button>

              <select
                value={enhanceModel}
                onChange={(e) => setEnhanceModel(e.target.value)}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-2 py-2 text-xs text-[var(--foreground)]"
                title="Model used for prompt enhancement"
              >
                {ENHANCE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {apiError && (
        <div className={`mb-4 border rounded-lg p-4 flex items-start gap-3 ${
          apiError.code === "QUOTA_EXCEEDED" || apiError.code === "INVALID_API_KEY"
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-red-500/10 border-red-500/30"
        }`}>
          <AlertTriangle size={18} className={
            apiError.code === "QUOTA_EXCEEDED" || apiError.code === "INVALID_API_KEY"
              ? "text-amber-400 flex-shrink-0 mt-0.5"
              : "text-red-400 flex-shrink-0 mt-0.5"
          } />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--foreground)]">{apiError.message}</p>
            {(apiError.code === "QUOTA_EXCEEDED" || apiError.code === "INVALID_API_KEY") && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={handleClearApiKey}
                  className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-md font-medium"
                >
                  Clear API Key & Enter New One
                </button>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--primary)] hover:underline"
                >
                  Get a new key
                </a>
              </div>
            )}
          </div>
          <button
            onClick={() => setApiError(null)}
            className="text-[var(--muted)] hover:text-[var(--foreground)] flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div>
        <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-3">Recent Generations</p>
        <AssetGrid
          assets={assets}
          onAssetClick={setSelectedAsset}
          emptyMessage="Generate your first asset above"
        />
      </div>

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onGenerateVariations={handleVariations}
          onDelete={handleDelete}
          onRefine={handleRefine}
          onApprove={handleApprove}
          isRefining={isRefining}
        />
      )}
    </div>
  );
}
