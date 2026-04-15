import { useAppStore } from "../app-store";
import { GeneratedAsset, StyleGuide, DEFAULT_SETTINGS } from "../../lib/types";

describe("app-store", () => {
  beforeEach(() => {
    useAppStore.setState({
      assets: [],
      styleGuides: [],
      settings: { ...DEFAULT_SETTINGS },
      isGenerating: false,
    });
  });

  test("addAsset adds to beginning of assets array", () => {
    const asset: GeneratedAsset = {
      id: "1",
      prompt: "test",
      settings: DEFAULT_SETTINGS,
      outputPath: "/outputs/1.png",
      thumbnailPath: "/outputs/1-thumb.png",
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addAsset(asset);
    expect(useAppStore.getState().assets).toHaveLength(1);
    expect(useAppStore.getState().assets[0].id).toBe("1");
  });

  test("updateSettings merges partial settings", () => {
    useAppStore.getState().updateSettings({ width: 1024 });
    expect(useAppStore.getState().settings.width).toBe(1024);
    expect(useAppStore.getState().settings.height).toBe(512); // unchanged
  });

  test("addStyleGuide adds guide", () => {
    const guide: StyleGuide = {
      id: "g1",
      name: "RPG Style",
      referenceImages: ["/ref/1.png"],
      defaultPromptPrefix: "dark fantasy",
      negativePrompt: "",
      systemInstruction: "",
      defaultSettings: { style: "hand-drawn" },
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addStyleGuide(guide);
    expect(useAppStore.getState().styleGuides).toHaveLength(1);
  });

  test("removeStyleGuide removes by id", () => {
    const guide: StyleGuide = {
      id: "g1",
      name: "RPG Style",
      referenceImages: [],
      defaultPromptPrefix: "",
      negativePrompt: "",
      systemInstruction: "",
      defaultSettings: { style: "pixel-art" },
      createdAt: new Date().toISOString(),
    };
    useAppStore.getState().addStyleGuide(guide);
    useAppStore.getState().removeStyleGuide("g1");
    expect(useAppStore.getState().styleGuides).toHaveLength(0);
  });
});
