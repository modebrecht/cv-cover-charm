import type { DocumentPart, Paragraph } from "./model";
import type { DossierAppSnapshot } from "./source";
import { nativeTextHeightMm, nativeTextWidthMm } from "./layouts";
import { resolveLetterPalette } from "@/components/letter/letter-paper";

/** Internal Modern/Sans plain-letter trial. All line heights remain growable.
 * CSS div lines have no paragraph margin; explicit blank lines own their space.
 * Limited deliberately: customised typography/spacing, rich structures, sender
 * blocks, missing role content and wrapping recipient rows need other contracts.
 */
export function composeSourceLetterFlow(part: DocumentPart, source: DossierAppSnapshot): void {
  const { data, design } = source.letter;
  const fail = (): never => {
    throw Error("DOCX Next: Source-Letter-Fluss unterstützt nur einfache Modern/Sans-Briefe.");
  };
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
    part.id !== "letter" ||
    design.template !== "modern" ||
    (design.fontOverride ?? design.font) !== "sans" ||
    customised ||
    !data.text.trim() ||
    !data.betreff.trim() ||
    !data.anrede.trim() ||
    !data.gruss.trim() ||
    !data.unterschrift.trim() ||
    !(data.ort.trim() || data.datum.trim()) ||
    data.richTextHtml?.trim() ||
    data.images?.length ||
    (data.grussAbstandMm !== undefined && data.grussAbstandMm !== 4) ||
    (data.unterschriftAbstandMm !== undefined && data.unterschriftAbstandMm !== 1) ||
    design.ruleAfterSender ||
    design.ruleAfterRecipient ||
    design.ruleAfterSubject ||
    Object.keys(source.settings.fieldStyles ?? {}).some((id) => id.startsWith("letter.")) ||
    source.settings.margins?.letter ||
    part.blocks.some(
      (b) =>
        b.kind !== "paragraph" &&
        !(b.kind === "spacer" && b.id === "letter.measured.firstPageLead"),
    )
  )
    fail();
  const paragraphs = part.blocks.filter((b): b is Paragraph => b.kind === "paragraph");
  const recipients = paragraphs.filter((p) => p.id.startsWith("letter.recipient."));
  const bodies = paragraphs.filter((p) => p.id.startsWith("letter.body.paragraph:"));
  // Modern's band archetype uses 24/23 mm in LetterCanvas. The template's
  // previous 24/22 mm fallback widens native lines by another millimetre.
  const width = part.page.widthMm - 24 - 23;
  if (
    !recipients.length ||
    !bodies.length ||
    paragraphs.some(
      (p) => p.id.startsWith("letter.sender.") || p.runs.some((r) => r.style.font !== "Arial"),
    ) ||
    recipients.some(
      (p) => p.runs.some((r) => /[\n\t]/.test(r.text)) || nativeTextWidthMm(p) > width,
    )
  )
    fail();
  // Check every eligible field before changing the model. No partial mutation on failure.
  const known = (id: string) =>
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
  // LetterCanvas reserves at least 24 mm for the complete recipient block.
  // This bounded trial accepts only unwrapped rows, so its remaining space is exact.
  const recipientReserveMm = Math.max(0, 24 - (recipients.length * 10 * 1.45 * 25.4) / 72);
  for (const p of paragraphs) {
    if (p.id.startsWith("letter.recipient.")) set(p, 10, 1.45);
    else if (p.id === "letter.date") {
      set(p, 9.5, 1.45, recipientReserveMm + 4, 7);
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
}
