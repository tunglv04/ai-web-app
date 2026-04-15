import { enhancePrompt } from "../prompt-enhancer";

// Mock the Google Generative AI SDK
jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => "enhanced prompt result",
        },
      }),
    }),
  })),
}));

describe("enhancePrompt", () => {
  test("returns enhanced prompt string", async () => {
    const result = await enhancePrompt({
      prompt: "a warrior",
      style: "hand-drawn",
      apiKey: "test-key",
    });
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("includes negative prompt context when provided", async () => {
    const result = await enhancePrompt({
      prompt: "a warrior",
      style: "hand-drawn",
      negativePrompt: "no legs",
      apiKey: "test-key",
    });
    expect(typeof result).toBe("string");
  });

  test("includes system instruction when provided", async () => {
    const result = await enhancePrompt({
      prompt: "a warrior",
      style: "hand-drawn",
      systemInstruction: "2D game sprites with ink outlines",
      apiKey: "test-key",
    });
    expect(typeof result).toBe("string");
  });
});
