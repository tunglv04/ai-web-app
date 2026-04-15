import { DEFAULT_SETTINGS, STYLE_PRESETS, MODEL_OPTIONS } from "../types";

describe("types", () => {
  test("DEFAULT_SETTINGS uses gemini-3.1-flash", () => {
    expect(DEFAULT_SETTINGS.model).toBe("gemini-3.1-flash");
    expect(DEFAULT_SETTINGS.autoEnhance).toBe(true);
  });

  test("MODEL_OPTIONS contains all Gemini models", () => {
    expect(MODEL_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "gemini-3-pro" }),
        expect.objectContaining({ id: "gemini-3.1-flash" }),
        expect.objectContaining({ id: "gemini-2.5-flash" }),
      ])
    );
  });

  test("no Stability models", () => {
    const ids = MODEL_OPTIONS.map((m) => m.id);
    expect(ids).not.toContain("sdxl");
    expect(ids).not.toContain("sd3");
  });

  test("STYLE_PRESETS unchanged", () => {
    expect(STYLE_PRESETS).toContain("pixel-art");
    expect(STYLE_PRESETS).toContain("hand-drawn");
    expect(STYLE_PRESETS).toContain("flat-vector");
    expect(STYLE_PRESETS).toContain("realistic");
    expect(STYLE_PRESETS).toContain("custom");
  });
});
