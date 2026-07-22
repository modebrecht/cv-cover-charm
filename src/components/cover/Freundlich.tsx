import type { CoverData } from "./types";

export function Freundlich({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const primary = colors.primary;
  const secondary = colors.secondary;
  const accent = colors.accent;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email, data.geburtsdatum].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden font-sans"
      style={{ backgroundColor: bg, color: accent, padding: "14mm" }}
    >
      {/* Deko-Formen */}
      <div
        className="absolute"
        style={{
          width: "120mm",
          height: "120mm",
          borderRadius: "9999px",
          backgroundColor: secondary,
          top: "40mm",
          left: "50%",
          transform: "translateX(-50%)",
          opacity: 0.55,
        }}
      />
      <div
        className="absolute"
        style={{
          width: "90mm",
          height: "90mm",
          borderRadius: "9999px",
          backgroundColor: primary,
          top: "55mm",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      <div className="relative flex items-start justify-between text-[9.5pt]" style={{ color: accent, opacity: 0.85 }}>
        <div className="font-semibold uppercase tracking-[0.3em]">Bewerbung</div>
        {ortDatum && <div>{ortDatum}</div>}
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div style={{ marginTop: "10mm" }}>
          {data.foto ? (
            <img
              src={data.foto}
              alt="Foto"
              className="h-48 w-48 rounded-full object-cover"
              style={{ boxShadow: `0 0 0 6px ${bg}` }}
            />
          ) : initialen ? (
            <div
              className="flex h-48 w-48 items-center justify-center rounded-full text-5xl font-bold"
              style={{ backgroundColor: bg, color: accent, boxShadow: `0 0 0 6px ${bg}` }}
            >
              {initialen}
            </div>
          ) : null}
        </div>

        <div className="relative flex flex-col items-center gap-2" style={{ marginTop: "4mm" }}>
          {fullName && (
            <div className="text-[32pt] font-bold leading-tight" style={{ color: accent }}>
              {fullName}
            </div>
          )}
          {data.beruf && (
            <div className="text-[15pt]" style={{ color: accent }}>
              Bewerbung als <span className="font-semibold">{data.beruf}</span>
            </div>
          )}
          {data.lehrbeginn && (
            <div
              className="mt-2 rounded-full px-4 py-1 text-[10pt] font-semibold"
              style={{ backgroundColor: accent, color: bg }}
            >
              Lehrbeginn {data.lehrbeginn}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-8 text-[9.5pt]" style={{ color: accent }}>
        {kontakt.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {kontakt.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        {empfaenger.length > 0 && (
          <div className="flex flex-col gap-0.5 text-right">
            {empfaenger.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
