from pathlib import Path

p = Path("tests/e2e/cv-pdf-text.spec.ts")
text = p.read_text()
anchor = 'const BASE_URL = "http://127.0.0.1:4173";\n'
helper = '''\n\nasync function extractPdfPages(path: string): Promise<string[]> {\n  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");\n  const data = new Uint8Array(await readFile(path));\n  const document = await getDocument({ data, disableFontFace: true }).promise;\n  const pages: string[] = [];\n  try {\n    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {\n      const pdfPage = await document.getPage(pageNumber);\n      const content = await pdfPage.getTextContent();\n      pages.push(\n        content.items\n          .map((item) => ("str" in item ? item.str : ""))\n          .filter(Boolean)\n          .join(" "),\n      );\n    }\n  } finally {\n    await document.destroy();\n  }\n  return pages;\n}\n\nfunction expectCabinEmbedded(source: string) {\n  expect(source, "Cabin must be embedded as the real PDF font").toMatch(/Cabin/i);\n}\n'''
if "async function extractPdfPages" not in text:
    text = text.replace(anchor, anchor + helper)

old = '''    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    expect(pdfSource).toContain("Lea");\n    expect(pdfSource).toContain("Sekundarschule");\n    expect(pdfSource).toContain("Beispielbetrieb");\n    expect(pdfSource).toContain("Volleyball");\n    expect(pdfSource).toContain("Cabin");'''
new = '''    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    const pdfPages = await extractPdfPages(path ?? "");\n    const pdfText = pdfPages.join(" ");\n    expect(pdfText).toContain("Lea");\n    expect(pdfText).toContain("Sekundarschule");\n    expect(pdfText).toContain("Beispielbetrieb");\n    expect(pdfText).toContain("Volleyball");\n    expectCabinEmbedded(pdfSource);'''
if old not in text:
    raise SystemExit("standalone PDF assertion block not found")
text = text.replace(old, new, 1)

old = '''    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    expect(pdfSource).toContain(marker ?? "__missing_second_page_marker__");'''
new = '''    const pdfPages = await extractPdfPages(path ?? "");\n    expect(pdfPages.length).toBeGreaterThan(1);\n    expect(pdfPages.slice(1).join(" ")).toContain(marker ?? "__missing_second_page_marker__");'''
if old not in text:
    raise SystemExit("page-2 PDF assertion block not found")
text = text.replace(old, new, 1)

old = '''    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    const letterIndex = pdfSource.indexOf("Bewerbung Informatik Textlayer Test");\n    const cvIndex = pdfSource.indexOf("Sekundarschule");\n    expect(letterIndex).toBeGreaterThan(-1);\n    expect(cvIndex).toBeGreaterThan(-1);\n    expect(letterIndex).toBeLessThan(cvIndex);\n    expect(pdfSource).toContain("Cabin");'''
new = '''    const pdfSource = (await readFile(path ?? "")).toString("latin1");\n    const pdfPages = await extractPdfPages(path ?? "");\n    expect(pdfPages.length).toBeGreaterThanOrEqual(3);\n    expect(pdfPages[1]).toContain("Bewerbung Informatik Textlayer Test");\n    expect(pdfPages.slice(2).join(" ")).toContain("Sekundarschule");\n    expectCabinEmbedded(pdfSource);'''
if old not in text:
    raise SystemExit("combined PDF assertion block not found")
text = text.replace(old, new, 1)
p.write_text(text)

Path(".github/workflows/upgrade-cabin-pdf-tests.yml").unlink(missing_ok=True)
Path(".github/workflows/install-pdfjs-cabin-tests.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)
