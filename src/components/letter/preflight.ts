import type { LetterData } from "./types";

export type LetterReadiness = {
  started: boolean;
  readyToSend: boolean;
  missing: string[];
};

const filled = (value: string | undefined): boolean => !!value?.trim();

/** Standard-Anrede und -Gruss allein bedeuten noch nicht, dass der Brief begonnen wurde. */
export function letterHasStarted(data: LetterData): boolean {
  return [
    data.absenderName,
    data.absenderAdresse,
    data.absenderPlzOrt,
    data.absenderTelefon,
    data.absenderEmail,
    data.empfaengerFirma,
    data.empfaengerName,
    data.empfaengerAdresse,
    data.empfaengerPlzOrt,
    data.ort,
    data.datum,
    data.betreff,
    data.text,
    data.unterschrift,
  ].some(filled);
}

/**
 * Versandbereitschaft ist absichtlich strenger als "hat Inhalt". Die Felder
 * hier sind die kleinste sinnvolle Menge für ein adressiertes Motivationsschreiben;
 * optionale Kontaktwege oder eine konkrete Ansprechperson dürfen fehlen.
 */
export function letterReadiness(data: LetterData): LetterReadiness {
  const missing: string[] = [];
  if (!filled(data.absenderName)) missing.push("Absendername");
  if (!filled(data.empfaengerFirma) && !filled(data.empfaengerName)) {
    missing.push("Lehrbetrieb oder Ansprechperson");
  }
  if (!filled(data.datum)) missing.push("Datum");
  if (!filled(data.betreff)) missing.push("Betreff");
  if (!filled(data.text)) missing.push("Brieftext");

  return {
    started: letterHasStarted(data),
    readyToSend: missing.length === 0,
    missing,
  };
}

export type LetterTextLayerMetrics = Pick<HTMLElement, "scrollHeight" | "clientHeight">;

/** Dieselbe Überlaufregel wird von Editor, Dossier-Review und PDF-Gate verwendet. */
export function letterTextLayerOverflows(layer: LetterTextLayerMetrics | null): boolean {
  return !!layer && layer.scrollHeight > layer.clientHeight + 1;
}

/** Ein PDF darf nie ohne vermessbaren Briefbereich erzeugt werden. */
export function letterPageOverflows(page: ParentNode): boolean {
  const layer = page.querySelector<HTMLElement>("[data-letter-text-layer]");
  if (!layer) {
    throw new Error("Motivationsschreiben konnte für die Layoutprüfung nicht vermessen werden");
  }
  return letterTextLayerOverflows(layer);
}
