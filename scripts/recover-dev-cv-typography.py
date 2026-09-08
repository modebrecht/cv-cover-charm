from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"anchor not found in {path}: {old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"anchor not unique in {path}: {text.count(old)} matches")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


# ---------------------------------------------------------------------------
# 1) Persisted design contract + safe defaults
# ---------------------------------------------------------------------------
types_path = "src/components/cv/types.ts"
replace_once(
    types_path,
    '''  /** Linie neben der Abschnittsüberschrift. */
  headingRule?: CvHeadingRule;
  /** Grösse von Name und Dokumenttitel, 1 = Vorgabe. */
  titleScale?: number;
  /** Grösse von Untertitel und Rubriken, 1 = Vorgabe. */
  headingScale?: number;
  /** Grösse des Fliesstexts, 1 = Vorgabe. */
  bodyScale?: number;
  /** Breite der Seitenspalte als Anteil der Blattbreite. */
  sidebarPct?: number;
};
''',
    '''  /** Linie neben der Abschnittsüberschrift. */
  headingRule?: CvHeadingRule;
  /** Grösse des Namens, 1 = Vorgabe. Der Dokumenttitel hat eigene Regler. */
  titleScale?: number;
  /** Grösse von Untertitel und Rubriken, 1 = Vorgabe. */
  headingScale?: number;
  /** Grösse des Fliesstexts, 1 = Vorgabe. */
  bodyScale?: number;
  /** Eigene Gestaltung für den kleinen Dokumenttitel über dem Namen. */
  docTitleFontSizePx?: number;
  docTitleColor?: string;
  docTitleBold?: boolean;
  docTitleItalic?: boolean;
  docTitleUnderline?: boolean;
  docTitleMarginBottomPx?: number;
  /** Eine gemeinsame Gestaltung für alle Rubriktitel, inklusive eigener Rubriken. */
  sectionTitleFontSizePx?: number;
  sectionTitleColor?: string;
  sectionTitleBold?: boolean;
  sectionTitleItalic?: boolean;
  sectionTitleUnderline?: boolean;
  sectionTitleMarginBottomPx?: number;
  /** Breite der Seitenspalte als Anteil der Blattbreite. */
  sidebarPct?: number;
};
''',
)
replace_once(
    types_path,
    '''export const CV_TYPE_DEFAULTS = {
  headingRule: "short" as CvHeadingRule,
  titleScale: 1,
  headingScale: 1,
  bodyScale: 1,
  /** 30/70 – die Aufteilung, die sich beim Ausprobieren als brauchbar zeigte. */
  sidebarPct: 0.3,
} as const;
''',
    '''export const CV_TYPE_DEFAULTS = {
  headingRule: "full" as CvHeadingRule,
  titleScale: 1,
  headingScale: 1,
  bodyScale: 1,
  /** 30/70 – die Aufteilung, die sich beim Ausprobieren als brauchbar zeigte. */
  sidebarPct: 0.3,
} as const;

export const CV_DOC_TITLE_DEFAULTS = {
  fontSizePx: 18,
  bold: true,
  italic: false,
  underline: false,
  marginBottomPx: 10,
} as const;
export const CV_DOC_TITLE_FONT_SIZE_MIN = 10;
export const CV_DOC_TITLE_FONT_SIZE_MAX = 48;
export const CV_DOC_TITLE_MARGIN_BOTTOM_MAX = 100;

export const CV_SECTION_TITLE_DEFAULTS = {
  fontSizePx: 16,
  bold: true,
  italic: false,
  underline: false,
  marginBottomPx: 7,
} as const;
export const CV_SECTION_TITLE_FONT_SIZE_MIN = 10;
export const CV_SECTION_TITLE_FONT_SIZE_MAX = 32;
export const CV_SECTION_TITLE_MARGIN_BOTTOM_MAX = 100;
''',
)
replace_once(
    types_path,
    '    untertitel: "Schülerin, 3. Sekundarklasse",\n',
    '    untertitel: "",\n',
)

