import type { Metadata } from 'next';
import { Lexend, Orbitron } from 'next/font/google';
import './globals.css';

const lexend = Lexend({ subsets: ['latin'], variable: '--font-lexend' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron' });

export const metadata: Metadata = {
  title: 'EasyGoing - Creative Hub',
  description: 'AI-powered creative asset generator for Mobile Game UA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lexend.variable} ${orbitron.variable}`}>
      <body className="antialiased selection:bg-primary-500/30 font-sans">
        <div className="glow glow-1"></div>
        <div className="glow glow-2"></div>
        <div className="grid-overlay"></div>
        {children}
      </body>
    </html>
  );
}
