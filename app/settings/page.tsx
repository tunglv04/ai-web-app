'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Key, Save, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        supabase
          .from('user_settings')
          .select('gemini_api_key')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.gemini_api_key) {
              setApiKey(data.gemini_api_key)
            }
          })
      } else {
        window.location.href = '/login'
      }
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, gemini_api_key: apiKey }, { onConflict: 'user_id' })
    
    setLoading(false)
    if (!error) {
      alert('API Key saved successfully!')
    } else {
      alert('Error saving key. Make sure the database table `user_settings` exists with `user_id` primary key and `gemini_api_key`.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="panel-glass max-w-lg w-full p-8 rounded-2xl flex flex-col shadow-xl">
        <Link href="/" className="flex items-center gap-2 text-primary-400 hover:text-primary-300 mb-6 transition-colors self-start text-sm">
          <ArrowLeft size={16} /> Back to Hub
        </Link>
        <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-2">
          <Key className="text-primary-500" /> API Configuration
        </h1>
        <p className="text-foreground/70 mb-8 border-b border-white/10 pb-6">
          Enter your personal Google AI Studio API Key. It will be stored securely and used uniquely for your generation requests.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="apiKey" className="font-medium text-sm text-foreground/80">Gemini API Key</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder-white/30 text-white"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-3 px-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Key
          </button>
        </form>
      </div>
    </div>
  )
}
