import { useState, useSyncExternalStore } from "react";
import { readPhoto } from "@/lib/image";
import { readCoverDraft } from "@/lib/dossier";
import { getCvLayout, subscribeCvLayout } from "./layout";
import { getCvPlacements, setCvPlacement, subscribeCvPlacements } from "./placement";
import {
  CV_PHOTO_SHAPES,
  getCvPhotoShape,
  setCvPhotoShape,
  subscribeCvPhotoShape,
  type CvPhotoShape,
} from "./photo";
import {
  DEFAULT_CV_PLACEMENTS,
  emptyEntry,
  emptyReferenz,
  emptySprache,
  type CvData,
  type CvEntry,
  type CvPerson,
  type CvPlacement,
  type CvPlacementKey,
  type CvReferenz,
  type CvSprache,
} from "./types";

const inputCls =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const addBtn =
  "self-start rounded-md border border-dashed border-input px-3 py-1.5 text-xs hover:bg-accent";
const delBtn = "shrink-0 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10";

/** Kompakter Zwei-Zustands-Schalter für das Modern-Layout. */
export function PlacementToggle({
  value,
  onChange,
}: {
  value: CvPlacement;
  onChange: (value: CvPlacement) => void;
}) {
  return (
    <div
      className="inline-flex shrink-0 overflow-hidden rounded-md border border-input bg-background"
      aria-label="Position im Modern-Layout"
    >
      {(["side", "main"] as const).map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`px-2.5 py-1.5 text-[11px] font-semibold transition ${
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {option === "side" ? "Side" : "Main"}
          </button>
        );
      })}
    </div>
  );
}

function BlockPlacementControl({
  block,
  label = "Position",
}: {
  block: CvPlacementKey;
  label?: string;
}) {
  const layout = useSyncExternalStore(subscribeCvLayout, getCvLayout, () => "classic");
  const placements = useSyncExternalStore(
    subscribeCvPlacements,
    getCvPlacements,
    () => DEFAULT_CV_PLACEMENTS,
  );

  if (layout !== "modern") return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <PlacementToggle value={placements[block]} onChange={(value) => setCvPlacement(block, value)} />
    </div>
  );
}

/** Rahmen um einen wiederholbaren Eintrag, mit Entfernen-Knopf. */
function Item({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background/60 p-2">
      <div className="flex flex-col gap-2">{children}</div>
      <button type="button" onClick={onRemove} className={`${delBtn} self-end`}>
        Entfernen
      </button>
    </div>
  );
}

function photoPreviewClass(shape: CvPhotoShape): string {
  if (shape === "rect") return "h-14 w-20 rounded-md";
  if (shape === "square") return "h-16 w-16 rounded-md";
  if (shape === "circle") return "h-16 w-16 rounded-full";
  return "h-20 w-16 rounded-md";
}

export function FormCvPerson({
  person,
  onChange,
}: {
  person: CvPerson;
  onChange: (p: Partial<CvPerson>) => void;
}) {
  const photoShape = useSyncExternalStore(
    subscribeCvPhotoShape,
    getCvPhotoShape,
    () => "portrait",
  );
  const [photoMessage, setPhotoMessage] = useState<{ error: boolean; text: string } | null>(null);

  const onPhotoFile = (file?: File) => {
    if (!file) return;
    readPhoto(file)
      .then((foto) => {
        onChange({ foto });
        setPhotoMessage({ error: false, text: "Foto übernommen" });
      })
      .catch((e: Error) => setPhotoMessage({ error: true, text: e.message }));
  };

  const takePhotoFromCover = () => {
    const draft = readCoverDraft();
    if (!draft?.person.foto) {
      setPhotoMessage({ error: true, text: "Im Titelblatt ist noch kein Foto gespeichert." });
      return;
    }
    onChange({ foto: draft.person.foto });
    setPhotoMessage({ error: false, text: "Foto vom Titelblatt übernommen" });
  };

  return (
    <div className="flex flex-col gap-3">
      <BlockPlacementControl block="kontakt" label="Kontaktangaben" />

      <div className="rounded-md border bg-muted/20 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
            {person.foto ? "Foto ersetzen" : "Foto hochladen"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onPhotoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={takePhotoFromCover}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-accent"
          >
            Vom Titelblatt
          </button>
          {person.foto && (
            <button
              type="button"
              onClick={() => {
                onChange({ foto: null });
                setPhotoMessage(null);
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Entfernen
            </button>
          )}
        </div>

        <div className="flex items-start gap-3">
          {person.foto ? (
            <img
              src={person.foto}
              alt="Foto-Vorschau"
              className={`${photoPreviewClass(photoShape)} shrink-0 border object-cover`}
            />
          ) : (
            <div
              className={`${photoPreviewClass(photoShape)} flex shrink-0 items-center justify-center border border-dashed bg-background text-[10px] text-muted-foreground`}
            >
              Foto
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Form
            </span>
            <div className="flex flex-wrap gap-1">
              {CV_PHOTO_SHAPES.map((shape) => {
                const active = photoShape === shape.id;
                return (
                  <button
                    key={shape.id}
                    type="button"
                    onClick={() => setCvPhotoShape(shape.id)}
                    aria-pressed={active}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background hover:bg-accent"
                    }`}
                  >
                    {shape.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Die gewählte Form bleibt beim Wechsel des CV-Layouts erhalten.
            </p>
            {photoMessage && (
              <p
                className={`mt-1.5 text-[11px] ${
                  photoMessage.error ? "text-destructive" : "text-primary"
                }`}
              >
                {photoMessage.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Vorname">
          <input
            className={inputCls}
            value={person.vorname}
            onChange={(e) => onChange({ vorname: e.target.value })}
          />
        </Field>
        <Field label="Nachname">
          <input
            className={inputCls}
            value={person.nachname}
            onChange={(e) => onChange({ nachname: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Zeile unter dem Namen">
        <input
          className={inputCls}
          placeholder="z. B. Schülerin, 3. Sekundarklasse"
          value={person.untertitel}
          onChange={(e) => onChange({ untertitel: e.target.value })}
        />
      </Field>
      <Field label="Adresse">
        <input
          className={inputCls}
          value={person.adresse}
          onChange={(e) => onChange({ adresse: e.target.value })}
        />
      </Field>
      <Field label="PLZ und Ort">
        <input
          className={inputCls}
          value={person.plzOrt}
          onChange={(e) => onChange({ plzOrt: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Telefon">
          <input
            className={inputCls}
            value={person.telefon}
            onChange={(e) => onChange({ telefon: e.target.value })}
          />
        </Field>
        <Field label="E-Mail">
          <input
            className={inputCls}
            value={person.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Geburtsdatum">
          <input
            className={inputCls}
            value={person.geburtsdatum}
            onChange={(e) => onChange({ geburtsdatum: e.target.value })}
          />
        </Field>
        <Field label="Nationalität">
          <input
            className={inputCls}
            value={person.nationalitaet}
            onChange={(e) => onChange({ nationalitaet: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

/** Schule und Praktika teilen sich denselben Aufbau. */
export function FormCvEntries({
  entries,
  onChange,
  titelLabel,
  ortLabel,
}: {
  entries: CvEntry[];
  onChange: (list: CvEntry[]) => void;
  titelLabel: string;
  ortLabel: string;
}) {
  const patch = (id: string, p: Partial<CvEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...p } : e)));
  const block: CvPlacementKey = titelLabel === "Schule / Stufe" ? "schule" : "erfahrung";

  return (
    <div className="flex flex-col gap-2">
      <BlockPlacementControl block={block} />
      {entries.map((e) => (
        <Item key={e.id} onRemove={() => onChange(entries.filter((x) => x.id !== e.id))}>
          <Field label="Zeitraum">
            <input
              className={inputCls}
              placeholder="2023 – heute"
              value={e.zeit}
              onChange={(ev) => patch(e.id, { zeit: ev.target.value })}
            />
          </Field>
          <Field label={titelLabel}>
            <input
              className={inputCls}
              value={e.titel}
              onChange={(ev) => patch(e.id, { titel: ev.target.value })}
            />
          </Field>
          <Field label={ortLabel}>
            <input
              className={inputCls}
              value={e.ort}
              onChange={(ev) => patch(e.id, { ort: ev.target.value })}
            />
          </Field>
          <Field label="Ergänzung (optional)">
            <input
              className={inputCls}
              value={e.beschreibung}
              onChange={(ev) => patch(e.id, { beschreibung: ev.target.value })}
            />
          </Field>
        </Item>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange([...entries, emptyEntry()])}>
        + Eintrag
      </button>
    </div>
  );
}

export function FormCvSprachen({
  list,
  onChange,
}: {
  list: CvSprache[];
  onChange: (l: CvSprache[]) => void;
}) {
  const patch = (id: string, p: Partial<CvSprache>) =>
    onChange(list.map((s) => (s.id === id ? { ...s, ...p } : s)));

  return (
    <div className="flex flex-col gap-2">
      <BlockPlacementControl block="sprachen" />
      {list.map((s) => (
        <div key={s.id} className="flex items-end gap-2">
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Field label="Sprache">
              <input
                className={inputCls}
                value={s.name}
                onChange={(e) => patch(s.id, { name: e.target.value })}
              />
            </Field>
            <Field label="Niveau">
              <input
                className={inputCls}
                placeholder="Muttersprache, B1 …"
                value={s.niveau}
                onChange={(e) => patch(s.id, { niveau: e.target.value })}
              />
            </Field>
          </div>
          <button
            type="button"
            className={`${delBtn} mb-1.5`}
            onClick={() => onChange(list.filter((x) => x.id !== s.id))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange([...list, emptySprache()])}>
        + Sprache
      </button>
    </div>
  );
}

/** Hobbys und Stärken sind schlichte Zeilenlisten. */
export function FormCvLines({
  list,
  onChange,
  placeholder,
  addLabel,
}: {
  list: string[];
  onChange: (l: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const block: CvPlacementKey = addLabel.includes("Hobby") ? "hobbys" : "staerken";

  return (
    <div className="flex flex-col gap-2">
      <BlockPlacementControl block={block} />
      {list.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            placeholder={placeholder}
            value={v}
            onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <button
            type="button"
            className={delBtn}
            onClick={() => onChange(list.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange([...list, ""])}>
        {addLabel}
      </button>
    </div>
  );
}

export function FormCvReferenzen({
  list,
  onChange,
}: {
  list: CvReferenz[];
  onChange: (l: CvReferenz[]) => void;
}) {
  const patch = (id: string, p: Partial<CvReferenz>) =>
    onChange(list.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <div className="flex flex-col gap-2">
      <BlockPlacementControl block="referenzen" />
      {list.map((r) => (
        <Item key={r.id} onRemove={() => onChange(list.filter((x) => x.id !== r.id))}>
          <Field label="Name">
            <input
              className={inputCls}
              value={r.name}
              onChange={(e) => patch(r.id, { name: e.target.value })}
            />
          </Field>
          <Field label="Funktion">
            <input
              className={inputCls}
              placeholder="Klassenlehrer, Schulhaus Feld"
              value={r.funktion}
              onChange={(e) => patch(r.id, { funktion: e.target.value })}
            />
          </Field>
          <Field label="Kontakt">
            <input
              className={inputCls}
              value={r.kontakt}
              onChange={(e) => patch(r.id, { kontakt: e.target.value })}
            />
          </Field>
        </Item>
      ))}
      <button type="button" className={addBtn} onClick={() => onChange([...list, emptyReferenz()])}>
        + Referenz
      </button>
    </div>
  );
}

/** Überschrift eines Abschnitts umbenennen bzw. Abschnitt ausblenden. */
export function SectionOptions({
  value,
  placeholder,
  hidden,
  onLabel,
  onHidden,
}: {
  value: string;
  placeholder: string;
  hidden: boolean;
  onLabel: (v: string) => void;
  onHidden: (v: boolean) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 border-b pb-2">
      <input
        className={`${inputCls} flex-1`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onLabel(e.target.value)}
        aria-label="Überschrift"
      />
      <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" checked={!hidden} onChange={(e) => onHidden(!e.target.checked)} />
        zeigen
      </label>
    </div>
  );
}

export const cvDataHelpers = { emptyEntry, emptySprache, emptyReferenz };
export type { CvData };
