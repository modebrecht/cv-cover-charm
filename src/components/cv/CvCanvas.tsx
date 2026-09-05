import { useMemo, type ComponentProps } from "react";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import type { CvData } from "./types";

export type { CvLayoutWarning } from "./CvCanvasBase";

type BaseProps = ComponentProps<typeof BaseCvCanvas>;
type Props = Omit<BaseProps, "chromeOptions" | "chromeContact"> & {
  chromeOptions?: DossierChromeOptions;
};

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

/** Pure snapshot adapter: no dossier-chrome store reads happen below the route/editor boundary. */
export function CvCanvas({ chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS, ...props }: Props) {
  const contact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, chromeOptions), [props.data, chromeOptions]);

  return (
    <BaseCvCanvas {...props} data={data} chromeOptions={chromeOptions} chromeContact={contact} />
  );
}
