import type { CvSidebarTextMetrics } from "./cv-sidebar-text-metrics";
import type { DocBlock, DocumentPart, Paragraph, TableBlock } from "./model";
import type { DossierAppSnapshot } from "./source";
import { cvPersonalInfoRows } from "@/lib/cv-personal-info";
import { datedEntryBlocks, tableColumnWidths, nativeTextHeightMm } from "./layouts";
import { interiorMetricsKey } from "./interior-metrics";
import { resolveDossierChromeSnapshot } from "@/lib/dossier-resolved-chrome";
import { resolveCvRubricOptions } from "@/components/cv/citrus-rubric";
import { cvFrameFor, cvSurface } from "@/components/cv/archetype";
import { MODERN_SHEET_CIRCLE } from "@/components/dossier/sheet-geometry";
import { datedFlowAfterMm, NATIVE_BOUNDARY_HEIGHT_MM } from "./flow-boundaries";
import { compositeTextColor } from "./colors";
import {
  DEFAULT_DOSSIER_CHROME_STATE,
  effectiveDossierHeaderModeForOptions,
} from "@/lib/dossier-chrome";

/** Apply fresh CSS typography to the existing native owners. No absolute text positions. */
export function applyCvSidebarTypography(
  part: DocumentPart,
  source: DossierAppSnapshot,
  metrics: CvSidebarTextMetrics,
): void {
  if (
    part.id !== "cv" ||
    part.layout.mode !== "sidebar" ||
    metrics.version !== 3 ||
    metrics.sourceKey !== interiorMetricsKey(source) ||
    !metrics.profile.startsWith("brief-sans-v1;")
  )
    throw Error("DOCX Next: Sidebar-Schriftwerte fehlen oder sind veraltet.");
  const resolved = resolveDossierChromeSnapshot(
    source,
    source.settings.chrome ?? DEFAULT_DOSSIER_CHROME_STATE,
  ).cv;
  const contactHeaders = metrics.contactHeaders === true;
  const rubric = resolveCvRubricOptions(source.cv.design);
  if (rubric.pill || rubric.horizontalMm !== 0 || rubric.contentIndentMm !== 0)
    throw Error(
      "DOCX Next: Sidebar-Schriftwerte unterstützen nur unverrückte Rubriken ohne Pills.",
    );
  if (
    source.cv.design.font !== "sans" ||
    resolved.options.headerMode !== (contactHeaders ? "contact" : "compact") ||
    effectiveDossierHeaderModeForOptions(resolved.options, 1) !== resolved.options.headerMode ||
    resolved.options.footerMode !== "compact" ||
    Object.values(resolved.content).some((v) => v?.trim()) ||
    resolved.options.headerGradientColor ||
    resolved.options.footerGradientColor
  )
    throw Error(
      "DOCX Next: Sidebar-Schriftwerte benötigen Sans, kompakte oder gemessene Kontaktköpfe und einen leeren kompakten Fuss.",
    );
  if (contactHeaders && (!part.firstHeader || !part.headerFrames?.length))
    throw Error("DOCX Next: Sidebar-Kontaktkopf benötigt frische native Header-Besitzer.");
  const body = part.blocks.find((b) => b.kind === "table" && b.id === "cv.sidebar") as TableBlock;
  if (!body?.bodyBoundaryLeadByCellMm)
    throw Error("DOCX Next: Sidebar-Schriftwerte benötigen die gemeinsame Geometrie.");
  const personal = new Map(
    cvPersonalInfoRows(source.cv.data.person).map((row) => [`cv.person.${row.key}`, row]),
  );
  const fail = (id: string): never => {
    throw Error(`DOCX Next: Ungültige oder unvollständige Sidebar-Schriftwerte (${id}).`);
  };
  const seen = new Set<string>();
  const paragraphWidths = new Map<Paragraph, number>();
  const dateHeights = new Map<TableBlock, number>();
  for (const [id, field] of Object.entries(metrics.fields)) {
    const s = field.style;
    if (
      !id.startsWith("cv.") ||
      !field.text.trim() ||
      s.font !== "Arial" ||
      ![
        s.sizePt,
        s.trackingPt ?? 0,
        field.lineHeightPt,
        field.normalLineHeightFactor,
        field.beforeMm,
        field.afterMm,
        field.documentScale,
      ].every(Number.isFinite) ||
      s.sizePt < 5 ||
      s.sizePt > 72 ||
      field.lineHeightPt <= 0 ||
      field.normalLineHeightFactor < 1 ||
      field.normalLineHeightFactor > 2 ||
      Math.min(field.beforeMm, field.afterMm) < 0 ||
      field.documentScale < 0.5 ||
      field.documentScale > 2 ||
      !/^[A-F0-9]{6}$/.test(s.color)
    )
      fail(id);
  }
  function paragraph(p: Paragraph, widthMm: number) {
    paragraphWidths.set(p, widthMm);
    const field = metrics.fields[p.id];
    if (!field) fail(p.id);
    const text = p.runs
      .map((r) => r.text)
      .join("")
      .trim();
    const info = personal.get(p.id);
    const knownLabelledValue =
      info &&
      field.text === info.value &&
      text ===
        `${info.label}${source.cv.design.personalInfoColons === false ? " " : ": "}${info.value}`;
    if (text !== field.text && !knownLabelledValue) fail(p.id);
    seen.add(p.id);
    p.runs = p.runs.map((run) => {
      const own = run.fieldId ? metrics.fields[run.fieldId] : undefined;
      const style = {
        ...(own && own.text === run.text ? own.style : field.style),
      };
      // Canonical compound subfields retain explicit saved overrides, including
      // fields the Web currently renders inside the untagged name container.
      const override =
        run.fieldId && run.fieldId !== p.id
          ? source.settings.fieldStyles?.[run.fieldId]
          : undefined;
      if (override)
        for (const key of Object.keys(override) as (keyof typeof style)[]) {
          if (key === "sizePt" || key === "trackingPt") {
            const value = run.style[key];
            if (value !== undefined) style[key] = value * field.documentScale;
          } else Object.assign(style, { [key]: run.style[key] });
        }
      return { ...run, style };
    });
    p.beforeMm = field.beforeMm;
    p.afterMm = field.afterMm;
    if (p.runs.some((r) => r.style.font !== "Arial")) fail(p.id);
    // CSS specifies baseline advance in font-size units. Native "multiple"
    // uses the font's normal line, including its intrinsic leading. Convert
    // between those bases without exact line boxes or smaller text.
    p.fontLineHeightFactor = field.normalLineHeightFactor;
    p.lineHeight =
      field.lineHeightPt /
      (Math.max(...p.runs.map((r) => Math.round(r.style.sizePt * 2) / 2)) *
        field.normalLineHeightFactor);
    delete p.minimumLineHeightPt;
    // Remove the old template paragraph border/capsule; the source owns its rule.
    delete p.ruleColor;
    delete p.bottomRule;
    delete p.flowSurface;
    p.runs.forEach((r) => delete r.style.backgroundColor);
    if (field.listIndentMm !== undefined) {
      if (
        !Number.isFinite(field.listIndentMm) ||
        field.listIndentMm <= 0 ||
        field.listIndentMm > 12
      )
        fail(p.id);
      p.list = "bullet";
      p.listGroupId = p.id.split(":")[0] + ".list";
      p.listIndentMm = field.listIndentMm;
      if (
        !field.listMarkerStyle ||
        !/^[A-F0-9]{6}$/.test(field.listMarkerStyle.color) ||
        typeof field.listMarkerStyle.bold !== "boolean"
      )
        fail(p.id);
      p.listMarkerStyle = { ...field.listMarkerStyle! };
    }
    const heading = metrics.headings[p.id];
    if (p.id.startsWith("cv.section.") && p.id.endsWith(".heading") && !heading) fail(p.id);
    if (heading) {
      if (![heading.beforeMm, heading.afterMm].every((n) => Number.isFinite(n) && n >= 0))
        fail(p.id);
      p.beforeMm += heading.beforeMm;
      p.afterMm += heading.afterMm;
      if (heading.rule) {
        const r = heading.rule;
        if (
          ![r.textWidthMm, r.gapMm, r.heightMm, r.opacity].every(Number.isFinite) ||
          Math.min(r.textWidthMm, r.heightMm) <= 0 ||
          r.gapMm < 0 ||
          r.opacity < 0 ||
          r.opacity > 1 ||
          (r.placement !== undefined && r.placement !== "below") ||
          !/^[A-F0-9]{6}$/.test(r.color)
        )
          fail(p.id);
        if (r.placement === "below") {
          // The border follows the editable paragraph as it wraps in Word.
          // No measured text height or page-positioned decorative image.
          p.bottomRule = {
            color: compositeTextColor(r.color, metrics.surfaces.first.sidebarColor, r.opacity),
            heightMm: r.heightMm,
            gapMm: r.gapMm,
          };
          delete p.rightIndentMm;
          return;
        }
        if (r.textWidthMm + r.gapMm >= widthMm) return;
        p.flowSurface = {
          variant: "rule",
          widthMm: r.textWidthMm,
          rowWidthMm: widthMm,
          heightMm: (field.lineHeightPt * 25.4) / 72,
          paddingXMm: 0,
          paddingYMm: 0,
          ink: field.style.color,
          outlineMm: 0,
          rule: {
            color: r.color,
            gapMm: r.gapMm,
            heightMm: r.heightMm,
            opacity: r.opacity,
          },
        };
        // The CSS gap also belongs to the native text track. Reserving only
        // the exact browser advance makes Word's half-point rounding wrap
        // single words. Text can use the authored gap before the painted rule.
        p.rightIndentMm = widthMm - r.textWidthMm - r.gapMm;
      }
    }
  }
  function visit(block: DocBlock, widthMm: number): void {
    if (block.kind === "paragraph") paragraph(block, widthMm);
    else if (block.kind === "section") {
      if (block.heading) paragraph(block.heading, widthMm);
      block.blocks.forEach((b) => visit(b, widthMm - (block.contentIndentMm ?? 0)));
    } else if (block.kind === "entry" || block.kind === "group") {
      const entry = metrics.entries[block.id];
      if (block.kind === "entry" && !entry) fail(block.id);
      if (entry?.dateRail) {
        if (
          ![entry.dateRail.widthMm, entry.dateRail.gapMm].every(Number.isFinite) ||
          entry.dateRail.widthMm <= 0 ||
          entry.dateRail.gapMm < 0 ||
          block.blocks.some((b) => b.kind !== "paragraph")
        )
          fail(block.id);
        block.blocks = datedEntryBlocks(
          block.id,
          block.blocks as Paragraph[],
          {
            headerGapMm: 0,
            entryGapMm: 0,
            indentMm: 0,
            dateRail: {
              // The authored gap is usable by a no-wrap date. Move only the
              // cell boundary: the adjacent content starts at the same x.
              textWidthMm: entry.dateRail.widthMm + entry.dateRail.gapMm,
              paddingXMm: 0,
              axisWidthMm: 0,
              contentGapMm: 0,
              allowSplit: true,
            },
          },
          "000000",
        );
      }
      block.blocks.forEach((b) => visit(b, widthMm));
      if (entry?.dateRail) {
        const rail = block.blocks[0] as TableBlock;
        if (
          !rail ||
          rail.kind !== "table" ||
          rail.id !== `${block.id}.dateRail` ||
          rail.rows.length !== 1
        )
          fail(block.id);
        const widths = tableColumnWidths(rail, widthMm);
        const height = Math.max(
          ...rail.rows[0].cells.map((cell, index) =>
            nativeTextHeightMm(cell as Paragraph[], widths[index]),
          ),
        );
        // Only bounded short entries get cantSplit. An oversized cantSplit row
        // can clip in Word; long descriptions must retain ordinary native flow.
        const shortBudget =
          (part.page.heightMm - part.page.margins.top - part.page.margins.bottom) / 4;
        rail.rows[0].keepTogether = height <= shortBudget;
        dateHeights.set(rail, height);
      }
      if (entry) {
        if (!Number.isFinite(entry.afterMm) || entry.afterMm < 0) fail(block.id);
        const last = lastFlow(block.blocks);
        if (last)
          last.afterMm =
            (last.afterMm ?? 0) +
            (entry.dateRail ? datedFlowAfterMm(entry.afterMm) : entry.afterMm);
      }
    } else if (block.kind === "table") {
      if (
        block.id.startsWith("cv.section.referenzen.pair:") &&
        metrics.referenceGapMm !== undefined
      ) {
        if (
          !Number.isFinite(metrics.referenceGapMm) ||
          metrics.referenceGapMm <= 0 ||
          metrics.referenceGapMm > 20
        )
          fail(block.id);
        if (block.widths.length === 3) block.columnWidthsMm = [null, metrics.referenceGapMm, null];
      }
      const widths = tableColumnWidths(block, block.widthMm ?? widthMm);
      block.rows.forEach((row) =>
        row.cells.forEach((cell, i) => {
          const d = row.cellDecorations?.[i],
            fallback = block.decoration?.paddingXMm ?? 2;
          const width =
            widths[i] -
            (d?.paddingLeftMm ?? d?.paddingXMm ?? fallback) -
            (d?.paddingRightMm ?? d?.paddingXMm ?? fallback);
          cell.forEach((b) => visit(b, width));
        }),
      );
    }
  }
  function lastFlow(blocks: DocBlock[]): Paragraph | TableBlock | undefined {
    for (const b of [...blocks].reverse()) {
      if (b.kind === "paragraph" || b.kind === "table") return b;
      if (b.kind === "entry" || b.kind === "group" || b.kind === "section") {
        const p = lastFlow(b.blocks);
        if (p) return p;
      }
    }
  }
  visit(body, part.page.widthMm - part.page.margins.left - part.page.margins.right);
  const headerId = source.cv.data.person.untertitel ? "cv.person.subtitle" : "cv.person.name";
  const header = findParagraph(body.rows[0].cells.flat(), headerId);
  if (!header) throw Error(`DOCX Next: Sidebar-Kopf fehlt (${headerId}).`);
  if (!Number.isFinite(metrics.headerAfterMm) || metrics.headerAfterMm < 0) fail(headerId);
  header.afterMm += metrics.headerAfterMm;
  if (!seen.has("cv.person.name")) fail("cv.person.name");

  // CSS row wrappers keep vertical margins additive. Word collapses adjacent
  // paragraph spacing; give each gap exactly one existing paragraph owner.
  function fold(blocks: DocBlock[], origin: (gap: number) => boolean) {
    let previous: Paragraph | TableBlock | undefined;
    const one = (b: DocBlock) => {
      if (b.kind === "paragraph") {
        if (previous) {
          previous.afterMm = (previous.afterMm ?? 0) + b.beforeMm;
          b.beforeMm = 0;
        } else if (origin(b.beforeMm)) b.beforeMm = 0;
        if (b.flowSurface && b.beforeMm) fail(b.id);
        if (b.flowSurface) b.flowSurface.spacingOwner = previous ? "previous-block" : "origin";
        previous = b;
      } else if (b.kind === "section") {
        if (b.heading) one(b.heading);
        b.blocks.forEach(one);
      } else if (b.kind === "entry" || b.kind === "group") b.blocks.forEach(one);
      else if (b.kind === "table") {
        b.rows.forEach((row) =>
          row.cells.forEach((cell) =>
            fold(
              cell,
              !previous && ["cv.sidebar.side-story", "cv.sidebar.main-story"].includes(b.id)
                ? origin
                : () => false,
            ),
          ),
        );
        previous = b;
      }
    };
    blocks.forEach(one);
  }
  body.rows[0].cells.forEach((cell, i) =>
    fold(cell, (gap) => {
      body.bodyBoundaryLeadByCellMm![i] += gap;
      return true;
    }),
  );

  // keepNext alone does not reliably bind a heading across a nested table.
  // Use the existing flowing entry owner only for a bounded heading + short
  // first row. Long entries remain splittable, with no fixed text-box height.
  const leadBudget = (part.page.heightMm - part.page.margins.top - part.page.margins.bottom) / 4;
  const attachLeads = (blocks: DocBlock[]) => {
    for (const block of blocks) {
      if (block.kind === "section") {
        const first = block.blocks[0];
        const rail =
          first?.kind === "entry" && first.blocks[0]?.kind === "table"
            ? first.blocks[0]
            : undefined;
        if (
          block.heading &&
          first &&
          rail &&
          dateHeights.has(rail) &&
          rail.rows[0].keepTogether &&
          dateHeights.get(rail)! +
            nativeTextHeightMm([block.heading], paragraphWidths.get(block.heading)!) <=
            leadBudget
        ) {
          const heading = block.heading;
          delete block.heading;
          block.blocks[0] = {
            kind: "entry",
            id: `${block.id}.lead`,
            keepTogether: true,
            blocks: [heading, first],
          };
          // The grouping owner adds two native one-point boundaries. Spend
          // available authored after-space, retaining any unavoidable minimum.
          rail.afterMm = Math.max(0, (rail.afterMm ?? 0) - 2 * NATIVE_BOUNDARY_HEIGHT_MM);
        }
        attachLeads(block.blocks);
      } else if (block.kind === "entry" || block.kind === "group") attachLeads(block.blocks);
      else if (block.kind === "table") block.rows.forEach((row) => row.cells.forEach(attachLeads));
    }
  };
  body.rows[0].cells.forEach(attachLeads);

  // Page motifs sit behind the reading plane and the opaque rail in the App.
  // Keep them as decoration; no semantic text or photo is flattened into paint.
  const railWidth = body.columnWidthsMm![part.layout.side === "right" ? 2 : 0]!;
  const rail = part.artwork.find((a) => a.id === "cv.artwork.sidebar-surface") ?? {
    kind: "decorative-artwork" as const,
    id: "cv.artwork.sidebar-surface",
    semanticText: false as const,
    xMm:
      part.layout.side === "right"
        ? part.page.widthMm - part.page.margins.right - railWidth
        : part.page.margins.left,
    yMm: 0,
    widthMm: railWidth,
    heightMm: part.page.heightMm,
    fill: { color: "FFFFFF" },
  };
  if (!metrics.surfaces) fail("surfaces");
  part.artwork = part.artwork.filter(
    (a) => !["cv.artwork.sidebar-surface", "cv.artwork.sidebar-edge"].includes(a.id),
  );
  part.headerShapes = (part.headerShapes ?? []).map((shape) => {
    if (source.cv.design.template === "modern" && shape.id.startsWith("cv.artwork.motif.")) {
      const circle = MODERN_SHEET_CIRCLE;
      return {
        ...shape,
        xMm: part.page.widthMm - circle.rightMm - circle.sizeMm,
        yMm: circle.topMm,
        widthMm: circle.sizeMm,
        heightMm: circle.sizeMm,
        opacity: circle.opacity * source.cv.design.bgOpacity,
        paintLayer: 10,
      };
    }
    return { ...shape, paintLayer: shape.id.startsWith("cv.measured.") ? 40 : 10 };
  });
  for (const [pageIndex, repeat] of (["first", "continuation"] as const).entries()) {
    const paint = metrics.surfaces[repeat];
    if (
      !paint ||
      !/^[A-F0-9]{6}$/.test(paint.sidebarColor) ||
      !/^[A-F0-9]{6}$/.test(paint.readingPlane.color) ||
      !Number.isFinite(paint.readingPlane.opacity) ||
      paint.readingPlane.opacity < 0 ||
      paint.readingPlane.opacity > 1
    )
      fail("surfaces");
    const box = cvSurface(
      cvFrameFor(source.cv.design.template),
      pageIndex,
      "modern",
      source.cv.design.sidebarPct,
      resolved.options,
    );
    const left = part.layout.side === "right" ? box.right : box.left;
    const right = part.layout.side === "right" ? box.left : box.right;
    part.headerShapes.push({
      kind: "decorative-shape",
      id: `cv.artwork.reading-plane.${repeat}`,
      semanticText: false,
      shape: "rect",
      repeat,
      xMm: left,
      yMm: box.top,
      widthMm: part.page.widthMm - left - right,
      heightMm: part.page.heightMm - box.top - box.bottom,
      radiusMm: 0,
      opacity: paint.readingPlane.opacity,
      fill: { color: paint.readingPlane.color },
      stroke: { color: paint.readingPlane.color, widthMm: 0 },
      paintLayer: 20,
    });
    part.artwork.push({
      ...rail,
      id: repeat === "first" ? rail.id : `${rail.id}.${repeat}`,
      fill: { color: paint.sidebarColor },
      repeat,
      paintLayer: 30,
    });
  }
  part.paintOrder = "layer";

  // Empty compact Web chrome owns paint, with no implicit contact-name story.
  const bands = metrics.compactChrome;
  part.artwork = part.artwork.filter(
    (a) => !["cv.artwork.header", "cv.artwork.footer"].includes(a.id),
  );
  const paint = [] as DocumentPart["artwork"];
  for (const zone of contactHeaders ? [] : (["header", "footer"] as const)) {
    const b = bands[zone];
    if (
      ![b.heightMm, b.borderMm].every(Number.isFinite) ||
      b.heightMm < 0 ||
      b.heightMm > 120 ||
      b.borderMm < 0 ||
      b.borderMm > b.heightMm ||
      ![b.color, b.borderColor].every((c) => /^[A-F0-9]{6}$/.test(c))
    )
      fail(zone);
    if (b.heightMm)
      paint.push({
        kind: "decorative-artwork",
        id: `cv.artwork.${zone}`,
        semanticText: false,
        xMm: 0,
        yMm: zone === "header" ? 0 : part.page.heightMm - b.heightMm,
        widthMm: part.page.widthMm,
        heightMm: b.heightMm,
        fill: { color: b.color },
      });
    if (b.borderMm)
      paint.push({
        kind: "decorative-artwork",
        id: `cv.artwork.${zone}-edge`,
        semanticText: false,
        xMm: 0,
        yMm: zone === "header" ? b.heightMm - b.borderMm : part.page.heightMm - b.heightMm,
        widthMm: part.page.widthMm,
        heightMm: b.borderMm,
        fill: { color: b.borderColor },
      });
  }
  // App compact bands span both tracks and paint above the Sidebar surface.
  part.artwork.push(...paint);
  part.artwork.forEach((a) => {
    if (a.paintLayer === undefined) a.paintLayer = 40;
  });
  part.footer = [];
  if (part.firstFooter) part.firstFooter = [];
  part.page.headerDistanceMm = 0;
  part.chrome.borderColor = undefined;
  part.pagePaintComposition = "single-asset";
  part.pagePaintCoverage = "native-grid";
}

function findParagraph(blocks: DocBlock[], id: string): Paragraph | undefined {
  for (const b of blocks) {
    if (b.kind === "paragraph" && b.id === id) return b;
    if (b.kind === "entry" || b.kind === "section" || b.kind === "group") {
      if (b.kind === "section" && b.heading?.id === id) return b.heading;
      const p = findParagraph(b.blocks, id);
      if (p) return p;
    } else if (b.kind === "table") {
      for (const row of b.rows)
        for (const cell of row.cells) {
          const p = findParagraph(cell, id);
          if (p) return p;
        }
    }
  }
}
