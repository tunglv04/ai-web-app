"use client";

import { useState, useEffect } from "react";
import { Key, Loader2 } from "lucide-react";
import { getApiKey, saveApiKey } from "@/lib/client-storage";

export function ApiKeyGate({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setHasKey(!!getApiKey());
  }, []);

  // Show nothing until we've checked localStorage
  if (hasKey === null) return null;

  if (hasKey) return <>{children}</>;

  const handleSubmit = async () => {
    if (!key.trim()) return;
    setTesting(true);
    setError("");

    try {
      // Quick validation: try a simple Gemini call
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key.trim(),
        },
        body: JSON.stringify({ prompt: "test", style: "pixel-art" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid API key");
      }

      saveApiKey(key.trim());
      setHasKey(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate key");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--background)] flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--primary)] rounded-lg flex items-center justify-center">
            <Key size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Game Asset Generator</h1>
            <p className="text-xs text-[var(--muted)]">Enter your Gemini API key to get started</p>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4">
          <label className="block text-xs text-[var(--muted)] mb-2">
            Gemini API Key
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="AIza..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] mb-3 focus:outline-none focus:border-[var(--primary)]"
            autoFocus
          />

          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!key.trim() || testing}
            className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-semibold"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : null}
            {testing ? "Validating..." : "Save & Continue"}
          </button>

          <p className="text-xs text-[var(--muted)] mt-3">
            Get your API key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--primary)] hover:underline"
            >
              Google AI Studio
            </a>
            . Your key is stored locally in your browser.
          </p>
        </div>
      </div>
    </div>
  );
}
