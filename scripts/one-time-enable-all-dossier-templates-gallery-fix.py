from pathlib import Path

p = Path("tests/e2e/dossier-gallery.spec.ts")
text = p.read_text()

old = 'import { join } from "node:path";\nimport "../../src/components/cover/fresh-templates";\nimport { TEMPLATES, type TemplateId } from "../../src/components/cover/types";'
new = 'import { join } from "node:path";\nimport { TEMPLATES, type TemplateId } from "../../src/components/cover/types";'
if old not in text:
    raise SystemExit("missing fresh import anchor")
text = text.replace(old, new, 1)

anchor = 'const GALLERY_DIR = process.env.GALLERY_DIR ?? "artifacts/dossier-gallery";\n'
if anchor not in text:
    raise SystemExit("missing gallery const anchor")
fresh = '''const GALLERY_DIR = process.env.GALLERY_DIR ?? "artifacts/dossier-gallery";\n\n// Do not import fresh-templates.ts in the Playwright Node process: that module\n// intentionally imports the browser CSS for the fresh designs. The running app\n// registers the same 18 designs; this list only enumerates them for gallery files.\nconst FRESH_GALLERY_TEMPLATES: Array<{ id: TemplateId; name: string }> = [\n  { id: "edge" as TemplateId, name: "Edge" },\n  { id: "glow" as TemplateId, name: "Glow" },\n  { id: "frame" as TemplateId, name: "Frame" },\n  { id: "monoLuxe" as TemplateId, name: "Mono Luxe" },\n  { id: "horizon" as TemplateId, name: "Horizon" },\n  { id: "sunrise" as TemplateId, name: "Sunrise" },\n  { id: "forestFlow" as TemplateId, name: "Forest Flow" },\n  { id: "violetPulse" as TemplateId, name: "Violet Pulse" },\n  { id: "studio2" as TemplateId, name: "Studio 2" },\n  { id: "studio3" as TemplateId, name: "Studio 3" },\n  { id: "warm2" as TemplateId, name: "Warm 2" },\n  { id: "warm3" as TemplateId, name: "Warm 3" },\n  { id: "ledger" as TemplateId, name: "Ledger" },\n  { id: "prism" as TemplateId, name: "Prism" },\n  { id: "gallery" as TemplateId, name: "Gallery" },\n  { id: "orbit" as TemplateId, name: "Orbit" },\n  { id: "ribbon" as TemplateId, name: "Ribbon" },\n  { id: "cove" as TemplateId, name: "Cove" },\n];\n\nconst ALL_GALLERY_TEMPLATES = [\n  ...TEMPLATES.map((template) => ({ id: template.id, name: template.name })),\n  ...FRESH_GALLERY_TEMPLATES,\n];\n'''
text = text.replace(anchor, fresh, 1)

old = '    ...TEMPLATES.map((template) => ({\n'
new = '    ...ALL_GALLERY_TEMPLATES.map((template) => ({\n'
if old not in text:
    raise SystemExit("missing gallery template map anchor")
text = text.replace(old, new, 1)

old = '  expect(TEMPLATES).toHaveLength(37);\n  expect(cases).toHaveLength(38);'
new = '  expect(ALL_GALLERY_TEMPLATES).toHaveLength(37);\n  expect(cases).toHaveLength(38);'
if old not in text:
    raise SystemExit("missing gallery count anchor")
text = text.replace(old, new, 1)

p.write_text(text)
