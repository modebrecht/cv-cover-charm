import { useMemo, useSyncExternalStore, type ComponentProps } from "react";
import { DossierChromeContactOverrideProvider } from "@/components/dossier/DossierHeaderFooterChrome";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  getDossierChromeState,
  subscribeDossierChrome,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import type { CvData } from "./types";

export type { CvLayoutWarning } from "./CvCanvasBase";

type Props = ComponentProps<typeof BaseCvCanvas>;

function contactFromCv(data: CvData): DossierChromeContact {
  const person = data.person;
  return {
    name: [person.vorname, person.nachname].filter(Boolean).join(" "),
    address: person.adresse ?? "",
    place: person.plzOrt ?? "",
    phone: person.telefon ?? "",
    email: person.email ?? "",
  };
}

/**
 * Der gemeinsame Contact-Header besitzt die ausgewählten Identitätsfelder.
 * Für den historischen CV-Renderer werden genau diese Felder ausgeblendet,
 * damit sie nicht direkt darunter ein zweites Mal erscheinen. Nicht integrierte
 * Felder sowie Geburtsdatum/Nationalität bleiben unverändert im CV-Inhalt.
 */
function cvBodyData(data: CvData, options: DossierChromeOptions): CvData {
  if (options.headerMode !== "contact") return data;

  const person = data.person;
  const hasName = !!(person.vorname?.trim() || person.nachname?.trim());
  return {
    ...data,
    person: {
      ...person,
      ...(options.headerShowName && hasName ? { vorname: "\u200b", nachname: "" } : {}),
      ...(options.headerShowAddress ? { adresse: "", plzOrt: "" } : {}),
      ...(options.headerShowPhone ? { telefon: "" } : {}),
      ...(options.headerShowEmail ? { email: "" } : {}),
    },
  };
}

/**
 * Adapter um den bestehenden CV-Satz: die echte Person bleibt für den
 * gemeinsamen Header erhalten, während der Body nur die nicht integrierten
 * Kontaktfelder erhält. So bleibt der Eingabe-State unverändert.
 */
export function CvCanvas(props: Props) {
  const state = useSyncExternalStore(
    subscribeDossierChrome,
    getDossierChromeState,
    () => DEFAULT_DOSSIER_CHROME_STATE,
  );
  const options = state.sync ? state.shared : state.cv;
  const contact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, options), [props.data, options]);

  return (
    <DossierChromeContactOverrideProvider contact={contact}>
      <BaseCvCanvas {...props} data={data} />
    </DossierChromeContactOverrideProvider>
  );
}
