import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { composeSpriteSheet } from "@/lib/image-processing";
import { readJsonFile, writeJsonFile, PATHS } from "@/lib/storage";
import { GeneratedAsset, SpriteSheet } from "@/lib/types";

export async function GET() {
  const sheets = await readJsonFile<SpriteSheet[]>(PATHS.spritesheets, []);
  return NextResponse.json(sheets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, assetIds, grid } = body;

  const history = await readJsonFile<GeneratedAsset[]>(PATHS.history, []);
  const selectedAssets = assetIds
    .map((id: string) => history.find((a) => a.id === id))
    .filter(Boolean) as GeneratedAsset[];

  if (selectedAssets.length === 0) {
    return NextResponse.json({ error: "No valid assets found" }, { status: 400 });
  }

  const imageBuffers = await Promise.all(
    selectedAssets.map((asset) =>
      fs.readFile(path.join(process.cwd(), "public", asset.outputPath))
    )
  );

  const spriteSheetBuffer = await composeSpriteSheet(imageBuffers, grid);

  await fs.mkdir(PATHS.outputs, { recursive: true });
  const id = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${id}.png`;
  await fs.writeFile(path.join(PATHS.outputs, filename), spriteSheetBuffer);

  const sheet: SpriteSheet = {
    id,
    name: name || `Sprite Sheet ${id}`,
    assets: assetIds,
    grid,
    outputPath: `/outputs/${filename}`,
    createdAt: new Date().toISOString(),
  };

  const sheets = await readJsonFile<SpriteSheet[]>(PATHS.spritesheets, []);
  sheets.push(sheet);
  await writeJsonFile(PATHS.spritesheets, sheets);

  return NextResponse.json(sheet);
}
