export const STABILITY_ENDPOINTS = {
  textToImage: (model: string) =>
    `https://api.stability.ai/v2beta/stable-image/generate/${model === "sd3" ? "sd3" : "core"}`,
  img2img: () =>
    `https://api.stability.ai/v2beta/stable-image/generate/core`,
  upscale: () =>
    `https://api.stability.ai/v2beta/stable-image/upscale/fast`,
  removeBackground: () =>
    `https://api.stability.ai/v2beta/stable-image/edit/remove-background`,
};

export function buildTextToImagePayload(params: {
  prompt: string;
  width: number;
  height: number;
  style: string;
  negativePrompt?: string;
}): FormData {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("output_format", "png");
  if (params.negativePrompt) {
    formData.append("negative_prompt", params.negativePrompt);
  }
  return formData;
}

export function buildImg2ImgPayload(params: {
  prompt: string;
  image: Buffer;
  strength: number;
  negativePrompt?: string;
}): FormData {
  const formData = new FormData();
  formData.append("prompt", params.prompt);
  formData.append("image", new Blob([new Uint8Array(params.image)]), "reference.png");
  formData.append("strength", params.strength.toString());
  formData.append("output_format", "png");
  if (params.negativePrompt) {
    formData.append("negative_prompt", params.negativePrompt);
  }
  return formData;
}

export async function callStabilityApi(
  endpoint: string,
  formData: FormData,
  apiKey: string
): Promise<Buffer> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "image/*",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability AI error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
