import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PAGE } from "@/default-config";
import { CoverBackground } from "@/components/cover/CoverBackground";
import { ShapeElement } from "@/components/cover/ShapeElement";
import { customDefaultStyle } from "@/components/cover/layouts";
import { customKind, TEMPLATES, type CustomField } from "@/components/cover/types";
import { getCvLayout, subscribeCvLayout } from "./layout";
import {
  alphaHex,
  cvVisualPolicy,
  shapeSizeFactor,
  sidebarPlan,
  smartNameSize,
} from "./intelligence";
import { cvPalette, softColors } from "./palette";
import {
  CV_SECTION_LABELS,
  CV_SECTION_ORDER,
  entryFilled,
  type CvData,
  type CvDesign,
  type CvSectionKey,
} from "./types";

const MM = 96 / 25.4;

/** Seitenränder in mm. */
const MARGIN_X = 18;
const MARGIN_TOP = 14;
const MARGIN_BOTTOM = 14;
const MODERN_MAIN_LEFT = 64;
const MODERN_RIGHT = 16;
const MODERN_SIDEBAR_W = 55;

const CLASSIC_CONTENT_W = 210 - MARGIN_X * 2;
const MODERN_CONTENT_W = 210 - MODERN_MAIN_LEFT - MODERN_RIGHT;
/** Schrift des Blattes – auch die Messfläche braucht sie, sonst stimmen die Höhen nicht. */
const SHEET_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const USABLE_H = (297 - MARGIN_TOP - MARGIN_BOTTOM) * MM;

/** Eine Zeile des Lebenslaufs, die als Ganzes auf eine Seite gehört. */
type Row = { id: string; node: React.ReactNode; heading?: boolean };

type Props = {
  data: CvData;
  design: CvDesign;
  /** Formen und Bilder vom Titelblatt. */
  elements: CustomField[];
  /** Alle Seiten für den Export sichtbar ausgeben (statt nur die Vorschau). */
  exportMode?: boolean;
};

function label(data: CvData, key: CvSectionKey): string {
  return data.labels[key]?.trim() || CV_SECTION_LABELS[key];
}

