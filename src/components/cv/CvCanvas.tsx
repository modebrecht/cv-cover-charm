import { useMemo, type ComponentProps } from "react";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import type { CvData, CvDesign } from "./types";
import "./full-section-rules.css";

export type { CvLayoutWarning } from "./CvCanvasBase";

type BaseProps = ComponentProps<typeof BaseCvCanvas>;
type Props = Omit<BaseProps, "chromeOptions" | "chromeContact"> & {
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
};

/**
 * Section rules are one dossier-wide visual contract: when a rule is visible,
 * it fills the remaining heading row all the way to the right. Older saved CVs
 * may still contain the retired `short` value; render those as `full` instead
 * of leaking the historic 15/18 mm dash back into preview or PDF export.
 */
export function cvDesignWithFullSectionRules(design: CvDesign): CvDesign {
  if (design.headingRule === "none") return design;
  if (design.headingRule === "full") return design;
  return { ...design, headingRule: "full" };
}

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
export function CvCanvas({
  chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
  chromeContact,
  ...props
}: Props) {
  const localContact = useMemo(() => contactFromCv(props.data), [props.data]);
  const data = useMemo(() => cvBodyData(props.data, chromeOptions), [props.data, chromeOptions]);
  const design = useMemo(() => cvDesignWithFullSectionRules(props.design), [props.design]);

  return (
    <BaseCvCanvas
      {...props}
      data={data}
      design={design}
      chromeOptions={chromeOptions}
      chromeContact={chromeContact ?? localContact}
    />
  );
}
