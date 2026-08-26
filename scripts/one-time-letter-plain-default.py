from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"Expected text not found in {path}: {old[:180]!r}")
    file.write_text(text.replace(old, new, 1))


# 1) Letter-specific template id + plain-white default.
types_path = Path("src/components/letter/types.ts")
text = types_path.read_text()
text = text.replace(
    'export type LetterAlignment = "left" | "right";\n',
    'export type LetterAlignment = "left" | "right";\nexport type LetterTemplateId = "brief" | TemplateId;\n',
    1,
)
text = text.replace('  template: TemplateId;\n', '  template: LetterTemplateId;\n', 1)
old_colors = '''export function defaultLetterColors(template: TemplateId): Record<string, string> {\n  const definition = TEMPLATES.find((candidate) => candidate.id === template) ?? TEMPLATES[0];\n  return Object.fromEntries(definition.slots.map((slot) => [slot.key, slot.default]));\n}\n\nexport function emptyLetterDesign(): LetterDesign {\n  const template = TEMPLATES.find((candidate) => candidate.id !== "colorful")?.id ?? "klassisch";\n  return {\n    template,\n    colors: defaultLetterColors(template),'''
new_colors = '''export function defaultLetterColors(template: LetterTemplateId): Record<string, string> {\n  if (template === "brief") {\n    return {\n      bg: "#ffffff",\n      ink: "#111111",\n      primary: "#111111",\n      secondary: "#111111",\n      accent: "#111111",\n      cvInk: "#111111",\n      cvMuted: "#4b5563",\n      cvHeading: "#111111",\n    };\n  }\n  const definition = TEMPLATES.find((candidate) => candidate.id === template) ?? TEMPLATES[0];\n  return Object.fromEntries(definition.slots.map((slot) => [slot.key, slot.default]));\n}\n\nexport function emptyLetterDesign(): LetterDesign {\n  const template: LetterTemplateId = "brief";\n  return {\n    template,\n    colors: defaultLetterColors(template),'''
if old_colors not in text:
    raise SystemExit("default letter colors/default template anchor missing")
text = text.replace(old_colors, new_colors, 1)
old_normalize = '''  const template =\n    typeof incoming.template === "string" &&\n    incoming.template !== "colorful" &&\n    TEMPLATES.some((candidate) => candidate.id === incoming.template)\n      ? incoming.template\n      : fallback.template;'''
new_normalize = '''  const template: LetterTemplateId =\n    incoming.template === "brief"\n      ? "brief"\n      : typeof incoming.template === "string" &&\n          incoming.template !== "colorful" &&\n          TEMPLATES.some((candidate) => candidate.id === incoming.template)\n        ? (incoming.template as TemplateId)\n        : incoming.template === "colorful"\n          ? "klassisch"\n          : fallback.template;'''
if old_normalize not in text:
    raise SystemExit("normalize template anchor missing")
text = text.replace(old_normalize, new_normalize, 1)
types_path.write_text(text)

# 2) Letter-only template picker, keeping the shared cover/CV picker untouched.
picker_path = Path("src/components/letter/LetterTemplatePicker.tsx")
picker_path.write_text('''import { TEMPLATES } from "@/components/cover/types";\nimport type { LetterTemplateId } from "./types";\n\nconst SELECTABLE_TEMPLATES = TEMPLATES.filter((template) => template.id !== "colorful").sort(\n  (a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }),\n);\n\ntype Props = {\n  value: LetterTemplateId;\n  onChange: (id: LetterTemplateId) => void;\n};\n\nconst baseClass =\n  "flex min-h-10 items-center justify-center rounded-md border px-2 py-2 text-center text-xs font-medium leading-tight transition";\n\nexport function LetterTemplatePicker({ value, onChange }: Props) {\n  return (\n    <div className="grid grid-cols-3 gap-2">\n      <button\n        type="button"\n        onClick={() => onChange("brief")}\n        aria-pressed={value === "brief"}\n        title="Klassischer Brief auf reinweissem Papier ohne Gestaltungselemente"\n        className={`${baseClass} ${\n          value === "brief"\n            ? "border-foreground bg-accent"\n            : "border-input hover:border-foreground/40 hover:bg-accent/40"\n        }`}\n      >\n        Brief\n      </button>\n      {SELECTABLE_TEMPLATES.map((template) => {\n        const active = template.id === value;\n        return (\n          <button\n            key={template.id}\n            type="button"\n            onClick={() => onChange(template.id)}\n            aria-pressed={active}\n            title={template.description}\n            className={`${baseClass} ${\n              active\n                ? "border-foreground bg-accent"\n                : "border-input hover:border-foreground/40 hover:bg-accent/40"\n            }`}\n          >\n            {template.name}\n          </button>\n        );\n      })}\n    </div>\n  );\n}\n''')

