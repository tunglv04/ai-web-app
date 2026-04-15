import { promises as fs } from "fs";
import path from "path";

export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return defaultValue;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function appendToJsonArray<T>(filePath: string, item: T): Promise<void> {
  const existing = await readJsonFile<T[]>(filePath, []);
  existing.push(item);
  await writeJsonFile(filePath, existing);
}

const DATA_DIR = path.join(process.cwd(), "data");

export const PATHS = {
  history: path.join(DATA_DIR, "history.json"),
  styleguides: path.join(DATA_DIR, "styleguides.json"),
  spritesheets: path.join(DATA_DIR, "spritesheets.json"),
  outputs: path.join(process.cwd(), "public", "outputs"),
  references: path.join(process.cwd(), "public", "references"),
};
