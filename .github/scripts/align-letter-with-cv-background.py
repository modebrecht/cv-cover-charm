from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    path.write_text(text.replace(old, new, 1))


sheet = Path("src/components/dossier/DossierSheetBackground.tsx")
cv = Path("src/components/cv/CvCanvas.tsx")
test_sheet = Path("tests/unit/dossier-sheet-background.test.tsx")
test_cover = Path("tests/unit/cover-decorations.test.ts")
workflow = Path(".github/workflows/align-letter-with-cv-background.yml")
script = Path(".github/scripts/align-letter-with-cv-background.py")

# The CV archetype is now the geometry source for every established template.
replace_once(
    sheet,
    'import { cvPalette, onColorRoles } from "@/components/cv/palette";\nimport type { LetterTemplateId } from "@/components/letter/types";',
    'import { TEMPLATES, type TemplateId } from "@/components/cover/types";\nimport { cvContentBox, cvFrameFor } from "@/components/cv/archetype";\nimport { cvPalette, onColorRoles } from "@/components/cv/palette";\nimport type { LetterTemplateId } from "@/components/letter/types";',
    "sheet imports",
)

old_layout_fn = '''export function letterLayoutFor(template: LetterTemplateId): LetterLayout {
  if (template === "brief") {
    return { kind: "quiet", left: 25, right: 25, top: 24, bottom: 22 };
  }
  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;
}'''
new_layout_fn = '''const BASE_TEMPLATE_IDS = new Set<string>(TEMPLATES.map(({ id }) => id));

function baseTemplateId(template: LetterTemplateId): TemplateId | null {
  return template !== "brief" && BASE_TEMPLATE_IDS.has(template) ? (template as TemplateId) : null;
}

function dossierSheetLayoutFor(template: LetterTemplateId, pageIndex = 0): LetterLayout {
  if (template === "brief") {
    return { kind: "quiet", left: 25, right: 25, top: 24, bottom: 22 };
  }

  const baseId = baseTemplateId(template);
  if (baseId) {
    const frame = cvFrameFor(baseId);
    const box = cvContentBox(frame, pageIndex, "classic");
    const headMm = pageIndex === 0 ? frame.headFirstMm : frame.headRestMm;
    return {
      kind: frame.id,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      columnMm: frame.columnMm || undefined,
      bandMm: headMm || undefined,
      footMm: frame.footMm || undefined,
      cardInsetMm: frame.cardInsetMm || undefined,
      borderInsetMm: frame.borderInsetMm || undefined,
    };
  }

  // Fresh variants have no legacy CV archetype. They still use the same shared
  // background component on both documents and keep their curated safe margins.
  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;
}

export function letterLayoutFor(template: LetterTemplateId): LetterLayout {
  return dossierSheetLayoutFor(template, 0);
}'''
replace_once(sheet, old_layout_fn, new_layout_fn, "shared layout function")

replace_once(
    sheet,
    '''export function DossierSheetBackground({
  template,
  colors,
}: {
  template: LetterTemplateId;
  colors: Record<string, string>;
}) {''',
    '''export function DossierSheetBackground({
  template,
  colors,
  pageIndex = 0,
}: {
  template: LetterTemplateId;
  colors: Record<string, string>;
  pageIndex?: number;
}) {''',
    "shared background signature",
)
replace_once(
    sheet,
    "  const layout = letterLayoutFor(template);",
    "  const layout = dossierSheetLayoutFor(template, pageIndex);",
    "background layout source",
)

# Studio is a column archetype with a separate accent header band. Its CV name
# is positioned in that band, so the shared sheet must actually draw it.
replace_once(
    sheet,
    '''      {template === "studio" && (
        <div
          className="absolute left-0 top-[24mm] h-[10mm]"
          style={{
            width: "30mm",
            backgroundColor: accent,
            color: primaryRoles.ink,
          }}
        />
      )}''',
    '''      {template === "studio" && (
        <div
          className="absolute top-[24mm]"
          style={{
            left: `${layout.columnMm ?? 20}mm`,
            right: 0,
            height: `${layout.bandMm ?? 10}mm`,
            backgroundColor: accent,
            color: primaryRoles.ink,
          }}
        />
      )}''',
    "studio header band",
)

# Aurora's gradient must fill the actual CV head band, not the old 16 mm
# letter-only cap.
replace_once(
    sheet,
    '''      {template === "aurora" && (
        <div
          className="absolute inset-x-0 top-0 h-[16mm]"
          style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }}
        />
      )}''',
    '''      {template === "aurora" && (
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: `${layout.bandMm ?? 16}mm`,
            background: `linear-gradient(90deg, ${primary}, ${secondary})`,
          }}
        />
      )}''',
    "aurora band geometry",
)

# Horizont carries its full CV footer field. Keep the curved counter-shape
# proportional to that field instead of freezing the old quiet-letter height.
replace_once(
    sheet,
    '''      {template === "welle" && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 h-[15mm]"
            style={{ backgroundColor: primary }}
          />
          <div
            className="absolute bottom-[13mm] left-0 h-[5mm] w-[62%] rounded-tr-[100%]"
            style={{ backgroundColor: secondary, opacity: 0.8 }}
          />
        </>
      )}''',
    '''      {template === "welle" && (
        <>
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: `${layout.footMm ?? 15}mm`, backgroundColor: primary }}
          />
          <div
            className="absolute left-0 h-[5mm] w-[62%] rounded-tr-[100%]"
            style={{
              bottom: `${Math.max(0, (layout.footMm ?? 15) - 2)}mm`,
              backgroundColor: secondary,
              opacity: 0.8,
            }}
          />
        </>
      )}''',
    "horizon footer geometry",
)

