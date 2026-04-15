"use client";

import { StyleGuide } from "@/lib/types";
import { Trash2, Pencil } from "lucide-react";

interface StyleGuideCardProps {
  guide: StyleGuide;
  onDelete: (id: string) => void;
  onEdit: (guide: StyleGuide) => void;
}

export function StyleGuideCard({ guide, onDelete, onEdit }: StyleGuideCardProps) {
  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm">{guide.name}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(guide)}
            className="text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(guide.id)}
            className="text-[var(--muted)] hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {guide.referenceImages.length > 0 && (
        <div className="flex gap-2 mb-3">
          {guide.referenceImages.slice(0, 4).map((img, i) => (
            <div key={i} className="w-16 h-16 rounded border border-[var(--border)] overflow-hidden">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {guide.defaultPromptPrefix && (
        <p className="text-xs text-[var(--muted)] mb-2">
          Prefix: <span className="text-[var(--foreground)]">{guide.defaultPromptPrefix}</span>
        </p>
      )}

      {guide.negativePrompt && (
        <p className="text-xs text-[var(--muted)] mb-2">
          Exclude: <span className="text-[var(--foreground)]">{guide.negativePrompt}</span>
        </p>
      )}

      {guide.systemInstruction && (
        <p className="text-xs text-[var(--muted)] mb-2">
          Instruction: <span className="text-[var(--foreground)]">{guide.systemInstruction}</span>
        </p>
      )}

      <div className="text-xs text-[var(--muted)]">
        Style: {guide.defaultSettings.style}
      </div>
    </div>
  );
}
