import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDossierDocModel } from "../../src/lib/docx-next/build-model";
import { composeSourceLetterFlow } from "../../src/lib/docx-next/letter-source-flow";
import { paragraph } from "../../src/lib/docx-next/native-text";
import { renderDossierDocx } from "../../src/lib/docx-next/renderer";
import { validateDossierDocModel } from "../../src/lib/docx-next/validation";
import type { Paragraph } from "../../src/lib/docx-next/model";
import type { DossierAppSnapshot } from "../../src/lib/docx-next/source";
import type { BuildModelOptions } from "../../src/lib/docx-next/build-model";

const saved = JSON.parse(readFileSync(new URL(
  "../fixtures/docx-next/sidebar-contact-chrome-23okt.json", import.meta.url,
), "utf8"));
function setup() {
  const f = structuredClone(saved);
  f.sidebarMetrics.sourceKey = f.interiorMetrics.sourceKey = JSON.stringify(f.snapshot);
  const input = f.snapshot as DossierAppSnapshot;
  const options: BuildModelOptions = {
    coverComposition: "authored-frames", coverTextMetrics: f.metrics,
    coverBadgePlacement: "body", cvSidebarComposition: "shared-body-stories",
    chromeFirstPageIdentity: "distinct-stories", interiorTextMetrics: f.interiorMetrics,
    cvSidebarTextMetrics: f.sidebarMetrics,
  };
  return { input, options };
}
function build(trial = true) {
  const { input, options } = setup();
  return buildDossierDocModel(input, { ...options,
    ...(trial ? { letterFlowComposition: "source-lines" as const } : {}) });
}
function field(model: ReturnType<typeof build>, id: string) {
  return model.letter.blocks.find((p) => p.id === id) as Paragraph;
}

test("source flow is opt-in and does not mutate saved input or adjacent parts", () => {
  const { input, options } = setup(), original = structuredClone({ input, options });
  const baseline = buildDossierDocModel(input, options);
  const candidate = buildDossierDocModel(input, { ...options, letterFlowComposition: "source-lines" });
  assert.deepEqual({ input, options }, original);
  assert.deepEqual(candidate.cover, baseline.cover);
  assert.deepEqual(candidate.cv, baseline.cv);
  assert.equal(field(baseline, "letter.body.paragraph:0").afterMm, 3);
  assert.equal(field(candidate, "letter.body.paragraph:0").afterMm, 0);
  assert.equal(candidate.letter.page.margins.left, 24);
  assert.equal(candidate.letter.page.margins.right, 23);
  assert.deepEqual(buildDossierDocModel(input, options), baseline);
  validateDossierDocModel(candidate);
});

test("normal renderer rejects the candidate before assets are normalised", async () => {
  const candidate = build();
  assert.ok(candidate.issues.some((i) => i.code === "letter-source-flow-unaccepted"));
  await assert.rejects(renderDossierDocx(candidate), /letter-source-flow-unaccepted/);
});

test("text and canonical field identities survive every changed paragraph", () => {
  const before = build(false), after = build();
  const content = (m: typeof before) => m.letter.blocks.filter((b) => b.kind === "paragraph")
    .map((p) => [p.id, (p as Paragraph).runs.map((r) => [r.id, r.fieldId, r.text])]);
  assert.deepEqual(content(after), content(before));
});

test("blank lines reserve one CSS line without a second 3 mm paragraph gap", () => {
  const model = build();
  for (const index of [0, 1, 2, 3, 4]) {
    const p = field(model, `letter.body.paragraph:${index}`);
    assert.equal(p.beforeMm, 0);
    assert.equal(p.afterMm, 0);
    assert.equal(p.minimumLineHeightPt, 10.5 * 1.55);
    assert.ok(paragraph(p).includes('w:line="326" w:lineRule="atLeast"'));
    assert.ok(!paragraph(p).includes('w:lineRule="exact"'));
  }
  assert.equal(field(model, "letter.body.paragraph:1").runs.length, 0);
});

