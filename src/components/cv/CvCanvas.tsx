import { useMemo, type ComponentProps, type CSSProperties } from "react";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { cvContentBox, cvFrameFor } from "./archetype";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import type { CvData, CvDesign } from "./types";
import "@/components/dossier/edel-stationery.css";
import "./full-section-rules.css";
import "./fresh-modern-sidebar-geometry.css";
import "./default-pagination-density.css";
import "./user-typography.css";

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
  const modernBox = cvContentBox(
    cvFrameFor(design.template),
    0,
    "modern",
    design.sidebarPct,
    chromeOptions,
  );
  const geometryStyle = {
    display: "contents",
    "--cv-modern-main-left": `${modernBox.left}mm`,
    "--cv-modern-main-right": `${modernBox.right}mm`,
  } as CSSProperties;

  return (
    <div style={geometryStyle}>
      <BaseCvCanvas
        {...props}
        data={data}
        design={design}
        chromeOptions={chromeOptions}
        chromeContact={chromeContact ?? localContact}
      />
    </div>
  );
}
