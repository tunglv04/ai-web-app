import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function CreativeImagePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background">
      <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl">
        <Sparkles className="w-12 h-12 text-accent" />
      </div>
      <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight">Creative Image</h1>
      <div className="inline-flex items-center px-4 py-2 rounded-full border border-accent/30 bg-accent/10 text-accent font-medium tracking-wide">
        Coming Soon
      </div>
      <p className="mt-6 text-lg text-white/50 max-w-md">
        We are preparing something amazing for you. The Creative Image tool will be available very soon.
      </p>
      <Link href="/" className="mt-12 group flex items-center gap-2 text-white/50 hover:text-white transition-colors px-6 py-3 rounded-full hover:bg-white/5">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Back to Hub
      </Link>
    </div>
  );
}
