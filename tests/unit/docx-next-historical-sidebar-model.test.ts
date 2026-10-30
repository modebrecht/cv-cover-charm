import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { briefFixture } from "../fixtures/docx-next/brief";
import { historicalSidebarControlModel } from "../fixtures/docx-next/historical-sidebar-model";
import { containerSpanFixture } from "../fixtures/docx-next/sidebar-container-span";
import { sidebarFloatingContinuationFixture } from "../fixtures/docx-next/sidebar-floating-continuation";

const baseline = JSON.parse(
  readFileSync(
    new URL("../../docs/docx-next/sidebar-lead-window-evidence.json", import.meta.url),
    "utf8",
  ),
);
const hash = async (model: ReturnType<typeof historicalSidebarControlModel>) =>
  createHash("sha256")
    .update(
      new Uint8Array(
        await (await renderDossierDocx(model, { allowUnacceptedModelIssues: true })).arrayBuffer(),
      ),
    )
    .digest("hex");

const floatingBaseline = JSON.parse(
  readFileSync(
    new URL("../../docs/docx-next/sidebar-floating-continuation-evidence.json", import.meta.url),
    "utf8",
  ),
);
for (const orientation of ["left", "right"] as const)
  for (const kind of ["left", "side-long", "both-long"] as const)
    test(`historical floating ${orientation}/${kind}: reproduces its independently executed package`, async () => {
      const name = `floating-continuation-${orientation}-${kind}-all-pages`;
      const { model } = sidebarFloatingContinuationFixture({
        name,
        orientation,
        kind,
        policy: "all-pages",
      });
      const old = floatingBaseline.devCli.preparedSources.find(
        (row: { name: string }) => row.name === name,
      );
      expect(old).toBeDefined();
      expect(await hash(model)).toBe(old.docxSha256);
    });

for (const orientation of ["left", "right"] as const)
  for (const leadMm of [210, 220] as const)
    test(`historical Sidebar ${orientation}/${leadMm}: reproduces the unchanged complete-package pin`, async () => {
      const { model, fixture } = containerSpanFixture({
        name: `container-span-${orientation}-${leadMm}-caption-only`,
        orientation,
        leadMm,
        carrier: "caption-only",
      });
      const old = baseline.cases.find(
        (row: { fixture: string }) => row.fixture === fixture.originalName,
      );
      expect(old).toBeDefined();
      expect(await hash(model)).toBe(old.docxSha256);
    });

test("application input keeps its attachment heading; historical auxiliary stories omit only that later field", () => {
  const current = buildDossierDocModel(briefFixture("normal"));
  const historical = historicalSidebarControlModel();
  const heading = current.letter.blocks.find((block) => block.id === "letter.attachments-heading");
  expect(heading).toBeDefined();
  expect(historical.letter.blocks).toEqual(
    current.letter.blocks.filter((block) => block !== heading),
  );
  expect({ ...historical, letter: current.letter }).toEqual(current);
});

test("historical complete-package pins still detect changed CV geometry and field text", async () => {
  const { model, fixture } = containerSpanFixture({
    name: "container-span-left-220-caption-only",
    orientation: "left",
    leadMm: 220,
    carrier: "caption-only",
  });
  const old = baseline.cases.find(
    (row: { fixture: string }) => row.fixture === fixture.originalName,
  );
  const geometry = structuredClone(model);
  geometry.cv.page.margins.left += 1;
  expect(await hash(geometry)).not.toBe(old.docxSha256);
  const content = structuredClone(model);
  const table = content.cv.blocks[0];
  if (table.kind !== "table") throw Error("Missing historical table");
  const paragraph = table.rows[0].cells.flat().find((block) => block.kind === "paragraph");
  if (paragraph?.kind !== "paragraph") throw Error("Missing historical field");
  paragraph.runs[0].text += " changed";
  expect(await hash(content)).not.toBe(old.docxSha256);
});
