import { NextRequest, NextResponse } from "next/server";
import { upscaleImage } from "@/lib/image-processing";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const imageFile = formData.get("image") as File | null;
  const scaleStr = formData.get("scale") as string | null;

  if (!imageFile) {
    return NextResponse.json({ error: "image required" }, { status: 400 });
  }

  const scale = parseFloat(scaleStr || "2");
  if (scale < 1 || scale > 4) {
    return NextResponse.json({ error: "scale must be between 1 and 4" }, { status: 400 });
  }

  try {
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const upscaled = await upscaleImage(buffer, scale);

    return new NextResponse(new Uint8Array(upscaled), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="upscaled-${scale}x.png"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to upscale image" }, { status: 500 });
  }
}