# 3) Plain letter canvas.
canvas_path = Path("src/components/letter/LetterCanvas.tsx")
text = canvas_path.read_text()
text = text.replace(
    'import type { LetterData, LetterDesign } from "./types";',
    'import type { LetterData, LetterDesign, LetterTemplateId } from "./types";',
    1,
)
text = text.replace(
    'function layoutFor(template: TemplateId): LetterLayout {\n  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;\n}',
    'function layoutFor(template: LetterTemplateId): LetterLayout {\n  if (template === "brief") {\n    return { kind: "quiet", left: 25, right: 25, top: 24, bottom: 22 };\n  }\n  return LETTER_LAYOUTS[template] ?? LETTER_LAYOUTS.klassisch;\n}',
    1,
)
old_bg_start = '''function LetterBackground({ design }: { design: LetterDesign }) {\n  const { template, colors } = design;\n  const layout = layoutFor(template);\n  const palette = cvPalette(colors);'''
new_bg_start = '''function LetterBackground({ design }: { design: LetterDesign }) {\n  const { template, colors } = design;\n  if (template === "brief") {\n    return (\n      <div\n        data-letter-background="brief"\n        className="absolute inset-0 bg-white"\n        aria-hidden="true"\n      />\n    );\n  }\n\n  const layout = layoutFor(template);\n  const palette = cvPalette(colors);'''
if old_bg_start not in text:
    raise SystemExit("LetterBackground anchor missing")
text = text.replace(old_bg_start, new_bg_start, 1)
old_palette = '''  const layout = layoutFor(design.template);\n  const palette = cvPalette(design.colors);\n  const fontFamily = FONT_STACKS[design.font];'''
new_palette = '''  const layout = layoutFor(design.template);\n  const palette =\n    design.template === "brief"\n      ? { ink: "#111111", muted: "#4b5563", accent: "#111111", paper: "#ffffff" }\n      : cvPalette(design.colors);\n  const fontFamily = FONT_STACKS[design.font];'''
if old_palette not in text:
    raise SystemExit("LetterCanvas palette anchor missing")
text = text.replace(old_palette, new_palette, 1)
text = text.replace(
    '      data-letter-page\n      data-letter-font={design.font}',
    '      data-letter-page\n      data-letter-template={design.template}\n      data-letter-font={design.font}',
    1,
)
canvas_path.write_text(text)

# 4) Route: use the letter picker, keep default Brief on first open, hide colors for Brief.
route_path = Path("src/routes/anschreiben.tsx")
text = route_path.read_text()
text = text.replace('import { TemplatePicker } from "@/components/cover/TemplatePicker";\n', '', 1)
text = text.replace(
    'import { FONT_LABELS, TEMPLATES, type FontKey, type TemplateId } from "@/components/cover/types";',
    'import { FONT_LABELS, TEMPLATES, type FontKey } from "@/components/cover/types";',
    1,
)
text = text.replace(
    'import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";\n',
    'import { LetterRichTextEditor } from "@/components/letter/LetterRichTextEditor";\nimport { LetterTemplatePicker } from "@/components/letter/LetterTemplatePicker";\n',
    1,
)
text = text.replace(
    '  type LetterDesign,\n  type SavedLetter,',
    '  type LetterDesign,\n  type LetterTemplateId,\n  type SavedLetter,',
    1,
)
# First-open transfer: content yes, design no.
text = text.replace(
    '      if (dossier.design) setDesign((current) => ({ ...current, ...dossier.design }));\n\n      const automatic = [\n        dossier.hasPersonal ? "persönliche Angaben" : null,\n        dossier.hasApplication ? "Betriebsdaten" : null,\n        dossier.hasDesign ? "Design" : null,\n      ].filter(Boolean);',
    '      const automatic = [\n        dossier.hasPersonal ? "persönliche Angaben" : null,\n        dossier.hasApplication ? "Betriebsdaten" : null,\n      ].filter(Boolean);',
    1,
)
text = text.replace(
    '// Dossier. Ein später erneut geöffnetes Anschreiben bleibt dagegen exakt so,\n    // wie der Schüler es zuletzt gespeichert hat.',
    '// Dossier. Das Brief-Design startet bewusst neutral und kann später manuell\n    // übernommen werden. Ein erneut geöffnetes Anschreiben bleibt exakt gespeichert.',
    1,
)
old_template_memo = '''  const template = useMemo(\n    () => TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0],\n    [design.template],\n  );'''
new_template_memo = '''  const template = useMemo(\n    () =>\n      design.template === "brief"\n        ? null\n        : (TEMPLATES.find((candidate) => candidate.id === design.template) ?? TEMPLATES[0]),\n    [design.template],\n  );'''
if old_template_memo not in text:
    raise SystemExit("route template memo anchor missing")
