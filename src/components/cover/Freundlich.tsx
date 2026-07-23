import type { CoverData } from "./types";

export function Freundlich({ data, colors }: { data: CoverData; colors: Record<string, string> }) {
  const primary = colors.primary;
  const secondary = colors.secondary;
  const ink = colors.ink;
  const bg = colors.bg;
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ");
  const kontakt = [data.adresse, data.plzOrt, data.telefon, data.email, data.geburtsdatum].filter(Boolean);
  const empfaenger = [data.lehrbetrieb, data.ansprechperson, data.betriebAdresse].filter(Boolean);
  const ortDatum = [data.ort, data.datum].filter(Boolean).join(", ");
  const initialen = [data.vorname, data.nachname].map((s) => s?.[0]).filter(Boolean).join("").toUpperCase();

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={{
        backgroundColor: bg,
        color: ink,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Farbiger Kopfbereich */}
      <div
        className="relative"
        style={{ height: "115mm", backgroundColor: primary }}
      >
        {/* organische Form */}
        <div
          className="absolute"
          style={{
            width: "160mm",
            height: "160mm",
            borderRadius: "9999px",
            backgroundColor: secondary,
            right: "-40mm",
            top: "-40mm",
            opacity: 0.9,
          }}
        />
        <div
          className="absolute"
          style={{
            width: "80mm",
            height: "80mm",
            borderRadius: "9999px",
            backgroundColor: secondary,
            left: "-25mm",
            bottom: "-25mm",
            opacity: 0.55,
          }}
        />

        <div
          className="relative flex items-start justify-between text-[9.5pt] font-medium uppercase tracking-[0.3em]"
          style={{ padding: "14mm 16mm 0", color: bg }}
        >
          <div>Bewerbung</div>
          {ortDatum && <div style={{ opacity: 0.85 }}>{ortDatum}</div>}
        </div>

        {/* Foto mittig, überlappend */}
        <div
          className="absolute left-1/2"
          style={{ bottom: "-30mm", transform: "translateX(-50%)" }}
        >
          {data.foto ? (
            <img
              src={data.foto}
              alt="Foto"
              className="object-cover"
              style={{
                width: "60mm",
                height: "60mm",
                borderRadius: "9999px",
                boxShadow: `0 0 0 6px ${bg}`,
              }}
            />
          ) : initialen ? (
            <div
              className="flex items-center justify-center text-[30pt] font-bold"
              style={{
                width: "60mm",
                height: "60mm",
                borderRadius: "9999px",
                backgroundColor: bg,
                color: primary,
                boxShadow: `0 0 0 6px ${bg}, inset 0 0 0 2px ${primary}22`,
              }}
            >
              {initialen}
            </div>
          ) : (
            <div
              style={{
                width: "60mm",
                height: "60mm",
                borderRadius: "9999px",
                backgroundColor: bg,
                boxShadow: `0 0 0 6px ${bg}`,
              }}
            />
          )}
        </div>
      </div>

      {/* Inhalt */}
      <div
        className="flex flex-1 flex-col items-center text-center"
        style={{ padding: "42mm 18mm 16mm" }}
      >
        {fullName && (
          <div
            className="text-[30pt] font-bold leading-tight"
            style={{ color: ink, letterSpacing: "-0.01em" }}
          >
            {fullName}
          </div>
        )}
        {data.beruf && (
          <div className="mt-3 text-[13pt]" style={{ color: ink, opacity: 0.85 }}>
            Bewerbung als{" "}
            <span style={{ color: primary, fontWeight: 600 }}>{data.beruf}</span>
          </div>
        )}
        {data.lehrbeginn && (
          <div
            className="mt-4 rounded-full px-5 py-1.5 text-[10pt] font-semibold"
            style={{ backgroundColor: secondary, color: ink }}
          >
            Lehrbeginn · {data.lehrbeginn}
          </div>
        )}

        <div
          className="mt-auto grid w-full grid-cols-2 gap-6 text-left text-[9.5pt]"
          style={{ color: ink }}
        >
          {kontakt.length > 0 ? (
            <div>
              <div
                className="mb-1 text-[8pt] font-semibold uppercase tracking-[0.3em]"
                style={{ color: primary }}
              >
                Kontakt
              </div>
              {kontakt.map((l, i) => (
                <div key={i} style={{ opacity: 0.85 }}>
                  {l}
                </div>
              ))}
            </div>
          ) : (
            <div />
          )}
          {empfaenger.length > 0 && (
            <div className="text-right">
              <div
                className="mb-1 text-[8pt] font-semibold uppercase tracking-[0.3em]"
                style={{ color: primary }}
              >
                An
              </div>
              {empfaenger.map((l, i) => (
                <div key={i} style={{ opacity: 0.85 }}>
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
