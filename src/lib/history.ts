import { HISTORY } from "@/default-config";

/**
 * Frühere Stände des Entwurfs im Browser-Speicher.
 *
 * Der laufende Entwurf liegt unter seinem eigenen Schlüssel und behält seine
 * Bilder. Hier landen Kopien davon – ohne Bilder, damit viele Stände in den
 * knappen Speicher passen. Nichts hier überschreibt den laufenden Entwurf; die
 * Historie wächst nur und wirft erst am Limit den ältesten Stand weg.
 */

const HISTORY_KEY = "titelblatt:history";

export type Snapshot = {
  id: string;
  /** Zeitpunkt in ms seit 1970. */
  at: number;
  /** Kurzbeschreibung, z. B. "Vor dem Leeren" oder der Name im Formular. */
  label: string;
  /** Derselbe Aufbau wie der laufende Entwurf, nur ohne Bilddaten. */
  payload: Record<string, unknown>;
};

/** Bilder aus einem Entwurf entfernen – sie sprengen sonst den Speicher. */
function stripImages(payload: Record<string, unknown>): Record<string, unknown> {
  const data = payload.data as Record<string, unknown> | undefined;
  const customs = payload.customs as Record<string, unknown>[] | undefined;
  return {
    ...payload,
    ...(data ? { data: { ...data, foto: null } } : {}),
    // Das Element bleibt erhalten, nur das Bild daran nicht.
    ...(Array.isArray(customs)
      ? { customs: customs.map((c) => (c.src ? { ...c, src: null } : c)) }
      : {}),
  };
}

export function readHistory(): Snapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (s): s is Snapshot => !!s && typeof s === "object" && typeof s.at === "number" && !!s.payload,
    );
  } catch {
    return [];
  }
}

function write(list: Snapshot[]): Snapshot[] {
  let keep = list.slice(0, HISTORY.MAX);
  // Bei vollem Speicher lieber ältere Stände opfern als gar nichts sichern.
  for (;;) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(keep));
      return keep;
    } catch {
      if (keep.length <= 1) return readHistory();
      keep = keep.slice(0, Math.floor(keep.length / 2));
    }
  }
}

/**
 * Stand sichern. Gibt die neue Liste zurück – oder die unveränderte, wenn es
 * nichts Neues zu sichern gab.
 *
 * `force` übergeht die Wartezeit: vor dem Leeren oder Zurücksetzen soll der
 * bisherige Stand auf jeden Fall erhalten bleiben, auch wenn eben erst einer
 * entstanden ist.
 */
export function pushSnapshot(
  payload: Record<string, unknown>,
  label: string,
  force = false,
): Snapshot[] {
  const list = readHistory();
  const stripped = stripImages(payload);
  const body = JSON.stringify(stripped);

  const last = list[0];
  // Unverändert? Dann kein zweiter Eintrag mit demselben Inhalt.
  if (last && JSON.stringify(last.payload) === body) return list;
  if (!force && last && Date.now() - last.at < HISTORY.MIN_GAP_MS) return list;

  const snap: Snapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    label,
    payload: stripped,
  };
  return write([snap, ...list]);
}

/** Sprechender Name für einen Stand: der eingetragene Name, sonst die Vorlage. */
export function describe(payload: Record<string, unknown>): string {
  const data = payload.data as Record<string, string> | undefined;
  const name = [data?.vorname, data?.nachname].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (data?.beruf) return data.beruf;
  return "Ohne Namen";
}

/** Zeitpunkt kurz und lesbar: "heute 14:05" bzw. "14.03. 09:12". */
export function formatWhen(at: number): string {
  const d = new Date(at);
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const today = new Date();
  const sameDay =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (sameDay) return `heute ${time}`;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}. ${time}`;
}

/** Trägt ein Stand überhaupt Inhalt? Leere Stände sind zum Zurückholen nutzlos. */
export function hasContent(payload: Record<string, unknown>): boolean {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return false;
  const ignore = new Set(["meta", "datum", "ort", "kicker", "foto"]);
  return Object.entries(data).some(
    ([k, v]) => !ignore.has(k) && typeof v === "string" && v.trim() !== "",
  );
}
