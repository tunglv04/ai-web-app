import { buildTextToImagePayload, buildImg2ImgPayload, STABILITY_ENDPOINTS } from "../stability";

describe("stability", () => {
  test("STABILITY_ENDPOINTS has correct base URL", () => {
    expect(STABILITY_ENDPOINTS.textToImage("sdxl")).toContain(
      "https://api.stability.ai"
    );
  });

  test("buildTextToImagePayload creates correct FormData fields", () => {
    const payload = buildTextToImagePayload({
      prompt: "pixel art sword",
      width: 512,
      height: 512,
      style: "pixel-art",
    });
    expect(payload.get("prompt")).toBe("pixel art sword");
    expect(payload.get("output_format")).toBe("png");
  });

  test("buildImg2ImgPayload includes image and strength", () => {
    const imageBuffer = Buffer.from("fake-image");
    const payload = buildImg2ImgPayload({
      prompt: "make it blue",
      image: imageBuffer,
      strength: 0.7,
    });
    expect(payload.get("prompt")).toBe("make it blue");
    expect(payload.get("strength")).toBe("0.7");
    expect(payload.get("image")).toBeTruthy();
  });
});
