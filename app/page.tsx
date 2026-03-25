import Link from "next/link";
import { Image, Clapperboard, Sparkles, Wand2 } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* Header */}
      <header className="w-full border-b border-white/10 p-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <Wand2 className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white drop-shadow-md">
            EAGLE <span className="text-accent">AI HUB</span>
          </h1>
        </div>
        <nav>
          <ul className="flex gap-8 text-sm font-medium text-white/50">
            <li className="hover:text-accent transition-colors cursor-pointer text-white">Hub</li>
            <li className="hover:text-accent transition-colors cursor-pointer">Docs</li>
            <li className="hover:text-accent transition-colors cursor-pointer">Support</li>
          </ul>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-8 border border-accent/20">
          <Sparkles className="w-4 h-4" />
          <span>Internal Tools for Creative Team</span>
        </div>
        <h2 className="text-5xl md:text-7xl font-extrabold mb-8 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">
          Welcome back <span className="text-accent drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]"></span>
        </h2>
        <p className="text-lg md:text-xl text-white/50 max-w-2xl mb-20 leading-relaxed max-w-balance">
          Your centralized hub for all AI-powered creative production tools at Eagle Games.
          Select an application below to start creating magic.
        </p>

        {/* App Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
          {/* General Image Card */}
          <Link href="/general-image" className="group h-full">
            <div className="h-full bg-white/[0.03] border border-white/10 rounded-3xl p-10 transition-all duration-500 hover:border-accent/50 hover:bg-white/[0.05] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-accent/20 transition-colors duration-500"></div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-8 border border-white/10 group-hover:border-accent/30 transition-colors duration-500 relative z-10">
                <Image className="w-10 h-10 text-white group-hover:text-accent transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-accent transition-colors duration-300 relative z-10">General Image</h3>
              <p className="text-white/50 text-base leading-relaxed relative z-10">
                Generate high-quality general purpose assets, concepts, and moodboards for your projects.
              </p>
            </div>
          </Link>

          {/* Creative Image Card */}
          <Link href="/creative-image" className="group h-full">
            <div className="h-full bg-white/[0.03] border border-white/10 rounded-3xl p-10 transition-all duration-500 hover:border-accent/50 hover:bg-white/[0.05] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-accent/20 transition-colors duration-500"></div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-8 border border-white/10 group-hover:border-accent/30 transition-colors duration-500 relative z-10">
                <Sparkles className="w-10 h-10 text-white group-hover:text-accent transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-accent transition-colors duration-300 relative z-10">Creative Image</h3>
              <p className="text-white/50 text-base leading-relaxed relative z-10">
                Advanced image generation with fine-tuned models tailored for our distinct game art styles.
              </p>
            </div>
          </Link>

          {/* Creative Video Card */}
          <Link href="/creative-video" className="group h-full">
            <div className="h-full bg-white/[0.03] border border-white/10 rounded-3xl p-10 transition-all duration-500 hover:border-accent/50 hover:bg-white/[0.05] hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(234,179,8,0.15)] flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-accent/20 transition-colors duration-500"></div>
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 flex items-center justify-center mb-8 border border-white/10 group-hover:border-accent/30 transition-colors duration-500 relative z-10">
                <Clapperboard className="w-10 h-10 text-white group-hover:text-accent transition-colors duration-500" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-accent transition-colors duration-300 relative z-10">Creative Video</h3>
              <p className="text-white/50 text-base leading-relaxed relative z-10">
                Produce engaging video content, cinematic trailers, and smooth animations powered by AI.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
