"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";

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
        Drop reference image here
      </p>
    </div>
  );
}
