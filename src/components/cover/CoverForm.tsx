import type { BlockStyle, CoverData, PdfMeta } from "./types";
import { PhotoControls } from "./PhotoControls";
import { LEHRBERUFE } from "./types";
import { readPhoto } from "@/lib/image";
import { DEFAULTS } from "@/default-config";

type Props = {
  data: CoverData;
  onChange: (patch: Partial<CoverData>) => void;
  onError?: (message: string) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function FormBewerbung({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Titelzeile">
        <input
          className={inputCls}
          value={data.kicker}
          onChange={(e) => onChange({ kicker: e.target.value })}
          placeholder={DEFAULTS.KICKER}
        />
      </Field>
      <Field label="Lehrberuf">
        <input
          className={inputCls}
          list="lehrberufe"
          value={data.beruf}
          onChange={(e) => onChange({ beruf: e.target.value })}
          placeholder="z. B. Kaufmann/-frau EFZ"
        />
        <datalist id="lehrberufe">
          {LEHRBERUFE.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      </Field>
      <Field label="Kopfzeile">
        <input
          className={inputCls}
          value={data.eyebrow}
          onChange={(e) => onChange({ eyebrow: e.target.value })}
          placeholder="Vorgabe der Vorlage"
        />
      </Field>
      <Field label="Lehrbeginn">
        <input
          className={inputCls}
          value={data.lehrbeginn}
          onChange={(e) => onChange({ lehrbeginn: e.target.value })}
          placeholder="August 2027"
        />
      </Field>
    </div>
  );
}

export function FormPerson({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname">
          <input
            className={inputCls}
            value={data.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
          />
        </Field>
        <Field label="Nachname">
          <input
            className={inputCls}
            value={data.nachname}
            onChange={(e) => onChange({ nachname: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Adresse">
        <input
          className={inputCls}
          value={data.adresse}
          onChange={(e) => onChange({ adresse: e.target.value })}
          placeholder="Musterstrasse 12"
        />
      </Field>
      <Field label="PLZ / Ort">
        <input
          className={inputCls}
          value={data.plzOrt}
          onChange={(e) => onChange({ plzOrt: e.target.value })}
          placeholder="8000 Zürich"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefon">
          <input
            className={inputCls}
            value={data.telefon}
            onChange={(e) => onChange({ telefon: e.target.value })}
            placeholder="+41 79 000 00 00"
          />
        </Field>
        <Field label="Geburtsdatum">
          <input
            className={inputCls}
            value={data.geburtsdatum}
            onChange={(e) => onChange({ geburtsdatum: e.target.value })}
            placeholder="01.01.2010"
          />
        </Field>
      </div>
      <Field label="E-Mail">
        <input
          className={inputCls}
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function FormFoto({
  data,
  onChange,
  onError,
  photoStyle,
  onPhotoStyle,
}: Props & {
  photoStyle?: BlockStyle;
  onPhotoStyle?: (patch: Partial<BlockStyle>) => void;
}) {
  const onFile = (file: File | undefined) => {
    if (!file) return;
    readPhoto(file)
      .then((foto) => onChange({ foto }))
      .catch((e: Error) => onError?.(e.message));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
          {data.foto ? "Foto ersetzen" : "Foto hochladen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {data.foto ? (
          <>
            <img src={data.foto} alt="Vorschau" className="h-10 w-10 rounded-full object-cover" />
            <button
              type="button"
              onClick={() => onChange({ foto: null })}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Entfernen
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Ohne Foto werden die Initialen angezeigt.
          </span>
        )}
      </div>
      {photoStyle && onPhotoStyle && (
        <PhotoControls style={photoStyle} onChange={onPhotoStyle} hasPhoto={!!data.foto} compact />
      )}
    </div>
  );
}

export function FormBetrieb({ data, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Firma">
        <input
          className={inputCls}
          value={data.lehrbetrieb}
          onChange={(e) => onChange({ lehrbetrieb: e.target.value })}
        />
      </Field>
      <Field label="Ansprechperson">
        <input
          className={inputCls}
          value={data.ansprechperson}
          onChange={(e) => onChange({ ansprechperson: e.target.value })}
        />
      </Field>
      <Field label="Adresse">
        <input
          className={inputCls}
          value={data.betriebAdresse}
          onChange={(e) => onChange({ betriebAdresse: e.target.value })}
          placeholder="Strasse, PLZ Ort"
        />
      </Field>
    </div>
  );
}

export function FormOrtDatum({ data, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Ort">
        <input
          className={inputCls}
          value={data.ort}
          onChange={(e) => onChange({ ort: e.target.value })}
        />
      </Field>
      <Field label="Datum">
        <input
          className={inputCls}
          value={data.datum}
          onChange={(e) => onChange({ datum: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function FormMeta({
  meta,
  auto,
  onChange,
}: {
  meta: PdfMeta;
  /** Automatisch berechnete Werte – als Platzhalter sichtbar. */
  auto: PdfMeta;
  onChange: (patch: Partial<PdfMeta>) => void;
}) {
  const rows: { key: keyof PdfMeta; label: string }[] = [
    { key: "title", label: "Titel" },
    { key: "author", label: "Autor/in" },
    { key: "subject", label: "Betreff" },
    { key: "keywords", label: "Stichwörter" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Landet als Dokumentinfo im PDF – so heisst die Datei im Mailprogramm nicht nur
        &bdquo;Titelblatt&ldquo;. Leere Felder werden automatisch gefüllt.
      </p>
      {rows.map((r) => (
        <Field key={r.key} label={r.label}>
          <input
            className={inputCls}
            value={meta[r.key]}
            onChange={(e) => onChange({ [r.key]: e.target.value })}
            placeholder={auto[r.key]}
          />
        </Field>
      ))}
    </div>
  );
}
