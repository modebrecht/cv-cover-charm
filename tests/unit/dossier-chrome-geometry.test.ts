import { describe, expect, test } from "bun:test";
import { cvContentBox, cvFrameFor, cvSurface } from "../../src/components/cv/archetype";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  dossierFooterContentBottomMmForOptions,
  dossierHeaderContentTopMmForOptions,
  type DossierChromeOptions,
} from "../../src/lib/dossier-chrome";

// Release guard: CV layout geometry must be reproducible from an explicit chrome snapshot.
const contact: DossierChromeOptions = {
  ...DEFAULT_DOSSIER_CHROME_OPTIONS,
  headerMode: "contact",
  footerMode: "details",
};
const none: DossierChromeOptions = {
  ...DEFAULT_DOSSIER_CHROME_OPTIONS,
  headerMode: "none",
  footerMode: "none",
};

describe("pure dossier chrome geometry", () => {
  test("option helpers need no browser/store state", () => {
    expect(dossierHeaderContentTopMmForOptions(contact, 0)).toBe(31);
    expect(dossierHeaderContentTopMmForOptions(none, 0)).toBe(18);
    expect(dossierFooterContentBottomMmForOptions(contact)).toBe(20);
    expect(dossierFooterContentBottomMmForOptions(none)).toBe(10);
  });

  test("CV geometry follows the explicit chrome snapshot", () => {
    const frame = cvFrameFor("modern");
    expect(cvContentBox(frame, 0, "classic", 0.3, contact)).toMatchObject({ top: 31, bottom: 20 });
    expect(cvContentBox(frame, 0, "classic", 0.3, none)).toMatchObject({ top: 18, bottom: 10 });
    expect(cvSurface(frame, 0, "classic", 0.3, contact)).toMatchObject({ top: 22, bottom: 10 });
    expect(cvSurface(frame, 0, "classic", 0.3, none)).toMatchObject({ top: 0, bottom: 0 });
  });
});
