"use client";

import { useEffect, useState } from "react";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { KeyRound, X } from "lucide-react";

export function ApiKeyModal() {
  const [apiKey, setApiKey] = useLocalStorage<string>("google_ai_studio_key", "");
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Open modal automatically if API key is empty
  useEffect(() => {
    if (!apiKey) {
      setIsOpen(true);
    }
    setInputValue(apiKey);
  }, [apiKey]);

  const handleSave = () => {
    if (inputValue.trim()) {
      setApiKey(inputValue.trim());
      setIsOpen(false);
    }
  };

  const handleClose = () => {
    if (apiKey) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
        {apiKey && (
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-accent/20 text-accent rounded-full flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Key Required</h2>
            <p className="text-sm text-white/50">Google AI Studio</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-white/70 leading-relaxed">
            To use the General Image generator, please provide your Google AI Studio API Key. 
            This key will be saved locally in your browser.
          </p>
          
          <input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter your API Key..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />

          <button
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="w-full bg-accent hover:bg-accent/90 text-black font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Key & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
