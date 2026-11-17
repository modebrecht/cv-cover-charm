import type { DocBlock, DocumentPart, Paragraph, TableBlock } from "./model";
import type { DossierAppSnapshot } from "./source";
import { nativeTextHeightMm } from "./layouts";
import { resolveLetterPalette } from "@/components/letter/letter-paper";
import { datedFlowAfterMm as tableFlowAfterMm, NATIVE_BOUNDARY_HEIGHT_MM } from "./flow-boundaries";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import { DEFAULT_DOSSIER_CHROME_STATE } from "@/lib/dossier-chrome";

/** The source-only part of the existing renderer gate also drives download availability. */
export function sourceLetterFlowInputIssue(
  source: DossierAppSnapshot,
): "rich-text" | "layout" | null {
  const { data, design } = source.letter;
  if (data.richTextHtml?.trim()) return "rich-text";
  const customised = [
    design.senderTypography,
    design.recipientTypography,
    design.subjectTypography,
    design.bodyFont,
    design.bodyFontSizePt,
    design.dateFont,
    design.dateFontSizePt,
    design.salutationFont,
    design.salutationFontSizePt,
    design.closingFont,
    design.closingFontSizePt,
    design.signatureFont,
    design.signatureFontSizePt,
    design.attachmentsFont,
    design.attachmentsFontSizePt,
  ].some((value) => value !== undefined && value !== null);
  if (
    design.template !== "modern" ||
    (design.fontOverride ?? design.font) !== "sans" ||
    customised ||
    !data.text.trim() ||
    !data.betreff.trim() ||
    !data.anrede.trim() ||
    !data.gruss.trim() ||
    !data.unterschrift.trim() ||
    !(data.ort.trim() || data.datum.trim()) ||
    data.images?.length ||
    (data.grussAbstandMm !== undefined && data.grussAbstandMm !== 4) ||
    (data.unterschriftAbstandMm !== undefined && data.unterschriftAbstandMm !== 1) ||
    design.ruleAfterSender ||
    design.ruleAfterRecipient ||
    design.ruleAfterSubject ||
    Object.keys(source.settings.fieldStyles ?? {}).some((id) => id.startsWith("letter.")) ||
    source.settings.margins?.letter
  )
    return "layout";
  return null;
}

/** Internal Modern/Sans plain-letter trial. All line heights remain growable.
 * CSS div lines have no paragraph margin; explicit blank lines own their space.
 * Compact chrome keeps the plain sender in the body; contact chrome owns it
 * in the header. Custom typography/spacing and rich structures remain gated.
 * Recipient height grows
 * through a native minimum-height row; no text-width/line-count guess is used.
 */
