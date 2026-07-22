import type { CoverData } from "./types";
import { LEHRBERUFE } from "./types";

type Props = {
  data: CoverData;
  onChange: (patch: Partial<CoverData>) => void;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function CoverForm({ data, onChange }: Props) {
  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ foto: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Bewerbung
        </h3>
        <Field label="Bewerbung als">
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
        <Field label="Lehrbeginn">
          <input
            className={inputCls}
            value={data.lehrbeginn}
            onChange={(e) => onChange({ lehrbeginn: e.target.value })}
            placeholder="August 2027"
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Persönliche Daten
        </h3>
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
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Foto (optional)
        </h3>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
            {data.foto ? "Foto ersetzen" : "Foto hochladen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {data.foto && (
            <>
              <img
                src={data.foto}
                alt="Vorschau"
                className="h-10 w-10 rounded-full object-cover"
              />
              <button
                type="button"
                onClick={() => onChange({ foto: null })}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Entfernen
              </button>
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Lehrbetrieb
        </h3>
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
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Ort & Datum
        </h3>
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
      </section>
    </div>
  );
}
