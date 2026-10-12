import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./dossier-native-print.css";

/** One canonical canvas, outside the UI ancestry; measurable on screen, A4 in print. */
export function DossierNativePrintRoot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.body);
  }, []);
  return target
    ? createPortal(
        <div data-dossier-native-print-root aria-hidden="true">
          {children}
        </div>,
        target,
      )
    : null;
}