export function composeSourceLetterFlow(part: DocumentPart, source: DossierAppSnapshot): void {
  const { data, design } = source.letter;
  const compact =
    resolveDossierChromeSnapshot(source, source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE)
      .letter.options.headerMode === "compact";
  const fail = (): never => {
    throw Error("DOCX Next: Source-Letter-Fluss unterstützt nur einfache Modern/Sans-Briefe.");
  };
  if (
    part.id !== "letter" ||
    sourceLetterFlowInputIssue(source) ||
    part.blocks.some(
      (b) =>
        b.kind !== "paragraph" &&
        !(
          b.kind === "spacer" &&
          (b.id === "letter.measured.firstPageLead" || (compact && b.id === "letter.recipient.gap"))
        ),
    )
  )
    fail();
  const paragraphs = part.blocks.filter((b): b is Paragraph => b.kind === "paragraph");
  const recipients = paragraphs.filter((p) => p.id.startsWith("letter.recipient."));
  const senders = paragraphs.filter((p) => p.id.startsWith("letter.sender."));
  const recipientStart = part.blocks.findIndex((block) => block === recipients[0]);
  const bodies = paragraphs.filter((p) => p.id.startsWith("letter.body.paragraph:"));
  // Modern's band archetype uses 24/23 mm in LetterCanvas. The template's
  // previous 24/22 mm fallback widens native lines by another millimetre.
  const width = part.page.widthMm - 24 - 23;
  if (
    !recipients.length ||
    !bodies.length ||
    recipients.some((p, index) => part.blocks[recipientStart + index] !== p) ||
    paragraphs.some(
      (p) =>
        (!compact && p.id.startsWith("letter.sender.")) ||
        p.runs.some((r) => r.style.font !== "Arial"),
    ) ||
    [...recipients, ...senders].some((p) => p.runs.some((r) => /[\n\t]/.test(r.text)))
  )
    fail();
  // Check every eligible field before changing the model. No partial mutation on failure.
  const known = (id: string) =>
    (compact && id.startsWith("letter.sender.")) ||
    id.startsWith("letter.recipient.") ||
    id.startsWith("letter.body.paragraph:") ||
    id.startsWith("letter.attachment:") ||
    [
      "letter.date",
      "letter.subject",
      "letter.salutation",
      "letter.closing",
      "letter.signature",
      "letter.attachments-heading",
    ].includes(id);
  if (paragraphs.some((p) => !known(p.id))) fail();
  const senderValues: Record<string, string> = {
    "letter.sender.name": data.absenderName,
    "letter.sender.address": data.absenderAdresse,
    "letter.sender.place": data.absenderPlzOrt,
    "letter.sender.phone": data.absenderTelefon,
    "letter.sender.email": data.absenderEmail,
  };
  if (senders.some((p) => p.runs.map((r) => r.text).join("") !== senderValues[p.id])) fail();
  part.page.margins.left = 24;
  part.page.margins.right = 23;
  const attachments = paragraphs.some((p) => p.id === "letter.attachments-heading");
  const muted = resolveLetterPalette(design).muted.slice(1).toUpperCase();
  const set = (p: Paragraph, sizePt: number, lineHeight: number, beforeMm = 0, afterMm = 0) => {
    p.runs.forEach((r) => {
      r.style.sizePt = sizePt;
    });
    p.lineHeight = lineHeight;
    p.minimumLineHeightPt = sizePt * lineHeight;
    delete p.fontLineHeightFactor;
    p.beforeMm = beforeMm;
    p.afterMm = afterMm;
  };
  for (const p of paragraphs) {
    if (p.id.startsWith("letter.sender.")) set(p, 9.5, 1.45);
    else if (p.id.startsWith("letter.recipient.")) set(p, 10, 1.45);
    else if (p.id === "letter.date") {
      set(p, 9.5, 1.45, tableFlowAfterMm(4), 7);
      p.runs.forEach((r) => {
        r.style.color = muted;
      });
    } else if (p.id === "letter.subject") set(p, 12, 1.25, 0, 8);
    else if (p.id === "letter.salutation") set(p, 10.5, 1.48, 0, 5);
    else if (p.id.startsWith("letter.body.paragraph:")) set(p, 10.5, 1.55);
    else if (p.id === "letter.closing") set(p, 10.5, 1.48, 4);
    else if (p.id === "letter.signature") set(p, 10.5, 1.48, 1, attachments ? 9 : 0);
    else if (p.id === "letter.attachments-heading") set(p, 10, 1.45, 0, 1.5);
    else if (p.id.startsWith("letter.attachment:")) set(p, 10, 1.45);
  }
  if (compact) {
    // LetterCanvas's body sender has no paragraph margins and is followed by
    // a six-mm gap. Keep every field native and let long sender lines grow.
    const gap = part.blocks.find((b) => b.kind === "spacer" && b.id === "letter.recipient.gap");
    if (gap?.kind === "spacer") gap.heightMm = 6;
  }
  // Extend the template's existing short-tail keep policy by one ordinary
  // final paragraph. A long paragraph still splits naturally and cannot drag
  // an unbounded group onto a new page.
  const lastBody = [...bodies].reverse().find((p) => p.runs.some((r) => r.text.trim()));
  if (lastBody) {
    const tail = paragraphs.slice(paragraphs.indexOf(lastBody));
    if (nativeTextHeightMm(tail, width) <= 80)
      bodies.slice(bodies.indexOf(lastBody)).forEach((p) => {
        p.keepNext = true;
      });
  }
  // Match LetterCanvas's recipient min-height, including natural wrapping.
  // The minimum belongs to the whole block and can grow beyond 24 mm. No
  // fixed box, width estimate, reduced font or missing field owner is needed.
  const recipientSet = new Set(recipients);
  const recipientBlock: TableBlock = {
    kind: "table",
    id: "letter.recipient.minimum-block",
    widths: [1],
    widthMm: width,
    // The existing renderer emits one cell-ending and one table-ending
    // paragraph. Keep the cell ending outside the authored 24 mm minimum,
    // then account for both native boundaries in the following source gap.
    rows: [
      { cells: [recipients], keepTogether: false, minimumHeightMm: 24 + NATIVE_BOUNDARY_HEIGHT_MM },
    ],
    decoration: { borderColor: "FFFFFF", borderWidthMm: 0, paddingXMm: 0, paddingYMm: 0 },
  };
  part.blocks = part.blocks.flatMap<DocBlock>((block) => {
    if (block === recipients[0]) return [recipientBlock];
    return recipientSet.has(block as Paragraph) ? [] : [block];
  });
}
