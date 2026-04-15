"use client";

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PromptEditor({ value, onChange, placeholder }: PromptEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Describe the asset you want to generate..."}
      className="w-full bg-[var(--sidebar-bg)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] resize-none min-h-[80px] focus:outline-none focus:border-[var(--primary)]"
    />
  );
}
