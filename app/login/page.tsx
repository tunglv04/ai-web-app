'use client'

import { createClient } from '@/utils/supabase/client'
import { LogIn } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="panel-glass max-w-md w-full p-8 rounded-2xl flex flex-col items-center shadow-xl text-center">
        <h1 className="text-3xl font-display font-bold mb-2">Welcome</h1>
        <p className="text-foreground/70 mb-8 max-w-[320px] mx-auto">
          Sign in to generate high-quality marketing assets for your next campaign.
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 px-4 rounded-xl font-medium hover:bg-gray-100 transition-colors"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
