import { GoogleGenerativeAI } from "@google/generative-ai";

export const ENHANCE_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-3-pro", label: "Gemini 3 Pro" },
];

export async function enhancePrompt(params: {
  prompt: string;
  style: string;
  negativePrompt?: string;
  systemInstruction?: string;
  styleGuidePrefix?: string;
  editInstructions?: string;
  apiKey: string;
  model?: string;
}): Promise<string> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({ model: params.model || "gemini-3-pro-preview" });

  const context: string[] = [];

  if (params.style && params.style !== "custom") {
    context.push(`Art style: ${params.style}`);
  }

  if (params.styleGuidePrefix) {
    context.push(`Style guide direction: ${params.styleGuidePrefix}`);
  }

  if (params.systemInstruction) {
    context.push(`Artist instructions: ${params.systemInstruction}`);
  }

  if (params.negativePrompt) {
    context.push(`Must NOT appear in the image: ${params.negativePrompt}`);
  }

  if (params.editInstructions) {
    context.push(`Edit instructions (what to change in the reference image): ${params.editInstructions}`);
  }

  const enhanceRequest = `You are a prompt engineer for an AI image generator. Rewrite the user's prompt to produce the best possible image.

${context.length > 0 ? "Context:\n" + context.join("\n") + "\n" : ""}
User's prompt: "${params.prompt}"

Rules:
- Output ONLY the rewritten prompt, nothing else
- Incorporate the art style naturally into the description
- Be specific about visual details: lighting, colors, textures
- Do NOT add perspective or camera angle unless the user explicitly mentioned it — that comes from the reference image
- Do NOT add composition or layout instructions unless the user asked for them
- Keep it concise but descriptive (2-4 sentences max)
- Do not add quotation marks around the output`;

  const result = await model.generateContent(enhanceRequest);
  const enhanced = result.response.text().trim();

  return enhanced;
}
