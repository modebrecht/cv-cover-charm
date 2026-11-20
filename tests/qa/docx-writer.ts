import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

export async function readPages(path: string) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: new Uint8Array(await readFile(path)),
    disableFontFace: true,
  });
  const pdf = await task.promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(content.items.flatMap((item) => ("str" in item ? [item.str] : [])).join(" "));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function writer(source: string, target: string, format: "docx" | "pdf") {
  const engine = process.env.CV_QA_LO_KIT ?? process.env.CLASSIC_CV_QA_LO_KIT;
  if (!engine) throw new Error("Set CV_QA_LO_KIT to the LibreOfficeKit QA adapter.");
  const uri = (path: string) => pathToFileURL(resolve(path)).href;
  await run(engine, [uri(target + "-profile"), uri(source), uri(target), format], {
    timeout: 120_000,
  });
}

export async function readDocxDocument(path: string) {
  const { stdout } = await run("unzip", ["-p", path, "word/document.xml"], {
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout;
}
