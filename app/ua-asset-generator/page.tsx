'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { LogOut, Settings, UploadCloud, Image as ImageIcon, Download, Loader2, Sparkles, X } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const [prompt, setPrompt] = useState('')
  const [artStyle, setArtStyle] = useState('High-quality 3D render, vibrant colors, unreal engine 5 style')
  const [cameraAngle, setCameraAngle] = useState('Dynamic action angle')
  const [ratio, setRatio] = useState('9:16')
  const [resolution, setResolution] = useState('1080x1920')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [errorDesc, setErrorDesc] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
    })
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReferenceImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReferenceImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt) return
    
    setLoading(true)
    setErrorDesc(null)
    setOutputImage(null)
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          artStyle,
          cameraAngle,
          ratio,
          resolution,
          referenceImage,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate image.')
      }
      
      setOutputImage(`data:image/jpeg;base64,${data.image}`) // Expecting base64 image from API
    } catch (err: any) {
      setErrorDesc(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!outputImage) return
    const a = document.createElement('a')
    a.href = outputImage
    a.download = `UA_Creative_${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen flex flex-col">
      <header className="flex items-center justify-between mb-8 panel-glass px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-3 text-primary-500 font-display font-bold text-2xl tracking-wide">
          <Sparkles />
          CREATIVE STUDIO
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/settings" className="icon-btn text-foreground/70 hover:text-white transition-colors" title="Settings">
                <Settings size={20} />
              </Link>
              <button onClick={handleLogout} className="icon-btn text-foreground/70 hover:text-white transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link href="/login" className="bg-primary-600 hover:bg-primary-500 px-4 py-2 text-white rounded-lg font-medium transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 panel-glass rounded-2xl p-6 h-fit">
          <h2 className="text-xl font-display font-semibold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
            <Settings size={20} className="text-primary-400" /> Campaign Settings
          </h2>
          
          <form onSubmit={handleGenerate} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Creative Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="bg-white/5 border border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm placeholder-white/30 resize-none text-white"
                placeholder="Describe the main idea (e.g., A hero holding a glowing sword, fighting a massive dragon...)"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground/80">Reference Image (Optional)</label>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[120px] relative overflow-hidden group
                  ${referenceImage ? 'border-primary-500/50 bg-primary-500/5' : 'border-white/20 hover:border-primary-400 hover:bg-white/5'}`}
              >
                {referenceImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={referenceImage} alt="Reference" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setReferenceImage(null) }}
                      className="absolute top-2 right-2 bg-black/50 p-1 rounded-full hover:bg-black/80 text-white z-10"
                    >
                      <X size={16} />
                    </button>
                    <div className="z-10 bg-black/40 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm text-white border border-white/10 shadow-lg">Image Selected</div>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} className="text-foreground/50 mb-2 group-hover:text-primary-400 transition-colors" />
                    <span className="text-xs text-center text-foreground/60 group-hover:text-foreground/80">
                      Drag & Drop or <span className="text-primary-400 font-medium">Click</span> to browse
                    </span>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground/80">Art Style</label>
                <select value={artStyle} onChange={(e) => setArtStyle(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-white [&>option]:text-black">
                  <option value="High-quality 3D render, vibrant colors, unreal engine 5 style">3D Render</option>
                  <option value="Digital 2D illustration, crisp lines, mobile game art style">2D Illustration</option>
                  <option value="Cinematic lighting, hyper-realistic, dramatic composition">Cinematic Realistic</option>
                  <option value="Stylized cartoon, bright UI elements, casual gaming style">Casual/Cartoon</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground/80">Camera Angle</label>
                <select value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-white [&>option]:text-black">
                  <option value="Dynamic action angle, tilted perspective">Dynamic Action</option>
                  <option value="Isometric view, wide landscape">Isometric</option>
                  <option value="Close-up portrait, shallow depth of field">Close-up</option>
                  <option value="Over-the-shoulder perspective">Over-shoulder</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground/80">Ratio</label>
                <select value={ratio} onChange={(e) => setRatio(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-white [&>option]:text-black">
                  <option value="1:1">Square (1:1)</option>
                  <option value="9:16">Vertical (9:16)</option>
                  <option value="16:9">Landscape (16:9)</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-foreground/80">Resolution</label>
                <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none text-white [&>option]:text-black">
                  <option value="1080x1920">1080x1920 (HD Vertical)</option>
                  <option value="1920x1080">1920x1080 (HD Land)</option>
                  <option value="1024x1024">1024x1024 (Square HQ)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !user}
              className="mt-4 pulse-hover w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-accent-500 hover:from-primary-500 hover:to-accent-400 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  {user ? 'Generate Creative' : 'Login to Generate'}
                </>
              )}
            </button>
            {errorDesc && <div className="text-red-400 text-xs mt-2 text-center bg-red-400/10 border border-red-400/20 p-2 rounded-lg">{errorDesc}</div>}
          </form>
        </aside>

        <section className="lg:col-span-8 panel-glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-display font-semibold flex items-center gap-2">
              <ImageIcon size={20} className="text-accent-500" /> Output Preview
            </h2>
            <button
              onClick={handleDownload}
              disabled={!outputImage}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Download size={16} /> Download to Computer
            </button>
          </div>

          <div className="flex-1 bg-black/40 rounded-xl border border-white/5 flex items-center justify-center overflow-hidden relative min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center gap-4 text-primary-400">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500 blur-xl opacity-30 animate-pulse rounded-full"></div>
                  <Loader2 size={48} className="animate-spin relative z-10" />
                </div>
                <p className="font-display tracking-widest text-sm animate-pulse text-primary-200">SYNTHESIZING PIXELS...</p>
              </div>
            ) : outputImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={outputImage} alt="Generated Creative" className="max-w-full max-h-[70vh] object-contain shadow-2xl rounded" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-white/20">
                <ImageIcon size={64} className="opacity-50" />
                <p className="text-sm">Configure parameters and hit generate to see magic.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
