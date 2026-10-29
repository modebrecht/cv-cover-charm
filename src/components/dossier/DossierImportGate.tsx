import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  getDossierImportStatus,
  getServerDossierImportStatus,
  recoverDossierImport,
  subscribeDossierImportStatus,
} from "@/lib/dossier-import";

export function DossierImportGate({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(
    subscribeDossierImportStatus,
    getDossierImportStatus,
    getServerDossierImportStatus,
  );
  useEffect(() => {
    void recoverDossierImport().catch(() => {});
  }, []);
  if (state.phase === "idle")
    return (
      <>
        {state.error ? (
          <p role="alert" className="border-b bg-background p-4 text-sm">
            {state.error}
          </p>
        ) : null}
        {children}
      </>
    );
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-lg space-y-4" role={state.phase === "blocked" ? "alert" : "status"}>
        <p>
          {state.error ??
            (state.phase === "busy"
              ? "Dossier wird sicher geladen…"
              : "Gespeichertes Dossier wird vorbereitet…")}
        </p>
        {state.phase === "blocked" ? (
          <button
            type="button"
            className="rounded-md border px-4 py-2"
            onClick={() => {
              void recoverDossierImport().catch(() => {});
            }}
          >
            Wiederherstellung erneut versuchen
          </button>
        ) : null}
      </div>
    </main>
  );
}
