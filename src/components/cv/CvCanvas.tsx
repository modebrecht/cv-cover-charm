import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { PAGE } from "@/default-config";
import { CoverBackground } from "@/components/cover/CoverBackground";
import { ShapeElement } from "@/components/cover/ShapeElement";
import { customDefaultStyle } from "@/components/cover/layouts";
import { customKind, TEMPLATES, type CustomField } from "@/components/cover/types";
import {
  getCvLayout,
  getCvLayoutChoice,
  subscribeCvLayout,
  subscribeCvLayoutChoice,
} from "./layout";
import { getCvPlacements, subscribeCvPlacements } from "./placement";
import {
  alphaHex,
  cvVisualPolicy,
  shapeSizeFactor,
  sidebarPlan,
  smartNameSize,
} from "./intelligence";
import { cvPalette, onColorRoles, type CvOnColor } from "./palette";
import {
  bandLeftMm,
  cvContentBox,
  cvFrameFor,
  forcedRenderLayout,
  headerSitsInBand,
} from "./archetype";
import {
  CV_SECTION_LABELS,
  CV_SECTION_ORDER,
  DEFAULT_CV_PLACEMENTS,
  entryFilled,
  type CvData,
  type CvDesign,
  type CvSectionKey,
} from "./types";

/** Seitenrand in mm, wo keine Bauform etwas anderes vorgibt. */
const MARGIN_X = 18;
const MODERN_SIDEBAR_W = 55;
/** Umrechnung als Rückfall, falls die Messung nichts hergibt. */
const PX_PER_MM = 96 / 25.4;

const SHEET_FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";

type Row = { id: string; node: React.ReactNode; heading?: boolean };

type Props = {
  data: CvData;
  design: CvDesign;
  elements: CustomField[];
  exportMode?: boolean;
};

function label(data: CvData, key: CvSectionKey): string {
  return data.labels[key]?.trim() || CV_SECTION_LABELS[key];
}

