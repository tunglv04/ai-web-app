import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { ApiKeyGate } from "@/components/api-key-gate";

export const metadata: Metadata = {
  title: "Game Asset Generator",
  description: "Generate 2D game assets with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <ApiKeyGate>
          <Sidebar />
          <main className="ml-56 min-h-screen p-6">{children}</main>
        </ApiKeyGate>
      </body>
    </html>
  );
}
