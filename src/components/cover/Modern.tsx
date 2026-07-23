import type { CoverData } from "./types";

export function Modern({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const primary = colors.primary;
  const accent = colors.accent;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email, data.geburtsdatum].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="relative flex h-full w-full flex-col"
      style={{
        backgroundColor: bg,
        color: primary,
        fontFamily:
          "'Helvetica Neue', Helvetica, Arial, ui-sans-serif, system-ui, sans-serif",
        padding: "20mm",
      }}
    >
      {/* Kopfzeile */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            style={{
              display: "inline-block",
              width: "10mm",
              height: "2mm",
              background: accent,
            }}
          />
          <span className="text-[9pt] uppercase tracking-[0.35em]">Bewerbung</span>
        </div>
        {ortDatum && (
          <div className="text-[9pt]" style={{ opacity: 0.6 }}>
            {ortDatum}
          </div>
        )}
      </header>

      {/* Zentraler Block */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {data.foto ? (
          <img
            src={data.foto}
            alt="Foto"
            className="object-cover"
            style={{
              width: "42mm",
              height: "42mm",
              borderRadius: "9999px",
              boxShadow: `0 0 0 3px ${bg}, 0 0 0 4px ${accent}`,
            }}
          />
        ) : initialen ? (
          <div
            className="flex items-center justify-center text-[22pt] font-medium"
            style={{
              width: "42mm",
              height: "42mm",
              borderRadius: "9999px",
              backgroundColor: `${accent}18`,
              color: accent,
            }}
          >
            {initialen}
          </div>
        ) : null}

        {data.beruf && (
          <div
            className="mt-10 text-[10pt] font-semibold uppercase tracking-[0.4em]"
            style={{ color: accent }}
          >
            Lehrstelle als
          </div>
        )}

        {data.beruf && (
          <div
            className="mt-4 max-w-[170mm] text-[38pt] font-bold leading-[1.05]"
            style={{ letterSpacing: "-0.02em" }}
          >
            {data.beruf}
          </div>
        )}

        {fullName && (
          <div
            className="mt-8 flex items-center gap-4 text-[13pt]"
            style={{ opacity: 0.85 }}
          >
            <span style={{ height: "1px", width: "12mm", background: primary, opacity: 0.3 }} />
            <span style={{ letterSpacing: "0.08em" }}>{fullName}</span>
            <span style={{ height: "1px", width: "12mm", background: primary, opacity: 0.3 }} />
          </div>
        )}

        {data.lehrbeginn && (
          <div
            className="mt-4 inline-block rounded-full px-4 py-1 text-[9.5pt] font-medium"
            style={{ backgroundColor: primary, color: bg }}
          >
            Lehrbeginn {data.lehrbeginn}
          </div>
        )}
      </div>

      {/* Fusszeile */}
      <footer
        className="grid grid-cols-2 gap-8 border-t pt-4 text-[9pt]"
        style={{ borderColor: `${primary}22` }}
      >
        {kontakt.length > 0 ? (
          <div>
            <div className="mb-2 text-[8pt] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
              Kontakt
            </div>
            <div className="flex flex-col gap-[2px]" style={{ opacity: 0.85 }}>
              {kontakt.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        ) : (
          <div />
        )}
        {empfaenger.length > 0 && (
          <div className="text-right">
            <div className="mb-2 text-[8pt] font-semibold uppercase tracking-[0.3em]" style={{ color: accent }}>
              Adressiert an
            </div>
            <div className="flex flex-col gap-[2px]" style={{ opacity: 0.85 }}>
              {empfaenger.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
