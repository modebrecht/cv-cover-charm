from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


# Persistent design contract
p = Path("src/components/cv/types.ts")
text = p.read_text()
text = replace_once(
    text,
    "  docTitleMarginBottomPx?: number;\n  /** Breite der Seitenspalte als Anteil der Blattbreite. */",
    "  docTitleMarginBottomPx?: number;\n"
    "  /** Eine gemeinsame Gestaltung für alle Rubriktitel, inklusive eigener Rubriken. */\n"
    "  sectionTitleFontSizePx?: number;\n"
    "  sectionTitleColor?: string;\n"
    "  sectionTitleBold?: boolean;\n"
    "  sectionTitleItalic?: boolean;\n"
    "  sectionTitleUnderline?: boolean;\n"
    "  sectionTitleMarginBottomPx?: number;\n"
    "  /** Breite der Seitenspalte als Anteil der Blattbreite. */",
    "CvDesign rubric fields",
)
text = replace_once(
    text,
    "export const CV_DOC_TITLE_MARGIN_BOTTOM_MAX = 100;\n",
    "export const CV_DOC_TITLE_MARGIN_BOTTOM_MAX = 100;\n\n"
    "export const CV_SECTION_TITLE_DEFAULTS = {\n"
    "  fontSizePx: 16,\n"
    "  bold: true,\n"
    "  italic: false,\n"
    "  underline: false,\n"
    "  marginBottomPx: 7,\n"
    "} as const;\n"
    "export const CV_SECTION_TITLE_FONT_SIZE_MIN = 10;\n"
    "export const CV_SECTION_TITLE_FONT_SIZE_MAX = 32;\n"
    "export const CV_SECTION_TITLE_MARGIN_BOTTOM_MAX = 100;\n",
    "rubric constants",
)
p.write_text(text)


# Renderer: one shared style contract for main + sidebar headings
p = Path("src/components/cv/CvCanvasBase.tsx")
text = p.read_text()
text = replace_once(
    text,
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n  CV_TYPE_DEFAULTS,",
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_SECTION_TITLE_FONT_SIZE_MAX,\n"
    "  CV_SECTION_TITLE_FONT_SIZE_MIN,\n"
    "  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_TYPE_DEFAULTS,",
    "renderer rubric imports",
)
text = replace_once(
    text,
    "  const headingStyle = theme.headingStyle;\n\n  /** Rahmenform des Fotos – dieselbe Einstellung wie im Titelblatt. */",
    "  const headingStyle = theme.headingStyle;\n"
    "  const sectionTitleFontSizePx =\n"
    "    typeof design.sectionTitleFontSizePx === \"number\" &&\n"
    "    Number.isFinite(design.sectionTitleFontSizePx)\n"
    "      ? Math.max(\n"
    "          CV_SECTION_TITLE_FONT_SIZE_MIN,\n"
    "          Math.min(CV_SECTION_TITLE_FONT_SIZE_MAX, design.sectionTitleFontSizePx),\n"
    "        )\n"
    "      : null;\n"
    "  const sectionTitleMarginBottomPx =\n"
    "    typeof design.sectionTitleMarginBottomPx === \"number\" &&\n"
    "    Number.isFinite(design.sectionTitleMarginBottomPx)\n"
    "      ? Math.max(0, Math.min(CV_SECTION_TITLE_MARGIN_BOTTOM_MAX, design.sectionTitleMarginBottomPx))\n"
    "      : null;\n"
    "  const sectionTitleColor = design.sectionTitleColor?.trim();\n"
    "  const sectionTitleWeight =\n"
    "    design.sectionTitleBold === undefined ? headingStyle.weight : design.sectionTitleBold ? 700 : 400;\n"
    "  const sectionTitleFontStyle = design.sectionTitleItalic ? \"italic\" : \"normal\";\n"
    "  const sectionTitleDecoration = design.sectionTitleUnderline ? \"underline\" : \"none\";\n\n"
    "  /** Rahmenform des Fotos – dieselbe Einstellung wie im Titelblatt. */",
    "renderer rubric derived styles",
)
text = replace_once(
    text,
    '          marginBottom: layout === "modern" ? "2mm" : "1.8mm",',
    "          marginBottom:\n"
    "            sectionTitleMarginBottomPx === null\n"
    "              ? layout === \"modern\"\n"
    "                ? \"2mm\"\n"
    "                : \"1.8mm\"\n"
    "              : `${sectionTitleMarginBottomPx}px`,",
    "main rubric margin",
)
text = replace_once(
    text,
    '              fontSize: ptHead(headingStyle.uppercase ? 10.2 : 11.4),\n              fontWeight: headingStyle.weight,',
    "              fontSize:\n"
    "                sectionTitleFontSizePx === null\n"
    "                  ? ptHead(headingStyle.uppercase ? 10.2 : 11.4)\n"
    "                  : `${sectionTitleFontSizePx}px`,\n"
    "              fontWeight: sectionTitleWeight,\n"
    "              fontStyle: sectionTitleFontStyle,\n"
    "              textDecoration: sectionTitleDecoration,",
    "main rubric font",
)
text = replace_once(
    text,
    "              fontFamily: theme.typography.fontStack,\n"
    "              color: pal.accent,\n"
    "              lineHeight: headingStyle.lineHeight,",
    "              fontFamily: theme.typography.fontStack,\n"
    "              color: sectionTitleColor || pal.accent,\n"
    "              lineHeight: headingStyle.lineHeight,",
    "main rubric color",
)
text = replace_once(
    text,
    '                borderRadius: "999px",\n'
    "                background: pal.accent,\n"
    '                opacity: layout === "modern" ? 0.9 : 0.72,',
    '                borderRadius: "999px",\n'
    "                background: sectionTitleColor || pal.accent,\n"
    '                opacity: layout === "modern" ? 0.9 : 0.72,',
    "main rubric rule color",
)

