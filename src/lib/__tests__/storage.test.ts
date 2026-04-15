import { readJsonFile, writeJsonFile, appendToJsonArray } from "../storage";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("storage", () => {
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "storage-test-"));
    tempFile = path.join(tempDir, "test.json");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test("readJsonFile returns default when file does not exist", async () => {
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([]);
  });

  test("writeJsonFile writes and readJsonFile reads back", async () => {
    const data = [{ id: "1", name: "test" }];
    await writeJsonFile(tempFile, data);
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual(data);
  });

  test("appendToJsonArray appends item to array file", async () => {
    await writeJsonFile(tempFile, [{ id: "1" }]);
    await appendToJsonArray(tempFile, { id: "2" });
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([{ id: "1" }, { id: "2" }]);
  });

  test("appendToJsonArray creates file if missing", async () => {
    await appendToJsonArray(tempFile, { id: "1" });
    const result = await readJsonFile(tempFile, []);
    expect(result).toEqual([{ id: "1" }]);
  });
});