# ---------------------------------------------------------------------------
# 2) Renderer: independent document title + global rubric title styling
# ---------------------------------------------------------------------------
canvas_path = "src/components/cv/CvCanvasBase.tsx"
replace_once(
    canvas_path,
    '''import {
  CV_BLOCK_LABELS,
  CV_TYPE_DEFAULTS,
''',
    '''import {
  CV_BLOCK_LABELS,
  CV_DOC_TITLE_DEFAULTS,
  CV_DOC_TITLE_FONT_SIZE_MAX,
  CV_DOC_TITLE_FONT_SIZE_MIN,
  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
  CV_SECTION_TITLE_FONT_SIZE_MAX,
  CV_SECTION_TITLE_FONT_SIZE_MIN,
  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,
  CV_TYPE_DEFAULTS,
''',
)
replace_once(
    canvas_path,
    '''  const theme = useMemo(() => dossierThemeFor(design.template), [design.template]);
  const headingStyle = theme.headingStyle;

  /** Rahmenform des Fotos – dieselbe Einstellung wie im Titelblatt. */
''',
    '''  const theme = useMemo(() => dossierThemeFor(design.template), [design.template]);
  const headingStyle = theme.headingStyle;
  const sectionTitleFontSizePx =
    typeof design.sectionTitleFontSizePx === "number" &&
    Number.isFinite(design.sectionTitleFontSizePx)
      ? Math.max(
          CV_SECTION_TITLE_FONT_SIZE_MIN,
          Math.min(CV_SECTION_TITLE_FONT_SIZE_MAX, design.sectionTitleFontSizePx),
        )
      : null;
  const sectionTitleMarginBottomPx =
    typeof design.sectionTitleMarginBottomPx === "number" &&
    Number.isFinite(design.sectionTitleMarginBottomPx)
      ? Math.max(0, Math.min(CV_SECTION_TITLE_MARGIN_BOTTOM_MAX, design.sectionTitleMarginBottomPx))
      : null;
  const sectionTitleColor = design.sectionTitleColor?.trim();
  const sectionTitleWeight =
    design.sectionTitleBold === undefined
      ? headingStyle.weight
      : design.sectionTitleBold
        ? 700
        : 400;
  const sectionTitleFontStyle = design.sectionTitleItalic ? "italic" : "normal";
  const sectionTitleDecoration = design.sectionTitleUnderline ? "underline" : "none";

  /** Rahmenform des Fotos – dieselbe Einstellung wie im Titelblatt. */
''',
)
replace_once(
    canvas_path,
    '''        style={{
          marginTop: layout === "modern" ? "4.8mm" : "4mm",
          marginBottom: layout === "modern" ? "2mm" : "1.8mm",
        }}
''',
    '''        style={{
          marginTop: layout === "modern" ? "4.8mm" : "4mm",
          marginBottom:
            sectionTitleMarginBottomPx === null
              ? layout === "modern"
                ? "2mm"
                : "1.8mm"
              : `${sectionTitleMarginBottomPx}px`,
        }}
''',
)
replace_once(
    canvas_path,
    '''              fontSize: ptHead(headingStyle.uppercase ? 10.2 : 11.4),
              fontWeight: headingStyle.weight,
              letterSpacing: `${headingStyle.trackingEm}em`,
              textTransform: headingStyle.uppercase ? "uppercase" : "none",
              fontFamily: theme.typography.fontStack,
              color: pal.accent,
              lineHeight: headingStyle.lineHeight,
''',
    '''              fontSize:
                sectionTitleFontSizePx === null
                  ? ptHead(headingStyle.uppercase ? 10.2 : 11.4)
                  : `${sectionTitleFontSizePx}px`,
              fontWeight: sectionTitleWeight,
              fontStyle: sectionTitleFontStyle,
              textDecoration: sectionTitleDecoration,
              letterSpacing: `${headingStyle.trackingEm}em`,
              textTransform: headingStyle.uppercase ? "uppercase" : "none",
              fontFamily: theme.typography.fontStack,
              color: sectionTitleColor || pal.accent,
              lineHeight: headingStyle.lineHeight,
''',
)
replace_once(
    canvas_path,
    '                background: pal.accent,\n                opacity: layout === "modern" ? 0.9 : 0.72,\n',
    '                background: sectionTitleColor || pal.accent,\n                opacity: layout === "modern" ? 0.9 : 0.72,\n',
)
replace_once(
    canvas_path,
    '''  const docTitle = (color: string) => {
    const text = data.titel?.trim();
    if (!text) return null;
    return (
      <div
        data-cv-doc-title
        style={{
          fontSize: `${(8.2 * TYPE_BASE * titleScale).toFixed(2)}pt`,
          fontWeight: headingStyle.weight,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: theme.typography.fontStack,
          color,
          opacity: 0.85,
          marginBottom: "1.8mm",
        }}
      >
        {text}
      </div>
    );
  };
''',
    '''  const docTitle = (color: string) => {
    const text = data.titel?.trim();
    if (!text) return null;
    const fontSizePx = Math.max(
      CV_DOC_TITLE_FONT_SIZE_MIN,
      Math.min(
        CV_DOC_TITLE_FONT_SIZE_MAX,
        design.docTitleFontSizePx ?? CV_DOC_TITLE_DEFAULTS.fontSizePx,
      ),
    );
    const marginBottomPx = Math.max(
      0,
      Math.min(
        CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
        design.docTitleMarginBottomPx ?? CV_DOC_TITLE_DEFAULTS.marginBottomPx,
      ),
    );
    const customColor = design.docTitleColor?.trim();
    return (
      <div
        data-cv-doc-title
        style={{
          fontSize: `${fontSizePx}px`,
          fontWeight: (design.docTitleBold ?? CV_DOC_TITLE_DEFAULTS.bold) ? 700 : 400,
          fontStyle: (design.docTitleItalic ?? CV_DOC_TITLE_DEFAULTS.italic) ? "italic" : "normal",
          textDecoration:
            (design.docTitleUnderline ?? CV_DOC_TITLE_DEFAULTS.underline) ? "underline" : "none",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: theme.typography.fontStack,
          color: customColor || color,
          opacity: customColor ? 1 : 0.85,
          marginBottom: `${marginBottomPx}px`,
        }}
      >
        {text}
      </div>
    );
  };
''',
)
replace_once(
    canvas_path,
    '''  const sideHeading = (text: string, first = false) => (
    <div
      data-cv-section="sidebar"
      data-cv-section-title
      style={{
        marginTop:
          first && !autoPhoto
            ? "0.8mm"
            : sidePlan.veryCompact
              ? "3.2mm"
              : sidePlan.compact
                ? "4.1mm"
                : "5.2mm",
        marginBottom: sidePlan.veryCompact ? "1.2mm" : sidePlan.compact ? "1.5mm" : "1.9mm",
        fontSize: ptHead(
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
        ),
        fontWeight: headingStyle.weight,
        letterSpacing: `${headingStyle.trackingEm}em`,
        textTransform: headingStyle.uppercase ? "uppercase" : "none",
        fontFamily: theme.typography.fontStack,
        color: side.accent,
        lineHeight: headingStyle.lineHeight,
      }}
    >
      {text}
    </div>
  );
''',
    '''  const sideHeading = (text: string, first = false) => (
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
              width: "auto",
              flex: "1 1 auto",
              minWidth: 0,
              height: "0.5mm",
              borderRadius: "999px",
              background: sectionTitleColor || side.accent,
              opacity: 0.78,
            }}
          />
        )}
      </div>
    </div>
  );
''',
)

