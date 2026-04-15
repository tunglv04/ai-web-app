"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, X, Clipboard } from "lucide-react";

export interface ElementReference {
  id: string;
  file: File;
  preview: string;
  label: string;
}

interface ElementReferencesUploadProps {
  elements: ElementReference[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
}

export function ElementReferencesUpload({
  elements,
  onAdd,
  onRemove,
  onLabelChange,
}: ElementReferencesUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onAdd(acceptedFiles);
      }
    },
    [onAdd]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 6,
  });

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--muted)] uppercase tracking-wider">
        Element References
      </p>

      {elements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {elements.map((elem) => (
            <div
              key={elem.id}
              className="relative flex flex-col gap-1 border border-[var(--border)] rounded-lg p-1.5 bg-[var(--card-bg)]"
            >
              <div className="relative w-20 h-20 rounded overflow-hidden">
                <img
                  src={elem.preview}
                  alt={elem.label || "Element"}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => onRemove(elem.id)}
                  className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 hover:bg-black/80"
                >
                  <X size={10} />
                </button>
              </div>
              <input
                type="text"
                value={elem.label}
                onChange={(e) => onLabelChange(elem.id, e.target.value)}
                placeholder="Label..."
                className="w-20 text-[10px] bg-transparent border border-[var(--border)] rounded px-1 py-0.5 text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        onPaste={(e) => {
          const items = e.clipboardData?.items;
          if (!items) return;
          const files: File[] = [];
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith("image/")) {
              const file = items[i].getAsFile();
              if (file) files.push(file);
            }
          }
          if (files.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            onAdd(files);
          }
        }}
        tabIndex={0}
        className={`flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg cursor-pointer transition-colors outline-none focus:border-[var(--primary)] ${
          isDragActive
            ? "border-[var(--primary)] bg-[var(--primary)]/10"
            : "border-[var(--border)] hover:border-[var(--muted)]"
        }`}
      >
        <input {...getInputProps()} />
        <Plus size={14} className="text-[var(--muted)]" />
        <span className="text-xs text-[var(--muted)]">
          Drop or paste element references
        </span>
        <Clipboard size={10} className="text-[var(--muted)]" />
      </div>
    </div>
  );
}