test("source role sizes and additive gaps replace template approximations", () => {
  const m = build();
  assert.equal(field(m, "letter.recipient.company").runs[0].style.sizePt, 10);
  assert.equal(field(m, "letter.date").runs[0].style.sizePt, 9.5);
  assert.equal(field(m, "letter.subject").runs[0].style.sizePt, 12);
  assert.equal(field(m, "letter.subject").afterMm, 8);
  assert.equal(field(m, "letter.salutation").afterMm, 5);
  assert.equal(field(m, "letter.signature").afterMm, 9);
  assert.equal(field(m, "letter.attachments-heading").afterMm, 1.5);
  assert.equal(field(m, "letter.attachment:0").runs[0].style.sizePt, 10);
  assert.equal(field(m, "letter.attachment:0").afterMm, 0);
});

test("the recipient minimum belongs to its block rather than a guessed paragraph gap", () => {
  const m = build();
  const reserved = 4 * 10 * 1.45 * 25.4 / 72;
  assert.ok(Math.abs(field(m, "letter.date").beforeMm - (24 - reserved + 4)) < 1e-9);
  assert.equal(field(m, "letter.recipient.place").afterMm, 0);
});

test("a short final paragraph can accompany the existing letter tail without fixed boxes", () => {
  const m = build(), last = field(m, "letter.body.paragraph:4");
  assert.equal(last.keepNext, true);
  assert.equal(last.keepLines, false);
  assert.equal(field(m, "letter.body.paragraph:0").keepNext, false);
  assert.equal(field(m, "letter.body.paragraph:2").keepNext, false);
});

test("trailing blank lines stay with a bounded conclusion", () => {
  const { input, options } = setup();
  input.letter.data.text += "\n\n";
  options.interiorTextMetrics!.sourceKey = options.cvSidebarTextMetrics!.sourceKey = JSON.stringify(input);
  const m = buildDossierDocModel(input, { ...options, letterFlowComposition: "source-lines" });
  for (const index of [4, 5, 6]) assert.equal(field(m, `letter.body.paragraph:${index}`).keepNext, true);
});

test("an oversized final paragraph keeps its natural split policy", () => {
  const { input, options } = setup();
  input.letter.data.text = "Kurzer Anfang.\n\n" + "Langer synthetischer Testtext. ".repeat(150);
  options.interiorTextMetrics!.sourceKey = options.cvSidebarTextMetrics!.sourceKey = JSON.stringify(input);
  const m = buildDossierDocModel(input, { ...options, letterFlowComposition: "source-lines" });
  assert.equal(field(m, "letter.body.paragraph:2").keepNext, false);
  assert.equal(field(m, "letter.body.paragraph:2").keepLines, false);
});

test("unsupported rich text, user typography, images and custom spacing fail closed", () => {
  const mutations = [
    (s: DossierAppSnapshot) => { s.letter.data.richTextHtml = "<p>Rich text</p>"; },
    (s: DossierAppSnapshot) => { s.letter.design.bodyFontSizePt = 14; },
    (s: DossierAppSnapshot) => { s.letter.design.recipientTypography = {}; },
    (s: DossierAppSnapshot) => { s.letter.design.ruleAfterSubject = true; },
    (s: DossierAppSnapshot) => { s.letter.data.grussAbstandMm = 8; },
    (s: DossierAppSnapshot) => { s.letter.data.text = ""; },
    (s: DossierAppSnapshot) => { s.letter.data.gruss = ""; },
    (s: DossierAppSnapshot) => { s.letter.data.unterschrift = ""; },
    (s: DossierAppSnapshot) => { s.letter.data.betreff = ""; },
    (s: DossierAppSnapshot) => { s.letter.data.images = [{ id: "photo", src: "x", widthMm: 10, topMm: 0, gapMm: 1, side: "left" }]; },
  ];
  for (const mutate of mutations) {
    const { input, options } = setup(), part = buildDossierDocModel(input, options).letter;
    mutate(input);
    const old = structuredClone(part);
    assert.throws(() => composeSourceLetterFlow(part, input), /Source-Letter/);
    assert.deepEqual(part, old);
  }
});

test("unknown paragraphs and wrapping recipients do not get partially rewritten", () => {
  const { input, options } = setup();
  for (const mode of ["unknown", "recipient"] as const) {
    const model = buildDossierDocModel(input, options);
    if (mode === "unknown") model.letter.blocks.push({ ...structuredClone(field(model, "letter.date")), id: "letter.unknown" });
    else field(model, "letter.recipient.company").runs[0].text = "Very long recipient ".repeat(20);
    const old = structuredClone(model.letter);
    assert.throws(() => composeSourceLetterFlow(model.letter, input), /Source-Letter/);
    assert.deepEqual(model.letter, old);
  }
});
