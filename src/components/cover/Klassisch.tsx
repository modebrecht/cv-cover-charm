import type { CoverData } from "./types";

export function Klassisch({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const primary = colors.primary;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email, data.geburtsdatum].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="flex h-full w-full flex-col font-serif"
      style={{ backgroundColor: bg, color: primary, padding: "14mm" }}
    >
      {empfaenger.length > 0 && (
        <div className="text-[10pt] leading-snug" style={{ opacity: 0.85 }}>
          {empfaenger.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        {data.foto ? (
          <img
            src={data.foto}
            alt="Foto"
            className="h-40 w-40 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 1px ${primary}33` }}
          />
        ) : initialen ? (
          <div
            className="flex h-40 w-40 items-center justify-center rounded-full text-4xl"
            style={{ border: `1px solid ${primary}`, color: primary }}
          >
            {initialen}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-3">
          <div className="text-[11pt] uppercase tracking-[0.4em]" style={{ opacity: 0.7 }}>
            Bewerbung
          </div>
          {data.beruf && (
            <div className="max-w-[140mm] text-[28pt] leading-tight">
              {data.beruf}
            </div>
          )}
          <div
            className="my-2 h-px w-24"
            style={{ backgroundColor: primary, opacity: 0.4 }}
          />
          {fullName && <div className="text-[16pt] italic">{fullName}</div>}
          {data.lehrbeginn && (
            <div className="text-[11pt]" style={{ opacity: 0.75 }}>
              Lehrbeginn: {data.lehrbeginn}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between text-[9.5pt]" style={{ opacity: 0.8 }}>
        {kontakt.length > 0 ? (
          <div className="flex flex-col">
            {kontakt.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : (
          <div />
        )}
        {ortDatum && <div>{ortDatum}</div>}
      </div>
    </div>
  );
}
