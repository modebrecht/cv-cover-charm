import { expect, test } from "@playwright/test";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  DOSSIER_CHROME_STORAGE_KEY,
} from "../../src/lib/dossier-chrome";
import { paginationFixture } from "./pagination-fixtures";
import { auditDocument, loadFixture, type DocumentKind } from "./pagination-browser";
for (const template of ["brief", "studio3"])
  for (const kind of ["cv", "letter"] as DocumentKind[]) {
    test(`chrome ${template} ${kind}: different first-page contact header and attachments footer`, async ({
      page,
    }) => {
      const fixture = paginationFixture(template, {
        works: 6,
        schools: 2,
        paragraphs: 8,
        custom: true,
      });
      const chrome = structuredClone(DEFAULT_DOSSIER_CHROME_STATE);
      chrome.sync = false;
      chrome[kind] = {
        ...chrome[kind],
        headerMode: "contact",
        headerDifferentFirstPage: true,
        headerGapMm: 6,
        footerMode: "details",
        footerHeightMm: 20,
      };
      fixture.storage[DOSSIER_CHROME_STORAGE_KEY] = JSON.stringify(chrome);
      await loadFixture(page, fixture, kind);
      const result = await auditDocument(page, fixture, kind, `chrome-${template}-${kind}`);
      expect.soft(result.web.length).toBeGreaterThan(1);
      expect(result.findings).toEqual([]);
    });
  }
