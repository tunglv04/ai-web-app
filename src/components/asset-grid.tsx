"use client";

import { GeneratedAsset } from "@/lib/types";
import { AssetCard } from "./asset-card";

interface AssetGridProps {
  assets: GeneratedAsset[];
  onAssetClick: (asset: GeneratedAsset) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (asset: GeneratedAsset) => void;
  emptyMessage?: string;
}

export function AssetGrid({
  assets,
  onAssetClick,
  selectable,
  selectedIds,
  onToggleSelect,
  emptyMessage = "No assets yet",
}: AssetGridProps) {
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onClick={onAssetClick}
          selectable={selectable}
          selected={selectedIds?.has(asset.id)}
          onSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
