"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wand2, Image, Palette, LayoutGrid, Settings } from "lucide-react";

const navItems = [
  { href: "/generate", label: "Generate", icon: Wand2 },
  { href: "/gallery", label: "Gallery", icon: Image },
  { href: "/style-guides", label: "Style Guides", icon: Palette },
  { href: "/sprite-sheets", label: "Sprite Sheets", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[var(--sidebar-bg)] border-r border-[var(--border)] flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-[var(--border)]">
        <h1 className="text-lg font-bold">Asset Gen</h1>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-1 transition-colors ${
                isActive
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-bg)]"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
