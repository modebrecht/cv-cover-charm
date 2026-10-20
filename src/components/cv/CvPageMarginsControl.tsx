import { useCallback, useSyncExternalStore } from "react";
import { ContinuationTopMarginControl } from "@/components/dossier/ContinuationTopMarginControl";
import { DossierPageMarginsControl } from "@/components/dossier/DossierPageMarginsControl";
import { patchDossierChrome, type DossierChromeOptions } from "@/lib/dossier-chrome";
import {
  cvDefaultPageMargins,
  cvFrameFor,
  cvSafePageMarginMinimums,
  cvContentBox,
} from "./archetype";
import {
  getCvContinuationTopMarginOverrideMm,
  getCvLayoutChoiceForTemplate,
  defaultCvLayoutForTemplate,
  setCvContinuationTopMarginMm,
  subscribeCvContinuationTopMargin,
  subscribeCvLayout,
} from "./layout";
import {
  getDossierPageMargins,
  getDossierPageMarginsSnapshot,
  subscribeDossierPageMargins,
} from "@/lib/dossier-page-margins";
import type { CvDesign } from "./types";

/**
 * Editor-only adapter around the existing shared page-margin store and the
 * existing CV geometry helpers. Whole-document page-fit actions deliberately
 * live beside the other layout reset actions, not among fine geometry controls.
 */
export function CvPageMarginsControl({
  design,
  chromeOptions,
}: {
  design: CvDesign;
  chromeOptions: DossierChromeOptions;
}) {
  const getChoice = useCallback(
    () => getCvLayoutChoiceForTemplate(design.template),
    [design.template],
  );
  const choice = useSyncExternalStore(subscribeCvLayout, getChoice, () =>
    defaultCvLayoutForTemplate(design.template),
  );
  const layout = choice === "modern" || choice === "executive" ? "modern" : "classic";
  const getContinuation = getCvContinuationTopMarginOverrideMm;
  const continuationTopMargin = useSyncExternalStore(
    subscribeCvContinuationTopMargin,
    getContinuation,
    () => null,
  );
  useSyncExternalStore(subscribeDossierPageMargins, getDossierPageMarginsSnapshot, () => "{}");
  const pageMargins = getDossierPageMargins("cv");
  const frame = cvFrameFor(design.template);
  const defaultMargins = cvDefaultPageMargins(frame, 0, layout, design.sidebarPct, chromeOptions);
  const minimumMargins = cvSafePageMarginMinimums(
    frame,
    0,
    layout,
    design.sidebarPct,
    chromeOptions,
  );
  const continuationDefault = cvContentBox(frame, 1, layout, design.sidebarPct, chromeOptions, {
    pageMargins,
    continuationTopMarginMm: null,
  }).top;
  const effectiveTop = cvContentBox(frame, 1, layout, design.sidebarPct, chromeOptions, {
    pageMargins,
    continuationTopMarginMm: continuationTopMargin,
  }).top;
  const accentColor = design.colors.accent ?? design.colors.primary ?? design.colors.ink;
  const headerGap = Math.min(40, Math.max(0, chromeOptions.headerGapMm ?? 12));

  return (
    <div className="grid gap-3">
      <DossierPageMarginsControl
        scope="cv"
        defaultMargins={defaultMargins}
        minimumMargins={minimumMargins}
        accentColor={accentColor}
        extraControls={
          <>
            <ContinuationTopMarginControl
              scope="cv"
              value={continuationTopMargin ?? continuationDefault}
              automatic={continuationTopMargin === null}
              defaultValue={continuationDefault}
              effectiveTopMm={effectiveTop}
              onChange={setCvContinuationTopMarginMm}
              onReset={() => setCvContinuationTopMarginMm(null)}
            />

            <label className="grid gap-1 text-xs">
              <span className="flex items-center justify-between gap-2 text-muted-foreground">
                <span>Zusätzlicher Abstand nach Header</span>
                <span>{headerGap.toFixed(headerGap % 1 ? 1 : 0)} mm</span>
              </span>
              <input
                data-dossier-header-gap-control
                type="range"
                min={0}
                max={40}
                step={1}
                value={headerGap}
                onChange={(event) =>
                  patchDossierChrome("cv", { headerGapMm: Number(event.target.value) })
                }
                className="w-full accent-primary"
                aria-label="Zusätzlicher Abstand nach Header"
              />
              <span className="text-[11px] leading-relaxed text-muted-foreground">
                Gilt auf allen Seiten zusätzlich zum oberen Seitenrand. Ein eigener Folgeseitenrand
                hat ab Seite 2 Vorrang.
              </span>
              {headerGap !== 12 ? (
                <button
                  type="button"
                  className="justify-self-start rounded border border-input bg-background px-2 py-1 text-[11px] font-medium hover:bg-accent"
                  onClick={() => patchDossierChrome("cv", { headerGapMm: 12 })}
                >
                  Standardabstand (12 mm)
                </button>
              ) : null}
            </label>
          </>
        }
      />
    </div>
  );
}
