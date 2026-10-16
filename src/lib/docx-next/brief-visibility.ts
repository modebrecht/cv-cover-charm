/** Explicit QA opt-in; never selects or replaces the ordinary DOCX export. */
export function briefDocxNextUiEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-brief-qa") === "1"
  );
}
