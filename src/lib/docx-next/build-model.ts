import type {
  CoverPdfDocument,
  CvPdfDocument,
  LetterPdfDocument,
} from "@/lib/dossier-pdf-document";
import {
  CV_SECTION_LABELS,
  cvSectionOrder,
  cvSectionLayout,
  customSectionForKey,
  entryFilled,
  isCustomSectionKey,
  type CvEntry,
  type CvPlacements,
} from "@/components/cv/types";
import { cvPersonalInfoRows } from "@/lib/cv-personal-info";
import { coverAttachmentValues } from "@/components/cover/types";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import type { DossierChromeState } from "@/lib/dossier-chrome";
import type {
  DossierDocModel,
  DocumentPart,
  DocBlock,
  Paragraph,
  TextStyle,
  Alignment,
  PageMargins,
  ModelIssue,
} from "./model";
import { nextTemplate } from "./templates";
import { wordFont } from "./fonts";
import { richLetterBlocks } from "./rich-text";

export type DossierAppSnapshot = {
  cover: CoverPdfDocument;
  letter: LetterPdfDocument;
  cv: CvPdfDocument;
  settings: {
    chrome?: DossierChromeState;
    margins?: Partial<Record<"letter" | "cv", PageMargins>>;
    cvLayout?: "classic" | "sidebar";
    sidebarSide?: "left" | "right";
    placements?: Partial<CvPlacements>;
    cvAlignment?: Alignment;
    /** Canonical paths only; no visible-value or occurrence matching. */
    fieldStyles?: Record<string, Partial<TextStyle>>;
    unresolvedTypography?: string[];
  };
};
export function color(value: string | null | undefined, fallback: string): string {
  const text = value?.replace(/^#/, "");
  if (text && /^[\da-f]{3}$/i.test(text))
    return [...text]
      .map((c) => c + c)
      .join("")
      .toUpperCase();
  return text && /^[\da-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
}
const name = (first: string, last: string) => [first, last].filter(Boolean).join(" ");

/** Pure and synchronous: all ambient editor state must be captured before calling. */
export function buildDossierDocModel(input: DossierAppSnapshot): DossierDocModel {
  const { cover, letter, cv, settings } = input;
  const template = nextTemplate(String(cover.template));
  if (String(letter.design.template) !== template.id || String(cv.design.template) !== template.id)
    throw new Error("DOCX Next requires matching dossier templates.");
  const theme = {
    font: wordFont(cv.design.font ?? letter.design.fontOverride, template.typography.font),
    ink: color(cover.colors.ink, template.colors.ink),
    accent: color(cover.colors.accent ?? cover.colors.primary, template.colors.accent),
    paper: color(cover.colors.bg, template.colors.paper),
  };
  const issues: ModelIssue[] = (settings.unresolvedTypography ?? []).map((id) => ({
    code: "unresolved-legacy-typography",
    fieldId: id,
    message: "Legacy field identity needs explicit semantic binding before migration.",
  }));
  if (
    theme.paper !== "FFFFFF" ||
    [letter.design.paperColor, cv.design.paperColor].some(
      (value) => value && color(value, "FFFFFF") !== "FFFFFF",
    )
  )
    issues.push({
      code: "page-paper-artwork-pending",
      message:
        "Per-part paper backgrounds need a reviewed Word-native/artwork primitive before migration.",
    });
  if (cv.design.useElements && cv.elements.length)
    issues.push({
      code: "cv-elements-pending",
      message:
        "CV custom artwork/text elements require explicit semantic mapping; they must not disappear silently.",
    });
  const style = (id: string, patch: Partial<TextStyle> = {}): TextStyle => {
    const result = {
      font: theme.font,
      sizePt: template.typography.bodyPt,
      color: theme.ink,
      bold: false,
      italic: false,
      underline: false,
      ...patch,
      ...settings.fieldStyles?.[id],
    };
    return {
      ...result,
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
    runs: text ? [{ id: `${id}.value`, text, style: style(id, patch) }] : [],
    align: "left",
    beforeMm: 0,
    afterMm: 1.5,
    lineHeight: 1.2,
    keepNext: false,
    keepLines: false,
    ...layout,
  });
  const part = (id: DocumentPart["id"]): DocumentPart => ({
    id,
    blocks: [],
    page: {
      widthMm: 210,
      heightMm: 297,
      margins: { ...template.margins, ...(id !== "cover" ? settings.margins?.[id] : {}) },
    },
    header: [],
    footer: [],
    chrome: { borderWidthMm: 0 },
    layout: {
      mode: id === "cv" ? (settings.cvLayout ?? "classic") : "classic",
      side: settings.sidebarSide ?? "left",
      sidebarFraction: cv.design.sidebarPct ?? template.cv.sidebarFraction,
    },
  });
  const coverPart = part("cover"),
    letterPart = part("letter"),
    cvPart = part("cv");
  // Cover fields come with semantic block IDs before any rendering. Geometry becomes flowing composition.
  const aliases: Record<string, string> = { name: "fullName", foto: "photo", beruf: "profession" };
  const rank = (id: string) => {
    const index = template.cover.order.indexOf(id);
    return index < 0 ? 1000 : index;
  };
  const coverBlocks = cover.blocks
    .filter((block) => !block.style.hidden)
    .map((block, index) => ({ block, index }))
    .sort((a, b) => rank(a.block.id) - rank(b.block.id) || a.index - b.index);
  const seenCover = new Set<string>();
  for (const { block } of coverBlocks) {
    const id = `cover.${aliases[block.id] ?? block.id}`;
    if (seenCover.has(id)) throw new Error(`Duplicate cover field identity: ${id}`);
    seenCover.add(id);
    if (block.kind === "shape") {
      issues.push({
        code: "unmapped-cover-artwork",
        fieldId: id,
        message: "Decoration needs a reviewed nonsemantic artwork definition.",
      });
      continue;
    }
    if (block.kind === "photo" || block.kind === "image") {
      const source = block.kind === "photo" ? cover.data.foto : block.src;
      if (
        source &&
        block.kind === "photo" &&
        ((block.style.imgZoom ?? 1) !== 1 || (block.style.radius ?? 0) >= 999)
      )
        issues.push({
          code: "photo-framing-pending",
          fieldId: id,
          message: "Zoom/circle photo framing needs an accepted native Word picture primitive.",
        });
      if (source)
        coverPart.blocks.push({
          kind: "image",
          id,
          source,
          alt: block.label,
          widthMm: Math.min(80, block.style.w || template.cover.photoWidthMm),
          maxHeightMm: 80,
          placement: "inline",
          xMm: 0,
          yMm: 0,
          gapMm: 3,
        });
      continue;
    }
    const lines = block.lines.map((line) =>
      typeof line === "string" ? line : line.map((segment) => segment.t).join(""),
    );
    const text = lines.join("\n");
    if (!text.trim()) continue;
    if (block.id === "empfaenger" && cover.data.showBetriebOnCover === false) continue;
    if (
      ["beilagen", "beilagenTitel"].includes(block.id) &&
      cover.data.showBeilagenOnCover === false
    )
      continue;
    const fontStyle = {
      font: wordFont(block.style.font, theme.font),
      sizePt: block.style.size * cover.fontScale,
      color: color(cover.colors[block.style.color] ?? block.style.color, theme.ink),
      bold: block.style.weight >= 600,
      italic: block.style.italic,
      underline: block.style.underline,
    };
    const paragraph = p(id, text, fontStyle, {
      align: block.style.align === "justify" ? "justify" : block.style.align,
      role: block.id === "beruf" ? "title" : block.id === "name" ? "heading" : "body",
      beforeMm: block.id === "kicker" ? template.cover.heroSpaceMm : 0,
      afterMm: block.id === "name" ? 5 : 2,
      keepNext: ["kicker", "kontaktTitel", "empfaengerTitel", "beilagenTitel"].includes(block.id),
    });
    paragraph.runs = block.lines.flatMap((line, lineIndex) => {
      const segments = typeof line === "string" ? [{ t: line }] : line;
      return segments.map((segment, segmentIndex) => ({
        id: `${id}.line:${lineIndex}.run:${segmentIndex}`,
        text: (lineIndex > 0 && segmentIndex === 0 ? "\n" : "") + segment.t,
        style: style(id, {
          ...fontStyle,
          ...(segment.color
            ? { color: color(cover.colors[segment.color] ?? segment.color, fontStyle.color) }
            : {}),
          ...(segment.weight !== undefined ? { bold: segment.weight >= 600 } : {}),
        }),
      }));
    });
    coverPart.blocks.push(paragraph);
  }
  if (!coverPart.blocks.length)
    coverPart.blocks.push(
      p("cover.fullName", name(cover.data.vorname, cover.data.nachname), {
        sizePt: template.typography.namePt,
        bold: true,
      }),
    );

  const ld = letter.data,
    design = letter.design;
  const letterInk = color(design.textColor ?? design.colors.ink, theme.ink);
  const role = (key: "sender" | "recipient" | "subject"): Partial<TextStyle> => {
    const value = design[`${key}Typography`];
    return {
      color: letterInk,
      ...(value
        ? {
            ...value,
            font: wordFont(value.font, theme.font),
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
    p(
      "letter.date",
      [ld.ort, ld.datum].filter(Boolean).join(", "),
      {
        color: letterInk,
        font: wordFont(design.dateFont, theme.font),
        sizePt: design.dateFontSizePt ?? 10.5,
      },
      { align: design.dateAlign ?? "right", afterMm: 5 },
    ),
  );
  if (ld.betreff)
    letterPart.blocks.push(
      p(
        "letter.subject",
        ld.betreff,
        { bold: true, ...role("subject") },
        { role: "heading", keepNext: true, afterMm: 5 },
      ),
    );
  if (ld.anrede)
    letterPart.blocks.push(
      p(
        "letter.salutation",
        ld.anrede,
        {
          color: letterInk,
          font: wordFont(design.salutationFont, theme.font),
          sizePt: design.salutationFontSizePt ?? 10.5,
        },
        { keepNext: true, afterMm: 3 },
      ),
    );
  const bodyStyle = style("letter.body", {
    color: letterInk,
    font: wordFont(design.bodyFont, theme.font),
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
  letterPart.blocks.push(
    ...richLetterBlocks(
      ld.richTextHtml,
      ld.text,
      bodyStyle,
      template.letter.paragraphSpaceMm,
      template.letter.lineHeight,
    ),
  );
  if (ld.gruss)
    letterPart.blocks.push(
      p(
        "letter.closing",
        ld.gruss,
        {
          color: letterInk,
          font: wordFont(design.closingFont, theme.font),
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
          font: wordFont(design.signatureFont, theme.font),
          sizePt: design.signatureFontSizePt ?? 10.5,
        },
        { beforeMm: ld.unterschriftAbstandMm ?? 1, afterMm: 5 },
      ),
    );
  if (ld.showBeilagen !== false)
    (ld.beilagen ?? ["Lebenslauf", "Zeugnis"])
      .filter((text) => text.trim())
      .forEach((text, index) =>
        letterPart.blocks.push(
          p(`letter.attachment:${index}`, text, {
            color: letterInk,
            font: wordFont(design.attachmentsFont, theme.font),
            sizePt: design.attachmentsFontSizePt ?? 9,
          }),
        ),
      );

  const data = cv.data,
    cd = cv.design,
    person = data.person;
  const cvInk = color(cd.colors.ink, theme.ink),
    cvAccent = color(cd.colors.accent ?? cd.colors.primary, theme.accent);
  const body = { sizePt: template.typography.bodyPt * (cd.bodyScale ?? 1), color: cvInk };
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
        beforeMm: template.cv.sectionSpaceMm,
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
        { role: "title", keepNext: true, afterMm: ((cd.docTitleMarginBottomPx ?? 10) * 25.4) / 96 },
      ),
    );
  cvPart.blocks.push(
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
      { role: "heading", keepNext: !!person.untertitel },
    ),
  );
  if (person.untertitel) cvPart.blocks.push(p("cv.person.subtitle", person.untertitel, body));
  if (person.foto)
    cvPart.blocks.push({
      kind: "image",
      id: "cv.person.photo",
      source: person.foto,
      alt: "CV portrait",
      widthMm: 32,
      maxHeightMm: 45,
      placement: "inline",
      xMm: 0,
      yMm: 0,
      gapMm: 3,
    });
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
        blocks: fields.map(([key, text], index) =>
          p(
            `${id}.${key}`,
            text,
            { ...body, bold: key === "title", italic: key === "date" },
            {
              align:
                key === "description" || key === "place"
                  ? (settings.cvAlignment ?? "left")
                  : "left",
              keepNext: index < Math.min(2, fields.length - 1),
              afterMm: index === fields.length - 1 ? 3 : 0.5,
            },
          ),
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
          .filter((text) => text.trim())
          .map((text, index) => p(`cv.entry.${key}:${index}`, text, body));
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
              contact: e.kontakt,
              email: e.email ?? "",
              extra: e.zusatz ?? "",
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
    if (layout.positioning === "free")
      issues.push({
        code: "free-section-converted-to-flow",
        fieldId: `cv.section.${key}`,
        message:
          "Word CV sections flow to preserve editing; absolute section positioning requires explicit acceptance.",
      });
    cvPart.blocks.push({
      kind: "section",
      id: `cv.section.${key}`,
      heading: heading(`cv.section.${key}.heading`, title),
      blocks,
      placement: settings.placements?.[key === "person" ? "kontakt" : key] ?? "main",
      width: layout.width,
      startPage: layout.page,
    });
  }
  if (settings.chrome) {
    const resolved = resolveDossierChromeSnapshot({ cover, letter, cv }, settings.chrome);
    for (const target of [letterPart, cvPart]) {
      const { options, contact, content } = resolved[target.id as "letter" | "cv"];
      const font = wordFont(options.textFont ?? undefined, theme.font);
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
          color: color(options.headerTextColor, theme.ink),
        };
        const custom = Object.entries(headerFields)
          .filter(([key, value]) => ["title", "text"].includes(key) && value.trim())
          .map(([key, value]) =>
            p(`${target.id}.header${suffix}.${key}`, value, typography, {
              role: "contact",
              afterMm: 0.5,
            }),
          );
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
        if (options.headerTextLayout === "inline") {
          const separators = { dot: " · ", icons: " · ", slash: " / ", pipe: " | ", space: "   " };
          const paragraph = p(`${target.id}.header${suffix}.contact`, "", typography, {
            role: "contact",
            afterMm: 0.5,
          });
          paragraph.runs = rows.map(([key, value], index) => ({
            id: `${target.id}.header${suffix}.${key}`,
            text: (index ? separators[options.headerInlineSeparator ?? "dot"] : "") + value,
            fieldId: headerSourceId(key),
            style: style(`${target.id}.header.${key}`, {
              ...typography,
              ...settings.fieldStyles?.[headerSourceId(key)],
            }),
          }));
          return [...custom, paragraph];
        }
        return [
          ...custom,
          ...rows.map(([key, value]) => {
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
          }),
        ];
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
            const remaining = block.blocks.filter((child) => !coveredIds.has(child.id));
            return remaining.length ? [{ ...block, blocks: remaining }] : [];
          });
        }
      }
      target.header = header(options.headerContinuationMode ?? options.headerMode, "");
      if (options.headerDifferentFirstPage)
        target.firstHeader = header(options.headerMode, ".first");
      if (options.footerMode !== "none")
        target.footer = Object.entries({
          name: contact.name,
          title: content.footerTitle ?? "",
          text: content.footerText ?? "",
        })
          .filter(([, value]) => value.trim())
          .map(([key, text]) =>
            p(
              `${target.id}.footer.${key}`,
              text,
              {
                font,
                sizePt: options.footerFontSizePt ?? 8,
                color: color(options.footerTextColor, theme.ink),
              },
              { role: "contact", afterMm: 0.5 },
            ),
          );
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
      const headerLines = Math.max(target.header.length, target.firstHeader?.length ?? 0);
      target.page.margins.top += headerLines
        ? Math.max(
            options.headerHeightMm ?? 0,
            ((headerLines * (options.headerFontSizePt ?? 10) * 25.4) / 72) * 1.2 + 3,
          ) + (options.headerGapMm ?? 4)
        : 0;
      target.page.margins.bottom += target.footer.length
        ? Math.max(options.footerHeightMm ?? 0, target.footer.length * 4 + 3)
        : 0;
      if (
        options.headerContentOffsetYMm ||
        options.footerContentOffsetYMm ||
        options.letterRecipientOffsetYMm
      )
        issues.push({
          code: "chrome-offset-pending",
          fieldId: `${target.id}.chrome`,
          message: "Signed chrome offsets need a reviewed Word primitive before migration.",
        });
      if (options.headerGradientColor || options.footerGradientColor)
        issues.push({
          code: "chrome-gradient-needs-artwork",
          fieldId: `${target.id}.chrome`,
          message: "Gradient reduced to native solid shading pending artwork acceptance.",
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
    cover: coverPart,
    letter: letterPart,
    cv: cvPart,
    issues,
  };
}
