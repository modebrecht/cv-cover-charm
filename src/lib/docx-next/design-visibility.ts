/** Independent cohort gate. Only the first proved prototype can be downloaded. */
export function designDocxNextUiEnabled() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-design-qa") === "1"
  );
}

/** User Word feedback rejected this trial. Keep recognizing old URLs so they
 * show an explicit rejection instead of silently downloading another layout. */
export function designNativeBadgeUiEnabled() {
  return (
    designDocxNextUiEnabled() &&
    new URLSearchParams(window.location.search).get("docx-next-badge-qa") === "1"
  );
}

export const NATIVE_BADGE_WORD_REJECTION =
  "Die Pillen-Gruppierung ist gesperrt: Microsoft Word zeigt den Text unvollständig. Bitte den Modern-Testexport ohne Gruppierung verwenden.";

/** Explicit diagnostic downloads; not an accepted interior-layout composition. */
export function designInteriorAuditUiEnabled() {
  return (
    designDocxNextUiEnabled() &&
    new URLSearchParams(window.location.search).get("docx-next-interior-qa") === "1"
  );
}

/** One normal Modern CV proof after Word rejected the original line-anchor trial. */
export function designRubricSpacingUiEnabled() {
  return (
    designInteriorAuditUiEnabled() &&
    new URLSearchParams(window.location.search).get("docx-next-rubric-spacing-qa") === "1"
  );
}

export const RUBRIC_ANCHOR_WORD_REJECTION =
  "Rubrik-Pills sind in diesem Test gesperrt: Microsoft Word verschiebt Rubrik-Hintergründe. Bitte den getrennten Rubrik-Abstandstest verwenden.";
