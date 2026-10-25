import type { PortableDossierFieldTypographyState } from "@/lib/dossier-field-typography";
import { isSemanticDossierFieldId } from "@/lib/dossier-semantic-fields";
import type { TextStyle } from "./model";

/** Bind saved identities only. Visible text/labels/occurrences never select a target.
 * Anonymous records require an explicit source-key -> canonical-ID binding.
 * Conflicting records block instead of silently overwriting one user's formatting.
 */
export function bindSavedTypography(
  typography: PortableDossierFieldTypographyState,
  bindings: Record<string, string> = {},
) {
  const fieldStyles: Record<string, Partial<TextStyle>> = {};
  const unresolvedTypography: string[] = [];
  for (const scope of ["cv", "letter"] as const) {
    for (const [key, entry] of Object.entries(typography[scope])) {
      const sourceId = entry.fieldId ?? key;
      const canonical = isSemanticDossierFieldId(scope, sourceId);
      const semanticId = canonical ? sourceId : bindings[sourceId];
      if (!semanticId || !isSemanticDossierFieldId(scope, semanticId)) {
        unresolvedTypography.push(sourceId);
        continue;
      }
      const existing = fieldStyles[semanticId];
      if (
        existing &&
        Object.entries(entry.style).some(
          ([key, value]) => key in existing && existing[key as keyof TextStyle] !== value,
        )
      )
        throw new Error(`DOCX Next conflicting typography bindings for ${semanticId}`);
      fieldStyles[semanticId] = { ...existing, ...entry.style };
    }
  }
  return { fieldStyles, unresolvedTypography };
}
