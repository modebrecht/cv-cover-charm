import {
  DOSSIER_CONTINUATION_TOP_MM,
  DOSSIER_CONTINUATION_TOP_MIN_MM,
  DOSSIER_CONTINUATION_TOP_MAX_MM,
} from "@/lib/dossier-reading-settings";

export function ContinuationTopMarginControl({
  scope,
  value,
  defaultValue = DOSSIER_CONTINUATION_TOP_MM,
  onChange,
  onReset,
  effectiveTopMm,
  automatic = false,
}: {
  scope: "cv" | "letter";
  value: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  onReset: () => void;
  effectiveTopMm?: number;
  automatic?: boolean;
}) {
  return (
    <div className="grid gap-1 text-xs">
      <span className="flex items-center justify-between gap-2 text-muted-foreground">
        <label htmlFor={`${scope}-continuation-top`}>Oberer Rand ab Seite 2</label>
        <span>{value.toFixed(value % 1 ? 1 : 0)} mm</span>
      </span>
      <input
        id={`${scope}-continuation-top`}
        data-dossier-continuation-top-margin-control={scope}
        data-cv-continuation-top-margin-control={scope === "cv" ? true : undefined}
        data-cv-continuation-gap-control={scope === "cv" ? true : undefined}
        data-letter-continuation-top-margin-control={scope === "letter" ? true : undefined}
        type="range"
        min={DOSSIER_CONTINUATION_TOP_MIN_MM}
        max={DOSSIER_CONTINUATION_TOP_MAX_MM}
        step={0.5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
        aria-label="Oberer Rand ab Seite 2"
      />
      <span className="text-[11px] leading-relaxed text-muted-foreground">
        Abstand vom oberen Papierrand zum Inhalt ab Seite 2. Sichtbare Kopfzeilen und Vorlagenrahmen
        bleiben automatisch geschützt. Ohne eigenen Wert gilt auf allen Seiten derselbe Abstand
        unter dem Header.
      </span>
      {effectiveTopMm !== undefined && effectiveTopMm !== value ? (
        <span className="text-[11px] text-muted-foreground">
          Geschützter Inhaltsbeginn: {effectiveTopMm} mm
        </span>
      ) : null}
      <button
        type="button"
        className="justify-self-start rounded border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
        onClick={onReset}
      >
        {automatic ? "Standard aktiv: gleicher Headerabstand" : "Standard: gleicher Headerabstand"}{" "}
        ({defaultValue} mm)
      </button>
    </div>
  );
}
