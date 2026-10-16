/** Independent cohort gate. Only the first proved prototype can be downloaded. */
export function designDocxNextUiEnabled() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-design-qa") === "1"
  );
}

/** Separate Word-editing trial; never silently replace the visually reviewed export. */
export function designNativeBadgeUiEnabled() {
  return (
    designDocxNextUiEnabled() &&
    new URLSearchParams(window.location.search).get("docx-next-badge-qa") === "1"
  );
}

/** Explicit diagnostic downloads; not an accepted interior-layout composition. */
export function designInteriorAuditUiEnabled() {
  return (
    designDocxNextUiEnabled() &&
    new URLSearchParams(window.location.search).get("docx-next-interior-qa") === "1"
  );
}
