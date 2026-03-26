"use client";

import { useState } from "react";
import { ApiKeyModal } from "@/components/general-image/ApiKeyModal";
import { ImageGenerationForm, ImageGenerationConfig } from "@/components/general-image/ImageGenerationForm";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Settings, Download, Wand2 } from "lucide-react";

export default function GeneralImagePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [enhancedPromptOutput, setEnhancedPromptOutput] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerate = async (config: ImageGenerationConfig) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedImages([]);
    setEnhancedPromptOutput(null);

    try {
      // Fetch API Key from LocalStorage and parse it since useLocalStorage stringifies it
      const rawApiKey = window.localStorage.getItem("google_ai_studio_key");
      let apiKey = rawApiKey;
      try {
        if (rawApiKey) apiKey = JSON.parse(rawApiKey);
      } catch (e) {}

      if (!apiKey) {
        throw new Error("Missing API Key");
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-google-api-key": apiKey
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image from server.");
      }

      setGeneratedImages(data.images);
      setEnhancedPromptOutput(data.enhancedPrompt);

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "An error occurred during generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center bg-black text-white relative">
      <ApiKeyModal />
      
      {/* Header */}
      <header className="w-full border-b border-white/10 p-4 flex items-center justify-between max-w-[1600px] mx-auto z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center border border-accent/20">
              <ImageIcon className="w-4 h-4 text-accent" />
            </div>
            <h1 className="text-lg font-bold tracking-wide">
              General <span className="text-accent">Image</span>
            </h1>
          </div>
        </div>

        <button 
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2 text-sm font-medium"
          onClick={() => {
            // Logic to trigger the modal open if want to change key
            // For now, it will be handled by context or event bus, but we can also just let user delete localStorage
            window.localStorage.removeItem("google_ai_studio_key");
            window.location.reload();
          }}
          title="Reset API Key"
        >
          <Settings className="w-4 h-4" />
          <span>Reset Key</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_1fr] md:grid-cols-[350px_1fr] p-4 gap-6 relative">
        {/* Left Column - Form */}
        <section className="h-full border border-white/10 rounded-2xl bg-white/[0.02] p-6 overflow-y-auto custom-scrollbar">
          <ImageGenerationForm onGenerate={handleGenerate} isLoading={isGenerating} />
        </section>

        {/* Right Column - Preview */}
        <section className="flex flex-col items-center justify-center min-h-[500px] h-full border border-white/10 rounded-2xl bg-white/[0.02] p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          
          {isGenerating ? (
            <div className="flex flex-col items-center z-10">
              <div className="w-16 h-16 border-4 border-white/10 border-t-accent rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-bold mb-2 animate-pulse">Crafting your vision...</h3>
              <p className="text-white/50 text-sm">Expanding prompt with Gemini and generating with Imagen 3</p>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center text-center max-w-md z-10 bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
              <h3 className="text-red-400 font-bold mb-2">Generation Failed</h3>
              <p className="text-white/70 text-sm">{errorMessage}</p>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="w-full h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar z-10 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((img, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-white/10 bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Generated ${idx}`} className="w-full h-auto object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a href={img} download={`generated-${idx}.png`} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-all text-white">
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              
              {enhancedPromptOutput && (
                <div className="mt-4 p-4 rounded-xl border border-accent/20 bg-accent/5 backdrop-blur-sm self-stretch text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Wand2 className="w-4 h-4 text-accent" />
                    <h4 className="text-sm font-bold text-accent">Enhanced AI Prompt</h4>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed italic border-l-2 border-accent/50 pl-3">
                    {enhancedPromptOutput}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center max-w-md z-10">
              <ImageIcon className="w-16 h-16 text-white/20 mb-6" />
              <h3 className="text-2xl font-bold mb-2">Ready to generate</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Configure your settings on the left and click generate to create high-quality general purpose assets.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
