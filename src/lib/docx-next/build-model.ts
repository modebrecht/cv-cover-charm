import {
  cvLineFieldId,
  semanticListItemIds,
  CV_PERSON_FIELD_IDS,
  referenceContactFields,
  dossierChromeFieldId,
  dossierElementFieldId,
} from "@/lib/dossier-semantic-fields";
import {
  CV_SECTION_LABELS,
  DEFAULT_CV_PLACEMENTS,
  cvSectionOrder,
  cvSectionLayout,
  customSectionForKey,
  entryFilled,
  isCustomSectionKey,
  type CvEntry,
} from "@/components/cv/types";
import { cvPersonalInfoRows } from "@/lib/cv-personal-info";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { coverAttachmentValues, TEMPLATES } from "@/components/cover/types";
import { buildCustomBlocks } from "@/components/cover/layouts";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import type {
  DossierDocModel,
  DocumentPart,
  DocBlock,
  Paragraph,
  TextStyle,
  Alignment,
  ModelIssue,
} from "./model";
import { walkBlocks } from "./model";
import { nextTemplate } from "./templates";
import { color, compositeTextColor } from "./colors";
export { color } from "./colors";
import { composeCover } from "./cover-composition";
import { applyContinuationMargin } from "./continuation-margin";
import { composeCvSidebar } from "./cv-sidebar-composition";
import {
  chromeTextHeight,
  composeCompactMasthead,
  composeHeaderBands,
  composeLetterTail,
  templateBandInk,
} from "./template-composition";
import { ensureFirstHeader } from "./page-artwork";
import { templateMotifs, composePageMotifs } from "./template-motifs";
import { DEFAULT_DOSSIER_CHROME_STATE } from "@/lib/dossier-chrome";
import { CV_FLOW_LAYOUTS, cvWordLayout, datedEntryBlocks } from "./layouts";
import { wordFont as fontForKey, createFontResolver } from "./fonts";
import { richLetterBlocks } from "./rich-text";
import { textElement, imageElement, shapeElement, flowingElementBox } from "./elements";
import {
  dossierPhotoRatio,
  dossierPhotoStyleFromBlockStyle,
  normalizeDossierPhotoStyle,
} from "@/lib/dossier-photo";
import { normalizeCvPhotoPlacement, resolveCvPhotoPosition } from "@/components/cv/photo-place";
import { resolveLetterPalette, resolveLetterPaperColor } from "@/components/letter/letter-paper";
import { resolveCvPalette } from "@/components/cv/cv-paper";

import type { DossierAppSnapshot } from "./source";
export type { DossierAppSnapshot } from "./source";
const name = (first: string, last: string) => [first, last].filter(Boolean).join(" ");

