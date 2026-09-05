import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  normalizeDossierChromeState,
  patchDossierChromeState,
  setDossierChromeSyncState,
} from "../../src/lib/dossier-chrome";

describe("shared CV and motivation-letter header/footer settings", () => {
  test("synchronization is enabled by default", () => {
    const state = normalizeDossierChromeState(null);
    expect(state.sync).toBe(true);
    expect(state.shared.headerMode).toBe("compact");
    expect(state.shared.footerMode).toBe("compact");
  });

  test("with sync enabled either editor changes the one shared configuration", () => {
    const next = patchDossierChromeState(DEFAULT_DOSSIER_CHROME_STATE, "letter", {
      headerMode: "contact",
      footerMode: "details",
      headerShowPhone: false,
    });

    expect(next.sync).toBe(true);
    expect(next.shared.headerMode).toBe("contact");
    expect(next.shared.footerMode).toBe("details");
    expect(next.shared.headerShowPhone).toBe(false);
  });

  test("turning sync off clones the current shared settings into both documents", () => {
    const shared = patchDossierChromeState(DEFAULT_DOSSIER_CHROME_STATE, "cv", {
      headerMode: "contact",
      footerMode: "details",
    });
    const split = setDossierChromeSyncState(shared, "cv", false);

    expect(split.sync).toBe(false);
    expect(split.cv).toEqual(shared.shared);
    expect(split.letter).toEqual(shared.shared);
  });

  test("with sync off CV and motivation letter can diverge", () => {
    const split = setDossierChromeSyncState(DEFAULT_DOSSIER_CHROME_STATE, "letter", false);
    const cv = patchDossierChromeState(split, "cv", { headerMode: "none" });

    expect(cv.cv.headerMode).toBe("none");
    expect(cv.letter.headerMode).toBe("compact");
  });

  test("turning sync back on uses the document where the checkbox was enabled", () => {
    const split = setDossierChromeSyncState(DEFAULT_DOSSIER_CHROME_STATE, "letter", false);
    const changed = patchDossierChromeState(split, "letter", {
      headerMode: "contact",
      footerMode: "details",
      headerShowEmail: false,
    });
    const joined = setDossierChromeSyncState(changed, "letter", true);

    expect(joined.sync).toBe(true);
    expect(joined.shared).toEqual(changed.letter);
    expect(joined.shared.headerShowEmail).toBe(false);
  });
});