side_re = re.compile(
    r'  const sideHeading = \(text: string, first = false\) => \(.*?\n  \);\n\n  const sideBody =',
    re.S,
)
side_new = '''  const sideHeading = (text: string, first = false) => (
    <div
      data-cv-section="sidebar"
      style={{
        marginTop:
          first && !autoPhoto
            ? "0.8mm"
            : sidePlan.veryCompact
              ? "3.2mm"
              : sidePlan.compact
                ? "4.1mm"
                : "5.2mm",
        marginBottom:
          sectionTitleMarginBottomPx === null
            ? sidePlan.veryCompact
              ? "1.2mm"
              : sidePlan.compact
                ? "1.5mm"
                : "1.9mm"
            : `${sectionTitleMarginBottomPx}px`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "2mm", minWidth: 0 }}>
        <div
          data-cv-section-title
          style={{
            fontSize:
              sectionTitleFontSizePx === null
                ? ptHead(
                    headingStyle.uppercase
                      ? sidePlan.veryCompact
                        ? 8.4
                        : sidePlan.compact
                          ? 8.8
                          : 9.2
                      : sidePlan.veryCompact
                        ? 9.4
                        : sidePlan.compact
                          ? 9.8
                          : 10.2,
                  )
                : `${sectionTitleFontSizePx}px`,
            fontWeight: sectionTitleWeight,
            fontStyle: sectionTitleFontStyle,
            textDecoration: sectionTitleDecoration,
            letterSpacing: `${headingStyle.trackingEm}em`,
            textTransform: headingStyle.uppercase ? "uppercase" : "none",
            fontFamily: theme.typography.fontStack,
            color: sectionTitleColor || side.accent,
            lineHeight: headingStyle.lineHeight,
            flexShrink: 0,
          }}
        >
          {text}
        </div>
        {headingRule !== "none" && (
          <div
            data-cv-accent="section"
            style={{
              width: headingRule === "full" ? "auto" : "12mm",
              flex: headingRule === "full" ? "1 1 auto" : undefined,
              minWidth: 0,
              height: "0.5mm",
              flexShrink: headingRule === "full" ? 1 : 0,
              borderRadius: "999px",
              background: sectionTitleColor || side.accent,
              opacity: 0.78,
            }}
          />
        )}
      </div>
    </div>
  );

  const sideBody ='''
text, count = side_re.subn(side_new, text, count=1)
if count != 1:
    raise SystemExit(f"side rubric renderer: expected one match, found {count}")
p.write_text(text)