# ---------------------------------------------------------------------------
# 3) Editor UI: document title controls + global rubric controls + no `Kurz`
# ---------------------------------------------------------------------------
route_path = "src/routes/lebenslauf.tsx"
replace_once(
    route_path,
    '''import {
  CV_SECTION_LABELS,
  CV_SCALE_MAX,
''',
    '''import {
  CV_SECTION_LABELS,
  CV_DOC_TITLE_DEFAULTS,
  CV_DOC_TITLE_FONT_SIZE_MAX,
  CV_DOC_TITLE_FONT_SIZE_MIN,
  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
  CV_SECTION_TITLE_DEFAULTS,
  CV_SECTION_TITLE_FONT_SIZE_MAX,
  CV_SECTION_TITLE_FONT_SIZE_MIN,
  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,
  CV_SCALE_MAX,
''',
)

doc_anchor = '''                </label>\n\n                <FormCvPerson\n'''
doc_controls = '''                </label>

                <div className="grid gap-3 rounded-md border bg-muted/20 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold">Dokumenttitel gestalten</div>
                    <button
                      type="button"
                      onClick={() =>
                        setDesign((current) => ({
                          ...current,
                          docTitleFontSizePx: undefined,
                          docTitleColor: undefined,
                          docTitleBold: undefined,
                          docTitleItalic: undefined,
                          docTitleUnderline: undefined,
                          docTitleMarginBottomPx: undefined,
                        }))
                      }
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Vorlage
                    </button>
                  </div>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">
                      Schriftgrösse {design.docTitleFontSizePx ?? CV_DOC_TITLE_DEFAULTS.fontSizePx}{" "}
                      px
                    </span>
                    <input
                      type="range"
                      min={CV_DOC_TITLE_FONT_SIZE_MIN}
                      max={CV_DOC_TITLE_FONT_SIZE_MAX}
                      step={1}
                      value={design.docTitleFontSizePx ?? CV_DOC_TITLE_DEFAULTS.fontSizePx}
                      onChange={(event) =>
                        setDesign((current) => ({
                          ...current,
                          docTitleFontSizePx: Number(event.target.value),
                        }))
                      }
                      className="w-full accent-primary"
                      aria-label="Schriftgrösse Dokumenttitel"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Schriftfarbe</span>
                    <input
                      type="color"
                      value={design.docTitleColor ?? "#6b7280"}
                      onChange={(event) =>
                        setDesign((current) => ({ ...current, docTitleColor: event.target.value }))
                      }
                      className="h-7 w-10 cursor-pointer rounded border border-input bg-background"
                      aria-label="Schriftfarbe Dokumenttitel"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDesign((current) => ({ ...current, docTitleColor: undefined }))
                      }
                      className="text-muted-foreground underline hover:text-foreground"
                    >
                      Standardfarbe
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ["docTitleBold", "Fett", CV_DOC_TITLE_DEFAULTS.bold, "font-bold"],
                        ["docTitleItalic", "Kursiv", CV_DOC_TITLE_DEFAULTS.italic, "italic"],
                        [
                          "docTitleUnderline",
                          "Unterstrichen",
                          CV_DOC_TITLE_DEFAULTS.underline,
                          "underline",
                        ],
                      ] as const
                    ).map(([key, label, fallback, textClass]) => {
                      const active = design[key] ?? fallback;
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={active}
                          onClick={() =>
                            setDesign((current) => ({ ...current, [key]: !(current[key] ?? fallback) }))
                          }
                          className={`rounded-md border px-2 py-1.5 text-xs ${textClass} ${
                            active
                              ? "border-foreground bg-accent"
                              : "border-input hover:border-foreground/40"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">
                      Abstand nach unten{" "}
                      {design.docTitleMarginBottomPx ?? CV_DOC_TITLE_DEFAULTS.marginBottomPx} px
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={CV_DOC_TITLE_MARGIN_BOTTOM_MAX}
                      step={1}
                      value={design.docTitleMarginBottomPx ?? CV_DOC_TITLE_DEFAULTS.marginBottomPx}
                      onChange={(event) =>
                        setDesign((current) => ({
                          ...current,
                          docTitleMarginBottomPx: Number(event.target.value),
                        }))
                      }
                      className="w-full accent-primary"
                      aria-label="Abstand unter Dokumenttitel"
                    />
                  </label>
                </div>

                <FormCvPerson
'''
replace_once(route_path, doc_anchor, doc_controls)

