import { GEMINI_MODELS } from "../gemini";

describe("gemini", () => {
  test("GEMINI_MODELS contains all models", () => {
    expect(GEMINI_MODELS).toEqual({
      "gemini-3-pro": "gemini-3-pro-image-preview",
      "gemini-3.1-flash": "gemini-3.1-flash-image-preview",
      "gemini-2.5-flash": "gemini-2.5-flash-image",
    });
  });
});
