export async function sendToDiscord(
  imageBuffer: Buffer,
  prompt: string
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const formData = new FormData();

    const blob = new Blob([imageBuffer], { type: "image/png" });
    formData.set("file", blob, "generated.png");

    formData.set(
      "payload_json",
      JSON.stringify({
        content: `**Prompt:** ${prompt}`,
      })
    );

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error(
        `Discord webhook failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error("Discord webhook error:", error);
  }
}
