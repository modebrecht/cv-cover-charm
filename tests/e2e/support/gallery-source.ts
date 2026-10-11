import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Record the exact checked-out revision alongside independently generated galleries. */
export async function recordGallerySource(directory: string) {
  const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  await writeFile(join(directory, "SOURCE_SHA.txt"), `${sha}\n`);
}
