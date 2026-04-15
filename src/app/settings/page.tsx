"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { STYLE_PRESETS } from "@/lib/types";
import { getApiKey, saveApiKey, clearApiKey } from "@/lib/client-storage";

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const key = getApiKey();
    if (key) setApiKey(key);
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      saveApiKey(apiKey.trim());
    } else {
      clearApiKey();
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Gemini API Key</label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {showKey ? "Hide" : "Show"}
            </button>
            <button
              onClick={handleSaveKey}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-lg text-sm"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">
            Stored locally in your browser. Get one from{" "}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
              Google AI Studio
            </a>.
          </p>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Default Style</label>
          <select
            value={settings.style}
            onChange={(e) => updateSettings({ style: e.target.value })}
            className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
          >
            {STYLE_PRESETS.map((s) => (
              <option key={s} value={s}>{s.replace("-", " ")}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Default Width</label>
            <input
              type="number"
              value={settings.width}
              onChange={(e) => updateSettings({ width: parseInt(e.target.value) || 512 })}
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Default Height</label>
            <input
              type="number"
              value={settings.height}
              onChange={(e) => updateSettings({ height: parseInt(e.target.value) || 512 })}
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)]"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.transparent}
            onChange={(e) => updateSettings({ transparent: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">Transparent background by default</span>
        </label>
      </div>
    </div>
  );
}
