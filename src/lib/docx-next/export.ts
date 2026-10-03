import { buildDossierDocModel, type DossierAppSnapshot } from "./build-model";
import { renderDossierDocx, type RenderOptions } from "./renderer";
/** Isolated internal entry point. Normal production export remains in dossier-docx-export. */
export async function createDossierDocxNextBlob(
  snapshot: DossierAppSnapshot,
  options: RenderOptions = {},
) {
  return renderDossierDocx(buildDossierDocModel(snapshot), options);
}