text = text.replace(old_template_memo, new_template_memo, 1)
text = text.replace('  const changeTemplate = (next: TemplateId) => {', '  const changeTemplate = (next: LetterTemplateId) => {', 1)
text = text.replace(
    '              <TemplatePicker value={design.template} onChange={changeTemplate} />',
    '              <LetterTemplatePicker value={design.template} onChange={changeTemplate} />',
    1,
)
old_colors_section = '''            <Section title="Farben" open={open.farben} onToggle={() => toggle("farben")}>\n              <ColorChooser\n                slots={template.slots}\n                colors={design.colors}\n                onChange={(key, value) =>\n                  setDesign((current) => ({\n                    ...current,\n                    colors: { ...current.colors, [key]: value },\n                  }))\n                }\n                onApplyPalette={(colors) => setDesign((current) => ({ ...current, colors }))}\n                onReset={() =>\n                  setDesign((current) => ({\n                    ...current,\n                    colors: defaultLetterColors(current.template),\n                  }))\n                }\n              />\n            </Section>'''
new_colors_section = '''            {design.template !== "brief" && template ? (\n              <Section title="Farben" open={open.farben} onToggle={() => toggle("farben")}>\n                <ColorChooser\n                  slots={template.slots}\n                  colors={design.colors}\n                  onChange={(key, value) =>\n                    setDesign((current) => ({\n                      ...current,\n                      colors: { ...current.colors, [key]: value },\n                    }))\n                  }\n                  onApplyPalette={(colors) => setDesign((current) => ({ ...current, colors }))}\n                  onReset={() =>\n                    setDesign((current) => ({\n                      ...current,\n                      colors: defaultLetterColors(current.template),\n                    }))\n                  }\n                />\n              </Section>\n            ) : null}'''
if old_colors_section not in text:
    raise SystemExit("colors section anchor missing")
text = text.replace(old_colors_section, new_colors_section, 1)
route_path.write_text(text)

# 5) Regression: fresh letter stays plain even when cover/CV have a design.
test_path = Path("tests/e2e/dossier-regression.spec.ts")
text = test_path.read_text()
needle = '''    await expect(page.getByLabel("Vorschau Anschreiben")).toBeVisible();\n\n    const body = page.getByLabel("Brieftext");'''
replacement = '''    const preview = page.getByLabel("Vorschau Anschreiben");\n    await expect(preview).toBeVisible();\n    await expect(preview).toHaveAttribute("data-letter-template", "brief");\n    await expect(preview.locator('[data-letter-background="brief"]')).toHaveCSS(\n      "background-color",\n      "rgb(255, 255, 255)",\n    );\n    await expect\n      .poll(() =>\n        page.evaluate(\n          () => JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}").design?.template ?? "",\n        ),\n      )\n      .toBe("brief");\n    await expect(page.getByRole("button", { name: "Farben", exact: true })).toHaveCount(0);\n\n    const body = page.getByLabel("Brieftext");'''
if needle not in text:
    raise SystemExit("first-open letter regression anchor missing")
text = text.replace(needle, replacement, 1)
# Ensure letter picker can switch out of Brief and reveal colors without breaking shared templates.
needle2 = '''    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();\n\n    const body = page.getByRole("textbox", { name: "Brieftext" });'''
replacement2 = '''    await expect(page.getByRole("textbox", { name: "Titel / Betreff", exact: true })).toBeVisible();\n\n    await page.getByRole("button", { name: "Vorlage", exact: true }).click();\n    await expect(page.getByRole("button", { name: "Brief", exact: true })).toHaveAttribute(\n      "aria-pressed",\n      "true",\n    );\n    await page.getByRole("button", { name: "Klassisch", exact: true }).click();\n    await expect(preview).toHaveAttribute("data-letter-template", "klassisch");\n    await expect(page.getByRole("button", { name: "Farben", exact: true })).toBeVisible();\n\n    const body = page.getByRole("textbox", { name: "Brieftext" });'''
if needle2 not in text:
    raise SystemExit("letter layout regression anchor missing")
text = text.replace(needle2, replacement2, 1)
test_path.write_text(text)
