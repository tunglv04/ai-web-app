"use client";

import { GenerationSettings as Settings, STYLE_PRESETS, StyleGuide, MODEL_OPTIONS } from "@/lib/types";

interface GenerationSettingsProps {
  settings: Settings;
  onUpdate: (partial: Partial<Settings>) => void;
  styleGuides: StyleGuide[];
  selectedStyleGuideId: string | null;
  onSelectStyleGuide: (id: string | null) => void;
}

export function GenerationSettings({
  settings,
  onUpdate,
  styleGuides,
  selectedStyleGuideId,
  onSelectStyleGuide,
}: GenerationSettingsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select
          value={settings.model}
          onChange={(e) => onUpdate({ model: e.target.value })}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        {!selectedStyleGuideId && (
          <select
            value={settings.style}
            onChange={(e) => onUpdate({ style: e.target.value })}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
          >
            {STYLE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {s.replace("-", " ")}
              </option>
            ))}
          </select>
        )}

        <input
          type="number"
          value={settings.width}
          onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 512 })}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs w-20 text-[var(--foreground)]"
          placeholder="Width"
        />
        <span className="text-[var(--muted)] text-xs self-center">x</span>
        <input
          type="number"
          value={settings.height}
          onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 512 })}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs w-20 text-[var(--foreground)]"
          placeholder="Height"
        />

        <label className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={settings.transparent}
            onChange={(e) => onUpdate({ transparent: e.target.checked })}
            className="rounded"
          />
          <span className="text-[var(--foreground)]">Transparent</span>
        </label>

        <label
          className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs cursor-pointer"
          title="Uses AI to rewrite your prompt to better match the selected style guide and art direction"
        >
          <input
            type="checkbox"
            checked={settings.autoEnhance ?? true}
            onChange={(e) => onUpdate({ autoEnhance: e.target.checked })}
            className="rounded"
          />
          <span className="text-[var(--foreground)]">AI Enhance</span>
        </label>

        <div
          className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs"
          title="Controls randomness. Low (0-0.5): consistent, predictable results. Medium (0.5-1): balanced creativity. High (1-2): experimental, more varied but may be incoherent."
        >
          <span className="text-[var(--muted)]">Temp:</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            className="w-20"
          />
          <span className="text-[var(--foreground)] w-6">{settings.temperature}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs">
          <span className="text-[var(--muted)]">Count:</span>
          <select
            value={settings.numberOfImages}
            onChange={(e) => onUpdate({ numberOfImages: parseInt(e.target.value) })}
            className="bg-transparent text-[var(--foreground)]"
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {styleGuides.length > 0 && (
          <select
            value={selectedStyleGuideId || ""}
            onChange={(e) => onSelectStyleGuide(e.target.value || null)}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--foreground)]"
          >
            <option value="">No style guide</option>
            {styleGuides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
