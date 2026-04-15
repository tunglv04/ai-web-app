import { sendToDiscord } from "../discord";

// Save original env
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  global.fetch = jest.fn();
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

describe("sendToDiscord", () => {
  test("sends image and prompt to Discord webhook", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: true });

    const imageBuffer = Buffer.from("fake-png-data");
    await sendToDiscord(imageBuffer, "a cute pixel dragon");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://discord.com/api/webhooks/test/token");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  test("includes prompt in payload_json", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: true });

    await sendToDiscord(Buffer.from("fake"), "test prompt");

    const [, options] = mockFetch.mock.calls[0];
    const formData = options.body as FormData;
    const payloadJson = formData.get("payload_json") as string;
    const payload = JSON.parse(payloadJson);
    expect(payload.content).toContain("test prompt");
  });

  test("skips silently when DISCORD_WEBHOOK_URL is not set", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;
    const mockFetch = global.fetch as jest.Mock;

    await sendToDiscord(Buffer.from("fake"), "test");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("does not throw when webhook request fails", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockRejectedValue(new Error("Network error"));

    // Should not throw
    await expect(sendToDiscord(Buffer.from("fake"), "test")).resolves.toBeUndefined();
  });

  test("does not throw when webhook returns non-ok status", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test/token";
    const mockFetch = global.fetch as jest.Mock;
    mockFetch.mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests" });

    await expect(sendToDiscord(Buffer.from("fake"), "test")).resolves.toBeUndefined();
  });
});