# CV pages must render the shared background with their own page index so large
# first-page bands collapse to the documented continuation strip on page 2+.
replace_once(
    cv,
    '''  const ground = (
    <div data-cv-background="motif" style={{ position: "absolute", inset: 0 }}>
      <DossierSheetBackground template={design.template} colors={design.colors} />
    </div>
  );''',
    '''  const ground = (pageIndex: number) => (
    <div data-cv-background="motif" style={{ position: "absolute", inset: 0 }}>
      <DossierSheetBackground
        template={design.template}
        colors={design.colors}
        pageIndex={pageIndex}
      />
    </div>
  );''',
    "cv page-aware background",
)
replace_once(cv, "        {ground}\n", "        {ground(pageIndex)}\n", "cv background invocation")

# Quiet motifs (and Modern, which has no structural band despite its band
# archetype) need to remain perceptible through the reading surface. Structural
# band/column/card templates keep an opaque writing surface because their
# identity remains visible outside it.
replace_once(
    cv,
    '''            opacity: 1 - policy.backgroundOpacity * 0.14,''',
    '''            opacity:
              frame.id === "quiet" ||
              (frame.id === "band" && frame.headFirstMm === 0 && frame.footMm === 0)
                ? Math.max(0.8, 1 - policy.backgroundOpacity * 0.5)
                : 1,''',
    "cv quiet motif visibility",
)

# Update the direct shared-background contract with the CV geometry values that
# previously drifted away from the rendered sheet.
test_sheet.write_text('''import { describe, expect, test } from "bun:test";\nimport { createElement } from "react";\nimport { renderToStaticMarkup } from "react-dom/server";\nimport { DossierSheetBackground, letterLayoutFor } from "../../src/components/dossier/DossierSheetBackground";\nimport { TEMPLATES } from "../../src/components/cover/types";\nimport { defaultLetterColors } from "../../src/components/letter/types";\n\nconst markupFor = (template: Parameters<typeof DossierSheetBackground>[0]["template"]) =>\n  renderToStaticMarkup(\n    createElement(DossierSheetBackground, { template, colors: defaultLetterColors(template) }),\n  );\n\ndescribe("shared dossier sheet background", () => {\n  test("every dossier template renders the shared non-brief background", () => {\n    for (const { id } of TEMPLATES) {\n      const markup = markupFor(id);\n      expect(markup).toContain(`data-dossier-sheet-background="${id}"`);\n      expect(markup).not.toContain('data-dossier-sheet-background="brief"');\n      expect(markup).not.toContain('data-letter-background="brief"');\n      expect(markup).not.toContain("bg-white");\n    }\n  });\n\n  test("established templates use CV archetype geometry on the letter too", () => {\n    expect(markupFor("freundlich")).toContain("height:52mm");\n    expect(markupFor("colorful")).toContain("height:40mm");\n    expect(markupFor("colorful")).toContain("height:8mm");\n    expect(markupFor("blockig")).toContain("width:66mm");\n    expect(markupFor("terracotta")).toContain("width:70mm");\n    expect(markupFor("studio")).toContain("width:72mm");\n    expect(markupFor("studio")).toContain("height:38mm");\n    expect(letterLayoutFor("freundlich").top).toBe(60);\n    expect(letterLayoutFor("blockig").left).toBe(74);\n  });\n\n  test("Brief remains the deliberate plain-white alternative", () => {\n    const markup = markupFor("brief");\n    expect(markup).toContain('data-dossier-sheet-background="brief"');\n    expect(markup).toContain('data-letter-background="brief"');\n    expect(markup).toContain("bg-white");\n  });\n});\n''')

# The earlier Warm/Colorful guard must follow the component that now actually
# renders the CV sheet rather than CoverBackground's title-page-only fallback.
cover = test_cover.read_text()
cover = cover.replace(
    'import { CoverBackground } from "../../src/components/cover/CoverBackground";\n',
    'import { CoverBackground } from "../../src/components/cover/CoverBackground";\nimport { DossierSheetBackground } from "../../src/components/dossier/DossierSheetBackground";\n',
    1,
)
old_guard = '''  test("Warm and Colorful CVs keep real header fields and print-safe geometry", () => {
    const warm = renderToStaticMarkup(
      createElement(CoverBackground, { template: "freundlich", colors: COLORS }),
    );
    const colorful = renderToStaticMarkup(
      createElement(CoverBackground, { template: "colorful", colors: COLORS }),
    );

    expect(warm).toContain("height: 52mm");
    expect(warm).toContain("background: var(--cover-primary)");
    expect(colorful).toContain("height: 40mm");
    expect(colorful).toContain("height: 8mm");
    expect(cvFrameFor("colorful").headFirstMm).toBe(40);
  });'''
new_guard = '''  test("Warm and Colorful CVs keep real header fields and print-safe geometry", () => {
    const warm = renderToStaticMarkup(
      createElement(DossierSheetBackground, { template: "freundlich", colors: COLORS }),
    );
    const colorful = renderToStaticMarkup(
      createElement(DossierSheetBackground, { template: "colorful", colors: COLORS }),
    );

    expect(warm).toContain("height:52mm");
    expect(colorful).toContain("height:40mm");
    expect(colorful).toContain("height:8mm");
    expect(cvFrameFor("freundlich").headFirstMm).toBe(52);
    expect(cvFrameFor("colorful").headFirstMm).toBe(40);
  });'''
if old_guard not in cover:
    raise SystemExit("cover geometry guard: expected old block")
cover = cover.replace(old_guard, new_guard, 1)
test_cover.write_text(cover)

# Remove one-shot scaffolding in the real fix commit.
workflow.unlink()
script.unlink()
