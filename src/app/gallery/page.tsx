"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/types";
import { useAppStore, getApiKeyHeader } from "@/store/app-store";
import { AssetGrid } from "@/components/asset-grid";
import { AssetDetailModal } from "@/components/asset-detail-modal";
import { GeneratedAsset } from "@/lib/types";

export default function GalleryPage() {
  const { assets, init, removeAsset, updateAsset, addAssetFromApi } = useAppStore();
  const [search, setSearch] = useState("");
  const [styleFilter, setStyleFilter] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<GeneratedAsset | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (search && !a.prompt.toLowerCase().includes(search.toLowerCase())) return false;
      if (styleFilter && a.settings.style !== styleFilter) return false;
      return true;
    });
  }, [assets, search, styleFilter]);

  const handleVariations = async (assetId: string) => {
    setSelectedAsset(null);
    const sourceAsset = assets.find((a) => a.id === assetId);
    if (!sourceAsset) return;

    const formData = new FormData();
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
    const results = await response.json();

    for (const result of results) {
      await addAssetFromApi(result);
    }
  };

  const handleDelete = async (assetId: string) => {
    await removeAsset(assetId);
    setSelectedAsset(null);
  };

  const handleApprove = async (assetId: string, approved: boolean) => {
    updateAsset(assetId, { approved });
    if (selectedAsset?.id === assetId) {
      setSelectedAsset({ ...selectedAsset, approved });
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Gallery</h2>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        <select
          value={styleFilter}
          onChange={(e) => setStyleFilter(e.target.value)}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
        >
          <option value="">All styles</option>
          {STYLE_PRESETS.map((s) => (
            <option key={s} value={s}>
              {s.replace("-", " ")}
            </option>
          ))}
        </select>
      </div>

      <AssetGrid
        assets={filtered}
        onAssetClick={setSelectedAsset}
        emptyMessage="No assets match your search"
      />

      {selectedAsset && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onGenerateVariations={handleVariations}
          onDelete={handleDelete}
          onRefine={() => {}}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