# Editor controls: one global Rubriktitel style panel
p = Path("src/routes/lebenslauf.tsx")
text = p.read_text()
text = replace_once(
    text,
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n  CV_SCALE_MAX,",
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_SECTION_TITLE_DEFAULTS,\n"
    "  CV_SECTION_TITLE_FONT_SIZE_MAX,\n"
    "  CV_SECTION_TITLE_FONT_SIZE_MIN,\n"
    "  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_SCALE_MAX,",
    "route rubric imports",
)

start_marker = (
    '                  <label className="flex flex-col gap-1 text-xs">\n'
    '                    <span className="text-muted-foreground">Linie neben der Überschrift</span>'
)
start = text.find(start_marker)
if start < 0:
    raise SystemExit("route rubric controls: start marker missing")
end_marker = "                  </label>"
end = text.find(end_marker, start)
if end < 0:
    raise SystemExit("route rubric controls: end marker missing")
end += len(end_marker)
controls = '''                  <div className="grid gap-3 rounded-md border bg-muted/20 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold">Rubriktitel gestalten</div>
                      <button
                        type="button"
                        onClick={() =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleFontSizePx: undefined,
                            sectionTitleColor: undefined,
                            sectionTitleBold: undefined,
                            sectionTitleItalic: undefined,
                            sectionTitleUnderline: undefined,
                            sectionTitleMarginBottomPx: undefined,
                            headingRule: CV_TYPE_DEFAULTS.headingRule,
                          }))
                        }
                        className="text-xs text-muted-foreground underline hover:text-foreground"
                      >
                        Vorlage
                      </button>
                    </div>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">
                        Schriftgrösse {design.sectionTitleFontSizePx ?? CV_SECTION_TITLE_DEFAULTS.fontSizePx} px
                      </span>
                      <input
                        type="range"
                        min={CV_SECTION_TITLE_FONT_SIZE_MIN}
                        max={CV_SECTION_TITLE_FONT_SIZE_MAX}
                        step={1}
                        value={design.sectionTitleFontSizePx ?? CV_SECTION_TITLE_DEFAULTS.fontSizePx}
                        onChange={(event) =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleFontSizePx: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-primary"
                        aria-label="Schriftgrösse Rubriktitel"
                      />
                    </label>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Schriftfarbe</span>
                      <input
                        type="color"
                        value={
                          design.sectionTitleColor ??
                          design.colors.accent ??
                          design.colors.primary ??
                          "#6b7280"
                        }
                        onChange={(event) =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleColor: event.target.value,
                          }))
                        }
                        className="h-7 w-10 cursor-pointer rounded border border-input bg-background"
                        aria-label="Schriftfarbe Rubriktitel"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDesign((current) => ({ ...current, sectionTitleColor: undefined }))
                        }
                        className="text-muted-foreground underline hover:text-foreground"
                      >
                        Standardfarbe
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        aria-pressed={design.sectionTitleBold ?? CV_SECTION_TITLE_DEFAULTS.bold}
                        onClick={() =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleBold: !(
                              current.sectionTitleBold ?? CV_SECTION_TITLE_DEFAULTS.bold
                            ),
                          }))
                        }
                        className={`rounded-md border px-2 py-1.5 text-xs font-bold ${
                          (design.sectionTitleBold ?? CV_SECTION_TITLE_DEFAULTS.bold)
                            ? "border-foreground bg-accent"
                            : "border-input hover:border-foreground/40"
                        }`}
                      >
                        Fett
                      </button>
                      <button
                        type="button"
                        aria-pressed={design.sectionTitleItalic ?? CV_SECTION_TITLE_DEFAULTS.italic}
                        onClick={() =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleItalic: !(
                              current.sectionTitleItalic ?? CV_SECTION_TITLE_DEFAULTS.italic
                            ),
                          }))
                        }
                        className={`rounded-md border px-2 py-1.5 text-xs italic ${
                          (design.sectionTitleItalic ?? CV_SECTION_TITLE_DEFAULTS.italic)
                            ? "border-foreground bg-accent"
                            : "border-input hover:border-foreground/40"
                        }`}
                      >
                        Kursiv
                      </button>
                      <button
                        type="button"
                        aria-pressed={
                          design.sectionTitleUnderline ?? CV_SECTION_TITLE_DEFAULTS.underline
                        }
                        onClick={() =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleUnderline: !(
                              current.sectionTitleUnderline ?? CV_SECTION_TITLE_DEFAULTS.underline
                            ),
                          }))
                        }
                        className={`rounded-md border px-2 py-1.5 text-xs underline ${
                          (design.sectionTitleUnderline ?? CV_SECTION_TITLE_DEFAULTS.underline)
                            ? "border-foreground bg-accent"
                            : "border-input hover:border-foreground/40"
                        }`}
                      >
                        Unterstrichen
                      </button>
                    </div>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">
                        Abstand nach unten {design.sectionTitleMarginBottomPx ?? CV_SECTION_TITLE_DEFAULTS.marginBottomPx} px
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={CV_SECTION_TITLE_MARGIN_BOTTOM_MAX}
                        step={1}
                        value={
                          design.sectionTitleMarginBottomPx ??
                          CV_SECTION_TITLE_DEFAULTS.marginBottomPx
                        }
                        onChange={(event) =>
                          setDesign((current) => ({
                            ...current,
                            sectionTitleMarginBottomPx: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-primary"
                        aria-label="Abstand unter Rubriktiteln"
                      />
                    </label>

                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">Linie nach rechts</span>
                      <div className="flex gap-1">
                        {(
                          [
                            ["full", "Ganze Breite"],
                            ["short", "Kurz"],
                            ["none", "Keine"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={
                              (design.headingRule ?? CV_TYPE_DEFAULTS.headingRule) === id
                            }
                            onClick={() => setDesign((d) => ({ ...d, headingRule: id }))}
                            className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
                              (design.headingRule ?? CV_TYPE_DEFAULTS.headingRule) === id
                                ? "border-foreground bg-accent"
                                : "border-input hover:border-foreground/40"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-[11px] leading-relaxed text-muted-foreground/80">
                      Gilt gemeinsam für Schulbildung, Praktika, Sprachen, Stärken, Hobbys,
                      Referenzen und eigene Rubriken.
                    </span>
                  </div>'''
