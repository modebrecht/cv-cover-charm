export type SaveState = "idle" | "saving" | "saved" | "error";

const COPY: Record<Exclude<SaveState, "idle">, string> = {
  saving: "Speichert…",
  saved: "Automatisch gespeichert",
  error: "Nicht automatisch gespeichert",
};

/** Gleiche, zurückhaltende Speicheranzeige für alle Teile des Dossiers. */
export function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  return (
    <span
      role="status"
      aria-live="polite"
      title={COPY[state]}
      className={`inline-flex min-w-0 items-center gap-1.5 truncate text-[10px] sm:text-xs ${
        state === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          state === "saving"
            ? "animate-pulse bg-amber-500"
            : state === "error"
              ? "bg-destructive"
              : "bg-emerald-500"
        }`}
      />
      <span className="sr-only sm:hidden">{COPY[state]}</span>
      <span className="hidden truncate sm:inline">{COPY[state]}</span>
    </span>
  );
}
