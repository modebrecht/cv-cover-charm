import type {
  DossierDocModel,
  DocumentPart,
  DocBlock,
  Paragraph,
  TableBlock,
  ImageBlock,
  TextRun,
  DecorativeArtwork,
  DecorativeShape,
} from "./model";
import { walkBlocks } from "./model";
import { WordPackage, WORD_PART_TYPES } from "./package";
import { DECL, W, R, namespaces, xml, twips, emu } from "./xml";
import {
  normalizeBrowserImage,
  imageCache,
  type ImageNormalizer,
  type NormalizedImage,
} from "./images";
import { stylesXml, fontTableXml } from "./styles";
import { planNumbering } from "./numbering";
import { validateWordPackage, validateDossierDocModel } from "./validation";
import { rasterizeDecoration, decorationAssetKey, type DecorationRasterizer } from "./decoration";
import { pictureGeometry } from "./picture-geometry";
import { paintPng } from "./artwork";
import { planPartSections, type PlannedSection } from "./section-plan";

export type RenderOptions = {
  normalizeImage?: ImageNormalizer;
  allowUnacceptedModelIssues?: boolean;
  rasterizeDecoration?: DecorationRasterizer;
  onDecorationFailure?: (id: string, error: unknown) => void;
};
function control(id: string, content: string) {
  return `<w:sdt><w:sdtPr><w:alias w:val="${xml(id)}"/><w:tag w:val="${xml(id)}"/></w:sdtPr><w:sdtContent>${content}</w:sdtContent></w:sdt>`;
}
function runProperties(style: TextRun["style"]): string {
  return `<w:rPr><w:rFonts w:ascii="${xml(style.font)}" w:hAnsi="${xml(style.font)}"/><w:b w:val="${style.bold ? 1 : 0}"/><w:i w:val="${style.italic ? 1 : 0}"/>${style.allCaps !== undefined ? `<w:caps w:val="${style.allCaps ? 1 : 0}"/>` : ""}<w:color w:val="${xml(style.color)}"/>${style.trackingPt !== undefined ? `<w:spacing w:val="${Math.round(style.trackingPt * 20)}"/>` : ""}<w:sz w:val="${Math.round(style.sizePt * 2)}"/><w:szCs w:val="${Math.round(style.sizePt * 2)}"/><w:u w:val="${style.underline ? "single" : "none"}"/></w:rPr>`;
}
function run(value: TextRun): string {
  const tokens = value.text
    .replace(/\r/g, "")
    .split(/(\n|\t)/)
    .map((token) =>
      token === "\n"
        ? "<w:br/>"
        : token === "\t"
          ? "<w:tab/>"
          : `<w:t xml:space="preserve">${xml(token)}</w:t>`,
    )
    .join("");
  return `<w:r>${runProperties(value.style)}${tokens}</w:r>`;
}
function paragraph(value: Paragraph, drawingRuns = "", numberingId?: number): string {
  if (value.list && !numberingId) throw new Error(`DOCX Next unplanned list ${value.id}`);
  const style = value.role === "heading" ? "Heading1" : value.role === "title" ? "Title" : "Normal";
  const rule = value.ruleColor
    ? `<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="${xml(value.ruleColor)}"/></w:pBdr>`
    : "";
  // Follow schema ordering (numPr, borders/shading, spacing, alignment) for Word compatibility.
  const props = `<w:pPr><w:pStyle w:val="${style}"/><w:keepNext w:val="${value.keepNext ? 1 : 0}"/><w:keepLines w:val="${value.keepLines ? 1 : 0}"/><w:widowControl/>${value.list ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${numberingId}"/></w:numPr>` : ""}${rule}<w:spacing w:before="${twips(value.beforeMm)}" w:after="${twips(value.afterMm)}" w:line="${Math.round(240 * value.lineHeight)}" w:lineRule="auto"/><w:jc w:val="${value.align === "justify" ? "both" : value.align}"/>${value.list && value.runs[0] ? runProperties(value.runs[0].style) : ""}</w:pPr>`;
  return control(
    value.id,
    `<w:p>${props}${drawingRuns}${value.runs.map(run).join("") || "<w:r/>"}</w:p>`,
  );
}
function emptyParagraphWithRuns(runs = "") {
  return `<w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>${runs}</w:p>`;
}
const emptyParagraph = emptyParagraphWithRuns();
const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

/** One renderer for all semantic blocks. Templates never generate XML. */
export async function renderDossierDocx(
  model: DossierDocModel,
  options: RenderOptions = {},
): Promise<Blob> {
  if (model.issues.length && !options.allowUnacceptedModelIssues)
    throw new Error(
      `DOCX Next has unaccepted model issues: ${model.issues.map((issue) => issue.code).join(", ")}`,
    );
  if (model.cv.layout.mode !== "classic")
    throw new Error(
      "DOCX Next sidebar has not passed Gate 8; no legacy reconstruction fallback is allowed.",
    );
  validateDossierDocModel(model);
  const numbering = planNumbering(model);
  const renderParagraph = (value: Paragraph, drawings = "") =>
    paragraph(value, drawings, numbering.ids.get(value.id));
  const pkg = new WordPackage();
  const normalize = imageCache(options.normalizeImage ?? normalizeBrowserImage);
  const sources = new Map<string, { asset: NormalizedImage; rid: string; file: string }>();
  const blocks = [model.cover, model.letter, model.cv].flatMap((part) => walkBlocks(part.blocks));
  for (const block of blocks)
    if (block.kind === "image" && !sources.has(block.source)) {
      const asset = await normalize(block.source),
        index = sources.size + 1;
      const file = `media/image-${index}.png`,
        rid = `image${index}`;
      sources.set(block.source, { asset, rid, file });
      pkg.add(`word/${file}`, asset.contentType, asset.bytes);
      pkg.relate("word/document.xml", rid, "image", file);
    }
  const decorationSources = new Map<string, { rid: string; file: string }>();
  const decorationIds = new Map<string, string>();
  const rasterize = options.rasterizeDecoration ?? rasterizeDecoration;
  const normalizeDecoration = imageCache((key) => rasterize(JSON.parse(key) as DecorativeShape));
  for (const block of blocks) {
    if (block.kind !== "decorative-shape") continue;
    const key = decorationAssetKey(block);
    try {
      if (!decorationSources.has(key)) {
        const asset = await normalizeDecoration(key);
        const index = decorationSources.size + 1;
        const rid = `decoration${index}`,
          file = `media/decoration-${index}.png`;
        pkg.add(`word/${file}`, asset.contentType, asset.bytes);
        pkg.relate("word/document.xml", rid, "image", file);
        decorationSources.set(key, { rid, file });
      }
      decorationIds.set(block.id, decorationSources.get(key)!.rid);
    } catch (error) {
      if (options.onDecorationFailure) options.onDecorationFailure(block.id, error);
      else console.warn(`DOCX Next omitted nonsemantic decoration ${block.id}:`, error);
    }
  }
  let drawingId = 0;
  function pictureRun(
    value: ImageBlock,
    rid: string,
    geometry: ReturnType<typeof pictureGeometry>,
    widthMm: number,
    page: DocumentPart["page"],
    behind = false,
  ): string {
    const finalWidth = geometry.widthMm,
      finalHeight = geometry.heightMm;
    const cx = emu(finalWidth),
      cy = emu(finalHeight),
      id = ++drawingId;
    const crop = geometry.crop;
    const outline = geometry.borderWidthMm
      ? `<a:ln w="${emu(geometry.borderWidthMm)}"><a:solidFill><a:srgbClr val="${geometry.borderColor}"/></a:solidFill></a:ln>`
      : "";
    const corners =
      geometry.shape === "roundRect"
        ? `<a:gd name="adj" fmla="val ${geometry.cornerAdjustment}"/>`
        : "";
    const picture = `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${xml(value.id)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:srcRect l="${crop.left}" t="${crop.top}" r="${crop.right}" b="${crop.bottom}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="${geometry.shape}"><a:avLst>${corners}</a:avLst></a:prstGeom>${outline}</pic:spPr></pic:pic></a:graphicData></a:graphic>`;
    const extent = `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`;
    const properties = `<wp:docPr id="${id}" name="${xml(value.id)}" descr="${xml(value.alt)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>`;
    const distances = `distT="${emu(value.gapMm)}" distB="${emu(value.gapMm)}" distL="${emu(value.gapMm)}" distR="${emu(value.gapMm)}"`;
    let drawing: string;
    if (value.placement === "inline")
      drawing = `<wp:inline ${distances}>${extent}${properties}${picture}</wp:inline>`;
    else {
      const pageOrigin = value.coordinateOrigin === "page";
      const originWidth = pageOrigin ? page.widthMm : widthMm;
      const inset = geometry.borderWidthMm / 2;
      const x =
        value.placement === "free"
          ? Math.max(inset, Math.min(originWidth - finalWidth - inset, value.xMm))
          : value.placement === "right"
            ? widthMm - finalWidth
            : 0;
      const y = Math.max(
        pageOrigin ? inset : 0,
        Math.min(page.heightMm - finalHeight - inset, value.yMm),
      );
      drawing = `<wp:anchor ${distances} simplePos="0" relativeHeight="${id}" behindDoc="${behind ? 1 : 0}" locked="0" layoutInCell="1" allowOverlap="${behind ? 1 : 0}"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="${pageOrigin ? "page" : "column"}"><wp:posOffset>${emu(x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="${pageOrigin ? "page" : "paragraph"}"><wp:posOffset>${emu(y)}</wp:posOffset></wp:positionV>${extent}${behind ? "<wp:wrapNone/>" : '<wp:wrapSquare wrapText="bothSides"/>'}${properties}${picture}</wp:anchor>`;
    }
    return `<w:r><w:drawing>${drawing}</w:drawing></w:r>`;
  }
  function imageRun(value: ImageBlock, widthMm: number, page: DocumentPart["page"]): string {
    const media = sources.get(value.source)!;
    return pictureRun(
      value,
      media.rid,
      pictureGeometry(value, media.asset, widthMm),
      widthMm,
      page,
    );
  }
  function decorationRun(value: DecorativeShape, page: DocumentPart["page"]): string {
    const rid = decorationIds.get(value.id);
    if (!rid) return "";
    return pictureRun(
      {
        kind: "image",
        id: value.id,
        source: "",
        alt: "",
        widthMm: value.widthMm,
        maxHeightMm: value.heightMm,
        placement: "free",
        coordinateOrigin: "page",
        xMm: value.xMm,
        yMm: value.yMm,
        gapMm: 0,
      },
      rid,
      {
        widthMm: value.widthMm,
        heightMm: value.heightMm,
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        shape: "rect",
        cornerAdjustment: 0,
        borderWidthMm: 0,
        borderColor: "000000",
      },
      page.widthMm,
      page,
      true,
    );
  }
  const paints = new Map<string, string>();
  function artwork(value: DecorativeArtwork, part: DocumentPart, story: string): string {
    const key = `${value.fill.color}:${value.fill.endColor ?? value.fill.color}`;
    if (!paints.has(key)) {
      const file = `media/paint-${paints.size + 1}.png`;
      pkg.add(`word/${file}`, "image/png", paintPng(value.fill));
      paints.set(key, file);
    }
    const rid = `paint-${value.id}`;
    pkg.relate(story, rid, "image", paints.get(key)!);
    return pictureRun(
      {
        kind: "image",
        id: value.id,
        source: key,
        alt: "",
        widthMm: value.widthMm,
        maxHeightMm: value.heightMm,
        placement: "free",
        xMm: value.xMm,
        yMm: value.yMm,
        gapMm: 0,
        coordinateOrigin: "page",
      },
      rid,
      {
        widthMm: value.widthMm,
        heightMm: value.heightMm,
        crop: { left: 0, top: 0, right: 0, bottom: 0 },
        shape: "rect",
        cornerAdjustment: 0,
        borderWidthMm: 0,
        borderColor: "000000",
      },
      part.page.widthMm,
      part.page,
      true,
    );
  }
  function image(value: ImageBlock, widthMm: number, page: DocumentPart["page"]): string {
    return control(
      value.id,
      `<w:p><w:pPr><w:spacing w:after="${twips(3)}"/></w:pPr>${imageRun(value, widthMm, page)}</w:p>`,
    );
  }
  function table(value: TableBlock, widthMm: number, page: DocumentPart["page"]): string {
    const tableWidth = value.widthMm ?? widthMm;
    if (tableWidth + (value.indentMm ?? 0) > widthMm + 0.001)
      throw new Error(`DOCX Next flow box exceeds available width ${value.id}`);
    const d = value.decoration;
    const paddingX = d?.paddingXMm ?? 2,
      paddingY = d?.paddingYMm ?? 0;
    const shading = d?.fillColor
      ? `<w:shd w:val="clear" w:color="auto" w:fill="${d.fillColor}"/>`
      : "";
    const border = d?.borderWidthMm
      ? `w:val="single" w:sz="${Math.min(96, Math.max(2, Math.round(((d.borderWidthMm * 72) / 25.4) * 8)))}" w:color="${d.borderColor}"`
      : 'w:val="nil"';
    const total = value.widths.reduce((sum, width) => sum + width, 0);
    const widths = value.widths.map((width) => (tableWidth * width) / total);
    const rows = value.rows
      .map(
        (row) =>
          `<w:tr>${row.keepTogether ? "<w:trPr><w:cantSplit/></w:trPr>" : ""}${row.cells.map((cell, index) => `<w:tc><w:tcPr><w:tcW w:w="${twips(widths[index])}" w:type="dxa"/>${shading}<w:vAlign w:val="top"/></w:tcPr>${renderBlocks(cell, Math.max(10, widths[index] - paddingX * 2), page)}${emptyParagraph}</w:tc>`).join("")}</w:tr>`,
      )
      .join("");
    // A paragraph boundary keeps adjacent semantic tables independently editable.
    return `<w:tbl><w:tblPr><w:tblW w:w="${twips(tableWidth)}" w:type="dxa"/>${value.indentMm ? `<w:tblInd w:w="${twips(value.indentMm)}" w:type="dxa"/>` : ""}<w:tblBorders>${["top", "left", "bottom", "right"].map((edge) => `<w:${edge} ${border}/>`).join("")}<w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="${twips(paddingY)}" w:type="dxa"/><w:left w:w="${twips(paddingX)}" w:type="dxa"/><w:bottom w:w="${twips(paddingY)}" w:type="dxa"/><w:right w:w="${twips(paddingX)}" w:type="dxa"/></w:tblCellMar><w:tblCaption w:val="${xml(value.id)}"/></w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${twips(width)}"/>`).join("")}</w:tblGrid>${rows}</w:tbl>${emptyParagraph}`;
  }
  function renderBlock(block: DocBlock, widthMm: number, page: DocumentPart["page"]): string {
    if (block.kind === "paragraph") return renderParagraph(block);
    if (block.kind === "image") return image(block, widthMm, page);
    if (block.kind === "decorative-shape")
      return emptyParagraphWithRuns(decorationRun(block, page));
    if (block.kind === "spacer")
      return control(
        block.id,
        `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${Math.max(1, twips(block.heightMm))}" w:lineRule="exact"/></w:pPr></w:p>`,
      );
    if (block.kind === "page-break") return pageBreak;
    if (block.kind === "table") return table(block, widthMm, page);
    if (block.kind === "columns")
      return table(
        {
          kind: "table",
          id: block.id,
          widths: block.widths,
          rows: [{ cells: block.columns, keepTogether: false }],
        },
        widthMm,
        page,
      );
    if (block.kind === "entry" || block.kind === "group")
      return renderBlocks(block.blocks, widthMm, page);
    if (block.kind === "column-flow")
      throw new Error("Column flow must be planned before Word rendering.");
    return `${block.heading ? renderParagraph(block.heading) : ""}${renderBlocks(block.blocks, widthMm, page)}`;
  }
  const rendersContent = (value: DocBlock): boolean =>
    value.kind === "decorative-shape"
      ? decorationIds.has(value.id)
      : value.kind === "group"
        ? value.blocks.some(rendersContent)
        : true;
  function renderBlocks(values: DocBlock[], widthMm: number, page: DocumentPart["page"]): string {
    let result = "",
      page2Started = false;
    for (let index = 0; index < values.length; index++) {
      const block = values[index];
      if (block.kind === "group" && !rendersContent(block)) continue;
      // Floating image geometry is relative to one known paragraph anchor. Do not
      // insert separate anchor paragraphs that move each image's origin downwards.
      if (
        block.kind === "decorative-shape" ||
        (block.kind === "image" && block.placement !== "inline")
      ) {
        const drawings: string[] = [];
        let cursor = index;
        while (
          values[cursor]?.kind === "decorative-shape" ||
          (values[cursor]?.kind === "image" &&
            (values[cursor] as ImageBlock).placement !== "inline")
        ) {
          const value = values[cursor];
          drawings.push(
            value.kind === "decorative-shape"
              ? decorationRun(value, page)
              : imageRun(value as ImageBlock, widthMm, page),
          );
          cursor++;
        }
        const anchor = values[cursor];
        if (anchor?.kind === "paragraph") {
          result += renderParagraph(anchor, drawings.join(""));
          index = cursor;
          continue;
        }
        if (drawings.some(Boolean)) result += emptyParagraphWithRuns(drawings.join(""));
        index = cursor - 1;
        continue;
      }
      if (
        (block.kind === "section" || block.kind === "group") &&
        block.startPage === 2 &&
        !page2Started
      ) {
        result += pageBreak;
        page2Started = true;
      }
      if (block.kind === "section" && block.width === "half") {
        const next = values[index + 1];
        const cells: DocBlock[][] = [[{ ...block, width: "full" }], []];
        if (
          next?.kind === "section" &&
          next.width === "half" &&
          next.startPage === block.startPage
        ) {
          cells[1] = [{ ...next, width: "full" }];
          index++;
        }
        result += table(
          {
            kind: "table",
            id: `${block.id}.half-row`,
            widths: [1, 1],
            rows: [{ cells, keepTogether: false }],
          },
          widthMm,
          page,
        );
      } else result += renderBlock(block, widthMm, page);
    }
    return result;
  }
  const chromeReferences = new Map<string, string>();
  function chrome(part: DocumentPart, scope: "header" | "footer", first = false): string {
    const id = `${part.id}-${scope}${first ? "-first" : ""}`;
    if (chromeReferences.has(id)) return chromeReferences.get(id)!;
    const content = first ? part.firstHeader! : part[scope];
    const story = `word/${id}.xml`;
    const drawings =
      scope === "header" ? part.artwork.map((value) => artwork(value, part, story)).join("") : "";
    const paragraphs = content.length
      ? content.map((value, index) => renderParagraph(value, index === 0 ? drawings : "")).join("")
      : emptyParagraphWithRuns(drawings);
    pkg.add(
      story,
      WORD_PART_TYPES[scope],
      `${DECL}<w:${scope === "header" ? "hdr" : "ftr"} ${namespaces}>${paragraphs}</w:${scope === "header" ? "hdr" : "ftr"}>`,
    );
    pkg.relate("word/document.xml", id, scope, `${id}.xml`);
    const reference = `<w:${scope}Reference w:type="${first ? "first" : "default"}" r:id="${id}"/>`;
    chromeReferences.set(id, reference);
    return reference;
  }
  function section(part: DocumentPart, planned: PlannedSection): string {
    const m = part.page.margins;
    let references = "";
    // Even empty headers/footers explicitly break inheritance between dossier parts.
    references += chrome(part, "header");
    references += chrome(part, "footer");
    if (part.firstHeader && planned.logicalStart) {
      references += chrome(part, "header", true);
      // titlePg selects both first-page stories. Reuse the known footer part
      // explicitly so a different first header does not leave its footer blank.
      references += `<w:footerReference w:type="first" r:id="${part.id}-footer"/>`;
    }
    return `<w:sectPr>${references}<w:type w:val="${planned.breakBefore}"/><w:pgSz w:w="${twips(part.page.widthMm)}" w:h="${twips(part.page.heightMm)}"/><w:pgMar w:top="${twips(m.top)}" w:right="${twips(m.right)}" w:bottom="${twips(m.bottom)}" w:left="${twips(m.left)}" w:header="${twips(part.page.headerDistanceMm)}" w:footer="${twips(part.page.footerDistanceMm)}" w:gutter="0"/>${part.chrome.borderColor ? `<w:pgBorders w:offsetFrom="page">${["top", "left", "bottom", "right"].map((edge) => `<w:${edge} w:val="single" w:sz="${Math.max(1, Math.round(((part.chrome.borderWidthMm * 72) / 25.4) * 8))}" w:space="12" w:color="${part.chrome.borderColor}"/>`).join("")}</w:pgBorders>` : ""}<w:cols w:equalWidth="1" w:num="${planned.columns.count}" w:space="${twips(planned.columns.gapMm)}"/>${part.firstHeader && planned.logicalStart ? "<w:titlePg/>" : ""}</w:sectPr>`;
  }
  const parts = [model.cover, model.letter, model.cv];
  const physicalSections = parts.flatMap((part) =>
    planPartSections(part).map((planned) => ({ part, planned })),
  );
  const body = physicalSections
    .map(({ part, planned }, index) => {
      const widthMm =
        (part.page.widthMm -
          part.page.margins.left -
          part.page.margins.right -
          (planned.columns.count - 1) * planned.columns.gapMm) /
        planned.columns.count;
      const content = renderBlocks(planned.blocks, widthMm, part.page);
      return (
        content +
        (index < physicalSections.length - 1
          ? `<w:p><w:pPr>${section(part, planned)}</w:pPr></w:p>`
          : section(part, planned))
      );
    })
    .join("");
  pkg.add(
    "word/document.xml",
    WORD_PART_TYPES.document,
    `${DECL}<w:document ${namespaces}><w:body>${body}</w:body></w:document>`,
  );
  pkg.add("word/styles.xml", WORD_PART_TYPES.styles, stylesXml(model));
  pkg.add(
    "word/settings.xml",
    WORD_PART_TYPES.settings,
    `${DECL}<w:settings xmlns:w="${W}"><w:autoHyphenation w:val="0"/><w:doNotHyphenateCaps/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
  );
  const fonts = new Set<string>([model.theme.font]);
  for (const part of parts)
    for (const block of walkBlocks([
      ...part.blocks,
      ...part.header,
      ...(part.firstHeader ?? []),
      ...part.footer,
    ]))
      if (block.kind === "paragraph") block.runs.forEach((value) => fonts.add(value.style.font));
  pkg.add("word/fontTable.xml", WORD_PART_TYPES.fontTable, fontTableXml(fonts));
  pkg.add("word/numbering.xml", WORD_PART_TYPES.numbering, numbering.xml);
  for (const type of ["styles", "settings", "fontTable", "numbering"])
    pkg.relate("word/document.xml", type, type, `${type}.xml`);
  pkg.add(
    "docProps/core.xml",
    "application/vnd.openxmlformats-package.core-properties+xml",
    `${DECL}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(model.metadata.title)}</dc:title><dc:creator>${xml(model.metadata.author)}</dc:creator><dc:subject>${xml(model.metadata.subject)}</dc:subject><cp:keywords>${xml(model.metadata.keywords)}</cp:keywords></cp:coreProperties>`,
  );
  pkg.relate("", "document", "officeDocument", "word/document.xml");
  pkg.relationships.push({
    source: "",
    id: "core",
    type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
    target: "docProps/core.xml",
  });
  validateWordPackage(pkg, model);
  return pkg.blob();
}
