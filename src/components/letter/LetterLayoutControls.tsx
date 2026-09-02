import type {
  LetterAlignment,
  LetterDesign,
  LetterFooterMode,
  LetterHeaderMode,
} from "@/components/letter/types";

const buttonClass =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const selectClass =
  "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function AlignmentRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LetterAlignment;
  onChange: (value: LetterAlignment) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border p-2.5">
      <span className="text-xs font-medium">{label}</span>
      <div className="flex gap-1" role="group" aria-label={`${label} ausrichten`}>
        {(["left", "right"] as const).map((alignment) => {
          const active = value === alignment;
          const text = alignment === "left" ? "Links" : "Rechts";
          return (
            <button
              key={alignment}
              type="button"
              aria-pressed={active}
              aria-label={`${label} ${text}`}
              onClick={() => onChange(alignment)}
              className={`${buttonClass} ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LetterLayoutControls({
  design,
  onChange,
}: {
  design: LetterDesign;
  onChange: (value: Partial<LetterDesign>) => void;
}) {
  const headerMode = design.headerMode ?? "compact";
  const footerMode = design.footerMode ?? "compact";
  const contactOptions = [
    ["headerShowName", "Name", design.headerShowName !== false],
    ["headerShowAddress", "Adresse", design.headerShowAddress !== false],
    ["headerShowPhone", "Telefon", design.headerShowPhone !== false],
    ["headerShowEmail", "E-Mail", design.headerShowEmail !== false],
  ] as const;

  return (
    <div className="grid gap-2.5">
      <div className="rounded-md border p-2.5">
        <label className="block text-xs font-medium">
          Header
          <select
            data-letter-header-mode-control
            value={headerMode}
            onChange={(event) => onChange({ headerMode: event.target.value as LetterHeaderMode })}
            className={selectClass}
          >
            <option value="compact">Header-Deko kompakt</option>
            <option value="contact">Header mit Kontaktdaten</option>
            <option value="none">Kein Header</option>
          </select>
        </label>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Das Anschreiben bleibt weiss. Die Vorlage liefert nur eine kompakte Designreferenz statt
          der grossen CV-Kopfgeometrie.
        </p>

        {headerMode === "contact" ? (
          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3" data-letter-header-fields>
            {contactOptions.map(([key, label, checked]) => (
              <label key={key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onChange({ [key]: event.target.checked })}
                />
                {label} integrieren
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-md border p-2.5">
        <label className="block text-xs font-medium">
          Footer
          <select
            data-letter-footer-mode-control
            value={footerMode}
            onChange={(event) => onChange({ footerMode: event.target.value as LetterFooterMode })}
            className={selectClass}
          >
            <option value="compact">Footerband kompakt</option>
            <option value="attachments">Footerband mit Beilagen</option>
            <option value="none">Kein Footer</option>
          </select>
        </label>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Bei „mit Beilagen“ wandern die im Abschnitt Beilagen gepflegten Angaben automatisch in den
          Footer. Seine Höhe passt sich dem Inhalt an.
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Empfänger und Datum bleiben im eigentlichen Briefbereich. Die Ausrichtung kannst du
        weiterhin separat steuern.
      </p>

      {headerMode !== "contact" ? (
        <AlignmentRow
          label="Meine Kontaktdaten"
          value={design.senderAlign ?? "left"}
          onChange={(senderAlign) => onChange({ senderAlign })}
        />
      ) : null}
      <AlignmentRow
        label="Firma / Lehrbetrieb"
        value={design.recipientAlign ?? "left"}
        onChange={(recipientAlign) => onChange({ recipientAlign })}
      />
      <AlignmentRow
        label="Ort & Datum"
        value={design.dateAlign ?? "left"}
        onChange={(dateAlign) => onChange({ dateAlign })}
      />

      <div className="grid gap-2 rounded-md border p-2.5">
        <span className="text-xs font-medium">Trennlinien im Kopf</span>
        {headerMode !== "contact" ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={design.ruleAfterSender === true}
              onChange={(event) => onChange({ ruleAfterSender: event.target.checked })}
            />
            Trennlinie nach meinen Kontaktdaten
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={design.ruleAfterRecipient === true}
            onChange={(event) => onChange({ ruleAfterRecipient: event.target.checked })}
          />
          Trennlinie nach Firma / Lehrbetrieb
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={design.ruleAfterSubject === true}
            onChange={(event) => onChange({ ruleAfterSubject: event.target.checked })}
          />
          Trennlinie nach Titel / Betreff
        </label>
      </div>
    </div>
  );
}
