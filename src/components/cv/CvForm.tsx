import { type ComponentProps } from "react";
import { DossierChromeControls } from "@/components/dossier/DossierChromeControls";
import { FormCvPerson as BaseFormCvPerson } from "./CvFormBase";

export {
  PlacementToggle,
  FormCvEntries,
  FormCvSprachen,
  FormCvLines,
  FormCvReferenzen,
  SectionLayoutControls,
  SectionOptions,
} from "./CvFormBase";

/**
 * Persönliche Angaben bleiben der natürliche Ort für die gemeinsamen
 * Dossier-Kopf-/Fussoptionen. CV und Motivationsschreiben rendern damit exakt
 * dieselbe Control-Komponente statt zwei ähnlich aussehender Varianten.
 */
export function FormCvPerson(props: ComponentProps<typeof BaseFormCvPerson>) {
  return (
    <div className="flex flex-col gap-3">
      <DossierChromeControls scope="cv" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Header und Footer stellst du hier gemeinsam für Lebenslauf und Motivationsschreiben ein.
      </p>
      <BaseFormCvPerson {...props} />
    </div>
  );
}