/** Pure and synchronous: all ambient editor state must be captured before calling. */
export function buildDossierDocModel(input: DossierAppSnapshot): DossierDocModel {
  const { cover, letter, cv, settings } = input;
  const cvVariant = cvWordLayout(settings.cvLayout);
  const cvFlow = CV_FLOW_LAYOUTS[cvVariant];
  const placements =
    cvVariant === "sidebar"
      ? { ...DEFAULT_CV_PLACEMENTS, ...settings.placements }
      : settings.placements;
  const template = nextTemplate(String(cover.template));
  if (String(letter.design.template) !== template.id || String(cv.design.template) !== template.id)
    throw new Error("DOCX Next requires matching dossier templates.");
  const fonts = createFontResolver(settings.fontPolicy);
  const wordFont = (key: Parameters<typeof fontForKey>[0], fallback: string) =>
    fonts.resolve(fontForKey(key, fallback));
  const theme = {
    font: wordFont(cv.design.font ?? letter.design.fontOverride, template.typography.font),
    ink: color(cover.colors.ink, template.colors.ink),
    accent: color(cover.colors.accent ?? cover.colors.primary, template.colors.accent),
    paper: color(cover.colors.bg, template.colors.paper),
  };
  // These shared app functions consume authored colors only, never browser/PDF geometry.
  const letterPalette =
    template.interiorPaletteSource === "dossier" ? resolveLetterPalette(letter.design) : undefined;
  const cvPalette =
    template.interiorPaletteSource === "dossier" ? resolveCvPalette(cv.design) : undefined;
  const letterFont = wordFont(
    template.letter.fontSource === "standalone" ? letter.design.font : letter.design.fontOverride,
    theme.font,
  );
  const issues: ModelIssue[] = (settings.unresolvedTypography ?? []).map((id) => ({
    code: "unresolved-legacy-typography",
    fieldId: id,
    message: "Legacy field identity needs explicit semantic binding before migration.",
  }));
  const style = (id: string, patch: Partial<TextStyle> = {}): TextStyle => {
    const result = {
      font: id.startsWith("letter.") ? letterFont : theme.font,
      sizePt: template.typography.bodyPt,
      color: color(
        id.startsWith("letter.")
          ? letterPalette?.ink
          : id.startsWith("cv.")
            ? cvPalette?.ink
            : undefined,
        theme.ink,
      ),
      bold: false,
      italic: false,
      underline: false,
      ...patch,
      ...settings.fieldStyles?.[id],
    };
    return {
      ...result,
      font: fonts.resolve(result.font),
      sizePt: Number.isFinite(result.sizePt)
        ? Math.max(5, Math.min(72, result.sizePt))
        : template.typography.bodyPt,
      color: color(result.color, theme.ink),
    };
  };
  const p = (
    id: string,
    text: string,
    patch: Partial<TextStyle> = {},
    layout: Partial<Omit<Paragraph, "id" | "kind" | "runs">> = {},
  ): Paragraph => ({
    kind: "paragraph",
    id,
    role: "body",
    runs: text ? [{ id: `${id}.value`, fieldId: id, text, style: style(id, patch) }] : [],
    align: "left",
    beforeMm: 0,
    afterMm: 1.5,
    lineHeight: 1.2,
    keepNext: false,
    keepLines: false,
    ...layout,
  });
  const compound = (
    paragraph: Paragraph,
    fields: { id: string; text: string }[],
    separator: string,
  ): Paragraph => {
    const baseStyle = paragraph.runs[0]?.style ?? style(paragraph.id);
    paragraph.runs = fields
      .filter((field) => field.text.trim())
      .flatMap((field, index) => [
        ...(index
          ? [{ id: `${paragraph.id}.separator:${index}`, text: separator, style: baseStyle }]
          : []),
        {
          id: `${field.id}.value`,
          fieldId: field.id,
          text: field.text,
          style: style(field.id, baseStyle),
        },
      ]);
    return paragraph;
  };
  const part = (id: DocumentPart["id"]): DocumentPart => ({
    id,
    blocks: [],
    page: {
      widthMm: 210,
      heightMm: 297,
      margins: {
        ...template.margins,
        ...(id === "cover" ? template.cover.margins : settings.margins?.[id]),
      },
      headerDistanceMm: template.chrome.headerDistanceMm,
      footerDistanceMm: template.chrome.footerDistanceMm,
    },
    ...(template.pagePaintOrder ? { paintOrder: template.pagePaintOrder } : {}),
    ...(template.pagePaintComposition
      ? { pagePaintComposition: template.pagePaintComposition }
      : {}),
    artwork: [],
    header: [],
    footer: [],
    chrome: { borderWidthMm: 0 },
    layout: {
      mode: id === "cv" && cvVariant === "sidebar" ? "sidebar" : "classic",
      ...(id === "cv" ? { variant: cvVariant } : {}),
      side: settings.sidebarSide ?? "left",
      sidebarFraction: cv.design.sidebarPct ?? template.cv.sidebarFraction,
    },
  });
  const coverPart = part("cover"),
    letterPart = part("letter"),
    cvPart = part("cv");
  const cvFirstTopMargin = cvPart.page.margins.top;
  let cvHeaderReserveMm = 0;
  let cvMinimumFirstTopMm: number | undefined;
  const elementContext = (
    colors: Record<string, string>,
    font: string,
    fontScale = 1,
    paper = theme.paper,
  ) => ({
    colors,
    font,
    fontScale,
    paper,
    ink: theme.ink,
    color,
    style,
    fieldStyles: settings.fieldStyles,
  });
  coverPart.blocks = composeCover(
    cover,
    template,
    coverPart.page,
    elementContext(cover.colors, theme.font, cover.fontScale),
    theme.accent,
    color,
    p("cover.fullName", name(cover.data.vorname, cover.data.nachname), {
      sizePt: template.typography.namePt,
      bold: true,
    }),
  );

  if (template.cover.decorationPlacement === "first-header") {
    coverPart.headerShapes = coverPart.blocks.flatMap((block) =>
      block.kind === "decorative-shape" ? [{ ...block, repeat: "first" as const }] : [],
    );
    coverPart.blocks = coverPart.blocks.filter((block) => block.kind !== "decorative-shape");
    ensureFirstHeader(coverPart);
  }
  if (template.cover.motifs) {
    coverPart.headerShapes = [
      ...(coverPart.headerShapes ?? []),
      ...templateMotifs(coverPart, template.cover.motifs, cover.colors, theme.accent),
    ];
    ensureFirstHeader(coverPart);
  }
  const ld = letter.data,
    design = letter.design;
  const letterInk = color(letterPalette?.ink ?? design.textColor ?? design.colors.ink, theme.ink);
  const letterAccent = color(letterPalette?.accent ?? design.colors.accent, theme.accent);
  const role = (key: "sender" | "recipient" | "subject"): Partial<TextStyle> => {
    const value = design[`${key}Typography`];
    return {
      color: letterInk,
      ...(value
        ? {
            ...value,
            font: wordFont(value.font, letterFont),
            sizePt: value.fontSizePt ?? template.typography.bodyPt,
          }
        : {}),
    };
  };
  const letterLines = (
    prefix: string,
    fields: Record<string, string>,
    typography: Partial<TextStyle>,
    alignment: Alignment = "left",
  ) => {
    const values = Object.entries(fields).filter(([, value]) => value.trim());
    return values.map(([key, value], index) =>
      p(`letter.${prefix}.${key}`, value, typography, {
        align: alignment,
        keepNext: index < values.length - 1,
        afterMm: index === values.length - 1 ? 5 : 0.5,
        ...(index === values.length - 1 &&
        (prefix === "sender" ? design.ruleAfterSender : design.ruleAfterRecipient)
          ? { ruleColor: letterAccent }
          : {}),
      }),
    );
  };
  letterPart.blocks.push(
    ...letterLines(
      "sender",
      {
        name: ld.absenderName,
        address: ld.absenderAdresse,
        place: ld.absenderPlzOrt,
        phone: ld.absenderTelefon,
        email: ld.absenderEmail,
      },
      role("sender"),
      design.senderAlign,
    ),
  );
  letterPart.blocks.push(
    ...letterLines(
      "recipient",
      {
        company: ld.empfaengerFirma,
        name: ld.empfaengerName,
        address: ld.empfaengerAdresse,
        place: ld.empfaengerPlzOrt,
      },
      role("recipient"),
      design.recipientAlign,
    ),
  );
  letterPart.blocks.push(
    compound(
      p(
        "letter.date",
        [ld.ort, ld.datum].filter(Boolean).join(", "),
        {
          color: letterInk,
          font: wordFont(design.dateFont, letterFont),
          sizePt: design.dateFontSizePt ?? 10.5,
        },
        { align: design.dateAlign ?? "right", afterMm: 5 },
      ),
      [
        { id: "letter.date.place", text: ld.ort },
        { id: "letter.date.value", text: ld.datum },
      ],
      ", ",
    ),
  );
  if (ld.betreff)
    letterPart.blocks.push(
      p(
        "letter.subject",
        ld.betreff,
        { bold: true, ...role("subject") },
        {
          role: "heading",
          keepNext: true,
          afterMm: 5,
          ...(design.ruleAfterSubject ? { ruleColor: letterAccent } : {}),
        },
      ),
    );
  if (ld.anrede)
    letterPart.blocks.push(
      p(
        "letter.salutation",
        ld.anrede,
        {
          color: letterInk,
          font: wordFont(design.salutationFont, letterFont),
          sizePt: design.salutationFontSizePt ?? 10.5,
        },
        { keepNext: true, afterMm: 3 },
      ),
    );
  const bodyStyle = style("letter.body", {
    color: letterInk,
    font: wordFont(design.bodyFont, letterFont),
    sizePt: design.bodyFontSizePt ?? 10.5,
  });
  letterPart.blocks.push(
    ...(ld.images ?? []).map((image) => ({
      kind: "image" as const,
      id: `letter.image:${image.id}`,
      source: image.src,
      alt: "Letter image",
      widthMm: image.widthMm,
      maxHeightMm: 120,
      placement: image.xMm !== undefined ? ("free" as const) : image.side,
      xMm: image.xMm ?? 0,
      yMm: image.topMm,
      gapMm: image.gapMm,
    })),
  );
  const letterBody = richLetterBlocks(
    ld.richTextHtml,
    ld.text,
    bodyStyle,
    template.letter.paragraphSpaceMm,
    template.letter.lineHeight,
  );
  letterPart.blocks.push(...letterBody);
  if (ld.gruss)
    letterPart.blocks.push(
      p(
        "letter.closing",
        ld.gruss,
        {
          color: letterInk,
          font: wordFont(design.closingFont, letterFont),
          sizePt: design.closingFontSizePt ?? 10.5,
        },
        { beforeMm: ld.grussAbstandMm ?? 4, keepNext: true },
      ),
    );
  if (ld.unterschrift)
    letterPart.blocks.push(
      p(
        "letter.signature",
        ld.unterschrift,
        {
          color: letterInk,
          font: wordFont(design.signatureFont, letterFont),
          sizePt: design.signatureFontSizePt ?? 10.5,
        },
        { beforeMm: ld.unterschriftAbstandMm ?? 1, afterMm: 5 },
      ),
    );
  if (ld.showBeilagen !== false)
    (ld.beilagen ?? ["Lebenslauf", "Zeugnis"])
      .map((text, index) => ({ text, index }))
      .filter(({ text }) => text.trim())
      .forEach(({ text, index }) =>
        letterPart.blocks.push(
          p(
            `letter.attachment:${semanticListItemIds((ld.beilagen ?? ["Lebenslauf", "Zeugnis"]).length, ld.attachmentIds)[index]}`,
            text,
            {
              color: letterInk,
              font: wordFont(design.attachmentsFont, letterFont),
              sizePt: design.attachmentsFontSizePt ?? 9,
            },
          ),
        ),
      );

  if (template.letter.keepTailTogether) composeLetterTail(letterPart);
  const data = cv.data,
    cd = cv.design,
    person = data.person;
  const cvInk = color(cvPalette?.ink ?? cd.colors.ink, theme.ink),
    cvAccent = color(cvPalette?.accent ?? cd.colors.accent ?? cd.colors.primary, theme.accent);
  const body = { sizePt: template.typography.bodyPt * (cd.bodyScale ?? 1), color: cvInk };
  const rubric = resolveCvRubricOptions(cd, template.cv.headingBadge);
  const sectionGapMm =
    typeof settings.cvSectionGapMm === "number" && Number.isFinite(settings.cvSectionGapMm)
      ? Math.max(0, Math.min(12, settings.cvSectionGapMm))
      : (cvFlow.sectionGapMm ?? template.cv.sectionSpaceMm);
  const heading = (id: string, text: string) =>
    p(
      id,
      text,
      {
        sizePt:
          (cd.sectionTitleFontSizePx !== undefined
            ? cd.sectionTitleFontSizePx * 0.75
            : template.typography.headingPt) * (cd.headingScale ?? 1),
        color: color(cd.sectionTitleColor, cvAccent),
        bold: cd.sectionTitleBold ?? true,
        italic: cd.sectionTitleItalic ?? false,
        underline: cd.sectionTitleUnderline ?? false,
      },
      {
        role: "heading",
        beforeMm: sectionGapMm,
        afterMm: ((cd.sectionTitleMarginBottomPx ?? 7) * 25.4) / 96,
        keepNext: true,
        keepLines: true,
        ...(cd.headingRule !== "none" && template.cv.headingRule ? { ruleColor: cvAccent } : {}),
      },
    );
  if (cd.showDocumentTitle !== false && data.titel?.trim())
    cvPart.blocks.push(
      p(
        "cv.documentTitle",
        data.titel,
        {
          sizePt: (cd.docTitleFontSizePx ?? 18) * 0.75,
          bold: cd.docTitleBold ?? true,
          color: color(cd.docTitleColor, cvAccent),
          italic: cd.docTitleItalic ?? false,
          underline: cd.docTitleUnderline ?? false,
        },
        {
          role: "title",
          keepNext: true,
          afterMm: ((cd.docTitleMarginBottomPx ?? 10) * 25.4) / 96,
          indentMm: cvFlow.indentMm,
        },
      ),
    );
  cvPart.blocks.push(
    compound(
      p(
        "cv.person.name",
        name(person.vorname, person.nachname),
        {
          ...body,
          bold: true,
          sizePt: template.typography.namePt * (cd.titleScale ?? 1),
          ...person.nameStyle,
          font: wordFont(person.nameStyle?.font, theme.font),
          ...(person.nameStyle?.fontSizePt !== undefined
            ? { sizePt: person.nameStyle.fontSizePt }
            : {}),
        },
        {
          role: "heading",
          keepNext: !!person.untertitel,
          indentMm: cvFlow.indentMm,
          afterMm: person.untertitel ? 1.5 : cvFlow.headerGapMm,
        },
      ),
      [
        { id: CV_PERSON_FIELD_IDS.vorname, text: person.vorname },
        { id: CV_PERSON_FIELD_IDS.nachname, text: person.nachname },
      ],
      " ",
    ),
  );
  if (person.untertitel)
    cvPart.blocks.push(
      p("cv.person.subtitle", person.untertitel, body, {
        indentMm: cvFlow.indentMm,
        afterMm: cvFlow.headerGapMm,
      }),
    );
  if (person.foto) {
    const coverPhoto = cover.blocks.find((block) => block.kind === "photo");
    const photoStyle = normalizeDossierPhotoStyle(
      settings.cvPhotoStyle ?? dossierPhotoStyleFromBlockStyle(coverPhoto?.style),
    );
    const photoPlacement = normalizeCvPhotoPlacement(settings.cvPhotoPlacement);
    const position = resolveCvPhotoPosition(photoPlacement, {
      template: template.id,
      layout: cvPart.layout.mode === "sidebar" ? "modern" : "classic",
      legacyMirrored: settings.sidebarSide === "right",
    });
    cvPart.blocks.unshift({
      kind: "image",
      id: "cv.person.photo",
      source: person.foto,
      alt: "CV portrait",
      widthMm: photoPlacement.widthMm,
      maxHeightMm: cvPart.page.heightMm - cvPart.page.margins.top - cvPart.page.margins.bottom,
      placement: position,
      coordinateOrigin: position === "free" ? "page" : "content",
      xMm: photoPlacement.xMm,
      yMm: position === "free" ? photoPlacement.yMm : 0,
      gapMm: 3,
      frame: {
        heightRatio: dossierPhotoRatio(photoStyle.shape),
        radiusMm: photoStyle.shape === "circle" ? 999 : 1.5,
        zoom: photoStyle.zoom,
        xPct: photoStyle.x,
        yPct: photoStyle.y,
        borderWidthMm: photoStyle.borderWidth,
        borderColor: color(photoPlacement.frameColor, cvAccent),
      },
    });
  }
  const entries = (values: CvEntry[], section: string): DocBlock[] =>
    values.filter(entryFilled).map((entry) => {
      const id = `cv.entry.${section}:${entry.id}`;
      const fields = Object.entries({
        date: entry.zeit,
        title: entry.titel,
        place: entry.ort,
        description: entry.beschreibung,
      }).filter(([, text]) => text.trim());
      return {
        kind: "entry",
        id,
        ...(cvVariant === "sidebar" ? { keepTogether: true } : {}),
        blocks: datedEntryBlocks(
          id,
          fields.map(([key, text], index) =>
            p(
              `${id}.${key}`,
              text,
              { ...body, bold: key === "title", italic: key === "date" },
              {
                align:
                  key === "description" || key === "place"
                    ? (settings.cvAlignment ?? "left")
                    : "left",
                // Keep entry metadata with the start of its description. The final
                // paragraph still has keepLines=false so long descriptions flow.
                keepNext: index < fields.length - 1,
                afterMm: index === fields.length - 1 ? cvFlow.entryGapMm : 0.5,
              },
            ),
          ),
          cvFlow,
          cvAccent,
        ),
      };
    });
  for (const key of cvSectionOrder(data)) {
    let blocks: DocBlock[] = [],
      title = "";
    if (key === "person") {
      title = data.labels.kontakt || "Kontakt";
      blocks = Object.entries({
        address: person.adresse,
        place: person.plzOrt,
        phone: person.telefon,
        email: person.email,
      })
        .filter(([, text]) => text.trim())
        .map(([field, text]) => p(`cv.person.${field}`, text, body));
      blocks.push(
        ...cvPersonalInfoRows(person).map((row) =>
          p(
            `cv.person.${row.key}`,
            `${row.label}${cd.personalInfoColons === false ? " " : ": "}${row.value}`,
            body,
          ),
        ),
      );
      if (
        cd.personalInfoAligned !== false &&
        !(cvVariant === "sidebar" && placements?.kontakt === "side")
      ) {
        const contactPairs = [
          ["address", "place"],
          ["phone", "email"],
        ]
          .map((pair) =>
            pair
              .map((field) => blocks.find((block) => block.id === `cv.person.${field}`))
              .map((block) => (block ? [block] : [])),
          )
          .filter((cells) => cells.some((cell) => cell.length));
        const details = cvPersonalInfoRows(person).map((row) => [
          [
            p(
              `cv.person.${row.key}.label`,
              row.label + (cd.personalInfoColons === false ? "" : ":"),
              body,
            ),
          ],
          [p(`cv.person.${row.key}`, row.value, body)],
        ]);
        blocks = [
          ...(contactPairs.length
            ? [
                {
                  kind: "table" as const,
                  id: "cv.person.contact",
                  widths: [1, 1],
                  rows: contactPairs.map((cells) => ({ cells, keepTogether: false })),
                  decoration: {
                    borderColor: cvAccent,
                    borderWidthMm: 0,
                    paddingXMm: 1.25,
                    paddingYMm: 0,
                  },
                },
              ]
            : []),
          ...(details.length
            ? [
                {
                  kind: "table" as const,
                  id: "cv.person.details",
                  widths: [0.3, 0.7],
                  rows: details.map((cells) => ({
                    cells,
                    keepTogether: false,
                  })),
                  decoration: {
                    borderColor: cvAccent,
                    borderWidthMm: 0,
                    paddingXMm: 1.25,
                    paddingYMm: 0,
                  },
                },
              ]
            : []),
        ];
      }
    } else if (isCustomSectionKey(key)) {
      const section = customSectionForKey(data, key);
      if (!section) continue;
      title = section.title || "Weitere Angaben";
      blocks = entries(section.entries, key);
    } else {
      if (data.hidden[key]) continue;
      title = data.labels[key] || CV_SECTION_LABELS[key];
      if (key === "schule" || key === "erfahrung") blocks = entries(data[key], key);
      if (key === "sprachen")
        blocks = data.sprachen
          .filter((e) => e.name.trim() || e.niveau.trim())
          .map((e) => ({
            kind: "entry",
            id: `cv.entry.sprachen:${e.id}`,
            blocks: [
              p(
                `cv.entry.sprachen:${e.id}.name`,
                e.name,
                { ...body, bold: true },
                { keepNext: !!e.niveau },
              ),
              ...(e.niveau ? [p(`cv.entry.sprachen:${e.id}.level`, e.niveau, body)] : []),
            ],
          }));
      if (key === "hobbys" || key === "staerken")
        blocks = data[key]
          .map((text, index) => ({ text, index }))
          .filter(({ text }) => text.trim())
          .map(({ text, index }) => p(cvLineFieldId(key, index, data.lineIds?.[key]), text, body));
      if (key === "referenzen")
        blocks = data.referenzen
          .filter((e) =>
            [e.name, e.funktion, e.kontakt, e.email, e.zusatz].some((text) => text?.trim()),
          )
          .map((e) => ({
            kind: "entry",
            id: `cv.entry.referenzen:${e.id}`,
            blocks: Object.entries({
              name: e.name,
              role: e.funktion,
              ...referenceContactFields(e),
            })
              .filter(([, text]) => text.trim())
              .map(([field, text], index) =>
                p(
                  `cv.entry.referenzen:${e.id}.${field}`,
                  text,
                  { ...body, bold: field === "name" },
                  { keepNext: index === 0 },
                ),
              ),
          }));
    }
    if (!blocks.length) continue;
    const layout = cvSectionLayout(data, key);
    if (key === "referenzen" && data.referencesSideBySide !== false && layout.width === "full") {
      blocks = Array.from({ length: Math.ceil(blocks.length / 2) }, (_, index) => {
        const pair = blocks.slice(index * 2, index * 2 + 2);
        return {
          kind: "table",
          id: `cv.section.referenzen.pair:${pair.map((entry) => entry.id).join("|")}`,
          widths: [1, 1],
          rows: [{ cells: [pair.slice(0, 1), pair.slice(1)], keepTogether: false }],
          decoration: { borderColor: cvAccent, borderWidthMm: 0, paddingXMm: 3, paddingYMm: 0 },
        };
      });
    }
    if (layout.positioning === "free")
      issues.push({
        code: "free-section-converted-to-flow",
        fieldId: `cv.section.${key}`,
        message:
          "Word CV sections flow to preserve editing; absolute section positioning requires explicit acceptance.",
      });
    const sectionHeading = heading(`cv.section.${key}.heading`, title);
    sectionHeading.indentMm =
      cvFlow.indentMm +
      (layout.width === "half" ? Math.max(0, rubric.horizontalMm) : rubric.horizontalMm);
    if (rubric.pill) {
      for (const run of sectionHeading.runs) {
        const ink = run.style.color;
        const paper = color(cd.paperColor, "FFFFFF");
        run.style.backgroundColor = [0, 2, 4]
          .map((offset) =>
            Math.round(
              parseInt(ink.slice(offset, offset + 2), 16) * 0.14 +
                parseInt(paper.slice(offset, offset + 2), 16) * 0.86,
            )
              .toString(16)
              .padStart(2, "0"),
          )
          .join("")
          .toUpperCase();
      }
    }
    if (cd.headingRule === "short") {
      const afterMm = sectionHeading.afterMm;
      sectionHeading.afterMm = 0;
      delete sectionHeading.ruleColor;
      blocks.unshift({
        kind: "rule",
        id: `${sectionHeading.id}.rule`,
        color: cvAccent,
        lengthMm: 18,
        afterMm,
        keepNext: true,
        indentMm: (sectionHeading.indentMm ?? 0) - cvFlow.indentMm - rubric.contentIndentMm,
      });
    }
    cvPart.blocks.push({
      kind: "section",
      id: `cv.section.${key}`,
      heading: sectionHeading,
      blocks,
      placement: placements?.[key === "person" ? "kontakt" : key] ?? "main",
      width: layout.width,
      startPage: layout.page,
      contentIndentMm: cvFlow.indentMm + rubric.contentIndentMm,
    });
  }
  if (cv.design.useElements) {
    const slots = TEMPLATES.find((item) => item.id === cv.design.template)?.slots ?? [];
    const customBlocks = buildCustomBlocks(
      cv.design.template,
      cv.elements,
      cv.elementStyles,
      slots,
    );
    const context = elementContext(
      cv.design.colors,
      wordFont(cv.design.font, theme.font),
      1,
      color(cv.design.paperColor, theme.paper),
    );
    const firstPage: DocBlock[] = [],
      secondPage: DocBlock[] = [],
      firstArtwork: DocBlock[] = [],
      secondArtwork: DocBlock[] = [];
    const pages = new Map(cv.elements.map((element) => [element.id, element.page ?? 1]));
    for (const original of customBlocks) {
      if (original.style.hidden) continue;
      const block =
        cv.design.font && !cv.elementStyles[original.id]?.font
          ? { ...original, style: { ...original.style, font: cv.design.font } }
          : original;
      const id = dossierElementFieldId("cv", block.id);
      const target = pages.get(block.id) === 2 ? secondPage : firstPage;
      if (block.kind === "shape") {
        (target === firstPage ? firstArtwork : secondArtwork).push(
          shapeElement(block, id, context),
        );
      } else if (block.kind === "image") {
        const image = imageElement(block, id, context.colors, color, theme.accent);
        if (image) target.push(image);
      } else {
        target.push(
          ...flowingElementBox(block, id, textElement(block, id, context), context, cvPart.page),
        );
      }
    }
    const firstSection = cvPart.blocks.findIndex((block) => block.kind === "section");
    const sourceY = (block: DocBlock) =>
      block.kind === "table" || block.kind === "image" ? (block.sourceLayout?.yMm ?? 0) : 0;
    firstPage.sort((a, b) => sourceY(a) - sourceY(b));
    secondPage.sort((a, b) => sourceY(a) - sourceY(b));
    if (firstPage.length)
      cvPart.blocks.splice(firstSection < 0 ? cvPart.blocks.length : firstSection, 0, {
        kind: "group",
        id: "cv.elements.page:1",
        blocks: firstPage,
      });
    cvPart.blocks.unshift(...firstArtwork);
    if (secondPage.length || secondArtwork.length) {
      const nextPage = cvPart.blocks.findIndex(
        (block) => block.kind === "section" && block.startPage === 2,
      );
      cvPart.blocks.splice(nextPage < 0 ? cvPart.blocks.length : nextPage, 0, {
        kind: "group",
        id: "cv.elements.page:2",
        blocks: [...secondArtwork, ...secondPage],
        startPage: 2,
      });
    }
  }
  const defaultChrome = template.chrome.defaultContact;
  const chromeState =
    settings.chrome ??
    (defaultChrome
      ? {
          ...structuredClone(DEFAULT_DOSSIER_CHROME_STATE),
          shared: {
            ...DEFAULT_DOSSIER_CHROME_STATE.shared,
            headerMode: "contact" as const,
            headerHeightMm: defaultChrome.heightMm,
            headerGapMm: defaultChrome.gapMm,
          },
        }
      : undefined);
  if (chromeState) {
    const resolved = resolveDossierChromeSnapshot({ cover, letter, cv }, chromeState);
    for (const target of [letterPart, cvPart]) {
      const scope = target.id as "letter" | "cv";
      const { options, contact, content } = resolved[scope];
      const bandPolicy = template.chrome.band;
      const authoredChrome = chromeState.sync ? chromeState.shared : chromeState[scope];
      const explicitHeaderSurface =
        bandPolicy?.surfaceSource === "descriptor"
          ? !!(authoredChrome.headerBackgroundColor || authoredChrome.headerGradientColor)
          : !!(options.headerBackgroundColor || options.headerGradientColor);
      const partColors = input[scope].design.colors;
      const partInk =
        template.interiorPaletteSource === "dossier"
          ? scope === "letter"
            ? letterInk
            : cvInk
          : theme.ink;
      const bandFill = color(
        options.headerBackgroundColor ?? (bandPolicy ? partColors[bandPolicy.fillSlot] : undefined),
        theme.accent,
      );
      const headerInk =
        bandPolicy && (bandPolicy.surface !== "motifs" || explicitHeaderSurface)
          ? templateBandInk(bandFill, theme.paper)
          : partInk;
      const footerInk =
        template.chrome.footerSurfaceSlot &&
        (scope !== "cv" ||
          (cv.design.bgOpacity ?? 1) > 0 ||
          options.footerBackgroundColor ||
          options.footerGradientColor)
          ? templateBandInk(
              compositeTextColor(
                color(
                  options.footerBackgroundColor ?? partColors[template.chrome.footerSurfaceSlot],
                  theme.paper,
                ),
                scope === "cv"
                  ? color(cvPalette?.paper, theme.paper)
                  : color(resolveLetterPaperColor(letter.design), theme.paper),
                scope === "cv" && !options.footerBackgroundColor && !options.footerGradientColor
                  ? (cv.design.bgOpacity ?? 1)
                  : 1,
              ),
              theme.paper,
            )
          : partInk;
      const font = wordFont(
        options.textFont ?? undefined,
        scope === "letter" ? letterFont : theme.font,
      );
      const customParagraph = (
        surface: "header" | "footer",
        key: "title" | "text",
        value: string,
        suffix = "",
      ): Paragraph => {
        const fieldId = dossierChromeFieldId(scope, surface, key);
        const result = p(
          `${scope}.${surface}${suffix}.${key}`,
          value,
          {
            font,
            sizePt:
              (surface === "header" ? options.headerFontSizePt : options.footerFontSizePt) ??
              (surface === "header" ? 10 : 8),
            color: color(
              surface === "header" ? options.headerTextColor : options.footerTextColor,
              surface === "header" ? headerInk : footerInk,
            ),
            bold: key === "title",
            ...settings.fieldStyles?.[fieldId],
          },
          { role: "contact", afterMm: 0.5 },
        );
        result.runs.forEach((run) => {
          run.fieldId = fieldId;
        });
        return result;
      };
      const inlineContact = (
        id: string,
        fields: Paragraph[],
        typography: Partial<TextStyle>,
        separator: string,
      ): Paragraph => {
        const result = p(id, "", typography, { role: "contact", afterMm: 0.5 });
        result.runs = fields.flatMap((field, index) => [
          ...(index
            ? [{ id: `${id}.separator:${index}`, text: separator, style: style(id, typography) }]
            : []),
          ...field.runs,
        ]);
        return result;
      };
      const headerFields = {
        name: options.headerShowName ? contact.name : "",
        address: options.headerShowAddress ? contact.address : "",
        place: options.headerShowAddress ? contact.place : "",
        phone: options.headerShowPhone ? contact.phone : "",
        email: options.headerShowEmail ? contact.email : "",
        title: content.headerTitle ?? "",
        text: content.headerText ?? "",
      };
      const headerSourceId = (key: string) => {
        if (["name", "address", "place", "phone", "email"].includes(key))
          return target.id === "letter" ? `letter.sender.${key}` : `cv.person.${key}`;
        return `${target.id}.header.${key}`;
      };
      const header = (mode: "compact" | "contact" | "none", suffix: string): Paragraph[] => {
        if (mode === "none") return [];
        const typography = {
          font,
          sizePt: options.headerFontSizePt ?? 10,
          color: color(options.headerTextColor, headerInk),
        };
        const custom = (["title", "text"] as const)
          .filter((key) => headerFields[key].trim())
          .map((key) => customParagraph("header", key, headerFields[key], suffix));
        if (mode === "compact")
          return custom.length
            ? custom
            : [
                p(`${target.id}.header${suffix}.surface`, "", typography, {
                  role: "caption",
                  afterMm: 0,
                }),
              ];
        const rows = Object.entries(headerFields).filter(
          ([key, value]) => !["title", "text"].includes(key) && value.trim(),
        );
        const contactFields = rows.map(([key, value]) => {
          const paragraph = p(
            `${target.id}.header${suffix}.${key}`,
            value,
            { ...typography, ...settings.fieldStyles?.[headerSourceId(key)] },
            { role: "contact", afterMm: 0.5 },
          );
          paragraph.runs.forEach((run) => {
            run.fieldId = headerSourceId(key);
          });
          return paragraph;
        });
        if (options.headerTextLayout === "inline") {
          const separators = { dot: " · ", icons: " · ", slash: " / ", pipe: " | ", space: "   " };
          return [
            ...custom,
            inlineContact(
              `${scope}.header${suffix}.contact`,
              contactFields,
              typography,
              separators[options.headerInlineSeparator ?? "dot"],
            ),
          ];
        }
        return [...custom, ...contactFields];
      };
      const firstMode = options.headerDifferentFirstPage
        ? options.headerMode
        : (options.headerContinuationMode ?? options.headerMode);
      if (firstMode === "contact") {
        const coveredIds = new Set<string>();
        const coverField = (
          id: string,
          enabled: boolean,
          bodyValue: string,
          headerValue: string,
        ) => {
          if (enabled && bodyValue === headerValue) coveredIds.add(id);
        };
        if (target.id === "letter") {
          coverField("letter.sender.name", options.headerShowName, ld.absenderName, contact.name);
          coverField(
            "letter.sender.address",
            options.headerShowAddress,
            ld.absenderAdresse,
            contact.address,
          );
          coverField(
            "letter.sender.place",
            options.headerShowAddress,
            ld.absenderPlzOrt,
            contact.place,
          );
          coverField(
            "letter.sender.phone",
            options.headerShowPhone,
            ld.absenderTelefon,
            contact.phone,
          );
          coverField(
            "letter.sender.email",
            options.headerShowEmail,
            ld.absenderEmail,
            contact.email,
          );
          target.blocks = target.blocks.filter((block) => !coveredIds.has(block.id));
        } else {
          coverField(
            "cv.person.address",
            options.headerShowAddress,
            person.adresse,
            contact.address,
          );
          coverField("cv.person.place", options.headerShowAddress, person.plzOrt, contact.place);
          coverField("cv.person.phone", options.headerShowPhone, person.telefon, contact.phone);
          coverField("cv.person.email", options.headerShowEmail, person.email, contact.email);
          target.blocks = target.blocks.flatMap((block) => {
            if (block.kind !== "section" || block.id !== "cv.section.person") return [block];
            const remaining = block.blocks.flatMap<DocBlock>((child) => {
              if (coveredIds.has(child.id)) return [];
              if (child.kind !== "table") return [child];
              const rows = child.rows
                .map((row) => ({
                  ...row,
                  cells: row.cells.map((cell) => cell.filter((field) => !coveredIds.has(field.id))),
                }))
                .filter((row) => row.cells.some((cell) => cell.length));
              return rows.length ? [{ ...child, rows }] : [];
            });
            return remaining.some((child) => child.kind !== "rule")
              ? [{ ...block, blocks: remaining }]
              : [];
          });
        }
      }
      target.header = header(options.headerContinuationMode ?? options.headerMode, "");
      if (options.headerDifferentFirstPage)
        target.firstHeader = header(options.headerMode, ".first");
      if (options.footerMode !== "none") {
        const typography = {
          font,
          sizePt: options.footerFontSizePt ?? 8,
          color: color(options.footerTextColor, footerInk),
        };
        const customFields = (["title", "text"] as const).flatMap((key) => {
          const value = key === "title" ? content.footerTitle : content.footerText;
          return value?.trim() ? [customParagraph("footer", key, value)] : [];
        });
        const fields = customFields.length
          ? customFields
          : contact.name
            ? [
                p(`${scope}.footer.name`, contact.name, typography, {
                  role: "contact",
                  afterMm: 0.5,
                }),
              ]
            : [];
        target.footer =
          options.footerTextLayout === "inline" && fields.length
            ? [inlineContact(`${scope}.footer.content`, fields, typography, " · ")]
            : fields;
      }
      target.chrome = {
        headerBackground: options.headerBackgroundColor
          ? color(options.headerBackgroundColor, theme.paper)
          : undefined,
        footerBackground: options.footerBackgroundColor
          ? color(options.footerBackgroundColor, theme.paper)
          : undefined,
        borderColor: options.borderEnabled ? color(options.borderColor, theme.accent) : undefined,
        borderWidthMm: options.borderWidthMm,
      };
      const width = target.page.widthMm - target.page.margins.left - target.page.margins.right;
      const headerHeight =
        firstMode === "none" && (options.headerContinuationMode ?? options.headerMode) === "none"
          ? 0
          : Math.max(
              options.headerHeightMm ?? 0,
              chromeTextHeight(
                template.chrome.ignoreEmptyHeader
                  ? target.header.filter((p) => p.runs.length)
                  : target.header,
                width,
                template.chrome.lineMetricFactor,
              ),
              chromeTextHeight(
                template.chrome.ignoreEmptyHeader
                  ? (target.firstHeader ?? []).filter((p) => p.runs.length)
                  : (target.firstHeader ?? []),
                width,
                template.chrome.lineMetricFactor,
              ),
            );
      const footerHeight =
        options.footerMode === "none"
          ? 0
          : Math.max(options.footerHeightMm ?? 0, chromeTextHeight(target.footer, width));
      target.page.headerDistanceMm += options.headerContentOffsetYMm ?? 0;
      target.page.footerDistanceMm -= options.footerContentOffsetYMm ?? 0;
      if (headerHeight)
        target.page.margins.top =
          Math.max(target.page.margins.top, target.page.headerDistanceMm) +
          headerHeight +
          (options.headerGapMm ?? 4);
      if (scope === "cv" && headerHeight)
        cvHeaderReserveMm = headerHeight + (options.headerGapMm ?? 4);
      if (footerHeight)
        target.page.margins.bottom =
          Math.max(target.page.margins.bottom, target.page.footerDistanceMm) + footerHeight;
      const band = (surface: "header" | "footer", heightMm: number) => {
        const start = target.chrome[`${surface}Background`];
        const end = options[surface === "header" ? "headerGradientColor" : "footerGradientColor"];
        if (!heightMm || (!start && !end)) return;
        const distance =
          target.page[surface === "header" ? "headerDistanceMm" : "footerDistanceMm"];
        target.artwork.push({
          kind: "decorative-artwork",
          id: `${scope}.artwork.${surface}`,
          semanticText: false,
          fill: {
            color: start ?? theme.paper,
            ...(end ? { endColor: color(end, theme.paper) } : {}),
          },
          xMm: 0,
          yMm: surface === "header" ? 0 : target.page.heightMm - distance - heightMm,
          widthMm: target.page.widthMm,
          heightMm: distance + heightMm,
        });
      };
      if (bandPolicy?.surfaceSource !== "descriptor" || explicitHeaderSurface)
        band("header", headerHeight);
      band("footer", footerHeight);
      if (bandPolicy)
        composeHeaderBands(
          target,
          bandPolicy,
          partColors,
          theme.accent,
          firstMode,
          options.headerContinuationMode ?? options.headerMode,
          headerHeight,
          explicitHeaderSurface,
          scope === "cv" ? cv.design.bgOpacity : 1,
        );
      if (scope === "cv" && firstMode === "compact" && bandPolicy) {
        const firstBand = target.artwork.find((paint) => paint.repeat === "first");
        if (firstBand) cvMinimumFirstTopMm = firstBand.heightMm + (options.headerGapMm ?? 4);
      }
      if (scope === "letter" && firstMode === "compact" && template.letter.compactMasthead) {
        const masthead = template.letter.compactMasthead;
        const fill = color(
          options.headerBackgroundColor ?? partColors[masthead.fillSlot],
          theme.accent,
        );
        composeCompactMasthead(target, masthead, fill, (p) => ({
          ...p,
          runs: p.runs.map((run) => ({
            ...run,
            style: {
              ...run.style,
              ...(!design.senderTypography?.color && !settings.fieldStyles?.[p.id]?.color
                ? { color: templateBandInk(fill, theme.paper) }
                : {}),
              ...(!design.senderTypography?.fontSizePt && !settings.fieldStyles?.[p.id]?.sizePt
                ? { sizePt: p.id.endsWith(".name") ? 11 : 9.3 }
                : {}),
            },
          })),
        }));
      }

      if (scope === "letter") {
        const recipient = target.blocks.findIndex((block) =>
          block.id.startsWith("letter.recipient."),
        );
        const gapMm = template.letter.recipientGapMm + (options.letterRecipientOffsetYMm ?? 0);
        if (recipient >= 0 && gapMm > 0)
          target.blocks.splice(recipient, 0, {
            kind: "spacer",
            id: "letter.recipient.gap",
            heightMm: gapMm,
          });
      }
    }
  }
  issues.push(
    ...applyContinuationMargin(
      cvPart,
      settings.cvContinuationTopMarginMm,
      cvFirstTopMargin,
      cvHeaderReserveMm,
      cvMinimumFirstTopMm,
    ),
  );
  composeCvSidebar(
    cvPart,
    cvAccent,
    color(cv.design.paperColor, color(cvPalette?.paper, theme.paper)),
    cv.design.bgOpacity,
  );
  for (const target of [coverPart, letterPart, cvPart]) {
    const policies = template.pageMotifs?.[target.id];
    if (policies)
      composePageMotifs(
        target,
        policies,
        target.id === "cover"
          ? cover.colors
          : {
              ...input[target.id].design.colors,
              sheet: color(
                template.interiorPaletteSource === "dossier"
                  ? target.id === "letter"
                    ? resolveLetterPaperColor(letter.design)
                    : cvPalette!.paper
                  : input[target.id].design.paperColor,
                theme.paper,
              ),
            },
        theme.accent,
        target.id === "cv" ? cv.design.bgOpacity : 1,
      );
  }
  for (const target of [coverPart, letterPart, cvPart]) {
    const paper =
      target.id === "cover"
        ? theme.paper
        : color(
            template.interiorPaletteSource === "dossier"
              ? target.id === "letter"
                ? resolveLetterPaperColor(letter.design)
                : cvPalette!.paper
              : input[target.id].design.paperColor,
            theme.paper,
          );
    if (paper !== "FFFFFF")
      target.artwork.unshift({
        kind: "decorative-artwork",
        id: `${target.id}.artwork.paper`,
        ...(target.headerShapes?.some((shape) => shape.paintLayer !== undefined)
          ? { paintLayer: 0 }
          : {}),
        semanticText: false,
        fill: { color: paper },
        xMm: 0,
        yMm: 0,
        widthMm: target.page.widthMm,
        heightMm: target.page.heightMm,
      });
  }
  for (const target of [coverPart, letterPart, cvPart]) {
    for (const block of walkBlocks(target.blocks)) {
      if (block.kind === "image" && block.opacity !== undefined && block.opacity !== 1)
        issues.push({
          code: "unsupported-image-opacity",
          fieldId: block.id,
          message:
            "Translucent semantic images require native alpha render/edit acceptance. Use full image opacity for this candidate.",
        });
    }
  }
  return {
    version: 1,
    metadata: {
      ...cover.data.meta,
      title: cover.data.meta.title || "Bewerbungsdossier",
      author: cover.data.meta.author || name(cover.data.vorname, cover.data.nachname),
    },
    templateId: template.id,
    theme,
    fonts: fonts.result(),
    cover: coverPart,
    letter: letterPart,
    cv: cvPart,
    issues,
  };
}
