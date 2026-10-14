import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { docxBoundaryViolations, docxRuntimeGraph } from "../support/docx-next-runtime-graph";
import { graphicCandidateFixture } from "../fixtures/docx-next/graphic-candidate";

describe("Item 12 PDF/Print runtime boundary", () => {
  test("all nine entry closures exclude PDF/Print, browser CSS and legacy packages", () => {
    const graph = docxRuntimeGraph();
    expect(docxBoundaryViolations(graph)).toEqual([]);
    expect(graph.modules["src/lib/docx-next/source.ts"]).toEqual([]);
    expect(graph.modules["src/lib/docx-next/source-adapter.ts"]).toEqual([]);
    expect(graph.modules["src/lib/docx-next/decoration.ts"]).toEqual([]);
    expect(Object.keys(graph.modules)).not.toContain("src/lib/dossier-pdf-document.ts");
  }, 30000);

  test("saved CV scale migration stays at the existing design entry, outside semantic data", () => {
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        "-e",
        `
        const original = { design: { titleScale: 2, headingScale: 0.5, bodyScale: 1 }, preserved: "saved content" };
        let raw = JSON.stringify(original), reads = 0, writes = 0;
        globalThis.window = { localStorage: {
          getItem(key) { reads++; return key === "lebenslauf:v1" ? raw : null; },
          setItem(key, value) { if (key !== "lebenslauf:v1") throw new Error("Unexpected migration target"); writes++; raw = value; }
        } };
        await import("./src/components/cv/types.ts");
        if (reads || writes) throw new Error("Semantic module accessed browser state");
        await import("./src/components/cv/design.ts");
        const migrated = JSON.parse(raw);
        if (writes !== 1 || migrated.design.titleScale !== 1.35 || migrated.design.headingScale !== 0.75 || migrated.design.bodyScale !== 1 || migrated.preserved !== original.preserved)
          throw new Error("Existing saved design migration changed");
      `,
      ],
      cwd: process.cwd(),
    });
    expect(new TextDecoder().decode(result.stderr)).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test("guard follows re-exports, transitive dynamic imports and require, but erases types", () => {
    const folder = mkdtempSync(join(tmpdir(), "docx-runtime-graph-"));
    const file = (name: string, text: string) => writeFileSync(join(folder, name), text);
    try {
      file(
        "tsconfig.json",
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            verbatimModuleSyntax: false,
            types: [],
            noLib: true,
          },
          include: ["*.ts"],
        }),
      );
      file("types.ts", "export interface SavedPdfType { text: string }; export const runtime = 1;");
      file(
        "types-only.ts",
        'import type { SavedPdfType } from "./types"; import { SavedPdfType as Inferred } from "./types"; export type { SavedPdfType } from "./types"; export { SavedPdfType as ReExported } from "./types"; export const value = (input: Inferred): SavedPdfType => input;',
      );
      const types = docxRuntimeGraph(["types-only.ts"], folder);
      expect(Object.keys(types.modules)).toEqual(["types-only.ts"]);
      expect(docxBoundaryViolations(types)).toEqual([]);
      file("entry.ts", 'export * from "./bridge";');
      file("bridge.ts", 'export const load = () => import("./leaf");');
      file(
        "leaf.ts",
        'declare function require(id: string): unknown; export const pdf = require("jspdf");',
      );
      const runtime = docxRuntimeGraph(["entry.ts"], folder);
      expect(runtime.modules["entry.ts"][0].target).toBe("bridge.ts");
      expect(runtime.modules["bridge.ts"][0].kind).toBe("dynamic");
      expect(runtime.modules["leaf.ts"][0]).toMatchObject({ kind: "require", target: "jspdf" });
      expect(docxBoundaryViolations(runtime)).toContain("unapproved runtime package: jspdf");
      file("unknown.ts", "export const load = (id: string) => import(id);");
      expect(docxBoundaryViolations(docxRuntimeGraph(["unknown.ts"], folder)).join("\n")).toContain(
        "nonliteral dynamic",
      );
      expect(
        docxBoundaryViolations({
          roots: ["src/lib/docx-next/export.ts"],
          modules: {
            "src/lib/docx-next/export.ts": [
              { kind: "dynamic", specifier: "./snapshot", target: "src/lib/docx-next/snapshot.ts" },
            ],
            "src/lib/docx-next/snapshot.ts": [],
          },
          externals: [],
          unresolved: [],
        }),
      ).toContain("core reaches mutable snapshot capture: src/lib/docx-next/snapshot.ts");
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  }, 30000);

  for (const template of ["cove", "diagonal", "edelDark"])
    test(`${template}: cold import and native package with PDF/Print services unavailable`, () => {
      const folder = mkdtempSync(join(tmpdir(), "docx-runtime-isolation-"));
      try {
        const input = graphicCandidateFixture(template, "custom");
        input.cv.elementStyles = {};
        input.cover.data.foto = null;
        input.cv.data.person.foto = "captured-photo";
        input.letter.data.images = [
          {
            id: "captured-letter-image",
            src: "captured-photo",
            side: "left",
            topMm: 0,
            widthMm: 20,
            gapMm: 3,
          },
        ];
        const snapshot = join(folder, "snapshot.json");
        writeFileSync(snapshot, JSON.stringify(input));
        const result = Bun.spawnSync({
          cmd: [
            process.execPath,
            "-e",
            `
            import { readFileSync } from "node:fs";
            const blocked = [];
            Bun.plugin({ name: "DOCX PDF/Print unavailable", target: "bun", setup(build) {
              build.onLoad({ namespace: "file", filter: /jspdf|html2canvas|pdfjs|pdf-lib|dossier-(?:pdf|native-print|docx(?!-next))|\\.(?:css|scss|less)$/ }, ({ path }) => {
                blocked.push(path); throw new Error("Unavailable PDF/Print service: " + path);
              });
            } });
            for (const name of ["jspdf", "./src/lib/dossier-native-print.ts", "./src/lib/dossier-pdf-document.ts", "./src/components/cover/final-pdf-polish.css"]) {
              let rejected = false;
              try { await import(name); } catch (error) { rejected = String(error).includes("Unavailable PDF/Print service"); }
              if (!rejected) throw new Error("Loader negative control failed: " + name);
            }
            blocked.length = 0;
            const input = JSON.parse(readFileSync(process.argv[1], "utf8"));
            const freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } };
            freeze(input);
            const before = JSON.stringify(input);
            const unavailable = () => { throw new Error("Unexpected browser/editor/measurement access"); };
            for (const key of ["window", "document", "localStorage", "fetch", "Image", "HTMLElement", "getComputedStyle", "requestAnimationFrame"])
              Object.defineProperty(globalThis, key, { configurable: true, get: unavailable });
            Date.now = unavailable;
            Math.random = unavailable;
            const roots = ${JSON.stringify(["export", "source", "source-adapter", "snapshot", "build-model", "model", "renderer", "images", "decoration"])};
            for (const root of roots) await import("./src/lib/docx-next/" + root + ".ts");
            const { buildDossierDocModel } = await import("./src/lib/docx-next/build-model.ts");
            const { renderDossierDocx } = await import("./src/lib/docx-next/renderer.ts");
            const { createDossierDocxNextBlob } = await import("./src/lib/docx-next/export.ts");
            const { validateDossierDocModel } = await import("./src/lib/docx-next/validation.ts");
            const { readZipEntries } = await import("./src/lib/docx-next/zip.ts");
            const { paintPng } = await import("./src/lib/docx-next/artwork.ts");
            const model = buildDossierDocModel(input);
            if (JSON.stringify(model) !== JSON.stringify(buildDossierDocModel(structuredClone(input)))) throw new Error("Nondeterministic model");
            if (JSON.stringify(input) !== before) throw new Error("Source mutation");
            validateDossierDocModel(model);
            const asset = { bytes: paintPng({ color: "123456" }), widthPx: 1, heightPx: 1, extension: "png", contentType: "image/png" };
            let images = 0, decorations = 0;
            const services = { normalizeImage: async source => { if (source !== "captured-photo") throw new Error("Unexpected image source"); images++; return asset; }, rasterizeDecoration: async () => { decorations++; return asset; } };
            const invalid = structuredClone(model);
            invalid.cv.blocks.push(structuredClone(invalid.cv.blocks[0]));
            let validated = false;
            try { await renderDossierDocx(invalid, services); } catch (error) { validated = String(error).includes("duplicate semantic identity"); }
            if (!validated) throw new Error("Real validation was not enforced");
            const blob = await createDossierDocxNextBlob(input, services);
            const entries = new Map(readZipEntries(new Uint8Array(await blob.arrayBuffer())).map(e => [e.name, e.bytes]));
            const text = name => new TextDecoder().decode(entries.get(name));
            const document = text("word/document.xml");
            for (const token of ["<w:p", "<w:tbl>", "<w:sectPr>", 'w:val="letter.subject"', 'w:val="cv.person.name"', 'w:val="cv.element:custom-a"', "Editierbarer Kandidaten-Inhalt", "Linke Zelle", "Rechte Zelle"]) {
              if (!document.includes(token)) throw new Error("Missing editable structure: " + token);
            }
            const relationships = text("word/_rels/document.xml.rels");
            for (const match of document.matchAll(/r:embed="([^"]+)"/g)) {
              const relation = [...relationships.matchAll(/<Relationship\\b[^>]*>/g)].find(r => r[0].includes('Id="' + match[1] + '"'))?.[0];
              const target = relation?.match(/Target="([^"]+)"/)?.[1];
              if (!target || !entries.has("word/" + target)) throw new Error("Broken image relationship");
            }
            if (images !== 1 || decorations < 1 || blocked.length) throw new Error("Asset isolation failed");
            console.log(JSON.stringify({ template: model.templateId, bytes: blob.size, parts: entries.size, images, decorations, forbiddenImports: blocked.length }));
          `,
            snapshot,
          ],
          cwd: process.cwd(),
        });
        expect(new TextDecoder().decode(result.stderr)).toBe("");
        expect(result.exitCode).toBe(0);
        const evidence = JSON.parse(new TextDecoder().decode(result.stdout));
        expect(evidence).toMatchObject({ template, images: 1, forbiddenImports: 0 });
        expect(evidence.bytes).toBeGreaterThan(1000);
      } finally {
        rmSync(folder, { recursive: true, force: true });
      }
    });
});
