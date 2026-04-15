"use client";

import { useState, useEffect } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { GeneratedAsset, SpriteSheet } from "@/lib/types";
import { AssetGrid } from "@/components/asset-grid";
import { SpriteSheetPreview } from "@/components/sprite-sheet-preview";

export default function SpriteSheetsPage() {
  const [sheets, setSheets] = useState<SpriteSheet[]>([]);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [columns, setColumns] = useState(4);
  const [rows, setRows] = useState(4);
  const [frameWidth, setFrameWidth] = useState(64);
  const [frameHeight, setFrameHeight] = useState(64);
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    fetch("/api/spritesheet").then((r) => r.json()).then(setSheets);
    fetch("/api/gallery").then((r) => r.json()).then(setAssets);
  }, []);

  const toggleSelect = (asset: GeneratedAsset) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0 || !name.trim()) return;

    const res = await fetch("/api/spritesheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        assetIds: Array.from(selectedIds),
        grid: { columns, rows, frameWidth, frameHeight, padding },
      }),
    });
    const sheet = await res.json();
    setSheets((prev) => [...prev, sheet]);
    setIsCreating(false);
    setSelectedIds(new Set());
    setName("");
  };

  const handleDelete = async (id: string) => {
    setSheets((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sprite Sheets</h2>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus size={16} /> New Sheet
        </button>
      </div>

      {isCreating && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprite sheet name..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3"
          />

          <div className="flex gap-3 mb-3 flex-wrap text-xs">
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Columns:
              <input type="number" value={columns} onChange={(e) => setColumns(parseInt(e.target.value) || 1)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Rows:
              <input type="number" value={rows} onChange={(e) => setRows(parseInt(e.target.value) || 1)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Frame W:
              <input type="number" value={frameWidth} onChange={(e) => setFrameWidth(parseInt(e.target.value) || 32)} className="w-16 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Frame H:
              <input type="number" value={frameHeight} onChange={(e) => setFrameHeight(parseInt(e.target.value) || 32)} className="w-16 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
            <label className="flex items-center gap-1 text-[var(--muted)]">
              Padding:
              <input type="number" value={padding} onChange={(e) => setPadding(parseInt(e.target.value) || 0)} className="w-14 bg-[var(--sidebar-bg)] border border-[var(--border)] rounded px-2 py-1 text-[var(--foreground)]" />
            </label>
          </div>

          <p className="text-xs text-[var(--muted)] mb-2">Select assets ({selectedIds.size} selected):</p>
          <div className="max-h-64 overflow-auto mb-3">
            <AssetGrid
              assets={assets}
              onAssetClick={() => {}}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={selectedIds.size === 0 || !name.trim()}
              className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
            >
              <LayoutGrid size={16} /> Compose Sheet
            </button>
            <button onClick={() => setIsCreating(false)} className="bg-[var(--card-bg)] text-[var(--muted)] px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sheets.map((sheet) => (
          <SpriteSheetPreview key={sheet.id} sheet={sheet} onDelete={handleDelete} />
        ))}
      </div>

      {sheets.length === 0 && !isCreating && (
        <p className="text-[var(--muted)] text-sm text-center mt-8">
          No sprite sheets yet. Compose one from your generated assets.
        </p>
      )}
    </div>
  );
}
