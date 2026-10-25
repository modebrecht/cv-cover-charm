import { useEffect, useRef, useState, type RefObject } from "react";
import { printDossierNative } from "@/lib/dossier-native-print";

export function useDossierNativePrint(canvasRef: RefObject<HTMLDivElement | null>) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const print = async () => {
    if (controllerRef.current) return;
    const root = canvasRef.current;
    if (!root) {
      setError("Die Druckansicht ist noch nicht montiert.");
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setPrinting(true);
    try {
      await printDossierNative(root, controller.signal);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error ? cause.message : "Der Druckdialog konnte nicht geöffnet werden.",
        );
    } finally {
      controllerRef.current = null;
      if (!controller.signal.aborted) setPrinting(false);
    }
  };
  return { print, printing, error };
}