text = text[:start] + controls + text[end:]
text = replace_once(
    text,
    '                        "headingScale",\n'
    '                        "Untertitel und Rubriken",\n'
    '                        "Untertitel unter dem Namen sowie alle Rubriktitel, auch in der Seitenspalte.",',
    '                        "headingScale",\n'
    '                        "Untertitel / Rubriken-Basis",\n'
    '                        "Untertitel sowie die Vorlagen-Grösse der Rubriken. Eine eigene Rubriktitel-Grösse überschreibt sie.",',
    "heading scale copy",
)
p.write_text(text)


# Regression contract
p = Path("tests/unit/cv-doc-title-style.test.ts")
text = p.read_text()
text = replace_once(
    text,
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n  CV_TYPE_DEFAULTS,",
    "  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_SECTION_TITLE_DEFAULTS,\n"
    "  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,\n"
    "  CV_TYPE_DEFAULTS,",
    "unit rubric imports",
)
text += '''\n\ntest("rubric title formatting is one global CV style and defaults to a full right rule", () => {
  expect(CV_TYPE_DEFAULTS.headingRule).toBe("full");
  expect(CV_SECTION_TITLE_DEFAULTS.fontSizePx).toBeGreaterThan(12);
  expect(CV_SECTION_TITLE_MARGIN_BOTTOM_MAX).toBe(100);

  const canvas = readFileSync("src/components/cv/CvCanvasBase.tsx", "utf8");
  const route = readFileSync("src/routes/lebenslauf.tsx", "utf8");
  for (const contract of [
    "sectionTitleFontSizePx",
    "sectionTitleColor",
    "sectionTitleBold",
    "sectionTitleItalic",
    "sectionTitleUnderline",
    "sectionTitleMarginBottomPx",
  ]) {
    expect(canvas).toContain(contract);
    expect(route).toContain(contract);
  }
  expect(route).toContain("Rubriktitel gestalten");
  expect(route).toContain("Referenzen und eigene Rubriken");
  expect(canvas).toContain("background: sectionTitleColor || pal.accent");
  expect(canvas).toContain("background: sectionTitleColor || side.accent");
  expect(canvas).toContain('flex: headingRule === "full" ? "1 1 auto" : undefined');
});
'''
p.write_text(text)
