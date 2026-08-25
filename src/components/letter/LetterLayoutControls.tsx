import type { LetterAlignment, LetterDesign } from "@/components/letter/types";

const buttonClass =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
  return (
    <div className="grid gap-2.5">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Standardmässig bleibt alles links. Einzelne Kopfbereiche kannst du bewusst nach rechts setzen.
      </p>

      <AlignmentRow
        label="Absender"
        value={design.senderAlign ?? "left"}
        onChange={(senderAlign) => onChange({ senderAlign })}
      />
      <AlignmentRow
        label="Empfänger"
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
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={design.ruleAfterSender === true}
            onChange={(event) => onChange({ ruleAfterSender: event.target.checked })}
          />
          Trennlinie nach Absender
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={design.ruleAfterRecipient === true}
            onChange={(event) => onChange({ ruleAfterRecipient: event.target.checked })}
          />
          Trennlinie nach Empfänger
        </label>
      </div>
    </div>
  );
}
