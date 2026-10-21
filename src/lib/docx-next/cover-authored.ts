import { TEMPLATES, lineText, type Block } from "@/components/cover/types";
import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { resolveCoverAnchors } from "@/components/cover/anchors";
import { hasUserStyle } from "@/components/cover/user-style-precedence";
import { dossierNameScale } from "@/lib/dossier-theme";
import type { DossierCoverSource } from "./source";
import type { DocBlock, DocumentPart } from "./model";
import { textElement, shapeElement } from "./elements";
import { nativeTextHeightMm } from "./layouts";
import { compositeTextColor } from "./colors";
import { coverTextMetricsKey, type CoverTextMetrics } from "@/components/cover/text-metrics";

type Context = Parameters<typeof textElement>[2];
/** Guarded fixed-page composition using existing native paragraphs, images and paint.
 * Conservative native reservations are NOT browser or Word font-metric acceptance.
 */
export function composeAuthoredCover(
  cover: DossierCoverSource,
  page: DocumentPart["page"],
  context: Context,
  fontMetrics?: CoverTextMetrics,
  hiddenDecorationIds: readonly string[] = [],
  badgeComposition?: "native-shape",
  graphicFamilyQa = false,
): DocBlock[] {
  if (!TEMPLATES.find((t) => t.id === cover.template)?.authoredCoverPresentation &&
      !(graphicFamilyQa && ["verlauf", "neon", "freundlich"].includes(cover.template)))
    throw Error("DOCX Next authored cover presentation is not declared for this template");
  if (cover.template === "modern" && cover.customFieldIds?.length)
    throw Error("DOCX Next Modern prototype does not yet accept custom cover elements");
  const blocks = normalizedCoverLabels(cover.blocks, cover.data.labelKontakt);
  if (
    fontMetrics &&
    (fontMetrics.version !== 1 ||
      typeof fontMetrics.profile !== "string" ||
      !fontMetrics.profile.trim() ||
      !fontMetrics.blocks ||
      fontMetrics.sourceKey !== coverTextMetricsKey(blocks, cover.fontScale))
  )
    throw Error("DOCX Next stale or invalid cover font metrics");
  const aliases: Record<string, string> = { name: "fullName", beruf: "profession", foto: "photo" };
  const key = (b: Block) => "cover." + (aliases[b.id] ?? b.id);
  // The packet measures authored cover blocks, not later generic field overrides.
  // Color/underline do not change advances. Font, emphasis, case and spacing can.
  const assertMeasuredTypography = (id: string) => {
    if (!fontMetrics) return;
    const keys = (["font", "sizePt", "bold", "italic", "allCaps", "trackingPt"] as const).filter(
      (key) => context.fieldStyles?.[id]?.[key] !== undefined,
    );
    if (keys.length)
      throw Error(
        `DOCX Next cover font metrics exclude field typography overrides: ${id} (${keys.join(", ")}). Apply the edit to the authored cover block and recapture metrics.`,
      );
  };
  const metrics = new Map<string, { size: number; height: number }>();
  for (const b of blocks) {
    let size =
      b.style.size *
      cover.fontScale *
      (b.id === "name" ? dossierNameScale(b.lines.map(lineText).join("\n")) : 1);
    const measured = b.kind === "text" ? fontMetrics?.blocks[b.id] : undefined;
    if (fontMetrics && b.kind === "text") {
      if (
        !measured ||
        !Number.isFinite(measured.sizePt) ||
        measured.sizePt <= 0 ||
        measured.sizePt > size + 0.1 ||
        measured.sizePt < size * 0.55 - 0.1 ||
        !Number.isInteger(measured.lines) ||
        measured.lines < (b.lines.length ? 1 : 0) ||
        (!b.lines.length && measured.lines !== 0)
      )
        throw Error("DOCX Next invalid cover font measurement: " + b.id);
      if (b.style.maxLines && measured.lines > b.style.maxLines)
        throw Error("DOCX Next measured cover exceeds line budget: " + b.id);
      size = measured.sizePt;
    } else if (b.kind === "text" && b.style.maxLines) {
      const linesAt = (pt: number) =>
        b.lines.reduce(
          (n, line) =>
            n +
            Math.max(
              1,
              Math.ceil(
                lineText(line).length / Math.max(1, b.style.w / (((pt * 25.4) / 72) * 0.6)),
              ),
            ),
          0,
        );
      if (linesAt(size) > b.style.maxLines) {
        let lo = size * 0.55,
          hi = size;
        if (linesAt(lo) > b.style.maxLines)
          throw Error("DOCX Next authored cover text exceeds line budget: " + b.id);
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          if (linesAt(mid) <= b.style.maxLines) lo = mid;
          else hi = mid;
        }
        size = Math.floor(lo * 10) / 10;
      }
    }
    const paragraphs = textElement(
      { ...b, style: { ...b.style, size } },
      key(b),
      { ...context, fontScale: 1 },
      { beforeMm: 0, afterMm: 0 },
    );
    metrics.set(b.id, {
      size,
      height:
        b.kind === "shape" || b.kind === "photo" || b.kind === "image"
          ? b.style.w * (b.style.ratio ?? 1)
          : b.lines.length
            ? measured
              ? (measured.lines * size * b.style.lineHeight * 25.4) / 72 +
                (b.style.bg ? b.style.padY * 2 : 0)
              : nativeTextHeightMm(paragraphs, b.style.w)
            : 0,
    });
  }
  const positions = resolveCoverAnchors(blocks, metrics);
  const result: DocBlock[] = [],
    occupied: { id: string; x: number; y: number; w: number; h: number }[] = [];
  const check = (id: string, x: number, y: number, w: number, h: number) => {
    if (
      ![x, y, w, h].every(Number.isFinite) ||
      x < 0 ||
      y < 0 ||
      w <= 0 ||
      h <= 0 ||
      x + w > page.widthMm ||
      y + h > page.heightMm
    )
      throw Error("DOCX Next authored cover exceeds A4 bounds: " + id);
    for (const o of occupied)
      if (
        !graphicFamilyQa &&
        Math.min(x + w, o.x + o.w) - Math.max(x, o.x) > 0.2 &&
        Math.min(y + h, o.y + o.h) - Math.max(y, o.y) > 0.2
      )
        throw Error("DOCX Next authored cover overlaps: " + id + " / " + o.id);
    occupied.push({ id, x, y, w, h });
  };
  for (const b of blocks) {
    if (b.style.hidden || (b.kind === "text" && !b.lines.some((line) => lineText(line).trim())))
      continue;
    if (["empfaenger", "anTitel"].includes(b.id) && cover.data.showBetriebOnCover === false)
      continue;
    if (["beilagen", "beilagenTitel"].includes(b.id) && cover.data.showBeilagenOnCover === false)
      continue;
    const id = key(b),
      s = b.style,
      pos = positions[b.id];
    if (b.kind === "shape") {
      if (hiddenDecorationIds.includes(b.id)) {
        if (hasUserStyle(b, "hidden"))
          throw Error("DOCX Next CSS-hidden decoration override needs separate acceptance: " + id);
        continue;
      }
      // ShapeElement renders both square circles and non-square capsules using
      // CSS border radius. Shared native paint uses that identical contour.
      // Web uses the resolved anchor, not the stored top; leave the source immutable.
      result.push(shapeElement({ ...b, style: { ...s, y: pos.y } }, id, context));
      continue;
    }
    if (b.kind === "photo" || b.kind === "image") {
      // The shared picture geometry now preserves fully rounded portrait
      // capsules; explicit user radius, crop and aspect ratio remain authoritative.
      const source = b.kind === "photo" ? cover.data.foto : b.src,
        h = s.w * (s.ratio ?? 1);
      if (graphicFamilyQa && b.kind === "photo" && source &&
          (s.follows || s.above || s.anchorBottom ||
            ![s.x, s.y, s.w, h].every(Number.isFinite) ||
            Math.min(s.x, s.y, s.w, h) < 0 ||
            s.x + s.w > page.widthMm || s.y + h > page.heightMm))
        throw Error("DOCX Next saved photo requires safe absolute page coordinates");
      check(id, s.x, pos.y, s.w, h);
      if (s.w > page.widthMm - page.margins.left - page.margins.right)
        throw Error("DOCX Next authored cover picture exceeds native content width: " + id);
      if (source) {
        const border = s.borderWidth ?? (b.kind === "photo" ? 0.3 : 0);
        if (border > 0) {
          const inset = (3 * 25.4) / 96 + border / 2;
          if (
            s.x - inset < 0 ||
            pos.y - inset < 0 ||
            s.x + s.w + inset > page.widthMm ||
            pos.y + h + inset > page.heightMm
          )
            throw Error("DOCX Next authored cover photo mat exceeds A4: " + id);
          result.push({
            kind: "decorative-shape",
            id: id + ".mat",
            semanticText: false,
            shape: s.radius && s.radius >= 999 ? "circle" : "rect",
            xMm: s.x - inset,
            yMm: pos.y - inset,
            widthMm: s.w + 2 * inset,
            heightMm: h + 2 * inset,
            radiusMm: s.radius && s.radius < 999 ? s.radius + inset : 0,
            opacity: 1,
            fill: { color: context.paper ?? "FFFFFF" },
            stroke: {
              color: context.color(
                cover.colors[s.borderColor ?? s.color] ?? s.borderColor ?? s.color,
                context.ink,
              ),
              widthMm: border,
            },
          });
        }
        result.push({
          kind: "image",
          id,
          source,
          alt: b.label,
          widthMm: s.w,
          maxHeightMm: h,
          placement: "free",
          coordinateOrigin: "page",
          ...(graphicFamilyQa ? { wrapMode: "none" as const } : {}),
          xMm: s.x,
          yMm: pos.y,
          gapMm: 0,
          opacity: s.opacity,
          frame: {
            heightRatio: s.ratio ?? 1,
            radiusMm: s.radius ?? 0,
            zoom: s.imgZoom ?? 1,
            xPct: s.imgX ?? 50,
            yPct: s.imgY ?? 50,
            borderWidthMm: 0,
            borderColor: context.ink,
          },
        });
      } else if (b.kind === "photo") {
        if (s.opacity !== 1)
          throw Error(
            "DOCX Next authored cover placeholder opacity needs separate acceptance: " + id,
          );
        const initials = [cover.data.vorname, cover.data.nachname]
          .map((v) => v?.[0])
          .filter(Boolean)
          .join("")
          .toUpperCase();
        if (!initials) continue;
        assertMeasuredTypography(id + ".initials");
        result.push({
          kind: "decorative-shape",
          id: id + ".placeholder-paint",
          semanticText: false,
          shape: s.radius && s.radius >= 999 ? "circle" : "rect",
          xMm: s.x,
          yMm: pos.y,
          widthMm: s.w,
          heightMm: h,
          radiusMm: s.radius && s.radius < 999 ? s.radius : 0,
          opacity: 1,
          fill: s.fill
            ? { color: context.color(cover.colors[s.fill] ?? s.fill, context.paper ?? "FFFFFF") }
            : undefined,
          stroke: {
            color: context.color(cover.colors[s.color] ?? s.color, context.ink),
            widthMm: 25.4 / 96,
          },
        });
        const pt = Math.max(14, s.w * 0.42) * cover.fontScale;
        const paragraphs = textElement(
          {
            ...b,
            kind: "text",
            lines: [initials],
            style: {
              ...s,
              size: pt,
              align: "center",
              lineHeight: 1.2,
              tracking: 0,
              weight: s.weight >= 600 ? s.weight : 400,
            },
          },
          id + ".initials",
          { ...context, fontScale: 1 },
          { beforeMm: 0, afterMm: 0, keepNext: false, keepLines: true },
        );
        result.push({
          kind: "paragraph-frame",
          id: id + ".initials.frame",
          xMm: s.x,
          yMm: graphicFamilyQa
            ? pos.y + h / 2 - ((pt * 25.4) / 72) * 0.58
            : pos.y + (h - ((pt * 25.4) / 72) * 1.2) / 2,
          widthMm: s.w,
          ...(graphicFamilyQa ? { wrapMode: "none" as const } : {}),
          paragraphs,
        });
      } else throw Error("DOCX Next authored cover image has no source: " + id);
      continue;
    }
    if (b.src || (s.borderWidth ?? 0) > 0 || (s.h ?? 0) > 0 || s.list !== "none")
      throw Error("DOCX Next authored cover text box paint/list needs separate acceptance: " + id);
    assertMeasuredTypography(id);
    const visual = coverTextPresentation(b, cover.template, cover.colors);
    const measured = fontMetrics?.blocks[b.id];
    const alpha = visual.style.opacity * visual.paintOpacity;
    if (alpha < 1 && !graphicFamilyQa) {
      const height =
        ((measured?.lines ?? 1) * pos.size * visual.style.lineHeight * 25.4) / 72 +
        (s.bg ? s.padY * 2 : 0);
      if (
        blocks.some((other) => {
          if (
            other.kind !== "shape" ||
            other.style.hidden ||
            (hiddenDecorationIds.includes(other.id) && !hasUserStyle(other, "hidden"))
          )
            return false;
          const o = other.style;
          const h =
            other.shape === "line" ? Math.max(o.strokeWidth ?? 0.8, 0.2) : o.w * (o.ratio ?? 1);
          return (
            o.opacity > 0 &&
            Math.min(s.x + s.w, o.x + o.w) > Math.max(s.x, o.x) &&
            Math.min(pos.y + height, positions[other.id].y + h) >
              Math.max(pos.y, positions[other.id].y)
          );
        })
      )
        throw Error(
          "DOCX Next translucent cover text over artwork needs separate acceptance: " + id,
        );
    }
    let badge: { x: number; width: number; height: number } | undefined;
    let badgeSurface: Extract<DocBlock, { kind: "paragraph-frame" }>["surface"];
    if (s.bg) {
      // QA-only fallback: no fresh browser advance supplied by the saved-state
      // fixture. This is a prototype approximation, NOT Word pixel acceptance.
      const advance = measured?.badgeAdvanceMm ?? (graphicFamilyQa
        ? Math.max(1, Math.min(s.w - 2 * s.padX,
            lineText(b.lines[0] ?? "").length * (pos.size * 25.4 / 72) * 0.53))
        : undefined);
      if (
        b.lines.length !== 1 ||
        (measured?.lines ?? (graphicFamilyQa ? 1 : undefined)) !== 1 ||
        advance === undefined ||
        !Number.isFinite(advance) ||
        advance <= 0 ||
        ![s.padX, s.padY, s.bgRadius].every((v) => Number.isFinite(v) && v >= 0) ||
        advance + 2 * s.padX > s.w ||
        !["left", "center", "right"].includes(s.align)
      )
        throw Error(
          "DOCX Next badge requires fresh single-line metrics within its authored width: " + id,
        );
      const width = advance + 2 * s.padX;
      badge = {
        x: s.x + (s.align === "center" ? (s.w - width) / 2 : s.align === "right" ? s.w - width : 0),
        width,
        height: (pos.size * visual.style.lineHeight * 25.4) / 72 + 2 * s.padY,
      };
      const paint: Extract<DocBlock, { kind: "decorative-shape" }> = {
        kind: "decorative-shape",
        id: id + ".badge-paint",
        semanticText: false,
        shape: "rect",
        xMm: badge.x,
        yMm: pos.y,
        widthMm: width,
        heightMm: badge.height,
        radiusMm:
          s.bgRadius >= 999 ? badge.height / 2 : Math.min(s.bgRadius, badge.height / 2, width / 2),
        // Alpha over artwork is rejected above and semantic/photo overlaps are
        // rejected by check(). Flatten the solid-paper composite once so Word
        // cannot blend this badge differently from editable accent text.
        opacity: cover.template === "modern" ? 1 : visual.style.opacity * visual.paintOpacity,
        fill: {
          color:
            cover.template === "modern"
              ? compositeTextColor(
                  context.color(cover.colors[s.bg] ?? s.bg, context.paper ?? "FFFFFF"),
                  context.paper ?? "FFFFFF",
                  visual.style.opacity * visual.paintOpacity,
                )
              : context.color(cover.colors[s.bg] ?? s.bg, context.paper ?? "FFFFFF"),
        },
        stroke: { color: "000000", widthMm: 0 },
      };
      if (badgeComposition === "native-shape") {
        if (paint.opacity !== 1)
          throw Error("DOCX Next native badge requires opaque solid-paper paint: " + id);
        badgeSurface = {
          heightMm: badge.height,
          radiusMm: paint.radiusMm,
          fillColor: paint.fill!.color,
          paddingXMm: s.padX,
          paddingYMm: s.padY,
        };
      } else result.push(paint);
    }
    const colorOverride = hasUserStyle(b, "color") || !!cover.colors.coverInk;
    const lines = b.lines.map((line) =>
      typeof line === "string"
        ? line
        : line.map((segment) => ({
            ...segment,
            ...(colorOverride ? { color: undefined } : {}),
            ...(hasUserStyle(b, "weight") ? { weight: undefined } : {}),
          })),
    );
    const paragraphs = textElement(
      {
        ...b,
        lines,
        style: {
          ...visual.style,
          size: pos.size,
          // CSS group opacity fades text and fill together against the page.
          opacity: badge ? 1 : visual.style.opacity * visual.paintOpacity,
        },
      },
      id,
      { ...context, fontScale: 1 },
      { beforeMm: 0, afterMm: 0, keepNext: false, keepLines: true },
    );
    if (badge)
      for (const p of paragraphs)
        for (const run of p.runs)
          run.style.color = compositeTextColor(
            run.style.color,
            context.paper ?? "FFFFFF",
            visual.style.opacity * visual.paintOpacity,
          );
    if (measured)
      for (const p of paragraphs) {
        if (p.runs.some((r) => r.style.sizePt !== pos.size))
          throw Error("DOCX Next cover metrics do not include field size override: " + id);
        p.minimumLineHeightPt = Math.max(...p.runs.map((r) => r.style.sizePt)) * p.lineHeight;
      }
    const height = measured
      ? (measured.lines * pos.size * visual.style.lineHeight * 25.4) / 72
      : nativeTextHeightMm(paragraphs, s.w);
    check(id, badge?.x ?? s.x, pos.y, badge?.width ?? s.w, badge?.height ?? height);
    result.push({
      kind: "paragraph-frame",
      id: id + ".frame",
      xMm: badgeSurface ? badge!.x : s.x + (badge ? s.padX : 0),
      yMm: pos.y + (badge && !badgeSurface ? s.padY : 0),
      widthMm: badgeSurface ? badge!.width : s.w - (badge ? 2 * s.padX : 0),
      ...(graphicFamilyQa ? { wrapMode: "none" as const } : {}),
      paragraphs: badgeSurface ? paragraphs.map((p) => ({ ...p, align: "left" })) : paragraphs,
      ...(badgeSurface ? { surface: badgeSurface } : {}),
    });
  }
  return result;
}