old_line_ui = '''                  <label className="flex flex-col gap-1 text-xs">
                    <span className="text-muted-foreground">Linie neben der Überschrift</span>
                    <div className="flex gap-1">
                      {(
                        [
                          ["short", "Kurz"],
                          ["full", "Ganze Breite"],
                          ["none", "Keine"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={(design.headingRule ?? CV_TYPE_DEFAULTS.headingRule) === id}
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
                  </label>
'''
new_rubric_ui = '''                  <div className="grid gap-3 rounded-md border bg-muted/20 p-2.5">
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
                        Schriftgrösse{" "}
                        {design.sectionTitleFontSizePx ?? CV_SECTION_TITLE_DEFAULTS.fontSizePx} px
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
                      {(
                        [
                          ["sectionTitleBold", "Fett", CV_SECTION_TITLE_DEFAULTS.bold, "font-bold"],
                          [
                            "sectionTitleItalic",
                            "Kursiv",
                            CV_SECTION_TITLE_DEFAULTS.italic,
                            "italic",
                          ],
                          [
                            "sectionTitleUnderline",
                            "Unterstrichen",
                            CV_SECTION_TITLE_DEFAULTS.underline,
                            "underline",
                          ],
                        ] as const
                      ).map(([key, label, fallback, textClass]) => {
                        const active = design[key] ?? fallback;
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setDesign((current) => ({ ...current, [key]: !(current[key] ?? fallback) }))
                            }
                            className={`rounded-md border px-2 py-1.5 text-xs ${textClass} ${
                              active
                                ? "border-foreground bg-accent"
                                : "border-input hover:border-foreground/40"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    <label className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">
                        Abstand nach unten{" "}
                        {design.sectionTitleMarginBottomPx ?? CV_SECTION_TITLE_DEFAULTS.marginBottomPx}{" "}
                        px
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={CV_SECTION_TITLE_MARGIN_BOTTOM_MAX}
                        step={1}
                        value={
                          design.sectionTitleMarginBottomPx ?? CV_SECTION_TITLE_DEFAULTS.marginBottomPx
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
                            ["none", "Keine"],
                          ] as const
                        ).map(([id, label]) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={
                              (design.headingRule === "none" ? "none" : "full") === id
                            }
                            onClick={() => setDesign((d) => ({ ...d, headingRule: id }))}
                            className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition ${
                              (design.headingRule === "none" ? "none" : "full") === id
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
                  </div>
'''
replace_once(route_path, old_line_ui, new_rubric_ui)
replace_once(
    route_path,
    '["titleScale", "Name und Titel", "Der Name oben und der Dokumenttitel."],',
    '["titleScale", "Name", "Der Name oben."],',
)
replace_once(
    route_path,
    '"Untertitel und Rubriken",\n                        "Untertitel unter dem Namen sowie alle Rubriktitel, auch in der Seitenspalte.",',
    '"Untertitel / Rubriken-Basis",\n                        "Untertitel sowie die Vorlagen-Grösse der Rubriken. Eine eigene Rubriktitel-Grösse überschreibt sie.",',
)

