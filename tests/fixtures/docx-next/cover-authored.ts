import { briefFixture } from "./brief";
import { withUserStyleKeys } from "../../../src/components/cover/user-style-precedence";
export const AUTHORED_COVER_CASES = [
  "normal",
  "moved",
  "long",
  "scaled",
  "photo-portrait",
  "photo-circle",
  "hidden",
] as const;
export function authoredCoverFixture(
  kind: (typeof AUTHORED_COVER_CASES)[number] = "normal",
  photo?: string,
) {
  const input = briefFixture();
  const b = (id: string) => input.cover.blocks.find((b) => b.id === id)!;
  if (kind === "moved") {
    const patch = {
      x: 105,
      y: 28,
      w: 85,
      above: null,
      follows: null,
      anchorBottom: false,
      align: "right" as const,
      weight: 700,
      tracking: 0.02,
      uppercase: false,
      lineHeight: 1.5,
      opacity: 0.8,
    };
    input.cover.blocks = input.cover.blocks.map((block) =>
      block.id === "ortDatum"
        ? withUserStyleKeys({ ...block, style: { ...block.style, ...patch } }, patch)
        : block,
    );
    b("name").style.hidden = true;
  }
  if (kind === "long") {
    b("beruf").lines = ["Fachmann/-frau Betreuung EFZ"];
    b("name").lines = ["Lea Sophie Müller-Meier"];
    b("kontakt").lines = [
      "Längere Beispielstrasse 123",
      "8000 Zürich",
      "079 123 45 67",
      "lea.mueller@example.ch",
      "14.03.2010",
    ];
    input.cover.data.beruf = "Fachmann/-frau Betreuung EFZ";
    input.cover.data.vorname = "Lea Sophie";
    input.cover.data.nachname = "Müller-Meier";
  }
  if (kind === "scaled") input.cover.fontScale = 1.15;
  if (kind.startsWith("photo")) {
    input.cover.data.foto = photo ?? "synthetic-photo";
    Object.assign(b("foto").style, {
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
    });
  }
  if (kind === "hidden") {
    input.cover.data.showBeilagenOnCover = false;
    b("foto").style.hidden = true;
  }
  return input;
}
