import type { CoverData } from "./types";

export function Modern({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const primary = colors.primary;
  const secondary = colors.secondary;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email, data.geburtsdatum].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="relative flex h-full w-full font-sans"
      style={{ backgroundColor: bg, color: secondary }}
    >
      <div style={{ width: "10mm", backgroundColor: primary }} />
      <div className="flex flex-1 flex-col" style={{ padding: "16mm 16mm 16mm 12mm" }}>
        <div className="flex items-start justify-between text-[9.5pt]" style={{ color: secondary, opacity: 0.7 }}>
          <div className="uppercase tracking-[0.3em]" style={{ color: primary }}>
            Bewerbungsdossier
          </div>
          {ortDatum && <div>{ortDatum}</div>}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          {data.foto ? (
            <img
              src={data.foto}
              alt="Foto"
              className="h-44 w-44 object-cover"
              style={{ borderRadius: "18px" }}
            />
          ) : initialen ? (
            <div
              className="flex h-44 w-44 items-center justify-center text-5xl font-light"
              style={{ borderRadius: "18px", backgroundColor: `${primary}18`, color: primary }}
            >
              {initialen}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3">
            {data.beruf && (
              <div className="text-[13pt] font-semibold uppercase tracking-[0.25em]" style={{ color: primary }}>
                {data.beruf}
              </div>
            )}
            {fullName && (
              <div className="text-[34pt] font-light leading-tight">{fullName}</div>
            )}
            {data.lehrbeginn && (
              <div className="text-[11pt]" style={{ opacity: 0.75 }}>
                Lehrbeginn · {data.lehrbeginn}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-end justify-between gap-8 text-[9.5pt]">
          {kontakt.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="mb-1 text-[8pt] uppercase tracking-[0.25em]" style={{ color: primary }}>
                Kontakt
              </div>
              {kontakt.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
          {empfaenger.length > 0 && (
            <div className="flex flex-col gap-0.5 text-right">
              <div className="mb-1 text-[8pt] uppercase tracking-[0.25em]" style={{ color: primary }}>
                An
              </div>
              {empfaenger.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