# ---------------------------------------------------------------------------
# 4) Regression contract tailored to the current renderer architecture
# ---------------------------------------------------------------------------
test_path = Path("tests/unit/cv-dev-recovery.test.ts")
test_path.write_text(
    '''import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CV_DOC_TITLE_DEFAULTS,
  CV_DOC_TITLE_MARGIN_BOTTOM_MAX,
  CV_SECTION_TITLE_DEFAULTS,
  CV_SECTION_TITLE_MARGIN_BOTTOM_MAX,
  CV_TYPE_DEFAULTS,
  DEMO_CV,
} from "../../src/components/cv/types";
import { cvDesignWithFullSectionRules } from "../../src/components/cv/CvCanvas";

const canvas = readFileSync("src/components/cv/CvCanvasBase.tsx", "utf8");
const route = readFileSync("src/routes/lebenslauf.tsx", "utf8");

test("CV defaults and legacy section rules resolve to full width", () => {
  expect(CV_TYPE_DEFAULTS.headingRule).toBe("full");
  expect(cvDesignWithFullSectionRules({ headingRule: "short" } as never).headingRule).toBe("full");
  expect(cvDesignWithFullSectionRules({ headingRule: "none" } as never).headingRule).toBe("none");
  expect(route).not.toContain('["short", "Kurz"]');
  expect(route).toContain('["full", "Ganze Breite"]');
  expect(route).toContain('["none", "Keine"]');
});

test("document title has independent persisted style controls in preview/PDF renderer", () => {
  expect(CV_DOC_TITLE_DEFAULTS.fontSizePx).toBeGreaterThan(13);
  expect(CV_DOC_TITLE_MARGIN_BOTTOM_MAX).toBe(100);
  for (const contract of [
    "docTitleFontSizePx",
    "docTitleColor",
    "docTitleBold",
    "docTitleItalic",
    "docTitleUnderline",
    "docTitleMarginBottomPx",
  ]) {
    expect(canvas).toContain(contract);
    expect(route).toContain(contract);
  }
  expect(route).toContain("Dokumenttitel gestalten");
  expect(canvas).toContain("marginBottom: `${marginBottomPx}px`");
});

test("rubric title formatting is global and includes side/custom render paths", () => {
  expect(CV_SECTION_TITLE_DEFAULTS.fontSizePx).toBeGreaterThan(12);
  expect(CV_SECTION_TITLE_MARGIN_BOTTOM_MAX).toBe(100);
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
  expect(canvas).toContain("sectionTitleColor || pal.accent");
  expect(canvas).toContain("sectionTitleColor || side.accent");
  expect(canvas).toContain("customSectionForKey(data, key)");
});

test("demo CV no longer adds a redundant subtitle below the candidate name", () => {
  expect(DEMO_CV.person.untertitel).toBe("");
});
''',
    encoding="utf-8",
)

print("CV typography recovery patch applied")
