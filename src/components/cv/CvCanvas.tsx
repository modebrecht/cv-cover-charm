import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PAGE } from "@/default-config";
import { CoverBackground } from "@/components/cover/CoverBackground";
import { ShapeElement } from "@/components/cover/ShapeElement";
import { customDefaultStyle } from "@/components/cover/layouts";
import { customKind, TEMPLATES, type CustomField } from "@/components/cover/types";
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

const CONTENT_W = 210 - MARGIN_X * 2;
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

  /* ---------- Inhalt als Liste von Zeilen ---------- */
  const rows: Row[] = [];

  const heading = (key: CvSectionKey) => ({
    id: `h-${key}`,
    heading: true,
    node: (
      <div style={{ marginTop: "4mm", marginBottom: "1.8mm" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
          <div
            style={{
              fontSize: "10.2pt",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: pal.accent,
              lineHeight: 1.1,
            }}
          >
            {label(data, key)}
          </div>
          <div
            style={{
              width: "18mm",
              height: "0.55mm",
              flexShrink: 0,
              borderRadius: "999px",
              background: pal.accent,
              opacity: 0.72,
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
      <div style={{ display: "flex", gap: "5mm", marginBottom: "2.4mm" }}>
        <div
          style={{
            width: "27mm",
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
                fontSize: "11.5pt",
                fontWeight: 700,
                color: pal.ink,
                lineHeight: 1.2,
              }}
            >
              {titel}
            </div>
          )}
          {ort && (
            <div style={{ fontSize: "9.7pt", color: pal.muted, marginTop: "0.35mm", lineHeight: 1.3 }}>
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
              fontSize: "27pt",
              fontWeight: 750,
              color: pal.ink,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
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

    if (key === "referenzen") {
      const list = data.referenzen.filter(
        (r) => r.name.trim() || r.funktion.trim() || r.kontakt.trim(),
      );
      if (!list.length) continue;
      rows.push(heading(key));
      list.forEach((r) =>
        rows.push({
          id: r.id,
          node: (
            <div style={{ marginBottom: "2.1mm" }}>
              {r.name && (
                <div style={{ fontSize: "10.8pt", fontWeight: 700, color: pal.ink, lineHeight: 1.25 }}>
                  {r.name}
                </div>
              )}
              {r.funktion && (
                <div style={{ fontSize: "9.7pt", color: pal.muted, marginTop: "0.3mm", lineHeight: 1.3 }}>
                  {r.funktion}
                </div>
              )}
              {r.kontakt && (
                <div style={{ fontSize: "9.7pt", color: pal.ink, marginTop: "0.35mm", lineHeight: 1.3 }}>
                  {r.kontakt}
                </div>
              )}
            </div>
          ),
        }),
      );
    }
  }

  /* ---------- Seiten aufteilen ---------- */
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Row[][]>([rows]);
  // Nur der Inhalt zählt für die Aufteilung, nicht die Farben.
  const shape = rows.map((r) => r.id).join("|");

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
  }, [shape, data, design.bgOpacity]);

  /* ---------- Hintergrund ---------- */
  const background = (
    <>
      <div style={{ position: "absolute", inset: 0, background: pal.paper }} />
      <div style={{ position: "absolute", inset: 0, opacity: design.bgOpacity }}>
        <CoverBackground template={design.template} colors={softened} />
      </div>
      {/*
        Ein sehr schmales Band in der Vorlagenfarbe hält die Verbindung zum
        Titelblatt, ohne den Lebenslauf wie eine Präsentationsfolie wirken zu
        lassen. Der Rest des Designs bleibt bewusst im Hintergrund.
      */}
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

      {design.useElements &&
        elements.map((el, i) => {
          if (customKind(el) !== "shape") return null;
          const st = customDefaultStyle(design.template, i, slots, el);
          return (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: `${st.x}mm`,
                top: `${st.y}mm`,
                width: `${st.w}mm`,
                opacity: design.bgOpacity * 0.25,
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
    </>
  );

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Messfläche: gleiche Breite wie der Inhalt, aber unsichtbar. */}
      <div
        aria-hidden
        ref={measureRef}
        style={{
          position: "absolute",
          left: "-10000px",
          top: 0,
          width: `${CONTENT_W}mm`,
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
          <div
            style={{
              position: "absolute",
              left: `${MARGIN_X}mm`,
              right: `${MARGIN_X}mm`,
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
