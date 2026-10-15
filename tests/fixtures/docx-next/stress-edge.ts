import { briefChromeFixture, briefFixture, briefVariantFixture } from "./brief";
import { graphicCandidateFixture } from "./graphic-candidate";
import type { DossierAppSnapshot } from "../../../src/lib/docx-next/source";

/** Six combined cases, not a new layout engine or Sidebar investigation. */
export const STRESS_EDGE_CASES = ["brief", "cove", "neon"].flatMap((template) =>
  (["minimal", "editorial"] as const).map((layout) => ({
    id: `${template}-${layout}-combined`,
    template,
    layout,
  })),
);
export type StressEdgeCase = (typeof STRESS_EDGE_CASES)[number];

export function stressEdgeFixture(value: StressEdgeCase, photo: string): DossierAppSnapshot {
  const input = graphicCandidateFixture(value.template, "images", photo);
  const long = briefVariantFixture(`${value.layout}-long`);
  input.settings.cvLayout = value.layout;
  input.cv.data = structuredClone(long.cv.data);
  input.cv.data.person.foto = photo;
  // The generic image fixture also exercises a saved absolute photo at y=20 mm.
  // These six cases deliberately test normal body flow beside a tall contact
  // header. Absolute/free-placement acceptance belongs to its separate matrix.
  input.settings.cvPhotoPlacement = { ...input.settings.cvPhotoPlacement, mode: "right" };
  input.cv.data.schule.forEach((entry, index) => {
    entry.titel = `CVPROBE${String(index + 1).padStart(3, "0")} ${entry.titel}`;
  });
  input.letter.data.text = briefFixture("long-letter")
    .letter.data.text.split("\n\n")
    .map((paragraph, index) => `BRIEFPROBE${String(index + 1).padStart(3, "0")} ${paragraph}`)
    .join("\n\n");
  input.letter.data.richTextHtml = "";
  input.letter.data.betreff = `Kombinierter Stresstest ${value.id}`;
  input.settings.chrome = structuredClone(briefChromeFixture().settings.chrome);
  for (const scope of ["letter", "cv"] as const) {
    const label = scope === "cv" ? "CV" : "BRIEF";
    input[scope].design.chromeContent = {
      headerTitleEnabled: true,
      headerTitle: `${label}KOPF`,
      headerTextEnabled: true,
      headerText: "Eigener Dokumentkopf",
      footerTitleEnabled: true,
      footerTitle: `${label}FUSS`,
      footerTextEnabled: true,
      footerText: "Eigener Dokumentfuss",
    };
  }
  return input;
}

/** Independent source expectations: never infer missing fields from the produced model. */
export function stressEdgeExpectedFields(input: DossierAppSnapshot): Record<string, string> {
  const fields: Record<string, string> = { "letter.subject": input.letter.data.betreff };
  input.letter.data.text.split("\n").forEach((text, index) => {
    fields[`letter.body.paragraph:${index}`] = text;
  });
  for (const entry of input.cv.data.schule)
    for (const [key, text] of Object.entries({
      date: entry.zeit,
      title: entry.titel,
      place: entry.ort,
      description: entry.beschreibung,
    }))
      if (text.trim()) fields[`cv.entry.schule:${entry.id}.${key}`] = text;
  return fields;
}
