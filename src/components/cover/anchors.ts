import type { Block } from "./types";
export type CoverMetrics = { size: number; height: number };
/** Authored relationships shared across renderers; metrics are explicit, never measured rectangles. */
export function resolveCoverAnchors(
  blocks: Block[],
  metricsOf: Map<string, CoverMetrics>,
  spacingDensity = 1,
) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  type Resolved = CoverMetrics & { y: number };
  const out: Record<string, Resolved> = {};
  const visiting = new Set<string>();

  const resolve = (id: string): Resolved => {
    const cached = out[id];
    if (cached) return cached;

    const b = byId.get(id)!;
    const st = b.style;
    const { size, height } = metricsOf.get(id)!;

    let y = st.anchorBottom ? st.y - height : st.y;

    const link = st.follows || st.above || null;
    if (link && byId.has(link) && !visiting.has(link)) {
      visiting.add(id);
      const target = resolve(link);
      visiting.delete(id);
      const gap = (st.gap ?? (st.follows ? 4 : 2)) * spacingDensity;
      y = st.follows ? target.y + target.height + gap : target.y - height - gap;
    }

    out[id] = { size, y, height };
    return out[id];
  };

  for (const b of blocks) resolve(b.id);

  /*
   * Kontakt + Beilagen are one semantic footer pair. Historically both bodies
   * were bottom-anchored independently, so their headings started at different
   * heights whenever the columns contained a different number of lines.
   *
   * The generated default attachment layout is identifiable by the title being
   * `above: "beilagen"` and the body still owning its bottom anchor. Only that
   * untouched automatic state is synchronized here: explicit editor moves clear
   * those links/anchors and therefore continue to win.
   */
  const contactTitleBlock = byId.get("kontaktTitel");
  const attachmentsTitleBlock = byId.get("beilagenTitel");
  const attachmentsBodyBlock = byId.get("beilagen");
  const contactTitle = out.kontaktTitel;
  const attachmentsTitle = out.beilagenTitel;
  const attachmentsBody = out.beilagen;

  if (
    contactTitleBlock &&
    attachmentsTitleBlock &&
    attachmentsBodyBlock &&
    contactTitle &&
    attachmentsTitle &&
    attachmentsBody &&
    contactTitleBlock.lines.length > 0 &&
    attachmentsTitleBlock.style.above === "beilagen" &&
    !attachmentsTitleBlock.style.follows &&
    attachmentsBodyBlock.style.anchorBottom === true
  ) {
    const gap = (attachmentsTitleBlock.style.gap ?? 2) * spacingDensity;
    out.beilagenTitel = { ...attachmentsTitle, y: contactTitle.y };
    out.beilagen = {
      ...attachmentsBody,
      y: contactTitle.y + attachmentsTitle.height + gap,
    };
  }

  return out;
}
