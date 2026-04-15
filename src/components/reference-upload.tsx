"use client";

import { useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Clipboard } from "lucide-react";

interface ReferenceUploadProps {
  onUpload: (file: File) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ReferenceUpload({ onUpload, currentImage, onClear }: ReferenceUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  // Global paste listener when no image is set
  useEffect(() => {
    if (currentImage) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            onUpload(file);
            return;
          }
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [currentImage, onUpload]);

  if (currentImage) {
    return (
      <div className="relative w-44 h-44 rounded-lg overflow-hidden border border-[var(--border)] flex-shrink-0">
        <img src={currentImage} alt="Reference" className="w-full h-full object-cover" />
        <button
          onClick={onClear}
          className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-black/80"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`w-44 h-44 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer flex-shrink-0 transition-colors ${
        isDragActive
          ? "border-[var(--primary)] bg-[var(--primary)]/10"
          : "border-[var(--border)] hover:border-[var(--muted)]"
      }`}
    >
      <input {...getInputProps()} />
      <Upload size={28} className="text-[var(--muted)] mb-2" />
      <p className="text-xs text-[var(--muted)] text-center px-2">
        Drop or paste image
      </p>
      <div className="flex items-center gap-1 mt-1">
        <Clipboard size={10} className="text-[var(--muted)]" />
        <p className="text-[10px] text-[var(--muted)]">Ctrl+V</p>
      </div>
    </div>
  );
}
