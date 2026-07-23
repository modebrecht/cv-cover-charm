import type { CoverData } from "./types";

export function Klassisch({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const ink = colors.ink;
  const accent = colors.accent;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{
        backgroundColor: bg,
        color: ink,
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "18mm",
      }}
    >
      {/* Feiner Rahmen */}
      <div
        className="pointer-events-none absolute"
        style={{
          inset: "10mm",
          border: `1px solid ${ink}`,
          opacity: 0.15,
        }}
      />

      <header className="relative flex items-start justify-between">
        <div className="text-[9pt] uppercase tracking-[0.35em]" style={{ color: accent }}>
          Bewerbungsdossier
        </div>
        {ortDatum && (
          <div className="text-[9pt] italic" style={{ opacity: 0.75 }}>
            {ortDatum}
          </div>
        )}
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center text-center">
        {data.foto ? (
          <img
            src={data.foto}
            alt="Foto"
            className="object-cover"
            style={{
              width: "48mm",
              height: "60mm",
              filter: "grayscale(15%) contrast(1.02)",
              boxShadow: `0 0 0 1px ${ink}22`,
            }}
          />
        ) : initialen ? (
          <div
            className="flex items-center justify-center text-[36pt]"
            style={{
              width: "48mm",
              height: "60mm",
              border: `1px solid ${ink}`,
              color: accent,
              fontStyle: "italic",
            }}
          >
            {initialen}
          </div>
        ) : null}

        <div
          className="mt-10 text-[10pt] uppercase tracking-[0.5em]"
          style={{ color: accent }}
        >
          Bewerbung
        </div>

        {data.beruf && (
          <div
            className="mt-3 max-w-[150mm] text-[26pt] leading-[1.15]"
            style={{ fontStyle: "italic" }}
          >
            um eine Lehrstelle als
            <br />
            <span style={{ fontStyle: "normal", fontWeight: 600 }}>{data.beruf}</span>
          </div>
        )}

        <div
          className="my-8 flex items-center justify-center gap-3"
          style={{ color: accent }}
        >
          <span style={{ height: "1px", width: "20mm", background: accent, opacity: 0.6 }} />
          <span className="text-[10pt]">·</span>
          <span style={{ height: "1px", width: "20mm", background: accent, opacity: 0.6 }} />
        </div>

        {fullName && (
          <div className="text-[18pt]" style={{ letterSpacing: "0.05em" }}>
            {fullName}
          </div>
        )}
        {data.lehrbeginn && (
          <div className="mt-2 text-[10pt] italic" style={{ opacity: 0.75 }}>
            Lehrbeginn · {data.lehrbeginn}
          </div>
        )}
      </div>

      <footer className="relative grid grid-cols-2 gap-6 text-[9pt]" style={{ opacity: 0.85 }}>
        {kontakt.length > 0 ? (
          <div>
            <div className="mb-1 text-[8pt] uppercase tracking-[0.3em]" style={{ color: accent }}>
              Kontakt
            </div>
            {kontakt.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
            {data.geburtsdatum && <div style={{ opacity: 0.7 }}>*{data.geburtsdatum}</div>}
          </div>
        ) : (
          <div />
        )}
        {empfaenger.length > 0 && (
          <div className="text-right">
            <div className="mb-1 text-[8pt] uppercase tracking-[0.3em]" style={{ color: accent }}>
              An
            </div>
            {empfaenger.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
