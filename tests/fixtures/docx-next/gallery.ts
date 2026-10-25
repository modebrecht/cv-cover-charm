import {
  GRAPHIC_FIXTURES,
  graphicCandidateFixture,
  type GraphicFixture,
} from "./graphic-candidate";
export const GALLERY_FIXTURES = [...GRAPHIC_FIXTURES, "contact-long", "cover-long"] as const;
export const galleryFixture = (kind: GraphicFixture = "normal", photo?: string) =>
  graphicCandidateFixture("gallery", kind, photo);
