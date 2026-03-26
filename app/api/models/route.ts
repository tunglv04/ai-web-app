import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-google-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing API Key" }, { status: 401 });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to fetch models");
    }

    return NextResponse.json({ models: data.models || [] });
  } catch (error: any) {
    console.error("Fetch models error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
