import { test, expect } from "bun:test";
import headerSource from "../fixtures/docx-next/modern-header-snapshot.json";
import headerCover from "../fixtures/docx-next/modern-header-metrics.json";
import headerMetrics from "../fixtures/docx-next/modern-header-interior-metrics.json";
import rubricSource from "../fixtures/docx-next/modern-rubric-snapshot.json";
import rubricCover from "../fixtures/docx-next/modern-rubric-metrics.json";
import rubricMetrics from "../fixtures/docx-next/modern-rubric-interior-metrics.json";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import { readZipEntries } from "../../src/lib/docx-next/zip";
import { walkBlocks } from "../../src/lib/docx-next/model";
import { paintPng } from "../../src/lib/docx-next/artwork";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { CoverTextMetrics } from "../../src/components/cover/text-metrics";
import type { InteriorTextMetrics } from "../../src/lib/docx-next/interior-metrics";

const source = (rubric = false) =>
  structuredClone(rubric ? rubricSource : headerSource) as unknown as DossierAppSnapshot;
const metrics = (rubric = false) =>
  structuredClone(rubric ? rubricMetrics : headerMetrics) as unknown as InteriorTextMetrics;
const options = (rubric = false) => ({
  coverComposition: "authored-frames"¶»§q«^