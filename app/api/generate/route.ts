import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai' // Included per requirements, but Imagen 3 currently requires direct REST predict calls in JS

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
    }

    // 1. Securely Retrieve User API Key
    const { data: settings } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', session.user.id)
      .single()

    const apiKey = settings?.gemini_api_key
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI Studio API Key not found. Please add it in Settings.' }, { status: 400 })
    }

    const body = await req.json()
    const { prompt, artStyle, cameraAngle, ratio, resolution, referenceImage } = body

    const fullPrompt = `${prompt}
- Art Style: ${artStyle}
- Camera Angle: ${cameraAngle}
- Resolution / Ratio Target: ${resolution} (${ratio})`

    // Extract base64 without prefix for the image
    let base64Image = null
    if (referenceImage) {
      const match = referenceImage.match(/^data:image\/([a-z]+);base64,(.+)$/i)
      base64Image = match ? { 
        mimeType: `image/${match[1]}`, 
        data: match[2] 
      } : null
    }

    // 2. Determine generation method
    // Because the official @google/generative-ai Node SDK does not yet natively support 
    // `generateImages` or direct Imagen 3 predictions (it focuses on text/multimodal chat),
    // we use a direct fetch to the predict REST endpoint.
    
    // For text-based (Gemini Flash), SDK usage would be:
    // const genAI = new GoogleGenerativeAI(apiKey);
    // const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // const result = await model.generateContent(fullPrompt);

    // But for Imagen 3:
    const instances: any = [
      { prompt: fullPrompt }
    ]

    // If reference image provided, some endpoints support image conditioning. 
    // Currently, standard predict focuses on text-to-image.
    if (base64Image) {
      instances[0].image = {
        bytesBase64Encoded: base64Image.data
      }
    }

    const payload = {
      instances,
      parameters: {
        sampleCount: 1,
        // Optional ratio parameters based on API version: '1:1', '9:16', '16:9'
        aspectRatio: ratio === "1:1" ? "1:1" : ratio === "9:16" ? "9:16" : "16:9" 
      }
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
        // Detailed error logging
        console.error("Google AI Studio SDK/API Error:", data.error)
        throw new Error(data.error?.message || 'Error generating image with Google AI Studio.')
    }

    const generatedImageBase64 = data.predictions?.[0]?.bytesBase64Encoded

    if (!generatedImageBase64) {
      throw new Error('No image returned from generation. The prompt might have triggered safety filters.')
    }

    // 3. Return Base64 Image (No server-side storage)
    return NextResponse.json({ image: generatedImageBase64 })

  } catch (error: any) {
    console.error('Generation Error Route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
