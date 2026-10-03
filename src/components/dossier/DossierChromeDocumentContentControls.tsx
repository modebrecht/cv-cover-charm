import type { DossierChromeDocumentContentSettings } from "@/lib/dossier-chrome-content";
import { dossierChromeFieldId } from "@/lib/dossier-semantic-fields";

type Props = {
  scope: "cv" | "letter";
  value?: DossierChromeDocumentContentSettings;
  defaultTitle: string;
  onChange: (value: DossierChromeDocumentContentSettings) => void;
};

function TextOption({
  fieldId,
  fieldLabel,
  label,
  enabled,
  value,
  placeholder,
  multiline = false,
  onEnabledChange,
  onValueChange,
}: {
  fieldId: string;
  fieldLabel: string;
  label: string;
  enabled: boolean;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border bg-muted/20 p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        {label}
      </label>
      {enabled ? (
        multiline ? (
          <textarea
            data-dossier-field-id={fieldId}
            aria-label={fieldLabel}
            value={value}
            maxLength={240}
            rows={2}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <input
            type="text"
            data-dossier-field-id={fieldId}
            aria-label={fieldLabel}
            value={value}
            maxLength={120}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        )
      ) : null}
    </div>
  );
}

export function DossierChromeDocumentContentControls({
  scope,
  value,
  defaultTitle,
  onChange,
}: Props) {
  const settings = value ?? {};
  const patch = (next: Partial<DossierChromeDocumentContentSettings>) =>
    onChange({ ...settings, ...next });

  return (
    <div data-dossier-document-content-controls className="mt-3 grid gap-3 border-t pt-3">
      <div>
        <div className="text-xs font-semibold">Inhalt im Header</div>
        <div className="mt-2 grid gap-2">
          <TextOption
            fieldId={dossierChromeFieldId(scope, "header", "title")}
            fieldLabel="Header: Titel"
            label="Titel anzeigen"
            enabled={settings.headerTitleEnabled === true}
            value={settings.headerTitle ?? ""}
            placeholder={defaultTitle}
            onEnabledChange={(headerTitleEnabled) => patch({ headerTitleEnabled })}
            onValueChange={(headerTitle) => patch({ headerTitle })}
          />
          <TextOption
            fieldId={dossierChromeFieldId(scope, "header", "text")}
            fieldLabel="Header: Eigener Text"
            label="Eigener Text"
            enabled={settings.headerTextEnabled === true}
            value={settings.headerText ?? ""}
            placeholder="z. B. Bewerbung als Informatiker/in EFZ"
            multiline
            onEnabledChange={(headerTextEnabled) => patch({ headerTextEnabled })}
            onValueChange={(headerText) => patch({ headerText })}
          />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold">Inhalt im Footer</div>
        <div className="mt-2 grid gap-2">
          <TextOption
            fieldId={dossierChromeFieldId(scope, "footer", "title")}
            fieldLabel="Footer: Titel"
            label="Titel anzeigen"
            enabled={settings.footerTitleEnabled === true}
            value={settings.footerTitle ?? ""}
            placeholder={defaultTitle}
            onEnabledChange={(footerTitleEnabled) => patch({ footerTitleEnabled })}
            onValueChange={(footerTitle) => patch({ footerTitle })}
          />
          <TextOption
            fieldId={dossierChromeFieldId(scope, "footer", "text")}
            fieldLabel="Footer: Eigener Text"
            label="Eigener Text"
            enabled={settings.footerTextEnabled === true}
            value={settings.footerText ?? ""}
            placeholder="z. B. Referenzen gerne auf Anfrage"
            multiline
            onEnabledChange={(footerTextEnabled) => patch({ footerTextEnabled })}
            onValueChange={(footerText) => patch({ footerText })}
          />
        </div>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Text gilt nur für dieses Dokument. Die Sync-Option synchronisiert weiterhin nur Darstellung
        und Geometrie.
      </p>
    </div>
  );
}
