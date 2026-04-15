"use client";

import { SpriteSheet } from "@/lib/types";
import { Download, Trash2 } from "lucide-react";

interface SpriteSheetPreviewProps {
  sheet: SpriteSheet;
  onDelete: (id: string) => void;
}

export function SpriteSheetPreview({ sheet, onDelete }: SpriteSheetPreviewProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = sheet.outputPath;
    link.download = `${sheet.name}.png`;
    link.click();
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
      <div
        className="aspect-video"
        style={{
          background: "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
        }}
      >
        <img src={sheet.outputPath} alt={sheet.name} className="w-full h-full object-contain" />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">{sheet.name}</h3>
          <div className="flex gap-1">
            <button onClick={handleDownload} className="text-[var(--muted)] hover:text-[var(--foreground)] p-1">
              <Download size={16} />
            </button>
            <button onClick={() => onDelete(sheet.id)} className="text-[var(--muted)] hover:text-red-400 p-1">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {sheet.grid.columns}x{sheet.grid.rows} grid | {sheet.grid.frameWidth}x{sheet.grid.frameHeight}px frames | {sheet.assets.length} assets
        </p>
      </div>
    </div>
  );
}
