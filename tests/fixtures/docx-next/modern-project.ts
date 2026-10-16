import { briefProjectFixture, BRIEF_PROJECT_CASES } from "./brief-project";

export const MODERN_PROJECT_CASES = [
  ...BRIEF_PROJECT_CASES,
  "badge-center",
  "badge-right",
  "badge-long",
  "contact-long",
  "contact-partial",
  "contact-unaligned",
] as const;
export function modernProjectFixture(kind: string, photo?: string) {
  const base = BRIEF_PROJECT_CASES.includes(kind as (typeof BRIEF_PROJECT_CASES)[number])
    ? (kind as (typeof BRIEF_PROJECT_CASES)[number])
    : "normal";
  const project = briefProjectFixture(base, photo);
  project.cover!.template = "modern";
  project.cover!.data.lehrbeginn = "August 2028";
  project.cover!.colors = {};
  project.cover!.layout = { modern: project.cover!.layout!.brief ?? {} };
  project.letter!.design.template = "modern";
  project.cv!.design.template = "modern";
  if (kind === "hidden") project.cover!.layout!.modern!.lehrbeginn = { hidden: true };
  if (kind === "badge-center" || kind === "badge-right") {
    project.cover!.layout!.modern!.lehrbeginn = {
      x: 25,
      y: 184,
      w: 160,
      follows: null,
      above: null,
      anchorBottom: false,
      align: kind === "badge-center" ? "center" : "right",
      color: "#ffffff",
      bg: "#204080",
      opacity: 0.8,
      padX: 6,
      padY: 2,
      bgRadius: kind === "badge-center" ? 2 : 999,
    };
  }
  if (kind === "badge-long")
    project.cover!.data.lehrbeginn = "August 2028 – Ausbildungsstart am 15. August";
  if (kind === "contact-long") {
    Object.assign(project.cv!.data.person, {
      adresse: "An der langen Schulhausstrasse 123, Haus B",
      plzOrt: "9999 Oberdorf bei der langen Flusslandschaft",
      email: "lea.sophie.mueller.meier.bewerbung@example.ch",
      geburtsort: "Solothurn",
      heimatort: "Olten und Langendorf",
      nationalitaet: "Schweiz / Deutschland",
    });
    project.cv!.design.bodyScale = 1.15;
  }
  if (kind === "contact-partial") {
    Object.assign(project.cv!.data.person, {
      adresse: "",
      telefon: "",
      geburtsdatum: "",
      nationalitaet: "Schweiz",
    });
    project.cv!.design.personalInfoColons = false;
  }
  if (kind === "contact-unaligned") project.cv!.design.personalInfoAligned = false;
  return project;
}
