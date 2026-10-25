/** Three unaccepted cover families. This flag never changes normal PDF/DOCX export. */
const families = ["verlauf", "neon", "freundlich"] as const;
export function isCoverFamilyDocxQaTemplate(value: unknown): value is (typeof families)[number] {
  return typeof value === "string" && families.some((family) => family === value);
}

export function coverFamilyDocxQaEnabled() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("docx-next-cover-family-qa") === "1"
  );
}
