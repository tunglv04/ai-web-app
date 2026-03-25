import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BaldEagle AI Hub",
  description: "AI Hub trung tâm dành cho Team Creative của Studio game BaldEagle",
  openGraph: {
    title: "BaldEagle AI Hub",
    description: "AI Hub trung tâm dành cho Team Creative của Studio game BaldEagle",
    url: "https://app.baldeagle.vn",
    siteName: "BaldEagle AI Hub",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
