import { briefFixture } from "./brief";
import type { DossierProject } from "../../../src/lib/dossier-project";
import type { StyleOverrides } from "../../../src/components/cover/layouts";
import { DEFAULTS } from "../../../src/default-config";
import { DEFAULT_COVER_BEILAGEN } from "../../../src/components/cover/types";

export const BRIEF_PROJECT_CASES = [
  "normal",
  "scaled",
  "long",
  "moved",
  "photo-portrait",
  "photo-circle",
  "hidden",
] as const;

/** Real saved-project shape, not a prebuilt model or a fabricated metric packet. */
export function briefProjectFixture(
  kind: (typeof BRIEF_PROJECT_CASES)[number],
  photo?: string,
): DossierProject {
  const input = briefFixture();
  const data = structuredClone(input.cover.data);
  // Match the editor's persisted prefill contract. Opening a project must not
  // create new text between the export capture and the Web reference.
  data.kicker = DEFAULTS.KICKER;
  data.showBetriebOnCover = false;
  data.showBeilagenOnCover = true;
  data.beilagen = [...DEFAULT_COVER_BEILAGEN];
  const layout: StyleOverrides = {};
  if (kind === "long") {
    data.beruf = "Fachmann/-frau Betreuung EFZ";
    data.vorname = "Lea Sophie";
    data.nachname = "Müller-Meier";
    data.adresse = "Längere Beispielstrasse 123";
    data.plzOrt = "8000 Zürich";
  }
  if (kind === "moved") {
    layout.ortDatum = {
      x: 105,
      y: 28,
      w: 85,
      above: null,
      follows: null,
      anchorBottom: false,
      align: "right",
      weight: 700,
      tracking: 0.02,
      uppercase: false,
      lineHeight: 1.5,
      opacity: 0.8,
    };
    layout.name = { hidden: true };
  }
  if (kind.startsWith("photo")) {
    if (!photo) throw new Error("Photo fixture requires an actual browser-decodable image");
    data.foto = photo;
    layout.foto = {
      x: 125,
      y: 45,
      w: 40,
      ratio: kind === "photo-circle" ? 1 : 1.5,
      radius: kind === "photo-circle" ? 999 : 0,
      imgZoom: 1.3,
      imgX: 30,
      imgY: 65,
      borderWidth: 0.6,
      borderColor: "ink",
    };
  }
  if (kind === "hidden") {
    data.showBeilagenOnCover = false;
    layout.foto = { hidden: true };
  }
  return {
    kind: "cv-cover-charm-dossier",
    version: 1,
    savedAt: "2026-10-16T06:00:00.000Z",
    cover: {
      version: 9,
      template: "brief",
      data,
      colors: { brief: input.cover.colors },
      layout: { brief: layout },
      fontScale: kind === "scaled" ? 1.15 : 1,
    },
    letter: input.letter,
    cv: input.cv,
  };
}
