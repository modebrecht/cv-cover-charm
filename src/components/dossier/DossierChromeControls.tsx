import { useSyncExternalStore } from "react";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeOptions,
  getDossierChromeState,
  patchDossierChrome,
  setDossierChromeSync,
  subscribeDossierChrome,
  type DossierChromeScope,
  type DossierFooterMode,
  type DossierHeaderMode,
} from "@/lib/dossier-chrome";

const selectClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

export function DossierChromeControls({ scope }: { scope: DossierChromeScope }) {
  const state = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const options = state.sync ? state.shared : state[scope];
  const other = scope === "cv" ? "Motivationsschreiben" : "Lebenslauf";
  const thisDocument = scope === "cv" ? "Lebenslauf" : "Motivationsschreiben";
  const contactOptions = [
    ["headerShowName", "Name", options.headerShowName],
    ["headerShowAddress", "Adresse", options.headerShowAddress],
    ["headerShowPhone", "Telefon", options.headerShowPhone],
    ["headerShowEmail", "E-Mail", options.headerShowEmail],
  ] as const;

  // Keeps the direct getter exercised by the UI contract and makes accidental
  // divergence between state and the public scope selector immediately visible.
  const selected = getDossierChromeOptions(scope);
  // The shared model calls the rich footer "details". The letter UI historically
  // exposed the same behavior as "attachments"; keeping that form value avoids
  // breaking persisted browser automation and makes the migration additive.
  const footerControlValue =
    scope === "letter" && selected.footerMode === "details" ? "attachments" : selected.footerMode;

  return (
    <section
      data-dossier-chrome-controls={scope}
      className="rounded-lg border bg-background p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <input
          id={`dossier-chrome-sync-${scope}`}
          data-dossier-chrome-sync
          type="checkbox"
          className="mt-0.5"
          checked={state.sync}
          onChange={(event) => setDossierChromeSync(scope, event.target.checked)}
        />
        <label htmlFor={`dossier-chrome-sync-${scope}`} className="min-w-0 text-xs">
          <span className="block font-semibold">Header &amp; Footer synchron halten</span>
          <span className="mt-0.5 block leading-relaxed text-muted-foreground">
            {state.sync
              ? `Änderungen gelten gleichzeitig für ${thisDocument} und ${other}.`
              : `Nur ${thisDocument} wird geändert.`}
          </span>
        </label>
      </div>

      <div className="mt-3 grid gap-3 border-t pt-3">
        <div>
          <label className="block text-xs font-medium">
            Header
            <select
              data-dossier-header-mode-control
              {...(scope === "letter" ? { "data-letter-header-mode-control": "" } : {})}
              {...(scope === "cv" ? { "data-cv-header-mode-control": "" } : {})}
              value={selected.headerMode}
              onChange={(event) =>
                patchDossierChrome(scope, { headerMode: event.target.value as DossierHeaderMode })
              }
              className={selectClass}
            >
              <option value="compact">Header kompakt</option>
              <option value="contact">Header mit Kontaktdaten</option>
              <option value="none">Kein Header</option>
            </select>
          </label>

          {selected.headerMode === "contact" ? (
            <div
              data-dossier-header-fields
              className="mt-2 grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2.5"
            >
              {contactOptions.map(([key, label, checked]) => (
                <label key={key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => patchDossierChrome(scope, { [key]: event.target.checked })}
                  />
                  {label} integrieren
                </label>
              ))}
            </div>
          ) : null}
        </div>

        <label className="block text-xs font-medium">
          Footer
          <select
            data-dossier-footer-mode-control
            {...(scope === "letter" ? { "data-letter-footer-mode-control": "" } : {})}
            {...(scope === "cv" ? { "data-cv-footer-mode-control": "" } : {})}
            value={footerControlValue}
            onChange={(event) => {
              const value = event.target.value;
              patchDossierChrome(scope, {
                footerMode: (value === "attachments" ? "details" : value) as DossierFooterMode,
              });
            }}
            className={selectClass}
          >
            <option value="compact">Footerband kompakt</option>
            <option value={scope === "letter" ? "attachments" : "details"}>
              Footerband mit Details
            </option>
            <option value="none">Kein Footer</option>
          </select>
          <span className="mt-1.5 block text-[11px] leading-relaxed text-muted-foreground">
            Mit Details zeigt das Motivationsschreiben die Beilagen; im Lebenslauf stehen Name und
            Seitenzahl im Footer.
          </span>
        </label>
      </div>
    </section>
  );
}
