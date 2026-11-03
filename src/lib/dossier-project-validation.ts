import { FONT_LABELS } from "@/components/cover/types";

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const optional = (value: unknown, accepts: (value: unknown) => boolean) =>
  value === undefined || accepts(value);
const text = (value: unknown) => typeof value === "string";
const image = (value: unknown) => value === null || text(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
const records = (value: unknown) => Array.isArray(value) && value.every(record);
const fields = (
  value: Record<string, unknown>,
  keys: string[],
  accepts: (value: unknown) => boolean = text,
) => keys.every((key) => optional(value[key], accepts));
const stringMap = (value: unknown) => record(value) && Object.values(value).every(text);
const entryList = (value: unknown) =>
  records(value) &&
  (value as Record<string, unknown>[]).every((entry) =>
    fields(entry, [
      "id",
      "zeit",
      "titel",
      "ort",
      "beschreibung",
      "name",
      "niveau",
      "funktion",
      "kontakt",
      "email",
      "zusatz",
    ]),
  );
const elements = (value: unknown) =>
  records(value) &&
  (value as Record<string, unknown>[]).every(
    (entry) =>
      fields(entry, ["id", "label", "text", "kind", "shape", "path"]) && optional(entry.src, image),
  );

const bool = (value: unknown) => typeof value === "boolean";
const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
// Earlier chrome/margin normalizers accepted numeric strings. Preserve that
// compatibility without letting arrays, booleans or broken text become numbers.
const numericInput = (value: unknown) =>
  finiteNumber(value) ||
  (text(value) && (value as string).trim() !== "" && Number.isFinite(Number(value)));
const nullable = (accepts: (value: unknown) => boolean) => (value: unknown) =>
  value === null || accepts(value);
const versionOne = (value: Record<string, unknown>) => optional(value.version, (v) => v === 1);
const choice =
  (...values: string[]) =>
  (value: unknown) =>
    text(value) && values.includes(value as string);

function chromeOptions(value: unknown): boolean {
  return (
    record(value) &&
    fields(value, ["headerMode", "headerContinuationMode"], choice("compact", "contact", "none")) &&
    optional(value.footerMode, choice("compact", "details", "none")) &&
    fields(value, ["headerTextLayout", "footerTextLayout"], choice("stacked", "inline")) &&
    optional(value.headerInlineSeparator, choice("dot", "icons", "slash", "pipe", "space")) &&
    fields(
      value,
      [
        "headerShowName",
        "headerShowAddress",
        "headerShowPhone",
        "headerShowEmail",
        "headerDifferentFirstPage",
        "borderEnabled",
      ],
      bool,
    ) &&
    fields(
      value,
      [
        "headerHeightMm",
        "headerGapMm",
        "headerContentOffsetYMm",
        "letterRecipientOffsetYMm",
        "headerFontSizePt",
        "footerHeightMm",
        "footerContentOffsetYMm",
        "footerFontSizePt",
        "borderWidthMm",
      ],
      nullable(numericInput),
    ) &&
    fields(
      value,
      [
        "headerBackgroundColor",
        "headerGradientColor",
        "headerTextColor",
        "footerBackgroundColor",
        "footerGradientColor",
        "footerTextColor",
        "borderColor",
        "textFont",
      ],
      nullable(text),
    )
  );
}

function margins(value: unknown): boolean {
  return (
    record(value) && ["top", "right", "bottom", "left"].every((key) => numericInput(value[key]))
  );
}

function typographyBucket(value: unknown): boolean {
  return (
    record(value) &&
    Object.values(value).every(
      (entry) =>
        record(entry) &&
        fields(entry, ["section", "label", "value", "fieldId"]) &&
        optional(entry.contextValues, strings) &&
        optional(
          entry.docxOccurrence,
          (v) => finiteNumber(v) && Number.isInteger(v) && Number(v) >= 0,
        ) &&
        record(entry.style) &&
        fields(entry.style, ["bold", "italic", "underline"], bool),
    )
  );
}

function cvSectionLayouts(value: unknown): boolean {
  return (
    record(value) &&
    Object.values(value).every((layout) =>
      optional(
        layout,
        nullable(
          (entry) =>
            record(entry) &&
            optional(entry.page, (page) => page === 1 || page === 2) &&
            optional(entry.width, choice("full", "half")) &&
            optional(entry.positioning, choice("flow", "free")) &&
            optional(entry.packing, choice("rows", "masonry")) &&
            fields(entry, ["x", "y", "widthMm", "heightMm"], nullable(finiteNumber)),
        ),
      ),
    )
  );
}

function portableCvSettings(value: unknown): boolean {
  return (
    record(value) &&
    optional(
      value.layout,
      choice("classic", "modern", "minimal", "timeline", "editorial", "executive"),
    ) &&
    optional(value.infoPosition, choice("standard", "mirrored")) &&
    optional(value.textAlign, choice("left", "justify")) &&
    optional(value.mirrored, bool) &&
    // Older exported projects use null for automatic/default spacing.
    fields(
      value,
      ["sectionGapMm", "continuationTopMarginMm", "continuationGapMm"],
      nullable(finiteNumber),
    ) &&
    optional(
      value.placements,
      (placements) => record(placements) && Object.values(placements).every(choice("side", "main")),
    ) &&
    optional(
      value.photoStyle,
      (style) =>
        record(style) &&
        optional(style.shape, choice("rect", "square", "portrait", "circle")) &&
        fields(style, ["zoom", "x", "y", "borderWidth"], numericInput),
    ) &&
    optional(
      value.photoPlacement,
      (placement) =>
        record(placement) &&
        optional(placement.mode, choice("auto", "left", "right", "frei")) &&
        fields(placement, ["xMm", "yMm", "widthMm"], numericInput) &&
        optional(placement.frameColor, nullable(text)),
    )
  );
}

const fontChoice = choice(...Object.keys(FONT_LABELS));
const roleColor = (value: unknown) =>
  text(value) && /^#[\da-f]{6}$/i.test((value as string).trim());

function roleTypography(value: unknown): boolean {
  return (
    record(value) &&
    optional(value.font, fontChoice) &&
    optional(value.fontSizePt, finiteNumber) &&
    optional(value.color, roleColor) &&
    fields(value, ["bold", "italic", "underline"], bool)
  );
}

function cvAppearance(value: Record<string, unknown>): boolean {
  return (
    optional(
      value.design,
      (design) =>
        record(design) &&
        fields(
          design,
          [
            "titleScale",
            "headingScale",
            "bodyScale",
            "bgOpacity",
            "sidebarPct",
            "docTitleFontSizePx",
            "docTitleMarginBottomPx",
            "sectionTitleFontSizePx",
            "sectionTitleMarginBottomPx",
            "sectionTitleOffsetMm",
            "sectionContentIndentMm",
            "citrusRubricOffsetMm",
            "citrusContentIndentMm",
          ],
          finiteNumber,
        ) &&
        fields(
          design,
          [
            "useElements",
            "personalInfoColons",
            "personalInfoAligned",
            "showDocumentTitle",
            "docTitleBold",
            "docTitleItalic",
            "docTitleUnderline",
            "sectionTitleBold",
            "sectionTitleItalic",
            "sectionTitleUnderline",
            "sectionTitlePill",
            "citrusRubricPill",
          ],
          bool,
        ) &&
        optional(design.headingRule, choice("none", "short", "full")) &&
        fields(design, ["docTitleColor", "sectionTitleColor"]) &&
        optional(design.paperColor, nullable(text)),
    ) &&
    (!record(value.data) ||
      !record(value.data.person) ||
      optional(value.data.person.nameStyle, nullable(roleTypography)))
  );
}

function letterAppearance(value: Record<string, unknown>): boolean {
  return (
    optional(
      value.design,
      (design) =>
        record(design) &&
        fields(
          design,
          ["senderTypography", "recipientTypography", "subjectTypography"],
          nullable(roleTypography),
        ) &&
        fields(
          design,
          [
            "dateFont",
            "salutationFont",
            "bodyFont",
            "closingFont",
            "signatureFont",
            "attachmentsFont",
          ],
          fontChoice,
        ) &&
        fields(
          design,
          [
            "dateFontSizePt",
            "salutationFontSizePt",
            "bodyFontSizePt",
            "closingFontSizePt",
            "signatureFontSizePt",
            "attachmentsFontSizePt",
            "bgOpacity",
          ],
          finiteNumber,
        ) &&
        optional(design.fontOverride, nullable(fontChoice)) &&
        fields(design, ["paperColor", "textColor"], nullable(text)) &&
        optional(design.continuationTopMarginMm, nullable(finiteNumber)) &&
        fields(design, ["senderAlign", "recipientAlign", "dateAlign"], choice("left", "right")) &&
        fields(design, ["ruleAfterSender", "ruleAfterRecipient", "ruleAfterSubject"], bool),
    ) &&
    (!record(value.data) ||
      (fields(value.data, ["grussAbstandMm", "unterschriftAbstandMm"], finiteNumber) &&
        optional(value.data.showBeilagen, bool) &&
        optional(
          value.data.images,
          (images) =>
            records(images) &&
            (images as Record<string, unknown>[]).every(
              (image) =>
                optional(image.side, choice("left", "right")) &&
                optional(image.placement, choice("left", "right", "free")) &&
                // These three historic dimensions use Number(); free x is strictly numeric.
                fields(image, ["widthMm", "topMm", "gapMm"], numericInput) &&
                optional(image.xMm, finiteNumber),
            ),
        )))
  );
}

/** File imports must reject corrupt supplied settings before normalization can
 * discard them and a full replacement clears the existing choices. Missing
 * legacy extensions and unknown additive fields remain supported. Browser
 * storage readers retain their existing tolerant normalization policy. */
export function validDossierProjectSettings(value: Record<string, unknown>): boolean {
  return (
    optional(
      value.chrome,
      (chrome) =>
        record(chrome) &&
        versionOne(chrome) &&
        optional(chrome.sync, bool) &&
        fields(chrome, ["shared", "cv", "letter"], chromeOptions),
    ) &&
    optional(
      value.hyphenation,
      (state) =>
        bool(state) || (record(state) && versionOne(state) && optional(state.enabled, bool)),
    ) &&
    optional(
      value.pageMargins,
      (state) => record(state) && fields(state, ["cv", "letter"], margins),
    ) &&
    optional(
      value.fieldTypography,
      (state) =>
        record(state) && versionOne(state) && fields(state, ["cv", "letter"], typographyBucket),
    ) &&
    (!record(value.cv) ||
      (optional(value.cv.portableState, portableCvSettings) && cvAppearance(value.cv))) &&
    (!record(value.letter) || letterAppearance(value.letter))
  );
}

/** Validate supplied structures that editors consume as strings/arrays. Missing
 * historical fields and unknown additive fields remain compatible. This is a
 * file-load boundary, not a migration of the active browser storage format. */
export function validDossierProjectPart(kind: "cover" | "letter" | "cv", value: unknown): boolean {
  if (!record(value) || !record(value.data)) return false;
  const data = value.data;
  if (
    !optional(value.design, record) ||
    !optional(value.elements, elements) ||
    !optional(value.customs, elements) ||
    !optional(value.elementStyles, record)
  )
    return false;
  if (
    record(value.design) &&
    (!optional(value.design.colors, stringMap) ||
      !fields(value.design, ["template"]) ||
      !optional(value.design.font, image))
  )
    return false;

  if (kind === "cover") {
    return (
      fields(data, [
        "kicker",
        "eyebrow",
        "beruf",
        "lehrbeginn",
        "vorname",
        "nachname",
        "adresse",
        "plzOrt",
        "telefon",
        "email",
        "geburtsdatum",
        "lehrbetrieb",
        "ansprechperson",
        "betriebAdresse",
        "ort",
        "datum",
        "labelKontakt",
        "labelEmpfaenger",
      ]) &&
      optional(data.foto, image) &&
      optional(data.beilagen, strings) &&
      optional(data.meta, stringMap) &&
      fields(value, ["template"]) &&
      optional(value.font, image) &&
      optional(value.colors, (colors) => record(colors) && Object.values(colors).every(stringMap))
    );
  }
  if (kind === "letter") {
    return (
      fields(data, [
        "absenderName",
        "absenderAdresse",
        "absenderPlzOrt",
        "absenderTelefon",
        "absenderEmail",
        "empfaengerFirma",
        "empfaengerName",
        "empfaengerAdresse",
        "empfaengerPlzOrt",
        "ort",
        "datum",
        "betreff",
        "anrede",
        "text",
        "richTextHtml",
        "gruss",
        "unterschrift",
      ]) &&
      optional(data.beilagen, strings) &&
      optional(data.attachmentIds, strings) &&
      optional(
        data.images,
        (images) =>
          records(images) &&
          (images as Record<string, unknown>[]).every((entry) =>
            fields(entry, ["id", "src", "side"]),
          ),
      )
    );
  }
  if (
    !optional(
      data.person,
      (person) =>
        record(person) &&
        fields(person, [
          "vorname",
          "nachname",
          "adresse",
          "plzOrt",
          "telefon",
          "email",
          "geburtsdatum",
          "geburtsort",
          "heimatort",
          "nationalitaet",
          "untertitel",
        ]) &&
        optional(person.foto, image),
    )
  )
    return false;
  if (
    !["schule", "erfahrung", "sprachen", "referenzen"].every((key) =>
      optional(data[key], entryList),
    )
  )
    return false;
  if (!["hobbys", "staerken", "sectionOrder"].every((key) => optional(data[key], strings)))
    return false;
  return (
    // Null/missing legacy layouts mean automatic placement. Supplied choices
    // and coordinates must be usable, rather than silently becoming defaults.
    optional(data.sectionLayouts, nullable(cvSectionLayouts)) &&
    optional(data.labels, stringMap) &&
    optional(
      data.hidden,
      (hidden) =>
        record(hidden) && Object.values(hidden).every((value) => typeof value === "boolean"),
    ) &&
    optional(data.titel, text) &&
    optional(
      data.customSections,
      (sections) =>
        records(sections) &&
        (sections as Record<string, unknown>[]).every(
          (section) =>
            fields(section, ["id", "title", "preset"]) && optional(section.entries, entryList),
        ),
    )
  );
}
