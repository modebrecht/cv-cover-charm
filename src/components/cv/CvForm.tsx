import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { readPhoto } from "@/lib/image";
import { readCoverPhoto } from "@/lib/dossier";
import {
  DEFAULT_DOSSIER_PHOTO_STYLE,
  dossierPhotoCropStyle,
  dossierPhotoRadius,
  dossierPhotoRatio,
  type DossierPhotoStyle,
} from "@/lib/dossier-photo";
import { PhotoStyleControls } from "@/components/photo/PhotoStyleControls";
import { getCvLayout, subscribeCvLayout } from "./layout";
import { getCvPlacements, setCvPlacement, subscribeCvPlacements } from "./placement";
import { getCvPhotoStyle, setCvPhotoStyle, subscribeCvPhotoStyle } from "./photo";
import {
  CV_PHOTO_MAX_MM,
  CV_PHOTO_MIN_MM,
  DEFAULT_CV_PHOTO_PLACEMENT,
  getCvPhotoPlacement,
  resetCvPhotoPlacement,
  setCvPhotoPlacement,
  subscribeCvPhotoPlacement,
} from "./photo-place";
import {
  CV_BLOCK_LABELS,
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
      <PlacementToggle
        value={placements[block]}
        onChange={(value) => setCvPlacement(block, value)}
      />
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

function photoPreviewFrame(style: DossierPhotoStyle): CSSProperties {
  const ratio = dossierPhotoRatio(style.shape);
  const width = style.shape === "rect" ? 80 : 64;
  return {
    position: "relative",
    width,
    height: width * ratio,
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: dossierPhotoRadius(style.shape),
    boxShadow:
      style.borderWidth > 0
        ? `0 0 0 ${Math.max(1, style.borderWidth * 2)}px currentColor`
        : undefined,
  };
}

const placeBtn =
  "flex-1 rounded-md border px-2 py-1 text-xs transition-colors border-input hover:bg-accent";
const placeBtnOn =
  "flex-1 rounded-md border px-2 py-1 text-xs border-primary bg-primary text-primary-foreground";

/**
 * Wo das Foto auf dem Blatt sitzt und welche Farbe sein Rahmen hat.
 *
 * Stärke und Form des Rahmens stehen bewusst weiter oben in den geteilten
 * Foto-Reglern – dieselbe Einstellung wie auf dem Titelblatt. Hier steht nur,
 * was den Lebenslauf allein betrifft.
 */
function CvPhotoPlaceControls({ borderWidth }: { borderWidth: number }) {
  const place = useSyncExternalStore(
    subscribeCvPhotoPlacement,
    getCvPhotoPlacement,
    () => DEFAULT_CV_PHOTO_PLACEMENT,
  );
  const free = place.mode === "frei";

  return (
    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Platz auf dem Blatt
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          className={free ? placeBtn : placeBtnOn}
          aria-pressed={!free}
          onClick={() => setCvPhotoPlacement({ mode: "auto" })}
        >
          Im Aufbau
        </button>
        <button
          type="button"
          className={free ? placeBtnOn : placeBtn}
          aria-pressed={free}
          onClick={() => setCvPhotoPlacement({ mode: "frei" })}
        >
          Frei platziert
        </button>
      </div>

      {free ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">
              Breite {Math.round(place.widthMm)} mm
            </span>
            <input
              type="range"
              min={CV_PHOTO_MIN_MM}
              max={CV_PHOTO_MAX_MM}
              step={1}
              value={place.widthMm}
              onChange={(e) => setCvPhotoPlacement({ widthMm: Number(e.target.value) })}
              className="w-full accent-primary"
            />
          </label>
          <p className="text-[11px] leading-snug text-muted-foreground">
            In der Vorschau lässt sich das Foto mit der Maus ziehen; am Punkt unten rechts wird es
            grösser oder kleiner. Mit den Pfeiltasten geht es millimeterweise.
          </p>
          <button
            type="button"
            className="self-start text-[11px] text-muted-foreground underline hover:text-foreground"
            onClick={resetCvPhotoPlacement}
          >
            Platz zurücksetzen
          </button>
        </>
      ) : (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Das Foto sitzt im Kopf bzw. in der Seitenspalte – je nach Aufbau.
        </p>
      )}

      {borderWidth > 0 && (
        <label className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">Rahmenfarbe</span>
          <input
            type="color"
            value={place.frameColor ?? "#000000"}
            onChange={(e) => setCvPhotoPlacement({ frameColor: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-input bg-background"
            aria-label="Rahmenfarbe"
          />
          {place.frameColor && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
              onClick={() => setCvPhotoPlacement({ frameColor: null })}
            >
              wie Vorlage
            </button>
          )}
        </label>
      )}
    </div>
  );
}

export function FormCvPerson({
  person,
  onChange,
  contactLabel,
  onContactLabel,
}: {
  person: CvPerson;
  onChange: (p: Partial<CvPerson>) => void;
  /** Eigene Überschrift über den Kontaktangaben; leer heisst „Kontakt". */
  contactLabel: string;
  onContactLabel: (value: string) => void;
}) {
  const photoStyle = useSyncExternalStore(
    subscribeCvPhotoStyle,
    getCvPhotoStyle,
    () => DEFAULT_DOSSIER_PHOTO_STYLE,
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
    const draft = readCoverPhoto();
    if (!draft) {
      setPhotoMessage({ error: true, text: "Im Titelblatt ist noch kein Foto gespeichert." });
      return;
    }
    // Persist the independent CV treatment first. The following React state
    // update can then never interrupt or roll back the one-way style copy.
    setCvPhotoStyle(draft.photoStyle);
    onChange({ foto: draft.foto });
    setPhotoMessage({ error: false, text: "Foto und Ausschnitt vom Titelblatt übernommen" });
  };

  return (
    <div className="flex flex-col gap-3">
      <BlockPlacementControl block="kontakt" label="Kontaktangaben" />

      {/* Wie bei jedem anderen Block: die Überschrift lässt sich frei benennen. */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Überschrift über den Kontaktangaben</span>
        <input
          className={inputCls}
          placeholder={CV_BLOCK_LABELS.kontakt}
          value={contactLabel}
          onChange={(e) => onContactLabel(e.target.value)}
        />
      </label>

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
          <div style={photoPreviewFrame(photoStyle)} className="border bg-background text-primary">
            {person.foto ? (
              <img
                src={person.foto}
                alt="Foto-Vorschau"
                style={dossierPhotoCropStyle(photoStyle)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                Foto
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <PhotoStyleControls
              value={photoStyle}
              onChange={setCvPhotoStyle}
              hasPhoto={!!person.foto}
              compact
            />
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
              Form, Rahmen und Ausschnitt bleiben beim Wechsel des CV-Layouts erhalten.
            </p>
            <CvPhotoPlaceControls borderWidth={photoStyle.borderWidth} />
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
