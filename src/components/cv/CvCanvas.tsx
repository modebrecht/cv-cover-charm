import { cvBodyData } from "@/lib/dossier-body-contact";
import {
  useCallback,
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { FONT_STACKS } from "@/components/cover/types";
import {
  DEFAULT_DOSSIER_CHROME_OPTIONS,
  type DossierChromeContact,
  type DossierChromeOptions,
} from "@/lib/dossier-chrome";
import { getDossierPageMargins, type DossierPageMargins } from "@/lib/dossier-page-margins";
import { applyDossierTheme, dossierThemeCssVariables } from "@/lib/dossier-theme";
import { resolveTemplateChromeOptions } from "@/lib/template-chrome";
import {
  resolveDossierChromeDocumentContent,
  withDossierChromeDocumentContent,
} from "@/lib/dossier-chrome-content";
import { CvPageFitMenuPortal } from "./CvPageFitMenuPortal";
import { useMeasuredOnePageFit, type CvMeasuredPageFitResult } from "./use-measured-one-page-fit";
import { useMeasuredTwoPageFit } from "./use-measured-two-page-fit";
import { CvTextAlignmentPortal } from "./CvTextAlignmentPortal";
import { cvPresentationCssVariables, useCvPresentation, type CvPresentation } from "./presentation";
import { cvContentBox, cvFrameFor } from "./archetype";
import { CV_LAYOUT_EVENT } from "./layout";
import { resolveCvPlacement } from "./placement";
import { CvCanvas as BaseCvCanvas } from "./CvCanvasBase";
import { resolveCvRubricOptions } from "./citrus-rubric";
import {
  buildCvPageFitPlan,
  measureCvPageFitSectionHeights,
  measureCvPageFitCapacityPx,
  measureCvPageFitSidebarFits,
  measureCvOnePageDemand,
  chooseCvSmartPageFitMode,
  cvPageFitKeepsManualPosition,
  consumeCvPageFitMode,
  getCvPageFitMode,
  getCvPageFitRevision,
  publishCvPageFitPageCount,
  subscribeCvPageFit,
} from "./page-fit";
import {
  CV_NAME_FONT_SIZE_MAX,
  CV_NAME_FONT_SIZE_MIN,
  cvSectionOrder,
  cvSectionLayout,
  type CvData,
  type CvDesign,
  type CvLayoutSectionKey,
} from "./types";
import "@/components/dossier/document-paint.css";
import "@/components/dossier-theme.css";
import "./layout-variants.css";
import "./layout-options.css";
import "@/components/dossier/edel-stationery.css";
import "@/components/dossier/human-polish.css";
import "@/components/dossier/legacy-template-refinements.css";
import "./full-section-rules.css";
import "./fresh-modern-sidebar-geometry.css";
import "./default-pagination-density.css";
import "./page-fit.css";
import "./user-typography.css";
import "./citrus-rubric.css";
import "./content-geometry-contract.css";
import "./document-title-user-override.css";

export type { CvLayoutWarning } from "./CvCanvasBase";

type BaseProps = ComponentProps<typeof BaseCvCanvas>;
type Props = Omit<
  BaseProps,
  "chromeOptions" | "chromeContact" | "chromeDocumentContent" | "presentation"
> & {
  presentation?: Partial<CvPresentation>;
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
  /** Hidden multi-document renderers must not seize the live html template scope. */
  manageGlobalTemplateScope?: boolean;
  /** Commit the first measured one-page fit atomically, preserving section order. */
  onMeasuredPageFit?: (result: CvMeasuredPageFitResult) => void;
  onPageFitNotice?: (message: string) => void;
};

/**
 * Section rules are one dossier-wide visual contract: when a rule is visible,
 * it fills the remaining heading row all the way to the right. Older saved CVs
 * may still contain the retired `short` value; render those as `full` instead
 * of leaking the historic 15/18 mm dash back into preview or PDF export.
 */
export function cvDesignWithFullSectionRules(design: CvDesign): CvDesign {
  if (design.headingRule === "none") return design;
  if (design.headingRule === "full") return design;
  return { ...design, headingRule: "full" };
}

function contactFromCv(data: CvData): DossierChromeContact {
  const person = data.person;
  return {
    name: [person.vorname, person.nachname].filter(Boolean).join(" "),
    address: person.adresse ?? "",
    place: person.plzOrt ?? "",
    phone: person.telefon ?? "",
    email: person.email ?? "",
  };
}

/**
 * The CV editor is the live authority while it is on screen. Synced dossier
 * contact may fill a blank CV field, but it must never mask a newly typed value.
 */
export function resolveCvChromeContact(
  live: DossierChromeContact,
  fallback?: DossierChromeContact,
): DossierChromeContact {
  const pick = (key: keyof DossierChromeContact) => {
    const liveValue = live[key]?.trim();
    if (liveValue) return liveValue;
    return fallback?.[key]?.trim() ?? "";
  };

  return {
    name: pick("name"),
    address: pick("address"),
    place: pick("place"),
    phone: pick("phone"),
    email: pick("email"),
  };
}

const SIDEBAR_MAIN_SELECTOR =
  '[data-dossier-document="cv"][data-cv-layout="modern"] :is([data-cv-page], [data-cv-measure-page]) > [data-cv-main]';
const CV_SIDEBAR_GUTTER_MM = 8;
const A4_WIDTH_MM = 210;
const roundHalfMm = (value: number) => Math.round(value * 2) / 2;
const cssMm = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const setStyleValue = (
  style: CSSStyleDeclaration,
  property: string,
  value: string,
  priority = "",
) => {
  if (
    style.getPropertyValue(property).trim() === value &&
    style.getPropertyPriority(property) === priority
  ) {
    return;
  }
  style.setProperty(property, value, priority);
};

/**
 * Sidebar geometry has two independent facts that must both survive hydration:
 * the live structural rail and the user's persisted physical page margins.
 * Historic template CSS can still carry horizontal `!important`, while the
 * inherited renderer variables can briefly reflect the initial neutral CV.
 *
 * The rail side therefore owns its inset: rail edge + the reviewed 8 mm gutter,
 * optionally enlarged by a user margin. The opposite side can safely inherit the
 * renderer value and is likewise enlarged by a persisted margin. This matters for
 * adjustable rails: a stale initial 71 mm value must never prevent a 22% sidebar
 * from shrinking back to its real ~54 mm main origin.
 */
export function pinCvSidebarMainGeometry(
  scope: HTMLElement,
  customMargins: DossierPageMargins | null = getDossierPageMargins("cv"),
) {
  // The instance owns these inputs. Reading a previously pinned main node
  // feeds its old inline output back into the next hydration/template pass,
  // masking updated inherited geometry on the opposite side of the rail.
  const instanceGeometry = window.getComputedStyle(scope);
  for (const main of scope.querySelectorAll<HTMLElement>(SIDEBAR_MAIN_SELECTOR)) {
    const cvRoot = main.closest<HTMLElement>('[data-dossier-document="cv"]');
    const mirrored = cvRoot?.dataset.cvInfoPosition === "mirrored";
    const customLeftMm = customMargins ? (mirrored ? customMargins.right : customMargins.left) : 0;
    const customRightMm = customMargins ? (mirrored ? customMargins.left : customMargins.right) : 0;

    let leftMm = Math.max(
      cssMm(instanceGeometry.getPropertyValue("--cv-modern-physical-left")) ?? 0,
      customLeftMm,
    );
    let rightMm = Math.max(
      cssMm(instanceGeometry.getPropertyValue("--cv-modern-physical-right")) ?? 0,
      customRightMm,
    );

    const measurePage = main.parentElement;
    // Measurement has no painted sidebar. Resolve its rail from the instance's
    // first visible/export page so both boxes receive the same actual geometry.
    const page = measurePage?.hasAttribute("data-cv-measure-page")
      ? (cvRoot?.querySelector<HTMLElement>('[data-cv-page="0"]') ?? measurePage)
      : measurePage;
    const sidebar = page
      ? (Array.from(page.children).find(
          (child) => child instanceof HTMLElement && child.hasAttribute("data-cv-sidebar"),
        ) as HTMLElement | undefined)
      : undefined;

    if (page && sidebar) {
      const pageRect = page.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const pxPerMm = pageRect.width > 0 ? pageRect.width / A4_WIDTH_MM : 0;
      if (pxPerMm > 0) {
        const sidebarOnLeft =
          sidebarRect.left + sidebarRect.width / 2 < pageRect.left + pageRect.width / 2;
        if (sidebarOnLeft) {
          const railRightMm = (sidebarRect.right - pageRect.left) / pxPerMm;
          leftMm = Math.max(railRightMm + CV_SIDEBAR_GUTTER_MM, customLeftMm);
        } else {
          const railLeftFromRightMm = (pageRect.right - sidebarRect.left) / pxPerMm;
          rightMm = Math.max(railLeftFromRightMm + CV_SIDEBAR_GUTTER_MM, customRightMm);
        }
      }
    }

    leftMm = roundHalfMm(leftMm);
    rightMm = roundHalfMm(rightMm);
    if (!(leftMm > 0) || !(rightMm > 0)) continue;

    const left = `${leftMm}mm`;
    const right = `${rightMm}mm`;
    const logicalLeft = mirrored ? right : left;
    const logicalRight = mirrored ? left : right;

    setStyleValue(main.style, "--cv-renderer-main-left", left);
    setStyleValue(main.style, "--cv-renderer-main-right", right);
    setStyleValue(main.style, "--cv-modern-physical-left", left);
    setStyleValue(main.style, "--cv-modern-physical-right", right);
    setStyleValue(main.style, "--cv-modern-main-left", logicalLeft);
    setStyleValue(main.style, "--cv-modern-main-right", logicalRight);
    setStyleValue(main.style, "left", left, "important");
    setStyleValue(main.style, "right", right, "important");

    if (main.dataset.cvMainGeometryPinned !== "true") {
      main.dataset.cvMainGeometryPinned = "true";
    }
  }
}

/** Pure snapshot adapter: no dossier-chrome store reads happen below the route/editor boundary. */
export function CvCanvas({
  chromeOptions = DEFAULT_DOSSIER_CHROME_OPTIONS,
  chromeContact,
  manageGlobalTemplateScope = true,
  presentation: presentationOverride,
  ...props
}: Props) {
  const presentation = useCvPresentation(props.design.template, presentationOverride);
  const { bodyAlignment, infoPosition } = presentation;
  const pageFitLayout = presentation.layoutChoice === "modern" ? "modern" : "classic";
  const pageFitMode = useSyncExternalStore(subscribeCvPageFit, getCvPageFitMode, () => null);
  const pageFitRevision = useSyncExternalStore(subscribeCvPageFit, getCvPageFitRevision, () => 0);
  const geometryScopeRef = useRef<HTMLDivElement>(null);
  const onePageTrial = useMeasuredOnePageFit({
    mode: pageFitMode,
    revision: pageFitRevision,
    data: props.data,
    design: props.design,
    classic: pageFitLayout === "classic",
    enabled: !props.exportMode && !!props.onMeasuredPageFit,
    fixedSecondPage:
      Object.values(props.data.sectionLayouts ?? {}).some(
        (layout) => layout?.positioning === "free" && layout.page === 2,
      ) || !!(props.design.useElements && props.elements.some((element) => element.page === 2)),
    scope: geometryScopeRef,
    onApply: props.onMeasuredPageFit,
    onNotice: props.onPageFitNotice,
  });
  const [autoTwoRevision, setAutoTwoRevision] = useState(-1);
  const twoPageMode =
    !props.exportMode &&
    props.onMeasuredPageFit &&
    (pageFitMode === "two" || (pageFitMode === "auto" && autoTwoRevision === pageFitRevision))
      ? (pageFitMode as "two" | "auto")
      : null;
  const sidebarKeys = useMemo(
    () =>
      pageFitLayout === "modern"
        ? cvSectionOrder(props.data).filter(
            (key) =>
              key !== "person" && resolveCvPlacement(presentation.placements, key) === "side",
          )
        : [],
    [pageFitLayout, props.data, presentation.placements],
  );
  const twoPageTrial = useMeasuredTwoPageFit({
    mode: twoPageMode,
    revision: pageFitRevision,
    data: props.data,
    design: props.design,
    sidebarKeys,
    scope: geometryScopeRef,
    onApply: props.onMeasuredPageFit,
    onNotice: props.onPageFitNotice,
  });
  const fitData = onePageTrial?.data ?? twoPageTrial?.data ?? props.data;
  const localContact = useMemo(() => contactFromCv(props.data), [props.data]);
  const resolvedContact = useMemo(
    () => resolveCvChromeContact(localContact, chromeContact),
    [chromeContact, localContact],
  );
  const pageFitPlan = useMemo(
    () =>
      pageFitMode === "auto" && !props.exportMode
        ? buildCvPageFitPlan(props.data, pageFitMode === "auto" ? "two" : pageFitMode, {
            allowHalfWidth: pageFitLayout === "classic",
          })
        : null,
    [pageFitLayout, pageFitMode, props.data, props.exportMode],
  );
  const trialDesign = onePageTrial?.design ?? props.design;
  const baseDesign = useMemo(() => cvDesignWithFullSectionRules(trialDesign), [trialDesign]);
  const design = baseDesign;
  const rubric = useMemo(() => resolveCvRubricOptions(design), [design]);
  const chromeDocumentContent = useMemo(
    () =>
      resolveDossierChromeDocumentContent(
        design.chromeContent,
        props.data.titel?.trim() || "Lebenslauf",
      ),
    [design.chromeContent, props.data.titel],
  );
  const resolvedChromeOptions = useMemo(
    () =>
      withDossierChromeDocumentContent(
        resolveTemplateChromeOptions(design.template, design.colors, chromeOptions),
        chromeDocumentContent,
      ),
    [chromeDocumentContent, chromeOptions, design.colors, design.template],
  );
  const canvasChromeOptions = useMemo<DossierChromeOptions>(() => {
    if (design.template !== "terracotta" || resolvedChromeOptions.headerMode !== "contact") {
      return resolvedChromeOptions;
    }
    // Kolumne intentionally hides the shared contact copy and presents these
    // fields in its sidebar. Keep the same contact-header geometry, but tell the
    // body de-duplication path that the hidden chrome does not own these fields.
    return {
      ...resolvedChromeOptions,
      headerShowAddress: false,
      headerShowPhone: false,
      headerShowEmail: false,
    };
  }, [design.template, resolvedChromeOptions]);
  const data = useMemo(
    () => cvBodyData(fitData, canvasChromeOptions),
    [canvasChromeOptions, fitData],
  );
  // CvCanvasBase stores paginated React rows in state and recalculates that state
  // when its `data` input changes. Design-only edits used to leave those cached
  // rows stale until some unrelated field edit changed the data. Give the base
  // renderer a fresh top-level data identity whenever the effective design changes
  // so every typography/color/spacing toggle is reflected immediately.
  const paginationData = useMemo(() => ({ ...data }), [data, design, presentation]);

  // A short automatic fit retains the existing layout adapter. Two-page
  // choices use the normalized, measured trial above for both button modes.
  const appliedPageFit = useRef<string | null>(null);
  useEffect(() => {
    if (twoPageMode) return;
    if (!pageFitPlan || props.exportMode || !props.onSectionLayout) {
      if (!pageFitPlan) appliedPageFit.current = null;
      return;
    }
    const heights = measureCvPageFitSectionHeights(geometryScopeRef.current);
    // The paginator measures grouped rows as a whole. Keep authored compact
    // widths/packing when using that complete demand instead of inventing
    // separate rubric heights. Free content needs its own geometric contract.
    const preserveClassicPacking =
      pageFitLayout === "classic" &&
      cvSectionOrder(props.data).some((key) => cvSectionLayout(props.data, key).width === "half");
    const measuredCompactFlow =
      preserveClassicPacking &&
      !props.design.useElements &&
      cvSectionOrder(props.data).every(
        (key) => cvSectionLayout(props.data, key).positioning === "flow",
      );
    const chosenMode =
      pageFitMode === "auto"
        ? chooseCvSmartPageFitMode(
            props.data,
            heights,
            measureCvPageFitCapacityPx(geometryScopeRef.current),
            geometryScopeRef.current?.querySelectorAll("[data-cv-page]").length === 1,
            pageFitLayout === "modern"
              ? {
                  mainSectionKeys: cvSectionOrder(props.data).filter(
                    (key) =>
                      key === "person" ||
                      resolveCvPlacement(presentation.placements, key) === "main",
                  ),
                  sidebarFitsFirstPage:
                    measureCvPageFitSidebarFits(geometryScopeRef.current) === true,
                }
              : measuredCompactFlow
                ? { measuredFlowDemand: measureCvOnePageDemand(geometryScopeRef.current) }
                : undefined,
          )
        : pageFitPlan.mode;
    if (chosenMode === "two") {
      setAutoTwoRevision(pageFitRevision);
      return;
    }
    const measuredPlan = buildCvPageFitPlan(props.data, "one", {
      // Short CVs have enough space without shrinking or forcing
      // small sections into half-width masonry. Existing manually
      // compacted layouts stay compact on a repeated auto action.
      allowHalfWidth:
        pageFitMode === "auto" &&
        !Object.values(props.data.sectionLayouts ?? {}).some(
          (layout) => layout?.packing === "masonry",
        )
          ? false
          : pageFitLayout === "classic",
    });
    const requestKey = `${pageFitRevision}:${measuredPlan.assignmentSignature}`;
    if (appliedPageFit.current === requestKey) return;
    appliedPageFit.current = requestKey;

    for (const key of Object.keys(measuredPlan.pageBySection) as CvLayoutSectionKey[]) {
      // Absolute user-positioned sections must never be reset by a preset.
      if (cvPageFitKeepsManualPosition(props.data, key)) continue;
      const page = measuredPlan.pageBySection[key];
      if (!page) continue;
      props.onSectionLayout(key, {
        page,
        width: preserveClassicPacking
          ? cvSectionLayout(props.data, key).width
          : (measuredPlan.widthBySection[key] ?? "full"),
        positioning: "flow",
        packing: preserveClassicPacking
          ? cvSectionLayout(props.data, key).packing
          : (measuredPlan.packingBySection[key] ?? "rows"),
        x: null,
        y: null,
        widthMm: null,
        heightMm: null,
      });
    }

    consumeCvPageFitMode(pageFitMode!);
  }, [
    pageFitPlan,
    pageFitMode,
    pageFitLayout,
    pageFitRevision,
    presentation.placements,
    props.data,
    props.design.useElements,
    props.exportMode,
    props.onSectionLayout,
    twoPageMode,
  ]);

  const handlePageCount = useCallback(
    (count: number) => {
      if (!props.exportMode) publishCvPageFitPageCount(count);
      props.onPageCount?.(count);
    },
    [props.exportMode, props.onPageCount],
  );

  // Template-scoped CSS and dossier theme variables must exist before
  // CvCanvasBase runs its layout/pagination measurement. On a hard refresh
  // persisted design state arrives after hydration; waiting until a layout
  // effect lets the child measure once against the previous/default template.
  useInsertionEffect(() => {
    if (!manageGlobalTemplateScope) return;
    applyDossierTheme(design.template);
  }, [design.template, manageGlobalTemplateScope]);

  // The visible CV editor still owns the legacy html[data-dossier-template]
  // route scope. Hidden mixed-template PDF renderers opt out; their local
  // local contract is sufficient for measurement and rasterization.
  useLayoutEffect(() => {
    if (!manageGlobalTemplateScope) return;
    const root = document.documentElement;
    const previous = root.dataset.dossierTemplate;
    root.dataset.dossierTemplate = design.template as string;
    window.dispatchEvent(new CustomEvent(CV_LAYOUT_EVENT));

    return () => {
      if (previous === undefined) delete root.dataset.dossierTemplate;
      else root.dataset.dossierTemplate = previous;
      window.dispatchEvent(new CustomEvent(CV_LAYOUT_EVENT));
    };
  }, [design.template, manageGlobalTemplateScope]);

  const frame = cvFrameFor(design.template);
  const classicBox = cvContentBox(
    frame,
    0,
    "classic",
    design.sidebarPct,
    canvasChromeOptions,
    presentation,
  );
  const modernBox = cvContentBox(
    frame,
    0,
    "modern",
    design.sidebarPct,
    canvasChromeOptions,
    presentation,
  );
  const modernPhysicalBox =
    infoPosition === "mirrored"
      ? { left: modernBox.right, right: modernBox.left }
      : { left: modernBox.left, right: modernBox.right };
  const primary = design.colors.primary ?? design.colors.accent ?? design.colors.ink ?? "#111111";
  const secondary = design.colors.secondary ?? design.colors.accent ?? primary;
  const tertiary = design.colors.tertiary ?? design.colors.accent ?? secondary;
  const nameStyle = props.data.person.nameStyle;
  const nameFontSizePt =
    typeof nameStyle?.fontSizePt === "number" && Number.isFinite(nameStyle.fontSizePt)
      ? Math.max(CV_NAME_FONT_SIZE_MIN, Math.min(CV_NAME_FONT_SIZE_MAX, nameStyle.fontSizePt))
      : undefined;
  const nameColor =
    typeof nameStyle?.color === "string" && /^#[0-9a-f]{6}$/i.test(nameStyle.color.trim())
      ? nameStyle.color.trim()
      : undefined;
  const geometryStyle = {
    ...dossierThemeCssVariables(design.template, design.font),
    ...cvPresentationCssVariables(presentation),
    display: "contents",
    "--cv-classic-main-left": `${classicBox.left}mm`,
    "--cv-classic-main-right": `${classicBox.right}mm`,
    "--cv-modern-main-left": `${modernBox.left}mm`,
    "--cv-modern-main-right": `${modernBox.right}mm`,
    "--cv-modern-physical-left": `${modernPhysicalBox.left}mm`,
    "--cv-modern-physical-right": `${modernPhysicalBox.right}mm`,
    "--cv-rubric-x": `${rubric.horizontalMm}mm`,
    "--cv-rubric-content-indent": `${rubric.contentIndentMm}mm`,
    "--cover-primary": primary,
    "--cover-secondary": secondary,
    "--cover-tertiary": tertiary,
    "--cover-accent": design.colors.accent ?? secondary,
    "--cover-ink": design.colors.ink ?? "#111111",
    "--cv-user-name-font": nameStyle?.font ? FONT_STACKS[nameStyle.font] : undefined,
    "--cv-user-name-size": nameFontSizePt ? `${nameFontSizePt}pt` : undefined,
    "--cv-user-name-color": nameColor,
    "--cv-user-name-weight":
      nameStyle?.bold === undefined ? undefined : nameStyle.bold ? "700" : "400",
    "--cv-user-name-style":
      nameStyle?.italic === undefined ? undefined : nameStyle.italic ? "italic" : "normal",
    "--cv-user-name-decoration":
      nameStyle?.underline === undefined ? undefined : nameStyle.underline ? "underline" : "none",
    // The generic background-motif slider owns only decorative motif intensity.
    // Keep the value as a CSS variable so preview and hidden PDF canvases use
    // the same live value without changing structural sheet geometry.
    "--dossier-motif-opacity": String(Math.max(0, Math.min(1, design.bgOpacity))),
  } as CSSProperties;

  useLayoutEffect(() => {
    const scope = geometryScopeRef.current;
    if (!scope) return;

    let animationFrame = 0;
    const pin = () => pinCvSidebarMainGeometry(scope, presentation.pageMargins);
    const schedulePin = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(pin);
    };

    pin();
    const observer = new MutationObserver(schedulePin);
    observer.observe(scope, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style"],
    });
    window.addEventListener(CV_LAYOUT_EVENT, schedulePin);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener(CV_LAYOUT_EVENT, schedulePin);
    };
  }, [
    canvasChromeOptions,
    design.sidebarPct,
    design.template,
    infoPosition,
    pageFitLayout,
    props.exportMode,
    presentation.pageMargins,
  ]);

  return (
    <div
      ref={geometryScopeRef}
      style={geometryStyle}
      data-dossier-template={design.template}
      data-cv-template={design.template}
      data-cv-page-fit-mode={pageFitMode ?? undefined}
      data-cv-body-align={bodyAlignment}
      data-cv-heading-rule={design.headingRule}
      data-cv-user-heading-rule={props.design.headingRule === "full" ? "full" : undefined}
      data-cv-user-name-font={nameStyle?.font ? "true" : undefined}
      data-cv-user-name-size={nameFontSizePt !== undefined ? "true" : undefined}
      data-cv-user-name-color={nameColor ? "true" : undefined}
      data-cv-user-name-weight={nameStyle?.bold === undefined ? undefined : "true"}
      data-cv-user-name-style={nameStyle?.italic === undefined ? undefined : "true"}
      data-cv-user-name-decoration={nameStyle?.underline === undefined ? undefined : "true"}
      data-cv-rubric-pill={rubric.pill ? "true" : "false"}
      data-cv-rubric-offset={rubric.horizontalOverride ? "custom" : undefined}
      data-cv-rubric-indent={rubric.contentIndentOverride ? "custom" : undefined}
      data-cv-rubric-x={rubric.horizontalMm}
      data-cv-rubric-content-indent={rubric.contentIndentMm}
      data-cv-citrus-pill={
        design.template === "citrus" ? (rubric.pill ? "true" : "false") : undefined
      }
      data-cv-citrus-rubric-x={design.template === "citrus" ? rubric.horizontalMm : undefined}
      data-cv-citrus-content-indent={
        design.template === "citrus" ? rubric.contentIndentMm : undefined
      }
    >
      <BaseCvCanvas
        {...props}
        data={paginationData}
        design={design}
        presentation={presentation}
        chromeOptions={canvasChromeOptions}
        chromeContact={resolvedContact}
        chromeDocumentContent={chromeDocumentContent}
        onPageCount={handlePageCount}
        measurePageFitSidebar={pageFitMode === "auto" || !!twoPageTrial}
        measurePageFitSecondSidebar={!!twoPageTrial}
      />
      {!props.exportMode ? <CvPageFitMenuPortal /> : null}
      {!props.exportMode ? (
        <CvTextAlignmentPortal
          template={design.template}
          sidebarPct={design.sidebarPct}
          chromeOptions={canvasChromeOptions}
          accentColor={design.colors.accent ?? secondary}
        />
      ) : null}
    </div>
  );
}
