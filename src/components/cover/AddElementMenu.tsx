import { useEffect, useRef, useState } from "react";
import type { ShapeKind } from "./types";
import { SHAPE_LABEL } from "./new-element";

const ICON: Record<ShapeKind, string> = { circle: "○", rect: "▭", line: "—", path: "✎" };

type Props = {
  onText: () => void;
  onPill: () => void;
  onImage: () => void;
  onRule: () => void;
  onShape: (shape: ShapeKind) => void;
};

/**
 * „+ Element" unter dem Blatt – dieselbe Auswahl auf Titelblatt und Lebenslauf.
 *
 * Der Aufklapper schliesst beim Klick daneben und mit Esc; das musste man sonst
 * über den Knopf selbst wieder loswerden.
 */
export function AddElementMenu({ onText, onPill, onImage, onRule, onShape }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent";
  const pick = (run: () => void) => () => {
    setOpen(false);
    run();
  };

  return (
    <div className="relative ml-auto" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent"
      >
        + Element
        <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true">
          <path
            d="M3 4.5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-52 overflow-hidden rounded-md border bg-popover shadow-lg">
          <button type="button" onClick={pick(onText)} className={item}>
            <span className="w-4 text-center">T</span> Textfeld
          </button>
          <button type="button" onClick={pick(onPill)} className={`${item} border-t`}>
            <span className="w-4 text-center" aria-hidden>
              ⬭
            </span>
            Pille (Text)
          </button>
          <button type="button" onClick={pick(onImage)} className={`${item} border-t`}>
            <span className="w-4 text-center" aria-hidden>
              ▣
            </span>
            Bild
            <span className="ml-auto text-xs text-muted-foreground">mehrfach</span>
          </button>
          <button type="button" onClick={pick(onRule)} className={`${item} border-t`}>
            <span className="w-4 text-center" aria-hidden>
              ═
            </span>
            Trennlinie
            <span className="ml-auto text-xs text-muted-foreground">HR</span>
          </button>
          {(["circle", "rect", "line", "path"] as const).map((sh) => (
            <button
              key={sh}
              type="button"
              onClick={pick(() => onShape(sh))}
              className={`${item} border-t`}
            >
              <span className="w-4 text-center" aria-hidden>
                {ICON[sh]}
              </span>
              {SHAPE_LABEL[sh]}
              {sh === "path" && (
                <span className="ml-auto text-xs text-muted-foreground">zeichnen</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
