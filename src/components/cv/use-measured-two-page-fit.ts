import { useEffect, useState, type RefObject } from "react";
import {
  consumeCvPageFitMode,
  cvTwoPageTrialFits,
  getCvPageFitMode,
  getCvPageFitRevision,
  measureCvTwoPageFit,
  planCvMeasuredTwoPages,
} from "./page-fit";
import {
  cvSectionLayout,
  cvSectionOrder,
  type CvData,
  type CvDesign,
  type CvLayoutSectionKey,
} from "./types";
import type { CvMeasuredPageFitResult } from "./use-measured-one-page-fit";

type Trial = {
  mode: "two" | "auto";
  revision: number;
  sourceData: CvData;
  sourceDesign: CvDesign;
  data: CvData;
  stage: "measure" | "verify";
};

/** Normalize locally before measuring; save only a verified two-page result. */
export function useMeasuredTwoPageFit({
  mode,
  revision,
  data,
  design,
  sidebarKeys,
  scope,
  onApply,
  onNotice,
}: {
  mode: "two" | "auto" | null;
  revision: number;
  data: CvData;
  design: CvDesign;
  sidebarKeys: readonly CvLayoutSectionKey[];
  scope: RefObject<HTMLDivElement | null>;
  onApply?: (result: CvMeasuredPageFitResult) => void;
  onNotice?: (message: string) => void;
}) {
  const [trial, setTrial] = useState<Trial | null>(null);
  const active = mode && trial?.mode === mode && trial.revision === revision ? trial : null;
  useEffect(() => {
    if (!mode || !onApply) {
      setTrial(null);
      return;
    }
    if (trial?.revision === revision) return;
    const sectionLayouts = { ...data.sectionLayouts };
    for (const key of cvSectionOrder(data)) {
      const layout = cvSectionLayout(data, key);
      if (layout.positioning === "free") continue;
      sectionLayouts[key] = {
        ...layout,
        page: 1,
        width: "full",
        packing: "rows",
        x: null,
        y: null,
        widthMm: null,
        heightMm: null,
      };
    }
    setTrial({
      mode,
      revision,
      sourceData: data,
      sourceDesign: design,
      data: { ...data, sectionLayouts },
      stage: "measure",
    });
  }, [mode, revision, data, design, onApply, trial?.revision]);

  useEffect(() => {
    if (!active || !onApply) return;
    if (data !== active.sourceData || design !== active.sourceDesign) {
      consumeCvPageFitMode(active.mode);
      return;
    }
    let cancelled = false;
    let frame = 0;
    const evaluate = () => {
      if (
        cancelled ||
        getCvPageFitMode() !== active.mode ||
        getCvPageFitRevision() !== active.revision
      )
        return;
      if (active.stage === "measure") {
        const measured = measureCvTwoPageFit(scope.current);
        const pages = measured && planCvMeasuredTwoPages(active.data, measured, sidebarKeys);
        if (!pages) {
          consumeCvPageFitMode(active.mode);
          onNotice?.(
            "Der verfügbare Platz konnte noch nicht gemessen werden. Bitte erneut versuchen.",
          );
          return;
        }
        const sectionLayouts = { ...active.data.sectionLayouts };
        for (const key of cvSectionOrder(active.data)) {
          if (pages[key])
            sectionLayouts[key] = { ...cvSectionLayout(active.data, key), page: pages[key] };
        }
        setTrial({ ...active, data: { ...active.data, sectionLayouts }, stage: "verify" });
        return;
      }
      if (cvTwoPageTrialFits(scope.current)) {
        if (
          cvSectionOrder(data).some(
            (key) =>
              JSON.stringify(cvSectionLayout(data, key)) !==
              JSON.stringify(cvSectionLayout(active.data, key)),
          )
        )
          onApply({ sectionLayouts: active.data.sectionLayouts });
      } else {
        onNotice?.(
          "Dieser Inhalt passt mit deinen Einstellungen nicht auf 2 Seiten. Bitte kürzen oder Schrift und Abstände anpassen.",
        );
      }
      consumeCvPageFitMode(active.mode);
    };
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
  }, [active, data, design, sidebarKeys, scope, onApply, onNotice]);
  return active;
}
