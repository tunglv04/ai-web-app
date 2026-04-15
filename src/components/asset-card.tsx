"use client";

import { GeneratedAsset } from "@/lib/types";

interface AssetCardProps {
  asset: GeneratedAsset;
  onClick: (asset: GeneratedAsset) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (asset: GeneratedAsset) => void;
}

export function AssetCard({ asset, onClick, selectable, selected, onSelect }: AssetCardProps) {
  return (
    <div
      className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${
        selected
          ? "border-[var(--primary)] ring-2 ring-[var(--primary)]"
          : "border-[var(--border)] hover:border-[var(--muted)]"
      }`}
      onClick={() => onClick(asset)}
    >
      <div
        className="aspect-square"
        style={{
          background:
            "repeating-conic-gradient(#1e293b 0% 25%, #0f172a 0% 50%) 50% / 16px 16px",
        }}
      >
        <img
          src={asset.thumbnailPath}
          alt={asset.prompt}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-white truncate">{asset.prompt}</p>
      </div>
      {asset.approved && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect?.(asset);
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 left-2 w-4 h-4"
        />
      )}
    </div>
  );
}