export function CvCanvas({ data, design, elements, exportMode = false }: Props) {
  const pal = useMemo(() => cvPalette(design.colors), [design.colors]);
  const layout = useSyncExternalStore(subscribeCvLayout, getCvLayout, () => "classic");
  const policy = useMemo(
    () => cvVisualPolicy(design.template, layout, design.bgOpacity),
    [design.template, design.bgOpacity, layout],
  );
  const sidePlan = useMemo(() => sidebarPlan(data), [data]);

  // Der Hintergrund läuft mit aufgehellten Farben – sonst wird aus einer
  // dunklen Vorlage ein graues Blatt.
  const softened = useMemo(() => softColors(design.colors), [design.colors]);
  const slots = useMemo(
    () => TEMPLATES.find((t) => t.id === design.template)?.slots ?? [],
    [design.template],
  );

  const p = data.person;
  const name = [p.vorname, p.nachname].filter(Boolean).join(" ");
  const adresse = [p.adresse, p.plzOrt].filter(Boolean).join(" · ");
  const kontakt = [p.telefon, p.email].filter(Boolean).join(" · ");
  const kontaktZeilen = [adresse, kontakt].filter(Boolean);
  const angaben = [
    p.geburtsdatum && `Geburtsdatum ${p.geburtsdatum}`,
    p.nationalitaet && `Nationalität ${p.nationalitaet}`,
  ].filter(Boolean) as string[];
  const nameSize = smartNameSize(name, layout);

  const heading = (key: CvSectionKey): Row => ({
    id: `h-${key}`,
    heading: true,
    node: (
      <div
        style={{
          marginTop: layout === "modern" ? "4.8mm" : "4mm",
          marginBottom: layout === "modern" ? "2mm" : "1.8mm",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
          <div
            style={{
              fontSize: layout === "modern" ? "10.3pt" : "10.2pt",
              fontWeight: layout === "modern" ? 800 : 700,
              letterSpacing: layout === "modern" ? "0.085em" : "0.1em",
              textTransform: "uppercase",
              color: pal.accent,
              lineHeight: 1.1,
            }}
          >
            {label(data, key)}
          </div>
          <div
            style={{
              width: layout === "modern" ? "15mm" : "18mm",
              height: layout === "modern" ? "0.65mm" : "0.55mm",
              flexShrink: 0,
              borderRadius: "999px",
              background: pal.accent,
              opacity: layout === "modern" ? 0.9 : 0.72,
            }}
          />
        </div>
      </div>
    ),
  });

  /** Eintrag mit Zeitspalte links. */
  const entryRow = (id: string, zeit: string, titel: string, ort: string, text: string): Row => ({
    id,
    node: (
      <div
        style={{
          display: "flex",
          gap: layout === "modern" ? "4mm" : "5mm",
          marginBottom: "2.4mm",
        }}
      >
        <div
          style={{
            width: layout === "modern" ? "23mm" : "27mm",
            flexShrink: 0,
            fontSize: "9.3pt",
            color: pal.muted,
            paddingTop: "0.45mm",
            lineHeight: 1.35,
          }}
        >
          {zeit}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {titel && (
            <div
              style={{
                fontSize: layout === "modern" ? "11.4pt" : "11.5pt",
                fontWeight: 700,
                color: pal.ink,
                lineHeight: 1.2,
                overflowWrap: "anywhere",
              }}
            >
              {titel}
            </div>
          )}
          {ort && (
            <div
              style={{
                fontSize: "9.7pt",
                color: pal.muted,
                marginTop: "0.35mm",
                lineHeight: 1.3,
              }}
            >
              {ort}
            </div>
          )}
          {text && (
            <div
              style={{
                fontSize: "9.9pt",
                color: pal.ink,
                marginTop: "0.75mm",
                lineHeight: 1.35,
              }}
            >
              {text}
            </div>
          )}
        </div>
      </div>
    ),
  });

  const referenceRows = (): Row[] => {
    const list = data.referenzen.filter(
      (r) => r.name.trim() || r.funktion.trim() || r.kontakt.trim(),
    );
    if (!list.length || data.hidden.referenzen) return [];
    return [
      heading("referenzen"),
      ...list.map(
        (r): Row => ({
          id: r.id,
          node: (
            <div style={{ marginBottom: "2.1mm" }}>
              {r.name && (
                <div
                  style={{
                    fontSize: "10.8pt",
                    fontWeight: 700,
                    color: pal.ink,
                    lineHeight: 1.25,
                  }}
                >
                  {r.name}
                </div>
              )}
              {r.funktion && (
                <div
                  style={{
                    fontSize: "9.7pt",
                    color: pal.muted,
                    marginTop: "0.3mm",
                    lineHeight: 1.3,
                  }}
                >
                  {r.funktion}
                </div>
              )}
              {r.kontakt && (
                <div
                  style={{
                    fontSize: "9.7pt",
                    color: pal.ink,
                    marginTop: "0.35mm",
                    lineHeight: 1.3,
                    overflowWrap: "anywhere",
                  }}
                >
                  {r.kontakt}
                </div>
              )}
            </div>
          ),
        }),
      ),
    ];
  };

  const simpleListRows = (key: "staerken" | "hobbys"): Row[] => {
    if (data.hidden[key]) return [];
    const list = data[key].filter((v) => v.trim());
    if (!list.length) return [];
    return [
      heading(key),
      ...list.map(
        (v, i): Row => ({
          id: `modern-main-${key}-${i}`,
          node: (
            <div
              style={{
                display: "flex",
                gap: "2.6mm",
                marginBottom: "1.35mm",
                fontSize: "9.9pt",
                lineHeight: 1.35,
                color: pal.ink,
              }}
            >
              <span style={{ color: pal.accent, fontWeight: 700 }}>•</span>
              <span>{v}</span>
            </div>
          ),
        }),
      ),
    ];
  };

  /* ---------- Inhalt als Liste von Zeilen ---------- */
  const rows: Row[] = [];

  if (layout === "classic") {
    // Kopf: Foto, Name, Untertitel und bewusst kompakte Kontaktdaten.
    rows.push({
      id: "kopf",
      node: (
        <div style={{ display: "flex", gap: "7mm", alignItems: "flex-start", marginBottom: "3.2mm" }}>
          {p.foto && (
            <div
              style={{
                width: "30mm",
                height: "38mm",
                flexShrink: 0,
                overflow: "hidden",
                borderRadius: "2mm",
                boxShadow: `0 0 0 0.4mm ${pal.accent}`,
              }}
            >
              <img
                src={p.foto}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: `${nameSize}pt`,
                fontWeight: 750,
                color: pal.ink,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                overflowWrap: "anywhere",
              }}
            >
              {name || "Dein Name"}
            </div>
            {p.untertitel && (
              <div
                style={{
                  fontSize: "11.2pt",
                  fontWeight: 600,
                  color: pal.accent,
                  marginTop: "1.15mm",
                  lineHeight: 1.25,
                }}
              >
                {p.untertitel}
              </div>
            )}
            {kontaktZeilen.length > 0 && (
              <div
                style={{
                  marginTop: "2.5mm",
                  fontSize: "9.7pt",
                  color: pal.ink,
                  lineHeight: 1.38,
                }}
              >
                {kontaktZeilen.map((k) => (
                  <div key={k} style={{ overflowWrap: "anywhere" }}>
                    {k}
                  </div>
                ))}
              </div>
            )}
            {angaben.length > 0 && (
              <div
                style={{
                  marginTop: "1.35mm",
                  fontSize: "9.2pt",
                  color: pal.muted,
                  lineHeight: 1.35,
                }}
              >
                {angaben.join(" · ")}
              </div>
            )}
          </div>
        </div>
      ),
    });

    for (const key of CV_SECTION_ORDER) {
      if (data.hidden[key]) continue;

      if (key === "schule" || key === "erfahrung") {
        const list = data[key].filter(entryFilled);
        if (!list.length) continue;
        rows.push(heading(key));
        list.forEach((e) => rows.push(entryRow(e.id, e.zeit, e.titel, e.ort, e.beschreibung)));
      }

      if (key === "sprachen") {
        const list = data.sprachen.filter((s) => s.name.trim() || s.niveau.trim());
        if (!list.length) continue;
        rows.push(heading(key));
        list.forEach((s) =>
          rows.push({
            id: s.id,
            node: (
              <div style={{ display: "flex", gap: "5mm", marginBottom: "1.5mm" }}>
                <div
                  style={{
                    width: "27mm",
                    flexShrink: 0,
                    fontSize: "10.2pt",
                    fontWeight: 650,
                    color: pal.ink,
                    lineHeight: 1.3,
                  }}
                >
                  {s.name}
                </div>
                <div style={{ flex: 1, fontSize: "9.8pt", color: pal.muted, lineHeight: 1.3 }}>
                  {s.niveau}
                </div>
              </div>
            ),
          }),
        );
      }

      if (key === "hobbys" || key === "staerken") {
        const list = data[key].filter((v) => v.trim());
        if (!list.length) continue;
        rows.push(heading(key));
        list.forEach((v, i) =>
          rows.push({
            id: `${key}-${i}`,
            node: (
              <div
                style={{
                  display: "flex",
                  gap: "2.6mm",
                  marginBottom: "1.35mm",
                  fontSize: "9.9pt",
                  lineHeight: 1.35,
                  color: pal.ink,
                }}
              >
                <span style={{ color: pal.accent, fontWeight: 700 }}>•</span>
                <span>{v}</span>
              </div>
            ),
          }),
        );
      }
    }
    // Referenzen wurden oben im Loop absichtlich noch nicht behandelt.
    if (!data.hidden.referenzen) rows.push(...referenceRows());
  } else {
    // Modern: persönliche Zusatzinfos wandern in die Sidebar; bei sehr viel
    // Inhalt ziehen Stärken/Hobbys automatisch in die Hauptspalte um.
    rows.push({
      id: "kopf-modern",
      node: (
        <div style={{ marginBottom: "4.8mm" }}>
          <div
            style={{
              fontSize: `${nameSize}pt`,
              fontWeight: 760,
              color: pal.ink,
              lineHeight: 1,
              letterSpacing: "-0.025em",
              overflowWrap: "anywhere",
            }}
          >
            {name || "Dein Name"}
          </div>
          {p.untertitel && (
            <div
              style={{
                marginTop: "1.4mm",
                fontSize: "11.5pt",
                fontWeight: 600,
                color: pal.accent,
                lineHeight: 1.25,
              }}
            >
              {p.untertitel}
            </div>
          )}
          <div
            style={{
              width: "24mm",
              height: "0.85mm",
              marginTop: "3.2mm",
              borderRadius: "999px",
              background: pal.accent,
            }}
          />
        </div>
      ),
    });

    (["schule", "erfahrung"] as const).forEach((key) => {
      if (data.hidden[key]) return;
      const list = data[key].filter(entryFilled);
      if (!list.length) return;
      rows.push(heading(key));
      list.forEach((e) => rows.push(entryRow(e.id, e.zeit, e.titel, e.ort, e.beschreibung)));
    });

    if (sidePlan.moveOptionalToMain) {
      rows.push(...simpleListRows("staerken"));
      rows.push(...simpleListRows("hobbys"));
    }
    rows.push(...referenceRows());
  }

  /* ---------- Seiten aufteilen ---------- */
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Row[][]>([rows]);
  const shape = `${layout}|${sidePlan.moveOptionalToMain ? "overflow" : "side"}|${rows
    .map((r) => r.id)
    .join("|")}`;
  const contentWidth = layout === "modern" ? MODERN_CONTENT_W : CLASSIC_CONTENT_W;

  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    // Die Vorschau skaliert das Blatt per transform – dort gibt
    // getBoundingClientRect skalierte Werte zurück und die Seitenzahl hinge am
    // Zoom. Der Massstab wird darum aus der Messfläche selbst bestimmt und
    // herausgerechnet.
    const scale = box.getBoundingClientRect().width / (box.offsetWidth || 1) || 1;
    const kids = Array.from(box.children) as HTMLElement[];
    const heights = kids.map((k) => k.getBoundingClientRect().height / scale);

    const out: Row[][] = [];
    let current: Row[] = [];
    let used = 0;
    rows.forEach((row, i) => {
      const h = heights[i] ?? 0;
      if (used + h > USABLE_H && current.length) {
        // Eine Überschrift allein am Seitenende sieht aus wie ein Fehler –
        // sie wandert mit auf die nächste Seite.
        const last = current[current.length - 1];
        if (last?.heading) {
          current.pop();
          out.push(current);
          current = [last];
          used = heights[i - 1] ?? 0;
        } else {
          out.push(current);
          current = [];
          used = 0;
        }
      }
      current.push(row);
      used += h;
    });
    if (current.length) out.push(current);
    setPages(out.length ? out : [[]]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, data, layout]);

  /* ---------- Hintergrund ---------- */
  const background = (
    <>
      <div style={{ position: "absolute", inset: 0, background: pal.paper }} />
      <div style={{ position: "absolute", inset: 0, opacity: policy.backgroundOpacity }}>
        <CoverBackground template={design.template} colors={softened} />
      </div>

      {design.useElements &&
        elements.map((el, i) => {
          if (customKind(el) !== "shape") return null;
          const st = customDefaultStyle(design.template, i, slots, el);
          const sizeFactor = shapeSizeFactor(st.w, el.shape);
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${st.x}mm`,
                top: `${st.y}mm`,
                width: `${st.w}mm`,
                opacity:
                  policy.backgroundOpacity *
                  policy.shapeFactor *
                  sizeFactor *
                  (layout === "modern" ? 0.45 : 1),
              }}
            >
              <ShapeElement
                shape={el.shape ?? "rect"}
                path={el.path}
                style={st}
                colors={softened}
              />
            </div>
          );
        })}

      {layout === "modern" && (
        <div
          style={{
            position: "absolute",
            left: `${MODERN_SIDEBAR_W}mm`,
            right: 0,
            top: "2.2mm",
            bottom: 0,
            background: `rgba(255,255,255,${policy.modernMainWash})`,
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: "2.2mm",
          background: pal.accent,
        }}
      />
    </>
  );

  const hasContact = !!(
    p.adresse ||
    p.plzOrt ||
    p.telefon ||
    p.email ||
    p.geburtsdatum ||
    p.nationalitaet
  );
  const hasLanguages =
    !data.hidden.sprachen && data.sprachen.some((s) => s.name.trim() || s.niveau.trim());
  const hasStrengths =
    !sidePlan.moveOptionalToMain &&
    !data.hidden.staerken &&
    data.staerken.some((v) => v.trim());
  const hasHobbies =
    !sidePlan.moveOptionalToMain &&
    !data.hidden.hobbys &&
    data.hobbys.some((v) => v.trim());
  const firstSide = hasContact
    ? "contact"
    : hasLanguages
      ? "languages"
      : hasStrengths
        ? "strengths"
        : "hobbies";

  const sideHeading = (text: string, first = false) => (
    <div
      style={{
        marginTop: first && !p.foto ? "0.8mm" : sidePlan.veryCompact ? "3.2mm" : sidePlan.compact ? "4.1mm" : "5.2mm",
        marginBottom: sidePlan.veryCompact ? "1.2mm" : sidePlan.compact ? "1.5mm" : "1.9mm",
        fontSize: sidePlan.veryCompact ? "8.4pt" : sidePlan.compact ? "8.8pt" : "9.2pt",
        fontWeight: 800,
        letterSpacing: "0.085em",
        textTransform: "uppercase",
        color: pal.accent,
        lineHeight: 1.15,
      }}
    >
      {text}
    </div>
  );

  const sideBody = sidePlan.veryCompact ? 8.7 : sidePlan.compact ? 9.1 : 9.5;
  const sideSmall = sidePlan.veryCompact ? 8.2 : sidePlan.compact ? 8.6 : 9.1;
  const sideLine = sidePlan.veryCompact ? 1.3 : sidePlan.compact ? 1.4 : 1.5;

  const modernSidebar = (pageIndex: number) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: "2.2mm",
        bottom: 0,
        width: `${MODERN_SIDEBAR_W}mm`,
        padding: `${p.foto ? "12.5mm" : "9.5mm"} 7.5mm 12mm 8mm`,
        boxSizing: "border-box",
        background: pal.paper,
        borderRight: `0.35mm solid ${pal.accent}${alphaHex(0.22)}`,
        fontFamily: SHEET_FONT,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `${pal.accent}${alphaHex(policy.sidebarTint)}`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
        {pageIndex === 0 ? (
          <>
            {p.foto && (
              <div
                style={{
                  width: sidePlan.veryCompact ? "25mm" : "28mm",
                  height: sidePlan.veryCompact ? "25mm" : "28mm",
                  overflow: "hidden",
                  borderRadius: "50%",
                  boxShadow: `0 0 0 0.55mm ${pal.accent}`,
                  marginBottom: sidePlan.compact ? "3.8mm" : "5.3mm",
                }}
              >
                <img
                  src={p.foto}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            )}

            {hasContact && (
              <>
                {sideHeading("Kontakt", firstSide === "contact")}
                <div
                  style={{
                    fontSize: `${sideBody}pt`,
                    color: pal.ink,
                    lineHeight: sideLine,
                    overflowWrap: "anywhere",
                  }}
                >
                  {p.adresse && <div>{p.adresse}</div>}
                  {p.plzOrt && <div>{p.plzOrt}</div>}
                  {p.telefon && <div style={{ marginTop: sidePlan.compact ? "1mm" : "1.7mm" }}>{p.telefon}</div>}
                  {p.email && <div>{p.email}</div>}
                  {p.geburtsdatum && (
                    <div style={{ marginTop: sidePlan.compact ? "1.2mm" : "2mm", color: pal.muted }}>
                      Geb. {p.geburtsdatum}
                    </div>
                  )}
                  {p.nationalitaet && <div style={{ color: pal.muted }}>{p.nationalitaet}</div>}
                </div>
              </>
            )}

            {hasLanguages && (
              <>
                {sideHeading(label(data, "sprachen"), firstSide === "languages")}
                {data.sprachen
                  .filter((s) => s.name.trim() || s.niveau.trim())
                  .map((s) => (
                    <div
                      key={s.id}
                      style={{
                        marginBottom: sidePlan.veryCompact ? "1.1mm" : sidePlan.compact ? "1.5mm" : "1.9mm",
                        lineHeight: 1.32,
                      }}
                    >
                      <div style={{ fontSize: `${sideBody + 0.1}pt`, fontWeight: 700, color: pal.ink }}>
                        {s.name}
                      </div>
                      {s.niveau && (
                        <div style={{ fontSize: `${sideSmall}pt`, color: pal.muted, marginTop: "0.2mm" }}>
                          {s.niveau}
                        </div>
                      )}
                    </div>
                  ))}
              </>
            )}

            {hasStrengths && (
              <>
                {sideHeading(label(data, "staerken"), firstSide === "strengths")}
                {data.staerken
                  .filter((v) => v.trim())
                  .map((v, i) => (
                    <div
                      key={`side-strength-${i}`}
                      style={{
                        display: "flex",
                        gap: "1.7mm",
                        marginBottom: sidePlan.veryCompact ? "0.9mm" : sidePlan.compact ? "1.15mm" : "1.45mm",
                      }}
                    >
                      <span style={{ color: pal.accent, fontWeight: 800 }}>•</span>
                      <span style={{ fontSize: `${sideBody - 0.2}pt`, lineHeight: 1.34, color: pal.ink }}>
                        {v}
                      </span>
                    </div>
                  ))}
              </>
            )}

            {hasHobbies && (
              <>
                {sideHeading(label(data, "hobbys"), firstSide === "hobbies")}
                {data.hobbys
                  .filter((v) => v.trim())
                  .map((v, i) => (
                    <div
                      key={`side-hobby-${i}`}
                      style={{
                        fontSize: `${sideBody - 0.2}pt`,
                        lineHeight: 1.36,
                        color: pal.ink,
                        marginBottom: sidePlan.veryCompact ? "0.8mm" : sidePlan.compact ? "1.05mm" : "1.35mm",
                      }}
                    >
                      {v}
                    </div>
                  ))}
              </>
            )}
          </>
        ) : (
          <div style={{ paddingTop: "5mm" }}>
            <div
              style={{
                fontSize: `${Math.min(12.5, smartNameSize(name, "modern") * 0.44)}pt`,
                fontWeight: 750,
                color: pal.ink,
                lineHeight: 1.15,
                overflowWrap: "anywhere",
              }}
            >
              {name || "Lebenslauf"}
            </div>
            <div style={{ marginTop: "1.5mm", fontSize: "9pt", color: pal.muted }}>
              Lebenslauf · Seite {pageIndex + 1}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col items-center gap-4"
      data-cv-layout={layout}
      data-export-mode={exportMode ? "true" : "false"}
    >
      {/* Messfläche: gleiche Breite wie der jeweilige Inhaltsbereich, aber unsichtbar. */}
      <div
        aria-hidden
        ref={measureRef}
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: `${contentWidth}mm`,
          visibility: "hidden",
          pointerEvents: "none",
          fontFamily: SHEET_FONT,
        }}
      >
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flow-root" }}>
            {r.node}
          </div>
        ))}
      </div>

      {pages.map((page, i) => (
        <div
          key={i}
          data-cv-page={i}
          className="relative overflow-hidden shadow-2xl"
          style={{ width: `${PAGE.WIDTH}px`, height: `${PAGE.HEIGHT}px`, background: pal.paper }}
        >
          {background}
          {layout === "modern" && modernSidebar(i)}
          {layout === "classic" && i > 0 && (
            <div
              style={{
                position: "absolute",
                top: "6.5mm",
                right: `${MARGIN_X}mm`,
                fontFamily: SHEET_FONT,
                fontSize: "8.5pt",
                color: pal.muted,
              }}
            >
              {name || "Lebenslauf"} · Seite {i + 1}
            </div>
          )}
          <div
            style={{
              position: "absolute",
              left: `${layout === "modern" ? MODERN_MAIN_LEFT : MARGIN_X}mm`,
              right: `${layout === "modern" ? MODERN_RIGHT : MARGIN_X}mm`,
              top: `${MARGIN_TOP}mm`,
              bottom: `${MARGIN_BOTTOM}mm`,
              overflow: "hidden",
              fontFamily: SHEET_FONT,
            }}
          >
            {page.map((r) => (
              <div key={r.id} style={{ display: "flow-root" }}>
                {r.node}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
