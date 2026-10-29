import { useEffect, useState, type RefObject } from "react";
import {
  buildCvPageFitPlan,
  consumeCvPageFitMode,
  getCvPageFitMode,
  getCvPageFitRevision,
  measureCvOnePageDemand,
  type CvPageFitMode,
} from "./page-fit";
import {
  CV_SCALE_MIN,
  CV_TYPE_DEFAULTS,
  cvSectionLayout,
  cvSectionOrder,
  type CvData,
  type CvDesign,
} from "./types";

type Typography = Pick<CvDesign, "titleScale" | "headingScale" | "bodyScale">;
export type CvMeasuredPageFitResult = {
  sectionLayouts: CvData["sectionLayouts"];
  typography?: Typography;
};

type Attempt = {
  revision: number;
  sourceData: CvData;
  sourceDesign: CvDesign;
  data: CvData;
  design: CvDesign;
  compact: boolean;
  reduction: number;
  unpacked?: { data: CvData; demand: number };
};

/** Trial layouts stay local. Only the first measured fit is saved to the CV. */
export function useMeasuredOnePageFit({
  mode,
  revision,
  data,
  design,
  classic,
  enabled,
  fixedSecondPage,
  scope,
  onApply,
  onNotice,
}: {
  mode: CvPageFitMode | null;
  revision: number;
  data: CvData;
  design: CvDesign;
  classic: boolean;
  enabled: boolean;
  fixedSecondPage: boolean;
  scope: RefObject<HTMLDivElement | null>;
  onApply?: (result: CvMeasuredPageFitResult) => void;
  onNotice?: (message: string) => void;
}) {
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const active = enabled && mode === "one" && attempt?.revision === revision ? attempt : null;

  useEffect(() => {
    if (!enabled || mode !== "one") {
      setAttempt(null);
      return;
    }
    if (attempt?.revision === revision) return;
    if (!onApply) return;
    const sectionLayouts = { ...data.sectionLayouts };
    for (const key of cvSectionOrder(data)) {
      const layout = cvSectionLayout(data, key);
      if (layout.positioning === "flow" && layout.page !== 1)
        sectionLayouts[key] = { ...layout, page: 1 };
    }
    setAttempt({
      revision,
      sourceData: data,
      sourceDesign: design,
      data: { ...data, sectionLayouts },
      design,
      compact: false,
      reduction: 0,
    });
  }, [attempt?.revision, data, design, enabled, mode, onApply, revision]);

  useEffect(() => {
    if (!active || !onApply) return;
    // Editing/importing while a trial is settling must never overwrite newer work.
    if (data !== active.sourceData || design !== active.sourceDesign) {
      consumeCvPageFitMode("one");
      return;
    }
    let cancelled = false;
    let frame = 0;
    const evaluate = () => {
      if (cancelled || getCvPageFitMode() !== "one" || getCvPageFitRevision() !== active.revision)
        return;
      const demand = measureCvOnePageDemand(scope.current);
      if (demand === null || fixedSecondPage) {
        consumeCvPageFitMode("one");
        onNotice?.(
          fixedSecondPage
            ? "Frei platzierte Inhalte auf Seite 2 bleiben erhalten. Verschiebe sie zuerst auf Seite 1."
            : "Der verfügbare Platz konnte noch nicht gemessen werden. Bitte erneut versuchen.",
        );
        return;
      }
      // Narrower columns can wrap more text. Keep them only if they save real space.
      if (active.reduction === 0 && active.unpacked && demand >= active.unpacked.demand) {
        setAttempt({ ...active, data: active.unpacked.data, unpacked: undefined });
        return;
      }
      if (demand <= 1) {
        const layoutChanged = cvSectionOrder(data).some(
          (key) =>
            JSON.stringify(cvSectionLayout(data, key)) !==
            JSON.stringify(cvSectionLayout(active.data, key)),
        );
        if (layoutChanged || active.reduction > 0)
          onApply({
            sectionLayouts: layoutChanged ? active.data.sectionLayouts : data.sectionLayouts,
            typography:
              active.reduction > 0
                ? {
                    titleScale: active.design.titleScale,
                    headingScale: active.design.headingScale,
                    bodyScale: active.design.bodyScale,
                  }
                : undefined,
          });
        consumeCvPageFitMode("one");
        return;
      }
      // First reclaim space with safe short rubrics, keeping the user's fonts.
      if (!active.compact && classic) {
        const plan = buildCvPageFitPlan(active.data, "one", { allowHalfWidth: true });
        const sectionLayouts = { ...active.data.sectionLayouts };
        for (const key of cvSectionOrder(active.data)) {
          const layout = cvSectionLayout(active.data, key);
          if (layout.positioning === "flow" && plan.packingBySection[key] === "masonry")
            sectionLayouts[key] = { ...layout, width: "half", packing: "masonry" };
        }
        setAttempt({
          ...active,
          data: { ...active.data, sectionLayouts },
          compact: true,
          unpacked: { data: active.data, demand },
        });
        return;
      }
      // Re-measure every 1% step. Never reset a user's scales to template defaults.
      if (active.reduction < 18) {
        const reduction = active.reduction + 1;
        const factor = 1 - reduction / 100;
        const scaled = (key: keyof Typography, minimumFactor: number) =>
          Math.max(
            CV_SCALE_MIN,
            (active.sourceDesign[key] ?? CV_TYPE_DEFAULTS[key]) * Math.max(minimumFactor, factor),
          );
        setAttempt({
          ...active,
          reduction,
          design: {
            ...active.sourceDesign,
            titleScale: scaled("titleScale", 0.9),
            headingScale: scaled("headingScale", 0.86),
            bodyScale: scaled("bodyScale", 0.82),
          },
        });
        return;
      }
      // No readable fit: discard trials, so repeated clicks cannot keep shrinking.
      consumeCvPageFitMode("one");
      onNotice?.("Dieser Inhalt braucht mehr Platz. Bitte kürzen oder auf 2 Seiten verteilen.");
    };
    // Use settled fonts and the same completed layout pass as the paginator.
    void document.fonts.ready.then(() => {
      if (!cancelled)
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(evaluate);
        });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [active, classic, data, design, fixedSecondPage, onApply, onNotice, scope]);

  return active;
}
