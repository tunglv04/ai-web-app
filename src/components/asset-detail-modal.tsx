"use client";

import { useState } from "react";
import { GeneratedAsset } from "@/lib/types";
import { X, Download, Copy, Trash2, ThumbsUp, ThumbsDown, RefreshCw, Loader2, ChevronDown } from "lucide-react";

interface AssetDetailModalProps {
  asset: GeneratedAsset;
  onClose: () => void;
  onGenerateVariations: (assetId: string) => void;
  onDelete: (assetId: string) => void;
  onRefine: (assetId: string, feedback: string) => void;
  onApprove: (assetId: string, approved: boolean) => void;
  isRefining?: boolean;
}

export function AssetDetailModal({
  asset,
  onClose,
  onGenerateVariations,
  onDelete,
  onRefine,
  onApprove,
  isRefining,
}: AssetDetailModalProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = asset.outputPath;
    link.download = `${asset.id}.png`;
    link.click();
  };

  const handleExportUpscaled = async (scale: number) => {
    setShowExportMenu(false);
    if (scale === 1) {
      handleDownload();
      return;
    }
    setIsUpscaling(true);
    try {
      const imgResponse = await fetch(asset.outputPath);
      const imgBlob = await imgResponse.blob();

      const formData = new FormData();
      formData.append("image", imgBlob, "source.png");
      formData.append("scale", String(scale));

      const res = await fetch("/api/upscale", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Upscale failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${asset.id}-${scale}x.png`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleThumbsUp = () => {
    onApprove(asset.id, !asset.approved);
    setShowFeedback(false);
    setFeedback("");
  };

  const handleThumbsDown = () => {
    setShowFeedback(true);
    if (asset.approved) {
      onApprove(asset.id, false);
    }
  };

  const handleRefine = () => {
    if (!feedback.trim()) return;
    onRefine(asset.id, feedback);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8" onClick={onClose}>
      <div
        className="bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-4 border-b border-[var(--border)]">
          <div className="flex-1 mr-4">
            <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Prompt</p>
            <p className="text-sm text-[var(--foreground)]">{asset.prompt}</p>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)] mt-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <div
            className={`rounded-lg overflow-hidden mb-4 ${asset.approved ? "ring-2 ring-green-500" : ""}`}
            style={{
              background: "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
            }}
          >
            <img src={asset.outputPath} alt={asset.prompt} className="w-full object-contain max-h-[50vh]" />
          </div>

          {/* Rate buttons */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleThumbsUp}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                asset.approved
                  ? "bg-green-600/30 text-green-400 border border-green-500/50"
                  : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-green-400 hover:border-green-500/50"
              }`}
            >
              <ThumbsUp size={16} />
            </button>
            <button
              onClick={handleThumbsDown}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                showFeedback
                  ? "bg-red-600/30 text-red-400 border border-red-500/50"
                  : "bg-[var(--card-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-red-400 hover:border-red-500/50"
              }`}
            >
              <ThumbsDown size={16} />
            </button>

            {asset.approved && (
              <span className="text-xs text-green-400 ml-1">Approved</span>
            )}
          </div>

          {/* Feedback + Refine */}
          {showFeedback && (
            <div className="mb-4">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What's wrong? This will be fixed. (e.g. 'still has legs', 'colors too dark', 'missing hat')"
                className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] resize-y min-h-[60px] mb-2"
                rows={2}
              />
              <button
                onClick={handleRefine}
                disabled={!feedback.trim() || isRefining}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
              >
                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {isRefining ? "Refining..." : "Refine"}
              </button>
            </div>
          )}

          {/* Existing feedback from previous refinement */}
          {asset.feedback && (
            <div className="mb-4 text-xs text-[var(--muted)]">
              Refined with feedback: <span className="text-[var(--foreground)] italic">&quot;{asset.feedback}&quot;</span>
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <div className="relative">
              <div className="flex">
                <button
                  onClick={handleDownload}
                  disabled={isUpscaling}
                  className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-l-lg text-sm"
                >
                  {isUpscaling ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {isUpscaling ? "Upscaling..." : "Download"}
                </button>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={isUpscaling}
                  className="flex items-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-2 py-2 rounded-r-lg text-sm border-l border-white/20"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[180px] py-1">
                    <p className="px-3 py-1.5 text-[10px] text-[var(--muted)] uppercase tracking-wider">Export Resolution</p>
                    {[
                      { scale: 1, label: `1x — ${asset.settings.width}x${asset.settings.height}` },
                      { scale: 2, label: `2x — ${asset.settings.width * 2}x${asset.settings.height * 2}` },
                      { scale: 4, label: `4x — ${asset.settings.width * 4}x${asset.settings.height * 4}` },
                    ].map((opt) => (
                      <button
                        key={opt.scale}
                        onClick={() => handleExportUpscaled(opt.scale)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => onGenerateVariations(asset.id)}
              className="flex items-center gap-2 bg-[var(--card-bg)] hover:bg-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-lg text-sm"
            >
              <Copy size={16} /> Variations
            </button>
            <button
              onClick={() => onDelete(asset.id)}
              className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 px-4 py-2 rounded-lg text-sm ml-auto"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
            <div>Style: <span className="text-[var(--foreground)]">{asset.settings.style}</span></div>
            <div>Size: <span className="text-[var(--foreground)]">{asset.settings.width}x{asset.settings.height}</span></div>
            <div>Model: <span className="text-[var(--foreground)]">{asset.settings.model}</span></div>
            <div>Transparent: <span className="text-[var(--foreground)]">{asset.settings.transparent ? "Yes" : "No"}</span></div>
            {asset.referenceImagePath && (
              <div className="col-span-2">Reference: <span className="text-[var(--foreground)]">{asset.referenceImagePath}</span></div>
            )}
            {asset.refinedFrom && (
              <div className="col-span-2">Refined from: <span className="text-[var(--foreground)]">{asset.refinedFrom}</span></div>
            )}
            <div className="col-span-2">Created: <span className="text-[var(--foreground)]">{new Date(asset.createdAt).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
