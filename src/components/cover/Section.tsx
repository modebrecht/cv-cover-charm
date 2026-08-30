import { useId, type ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  /** Kurzinfo rechts im Kopf, z. B. "5 / 7 ausgefüllt". */
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
};

/** Aufklappbarer Abschnitt für die Seitenleiste. */
export function Section({ title, open, onToggle, hint, action, children }: Props) {
  const id = useId();
  return (
    <section data-editor-section className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center gap-2 pr-2 sm:pr-3">
        <button
          type="button"
          data-editor-section-toggle
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/50 sm:px-4 sm:py-3"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            aria-hidden="true"
            className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          >
            <path
              d="M4 2.5l4 3.5-4 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
            {title}
          </span>
          {hint && (
            <span className="ml-auto shrink-0 text-[11px] font-normal normal-case text-muted-foreground/70 sm:text-xs">
              {hint}
            </span>
          )}
        </button>
        {action}
      </div>
      {open && (
        <div id={id} className="border-t px-3 py-3 sm:px-4 sm:py-4">
          {children}
        </div>
      )}
    </section>
  );
}
