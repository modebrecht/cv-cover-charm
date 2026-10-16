/** Independent cohort gate. Only the first proved prototype can be downloaded. */
export function designDocxNextUiEnabled() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-design-qa") === "1"
  );
}