export function CvCanvas({ data, design, elements, exportMode = false }: Props) {
  const pal = useMemo(() => cvPalette(design.colors), [design.colors]);
  // Die Bauform der Vorlage entscheidet über Flächen und Textbereich. Sie ist
  // der eigentliche Träger der Verwandtschaft zum Titelblatt.
  const frame = useMemo(() => cvFrameFor(design.template), [design.template]);
  const chosenLayout = useSyncExternalStore(subscribeCvLayout, getCvLayout, () => "classic");
  // Eine farbige Spalte will gefüllt sein, eine Karte hat für zwei Spalten zu
  // wenig Platz. Wo die Bauform das vorgibt, geht sie der Auswahl vor.
  const layout = forcedRenderLayout(frame) ?? chosenLayout;
  // Raw choice is separate from renderer mode. Classic/Luftig/Timeline/Magazin
  // share the same renderer but have different real content geometry.
  const layoutChoice = useSyncExternalStore(
    subscribeCvLayoutChoice,
    getCvLayoutChoice,
    () => "classic",
  );
  const placements = useSyncExternalStore(
    subscribeCvPlacements,
    getCvPlacements,
    () => DEFAULT_CV_PLACEMENTS,
  );
  const policy = useMemo(
    () => cvVisualPolicy(design.template, layout, design.bgOpacity),
    [design.template, design.bgOpacity, layout],
  );
  const sidePlan = useMemo(() => sidebarPlan(data), [data]);

  /** Farbe der tragenden Fläche – dieselbe, die das Titelblatt dort verwendet. */
  const areaColor = design.colors.primary || design.colors.accent || pal.accent;
  /**
   * Schrift **auf** der farbigen Fläche. Die Fläche wird nicht aufgehellt,
   * sondern bekommt eine Schrift, die darauf lesbar ist.
   */
  const onArea = useMemo(
    () => onColorRoles(areaColor, design.colors.accent),
    [areaColor, design.colors.accent],
  );
  /** Rollen für die Seitenspalte: auf Farbe bei "column", sonst auf Papier. */
  const side: CvOnColor =
    frame.id === "column"
      ? onArea
      : {
          bg: pal.paper,
          ink: pal.ink,
          muted: pal.muted,
          accent: pal.accent,
          hairline: pal.accent,
        };

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

  const headingText = (id: string, text: string): Row => ({
    id: `h-${id}`,
    heading: true,
    node: (
      <div
        data-cv-section={id}
        style={{
          marginTop: layout === "modern" ? "4.8mm" : "4mm",
          marginBottom: layout === "modern" ? "2mm" : "1.8mm",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
          <div
            data-cv-section-title
            style={{
              fontSize: layout === "modern" ? "10.3pt" : "10.2pt",
              fontWeight: layout === "modern" ? 800 : 700,
              letterSpacing: layout === "modern" ? "0.085em" : "0.1em",
              textTransform: "uppercase",
              color: pal.accent,
              lineHeight: 1.1,
            }}
          >
            {text}
          </div>
          <div
            data-cv-accent="section"
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

  const heading = (key: CvSectionKey): Row => headingText(key, label(data, key));

  const entryRow = (id: string, zeit: string, titel: string, ort: string, text: string): Row => ({
    id,
    node: (
      <div
        data-cv-entry
        style={{
          display: "flex",
          gap: layout === "modern" ? "4mm" : "5mm",
          marginBottom: "2.4mm",
        }}
      >
        <div
          data-cv-date
          data-cv-rail
          data-cv-muted
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
              data-cv-entry-title
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
              data-cv-muted
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
              data-cv-body
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
            <div data-cv-entry style={{ marginBottom: "2.1mm" }}>
              {r.name && (
                <div
                  data-cv-entry-title
                  style={{ fontSize: "10.8pt", fontWeight: 700, color: pal.ink, lineHeight: 1.25 }}
                >
                  {r.name}
                </div>
              )}
              {r.funktion && (
                <div
                  data-cv-muted
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
                  data-cv-body
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

  const languageRows = (): Row[] => {
    const list = data.sprachen.filter((s) => s.name.trim() || s.niveau.trim());
    if (!list.length || data.hidden.sprachen) return [];
    return [
      heading("sprachen"),
      ...list.map(
        (s): Row => ({
          id: `main-${s.id}`,
          node: (
            <div data-cv-entry style={{ display: "flex", gap: "5mm", marginBottom: "1.5mm" }}>
              <div
                data-cv-rail
                data-cv-entry-title
                style={{
                  width: layout === "modern" ? "23mm" : "27mm",
                  flexShrink: 0,
                  fontSize: "10.2pt",
                  fontWeight: 650,
                  color: pal.ink,
                  lineHeight: 1.3,
                }}
              >
                {s.name}
              </div>
              <div
                data-cv-muted
                style={{ flex: 1, fontSize: "9.8pt", color: pal.muted, lineHeight: 1.3 }}
              >
                {s.niveau}
              </div>
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
          id: `main-${key}-${i}`,
          node: (
            <div
              data-cv-entry
              data-cv-body
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

  const contactMainRows = (): Row[] => {
    if (!kontaktZeilen.length && !angaben.length) return [];
    return [
      headingText("kontakt", "Kontakt"),
      {
        id: "kontakt-main",
        node: (
          <div
            data-cv-entry
            data-cv-body
            style={{ marginBottom: "2.2mm", fontSize: "9.8pt", lineHeight: 1.4, color: pal.ink }}
          >
            {kontaktZeilen.map((line) => (
              <div key={line} style={{ overflowWrap: "anywhere" }}>
                {line}
              </div>
            ))}
            {angaben.length > 0 && (
              <div data-cv-muted style={{ marginTop: "1mm", color: pal.muted }}>
                {angaben.join(" · ")}
              </div>
            )}
          </div>
        ),
      },
    ];
  };

  const rows: Row[] = [];
  // Trägt ein Kopfband den Namen, gehört er nicht in den Textfluss – sonst
  // stünde er zweimal auf der Seite.
  const nameInBand = headerSitsInBand(frame);

  if (layout === "classic") {
    const classicHeader: Row = {
      id: "kopf",
      node: (
        <div
          data-cv-header
          style={{ display: "flex", gap: "7mm", alignItems: "flex-start", marginBottom: "3.2mm" }}
        >
          {p.foto && (
            <div
              data-cv-photo
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
              data-cv-name
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
                data-cv-subtitle
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
                data-cv-body
                style={{ marginTop: "2.5mm", fontSize: "9.7pt", color: pal.ink, lineHeight: 1.38 }}
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
                data-cv-muted
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
    };
    if (!nameInBand) rows.push(classicHeader);

    for (const key of CV_SECTION_ORDER) {
      if (data.hidden[key]) continue;
      if (key === "schule" || key === "erfahrung") {
        const list = data[key].filter(entryFilled);
        if (!list.length) continue;
        rows.push(heading(key));
        list.forEach((e) => rows.push(entryRow(e.id, e.zeit, e.titel, e.ort, e.beschreibung)));
      } else if (key === "sprachen") {
        rows.push(...languageRows());
      } else if (key === "hobbys" || key === "staerken") {
        rows.push(...simpleListRows(key));
      }
    }
    rows.push(...referenceRows());
  } else {
    const modernHeader: Row = {
      id: "kopf-modern",
      node: (
        <div data-cv-header style={{ marginBottom: "4.8mm" }}>
          <div
            data-cv-name
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
              data-cv-subtitle
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
            data-cv-accent="header"
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
    };
    if (!nameInBand) rows.push(modernHeader);

    if (placements.kontakt === "main") rows.push(...contactMainRows());

    for (const key of CV_SECTION_ORDER) {
      if (placements[key] !== "main" || data.hidden[key]) continue;
      if (key === "schule" || key === "erfahrung") {
        const list = data[key].filter(entryFilled);
        if (!list.length) continue;
        rows.push(heading(key));
        list.forEach((e) => rows.push(entryRow(e.id, e.zeit, e.titel, e.ort, e.beschreibung)));
      } else if (key === "sprachen") {
        rows.push(...languageRows());
      } else if (key === "hobbys" || key === "staerken") {
        rows.push(...simpleListRows(key));
      } else if (key === "referenzen") {
        rows.push(...referenceRows());
      }
    }
  }

  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Row[][]>([rows]);
  const placementShape = Object.entries(placements)
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  const shape = `${layoutChoice}|${layout}|${frame.id}|${placementShape}|${rows.map((r) => r.id).join("|")}`;

  useLayoutEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const scale = rect.width / (box.offsetWidth || 1) || 1;
    const measured = rect.height / scale;

    // Der Messkasten trägt die Ränder von Seite 1. Daraus ergibt sich, wie
    // viele Pixel ein Millimeter hier tatsächlich hat – und damit die Höhe
    // jeder weiteren Seite, ohne einen zweiten Kasten messen zu müssen.
    const first = cvContentBox(frame, 0);
    const marginMm = first.top + first.bottom;
    const pxPerMm = marginMm > 0 ? (PAGE.HEIGHT - measured) / marginMm : PX_PER_MM;
    const heightFor = (pageIndex: number) => {
      const b = cvContentBox(frame, pageIndex);
      return PAGE.HEIGHT - (b.top + b.bottom) * pxPerMm;
    };

    const kids = Array.from(box.children) as HTMLElement[];
    const heights = kids.map((k) => k.getBoundingClientRect().height / scale);

    const out: Row[][] = [];
    let current: Row[] = [];
    let used = 0;
    rows.forEach((row, i) => {
      const h = heights[i] ?? 0;
      if (used + h > heightFor(out.length) && current.length) {
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
  }, [shape, data, layout, layoutChoice, design.template, pal.accent, pal.ink, pal.muted]);

  /**
   * Papierfarbe für die Zierde.
   *
   * Eine Vorlage darf ein dunkles Blatt haben – Sonne etwa steht auf #333.
   * Läge diese Farbe auch nur blass unter dem Text, wäre das Papier grau statt
   * weiss. Für die Zierde zählen deshalb nur die *Formen* der Vorlage, nicht
   * ihr Blattgrund. Bei "card" ist der Grund dagegen die tragende Fläche und
   * bleibt, wie er ist.
   */
  const groundColors = frame.id === "card" ? design.colors : { ...design.colors, bg: pal.paper };

  /**
   * Der Grund der Seite.
   *
   * Bei "card" ist die Fläche die tragende Fläche der Vorlage – sie bleibt
   * voll deckend, sonst wäre Citrus nicht Citrus. Sonst liegt der Hintergrund
   * nur als Zierde darunter und gehorcht dem Regler.
   */
  const ground = (
    <div
      data-cv-background="motif"
      style={{
        position: "absolute",
        inset: 0,
        opacity:
          frame.id === "card"
            ? 1
            : frame.id === "quiet"
              ? policy.backgroundOpacity
              : // Wo Spalte oder Band die Vorlage schon tragen, tritt das
                // Motiv zurück, statt mit ihnen zu konkurrieren.
                policy.backgroundOpacity * 0.45,
      }}
    >
      <CoverBackground template={design.template} colors={groundColors} />
    </div>
  );

  /** Selbst hinzugefügte Formen vom Titelblatt – reine Zierde, dem Regler unterstellt. */
  const decoration = (
    <>
      {design.useElements &&
        elements.map((el, i) => {
          if (customKind(el) !== "shape") return null;
          const st = customDefaultStyle(design.template, i, slots, el);
          const sizeFactor = shapeSizeFactor(st.w, el.shape);
          return (
            <div
              key={el.id}
              data-cv-decoration
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
                colors={design.colors}
              />
            </div>
          );
        })}
    </>
  );

  /** Ausschnitt des echten Titelblatt-Hintergrunds, oben bündig. */
  const bandMotif = (heightMm: number) => (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: `${heightMm}mm`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: `${PAGE.WIDTH}px`,
          height: `${PAGE.HEIGHT}px`,
        }}
      >
        <CoverBackground template={design.template} colors={design.colors} />
      </div>
    </div>
  );

  /** Farbe des Kopfbands – bei Studio das Akzentband, sonst die Hauptfläche. */
  const bandColor = frame.id === "column" ? design.colors.accent || areaColor : areaColor;
  const onBand = onColorRoles(bandColor, design.colors.primary);

  const chrome = (pageIndex: number) => {
    const head = pageIndex === 0 ? frame.headFirstMm : frame.headRestMm;
    return (
      <>
        <div
          data-cv-background="paper"
          style={{ position: "absolute", inset: 0, background: pal.paper }}
        />
        {ground}

        {frame.id === "card" && (
          <>
            <div
              data-cv-card
              style={{
                position: "absolute",
                inset: `${frame.cardInsetMm}mm`,
                borderRadius: `${frame.cardRadiusMm}mm`,
                background: pal.paper,
              }}
            />
            {/*
              Bei dieser Bauform ist der Grund die tragende Fläche und darf
              nicht verblassen. Damit der Regler trotzdem etwas tut, bestimmt
              er hier, wie viel Vorlagenfarbe in die Textkarte durchscheint.
              Der Anteil ist klein genug, dass der Kontrast erhalten bleibt.
            */}
            <div
              data-cv-card-tint
              style={{
                position: "absolute",
                inset: `${frame.cardInsetMm}mm`,
                borderRadius: `${frame.cardRadiusMm}mm`,
                background: areaColor,
                opacity: policy.backgroundOpacity * 0.09,
              }}
            />
          </>
        )}

        {frame.id === "column" && (
          <div
            data-cv-column
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${frame.columnMm}mm`,
              background: areaColor,
            }}
          />
        )}

        {head > 0 &&
          (frame.bandMotif ? (
            bandMotif(head)
          ) : (
            <div
              data-cv-band="head"
              style={{
                position: "absolute",
                left: `${bandLeftMm(frame)}mm`,
                right: 0,
                top: 0,
                height: `${head}mm`,
                background: bandColor,
              }}
            />
          ))}

        {frame.footRule && frame.footMm > 0 && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: `${frame.footMm}mm`,
              height: "0.4mm",
              background: onArea.hairline,
              opacity: 0.7,
            }}
          />
        )}

        {frame.footMm > 0 && (
          <div
            data-cv-band="foot"
            style={{
              position: "absolute",
              // Studio setzt sein Fussband erst rechts der Spalte an.
              left: frame.id === "column" ? `${frame.columnMm}mm` : 0,
              right: 0,
              bottom: 0,
              height: `${frame.footMm}mm`,
              background: areaColor,
            }}
          />
        )}

        {frame.borderInsetMm > 0 && (
          <div
            data-cv-border
            style={{
              position: "absolute",
              inset: `${frame.borderInsetMm}mm`,
              border: `0.35mm solid ${pal.accent}`,
              opacity: 0.3,
            }}
          />
        )}
        {frame.borderDouble && (
          <div
            style={{
              position: "absolute",
              inset: `${frame.borderInsetMm + 3}mm`,
              border: `0.25mm solid ${pal.accent}`,
              opacity: 0.18,
            }}
          />
        )}

        {decoration}
        {layout === "modern" && frame.id !== "column" && (
          <div
            data-cv-main-wash
            style={{
              position: "absolute",
              left: `${MODERN_SIDEBAR_W}mm`,
              right: 0,
              top: 0,
              bottom: 0,
              background: `rgba(255,255,255,${policy.modernMainWash})`,
            }}
          />
        )}
      </>
    );
  };

  const hasContact =
    placements.kontakt === "side" &&
    !!(p.adresse || p.plzOrt || p.telefon || p.email || p.geburtsdatum || p.nationalitaet);
  const hasSchool =
    placements.schule === "side" && !data.hidden.schule && data.schule.some(entryFilled);
  const hasExperience =
    placements.erfahrung === "side" && !data.hidden.erfahrung && data.erfahrung.some(entryFilled);
  const hasLanguages =
    placements.sprachen === "side" &&
    !data.hidden.sprachen &&
    data.sprachen.some((s) => s.name.trim() || s.niveau.trim());
  const hasStrengths =
    placements.staerken === "side" && !data.hidden.staerken && data.staerken.some((v) => v.trim());
  const hasHobbies =
    placements.hobbys === "side" && !data.hidden.hobbys && data.hobbys.some((v) => v.trim());
  const hasReferences =
    placements.referenzen === "side" &&
    !data.hidden.referenzen &&
    data.referenzen.some((r) => r.name.trim() || r.funktion.trim() || r.kontakt.trim());

  const firstSide = hasContact
    ? "contact"
    : hasSchool
      ? "school"
      : hasExperience
        ? "experience"
        : hasLanguages
          ? "languages"
          : hasStrengths
            ? "strengths"
            : hasHobbies
              ? "hobbies"
              : "references";

  const sideHeading = (text: string, first = false) => (
    <div
      data-cv-section="sidebar"
      data-cv-section-title
      style={{
        marginTop:
          first && !p.foto
            ? "0.8mm"
            : sidePlan.veryCompact
              ? "3.2mm"
              : sidePlan.compact
                ? "4.1mm"
                : "5.2mm",
        marginBottom: sidePlan.veryCompact ? "1.2mm" : sidePlan.compact ? "1.5mm" : "1.9mm",
        fontSize: sidePlan.veryCompact ? "8.4pt" : sidePlan.compact ? "8.8pt" : "9.2pt",
        fontWeight: 800,
        letterSpacing: "0.085em",
        textTransform: "uppercase",
        color: side.accent,
        lineHeight: 1.15,
      }}
    >
      {text}
    </div>
  );

  const sideBody = sidePlan.veryCompact ? 8.7 : sidePlan.compact ? 9.1 : 9.5;
  const sideSmall = sidePlan.veryCompact ? 8.2 : sidePlan.compact ? 8.6 : 9.1;
  const sideLine = sidePlan.veryCompact ? 1.3 : sidePlan.compact ? 1.4 : 1.5;

  const sideEntries = (key: "schule" | "erfahrung") => (
    <>
      {data[key].filter(entryFilled).map((e) => (
        <div
          data-cv-entry
          key={`side-${e.id}`}
          style={{ marginBottom: sidePlan.compact ? "1.7mm" : "2.2mm" }}
        >
          {e.zeit && (
            <div
              data-cv-date
              data-cv-muted
              style={{ fontSize: `${sideSmall}pt`, color: side.muted, lineHeight: 1.25 }}
            >
              {e.zeit}
            </div>
          )}
          {e.titel && (
            <div
              data-cv-entry-title
              style={{
                marginTop: "0.25mm",
                fontSize: `${sideBody}pt`,
                fontWeight: 700,
                color: side.ink,
                lineHeight: 1.28,
              }}
            >
              {e.titel}
            </div>
          )}
          {e.ort && (
            <div
              data-cv-muted
              style={{
                marginTop: "0.2mm",
                fontSize: `${sideSmall}pt`,
                color: side.muted,
                lineHeight: 1.28,
              }}
            >
              {e.ort}
            </div>
          )}
          {e.beschreibung && (
            <div
              data-cv-body
              style={{
                marginTop: "0.35mm",
                fontSize: `${sideSmall}pt`,
                color: side.ink,
                lineHeight: 1.3,
              }}
            >
              {e.beschreibung}
            </div>
          )}
        </div>
      ))}
    </>
  );

  /** Bei "column" ist die Spalte die Fläche der Vorlage – sonst getönte Papierspalte. */
  const onColumn = frame.id === "column";
  const sidebarWidth = onColumn ? frame.columnMm : MODERN_SIDEBAR_W;

  const modernSidebar = (pageIndex: number) => (
    <div
      data-cv-sidebar
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: onColumn ? 0 : undefined,
        height: onColumn ? undefined : "100%",
        width: `${sidebarWidth}mm`,
        padding: onColumn
          ? `${p.foto ? "16mm" : "13mm"} 9mm ${Math.max(12, frame.footMm + 8)}mm 10mm`
          : `${p.foto ? "12.5mm" : "9.5mm"} 7.5mm 12mm 8mm`,
        boxSizing: "border-box",
        // Die Spalte selbst liegt schon im Seitengrund; hier nur bei der
        // getönten Papierspalte einen eigenen Grund zeichnen.
        background: onColumn ? "transparent" : side.bg,
        borderRight: onColumn ? undefined : `0.35mm solid ${side.accent}${alphaHex(0.22)}`,
        fontFamily: SHEET_FONT,
        overflow: "hidden",
      }}
    >
      {!onColumn && (
        <div
          aria-hidden
          data-cv-sidebar-tint
          style={{
            position: "absolute",
            inset: 0,
            background: `${side.accent}${alphaHex(policy.sidebarTint)}`,
            pointerEvents: "none",
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>
        {pageIndex === 0 ? (
          <>
            {p.foto && (
              <div
                data-cv-photo
                style={{
                  width: sidePlan.veryCompact ? "25mm" : "28mm",
                  height: sidePlan.veryCompact ? "25mm" : "28mm",
                  overflow: "hidden",
                  borderRadius: "50%",
                  boxShadow: `0 0 0 0.55mm ${side.accent}`,
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
                  data-cv-entry
                  data-cv-body
                  style={{
                    fontSize: `${sideBody}pt`,
                    color: side.ink,
                    lineHeight: sideLine,
                    overflowWrap: "anywhere",
                  }}
                >
                  {p.adresse && <div>{p.adresse}</div>}
                  {p.plzOrt && <div>{p.plzOrt}</div>}
                  {p.telefon && (
                    <div style={{ marginTop: sidePlan.compact ? "1mm" : "1.7mm" }}>{p.telefon}</div>
                  )}
                  {p.email && <div>{p.email}</div>}
                  {p.geburtsdatum && (
                    <div
                      data-cv-date
                      data-cv-muted
                      style={{ marginTop: sidePlan.compact ? "1.2mm" : "2mm", color: side.muted }}
                    >
                      Geb. {p.geburtsdatum}
                    </div>
                  )}
                  {p.nationalitaet && (
                    <div data-cv-muted style={{ color: side.muted }}>
                      {p.nationalitaet}
                    </div>
                  )}
                </div>
              </>
            )}

            {hasSchool && (
              <>
                {sideHeading(label(data, "schule"), firstSide === "school")}
                {sideEntries("schule")}
              </>
            )}

            {hasExperience && (
              <>
                {sideHeading(label(data, "erfahrung"), firstSide === "experience")}
                {sideEntries("erfahrung")}
              </>
            )}

            {hasLanguages && (
              <>
                {sideHeading(label(data, "sprachen"), firstSide === "languages")}
                {data.sprachen
                  .filter((s) => s.name.trim() || s.niveau.trim())
                  .map((s) => (
                    <div
                      data-cv-entry
                      key={s.id}
                      style={{
                        marginBottom: sidePlan.veryCompact
                          ? "1.1mm"
                          : sidePlan.compact
                            ? "1.5mm"
                            : "1.9mm",
                        lineHeight: 1.32,
                      }}
                    >
                      <div
                        data-cv-entry-title
                        style={{
                          fontSize: `${sideBody + 0.1}pt`,
                          fontWeight: 700,
                          color: side.ink,
                        }}
                      >
                        {s.name}
                      </div>
                      {s.niveau && (
                        <div
                          data-cv-muted
                          style={{
                            fontSize: `${sideSmall}pt`,
                            color: side.muted,
                            marginTop: "0.2mm",
                          }}
                        >
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
                      data-cv-entry
                      data-cv-body
                      key={`side-strength-${i}`}
                      style={{
                        display: "flex",
                        gap: "1.7mm",
                        marginBottom: sidePlan.veryCompact
                          ? "0.9mm"
                          : sidePlan.compact
                            ? "1.15mm"
                            : "1.45mm",
                      }}
                    >
                      <span style={{ color: side.accent, fontWeight: 800 }}>•</span>
                      <span
                        style={{
                          fontSize: `${sideBody - 0.2}pt`,
                          lineHeight: 1.34,
                          color: side.ink,
                        }}
                      >
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
                      data-cv-entry
                      data-cv-body
                      key={`side-hobby-${i}`}
                      style={{
                        fontSize: `${sideBody - 0.2}pt`,
                        lineHeight: 1.36,
                        color: side.ink,
                        marginBottom: sidePlan.veryCompact
                          ? "0.8mm"
                          : sidePlan.compact
                            ? "1.05mm"
                            : "1.35mm",
                      }}
                    >
                      {v}
                    </div>
                  ))}
              </>
            )}

            {hasReferences && (
              <>
                {sideHeading(label(data, "referenzen"), firstSide === "references")}
                {data.referenzen
                  .filter((r) => r.name.trim() || r.funktion.trim() || r.kontakt.trim())
                  .map((r) => (
                    <div
                      data-cv-entry
                      key={`side-${r.id}`}
                      style={{ marginBottom: sidePlan.compact ? "1.6mm" : "2mm" }}
                    >
                      {r.name && (
                        <div
                          data-cv-entry-title
                          style={{ fontSize: `${sideBody}pt`, fontWeight: 700, color: side.ink }}
                        >
                          {r.name}
                        </div>
                      )}
                      {r.funktion && (
                        <div
                          data-cv-muted
                          style={{
                            marginTop: "0.2mm",
                            fontSize: `${sideSmall}pt`,
                            color: side.muted,
                            lineHeight: 1.28,
                          }}
                        >
                          {r.funktion}
                        </div>
                      )}
                      {r.kontakt && (
                        <div
                          data-cv-body
                          style={{
                            marginTop: "0.25mm",
                            fontSize: `${sideSmall}pt`,
                            color: side.ink,
                            lineHeight: 1.28,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {r.kontakt}
                        </div>
                      )}
                    </div>
                  ))}
              </>
            )}
          </>
        ) : nameInBand ? null : ( // Das Kopfband trägt auf Folgeseiten bereits Name und Seitenzahl.
          <div data-cv-header style={{ paddingTop: "5mm" }}>
            <div
              data-cv-name
              style={{
                fontSize: `${Math.min(12.5, smartNameSize(name, "modern") * 0.44)}pt`,
                fontWeight: 750,
                color: side.ink,
                lineHeight: 1.15,
                overflowWrap: "anywhere",
              }}
            >
              {name || "Lebenslauf"}
            </div>
            <div data-cv-muted style={{ marginTop: "1.5mm", fontSize: "9pt", color: side.muted }}>
              Lebenslauf · Seite {pageIndex + 1}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Name und Zeile darunter im Kopfband – dort, wo sie auf dem Titelblatt
   * ebenfalls stehen. Auf Folgeseiten bleibt nur die Seitenangabe.
   */
  const bandHeader = (pageIndex: number) => {
    const head = pageIndex === 0 ? frame.headFirstMm : frame.headRestMm;
    if (!nameInBand || head <= 0) return null;
    const roles = frame.bandMotif ? onArea : onBand;
    const left = bandLeftMm(frame) + (frame.id === "column" ? 10 : MARGIN_X);
    return (
      <div
        data-cv-band-header
        style={{
          position: "absolute",
          left: `${left}mm`,
          right: `${MARGIN_X}mm`,
          top: 0,
          height: `${head}mm`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontFamily: SHEET_FONT,
          overflow: "hidden",
        }}
      >
        {pageIndex === 0 ? (
          <>
            <div
              data-cv-name
              style={{
                fontSize: `${nameSize}pt`,
                fontWeight: 750,
                color: roles.ink,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                overflowWrap: "anywhere",
              }}
            >
              {name || "Dein Name"}
            </div>
            {p.untertitel && (
              <div
                data-cv-subtitle
                style={{
                  marginTop: "1.6mm",
                  fontSize: "11.2pt",
                  fontWeight: 600,
                  color: roles.muted,
                }}
              >
                {p.untertitel}
              </div>
            )}
          </>
        ) : (
          <div data-cv-muted style={{ fontSize: "9pt", color: roles.muted }}>
            {name || "Lebenslauf"} · Seite {pageIndex + 1}
          </div>
        )}
      </div>
    );
  };

  const firstBox = cvContentBox(frame, 0);

  return (
    <div
      className="flex flex-col items-center gap-4"
      data-dossier-document="cv"
      data-cv-layout={layout}
      data-cv-archetype={frame.id}
      data-export-mode={exportMode ? "true" : "false"}
    >
      {/*
        Hidden A4 measurement page. It deliberately uses a separate semantic
        hook instead of data-cv-page so PDF export never mistakes it for a real
        page. Variant CSS mirrors the real main-column geometry onto this box.
      */}
      <div
        aria-hidden
        data-cv-measure-page
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: `${PAGE.WIDTH}px`,
          height: `${PAGE.HEIGHT}px`,
          visibility: "hidden",
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          ref={measureRef}
          data-cv-main
          style={{
            position: "absolute",
            left: `${firstBox.left}mm`,
            right: `${firstBox.right}mm`,
            top: `${firstBox.top}mm`,
            bottom: `${firstBox.bottom}mm`,
            overflow: "visible",
            fontFamily: SHEET_FONT,
          }}
        >
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flow-root" }}>
              {r.node}
            </div>
          ))}
        </div>
      </div>

      {pages.map((page, i) => {
        const box = cvContentBox(frame, i);
        return (
          <div
            key={i}
            data-cv-page={i}
            className="relative overflow-hidden shadow-2xl"
            style={{ width: `${PAGE.WIDTH}px`, height: `${PAGE.HEIGHT}px`, background: pal.paper }}
          >
            {chrome(i)}
            {layout === "modern" && modernSidebar(i)}
            {bandHeader(i)}
            {!nameInBand && layout === "classic" && i > 0 && (
              <div
                data-cv-page-label
                data-cv-muted
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
              data-cv-main
              style={{
                position: "absolute",
                left: `${box.left}mm`,
                right: `${box.right}mm`,
                top: `${box.top}mm`,
                bottom: `${box.bottom}mm`,
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
        );
      })}
    </div>
  );
}
