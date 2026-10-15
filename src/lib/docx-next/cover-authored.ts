import { TEMPLATES, lineText, type Block } from "@/components/cover/types";
import { normalizedCoverLabels, coverTextPresentation } from "@/components/cover/presentation";
import { resolveCoverAnchors } from "@/components/cover/anchors";
import { hasUserStyle } from "@/components/cover/user-style-precedence";
import { dossierNameScale } from "@/lib/dossier-theme";
import type { DossierCoverSource } from "./source";
import type { DocBlock, DocumentPart } from "./model";
import { textElement, shapeElement } from "./elements";
import { nativeTextHeightMm } from "./layouts";

type Context = Parameters<typeof textElement>[2];
/** Guarded fixed-page composition using existing native paragraphs, images and paint.
 * Conservative native reservations are NOT browser or Word font-metric acceptance.
 */
export function composeAuthoredCover(
  cover: DossierCoverSource,
  page: DocumentPart["page"],
  context: Context,
): DocBlock[] {
  if (!TEMPLATES.find((t) => t.id === cover.template)?.authoredCoverPresentation)
    throw Error("DOCX Next authored cover presentation is not declared for this template");
  const blocks = normalizedCoverLabels(cover.blocks, cover.data.labelKontakt);
  const aliases: Record<string, string> = { name: "fullName", beruf: "profession", foto: "photo" };
  const key = (b: Block) => "cover." + (aliases[b.id] ?? b.id);
  const metrics = new Map<string, { size: number; height: number }>();
  for (const b of blocks) {
    let size =
      b.style.size *
      cover.fontScale *
      (b.id === "name" ? dossierNameScale(b.lines.map(lineText).join("\n")) : 1);
    if (b.kind === "text" && b.style.maxLines) {
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
            ? nativeTextHeightMm(paragraphs, b.style.w)
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
      result.push(shapeElement(b, id, context));
      continue;
    }
    if (b.kind === "photo" || b.kind === "image") {
      const source = b.kind === "photo" ? cover.data.foto : b.src,
        h = s.w * (s.ratio ?? 1);
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
        const initials = [cover.data.vorname, cover.data.nachname]
          .map((v) => v?.[0])
          .filter(Boolean)
          .join("")
          .toUpperCase();
        if (!initials) continue;
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
          yMm: pos.y + (h - ((pt * 25.4) / 72) * 1.2) / 2,
          widthMm: s.w,
          paragraphs,
        });
      } else throw Error("DOCX Next authored cover image has no source: " + id);
      continue;
    }
    if (b.src || s.bg || (s.borderWidth ?? 0) > 0 || (s.h ?? 0) > 0 || s.list !== "none")
      throw Error("DOCX Next authored cover text box paint/list needs separate acceptance: " + id);
    const visual = coverTextPresentation(b, cover.template, cover.colors);
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
          opacity: visual.style.opacity * visual.paintOpacity,
        },
      },
      id,
      { ...context, fontScale: 1 },
      { beforeMm: 0, afterMm: 0, keepNext: false, keepLines: true },
    );
    check(id, s.x, pos.y, s.w, nativeTextHeightMm(paragraphs, s.w));
    result.push({
      kind: "paragraph-frame",
      id: id + ".frame",
      xMm: s.x,
      yMm: pos.y,
      widthMm: s.w,
      paragraphs,
    });
  }
  return result;
}
