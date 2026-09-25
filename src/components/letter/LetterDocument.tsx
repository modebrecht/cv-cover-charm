import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ScaledPreview } from "@/components/cover/ScaledPreview";
import type { DossierChromeContact, DossierChromeOptions } from "@/lib/dossier-chrome";
import { LetterCanvas } from "./LetterCanvas";
import { withLetterPaginationPageContext } from "./letter-page-context";
import {
  paginateMeasuredLetter,
  type LetterPageFragment,
  type LetterPaginationIssue,
} from "./letter-pagination";
import { letterPageOverflows } from "./preflight";
import { letterRichHtml, plainTextToRichHtml, richHtmlToPlainText } from "./rich-text";
import type { LetterData, LetterDesign, LetterFlowImage } from "./types";
import "./letter-pagination.css";

const PLACEHOLDER =
  "Hier entsteht dein persönliches Motivationsschreiben. Erkläre, weshalb du dich für diesen Beruf und diesen Lehrbetrieb interessierst und was du mitbringst.";
const PROBE_BODY_HTML = '<div data-align="justify">Messzeile für den Seitenumbruch</div>';
const EMPTY_BODY_HTML = '<div data-align="justify"><br></div>';

type LetterPhysicalOverflowIssue = {
  code: "physical-overflow";
  message: string;
  blockType?: string;
};

type LetterBlockingIssue = LetterPaginationIssue | LetterPhysicalOverflowIssue;

export type LetterPaginationState = {
  ready: boolean;
  pageCount: number;
  /** Only a measured physical overflow blocks PDF export. */
  issue: LetterBlockingIssue | null;
  /** Pagination uncertainty is advisory when the rendered A4 page itself fits. */
  warning?: LetterPaginationIssue | null;
};

type Props = {
  data: LetterData;
  design: LetterDesign;
  exportMode?: boolean;
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
  onPaginationChange?: (state: LetterPaginationState) => void;
  onImageChange?: (id: string, patch: Partial<LetterFlowImage>) => void;
  onImageRemove?: (id: string) => void;
  /** Visible editor mode: each physical A4 page gets the established responsive scaler. */
  scaledPreview?: boolean;
  ariaLabel?: string;
};

function resolvedBodyHtml(data: LetterData, exportMode: boolean): string {
  if (data.richTextHtml?.trim()) return letterRichHtml(data.richTextHtml, data.text);
  if (data.text) return plainTextToRichHtml(data.text);
  return exportMode ? "" : plainTextToRichHtml(PLACEHOLDER);
}

function pageChromeOptions(
  options: DossierChromeOptions | undefined,
  finalPage: boolean,
): DossierChromeOptions | undefined {
  if (!options || finalPage || options.footerMode !== "details") return options;
  return { ...options, footerMode: "compact" };
}

function pageDesign(design: LetterDesign, pageIndex: number, finalPage: boolean): LetterDesign {
  const resolved =
    !finalPage && design.footerMode === "attachments"
      ? { ...design, footerMode: "compact" as const }
      : design;
  return withLetterPaginationPageContext(resolved, { pageIndex, finalPage });
}

function pageData(
  data: LetterData,
  bodyHtml: string,
  images: LetterFlowImage[],
  finalPage: boolean,
): LetterData {
  return {
    ...data,
    text: richHtmlToPlainText(bodyHtml),
    richTextHtml: bodyHtml || EMPTY_BODY_HTML,
    images,
    showBeilagen: finalPage ? data.showBeilagen : false,
  };
}

function LetterPageShell({
  fragment,
  data,
  design,
  chromeOptions,
  chromeContact,
  exportMode,
  onOverflowChange,
  onImageChange,
  onImageRemove,
  ariaLabel,
}: {
  fragment: LetterPageFragment;
  data: LetterData;
  design: LetterDesign;
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
  exportMode: boolean;
  onOverflowChange?: (pageIndex: number, overflow: boolean) => void;
  onImageChange?: (id: string, patch: Partial<LetterFlowImage>) => void;
  onImageRemove?: (id: string) => void;
  ariaLabel: string;
}) {
  const contextualDesign = pageDesign(design, fragment.pageIndex, fragment.finalPage);
  const contextualChrome = pageChromeOptions(chromeOptions, fragment.finalPage);
  const contextualData = pageData(data, fragment.bodyHtml, fragment.images, fragment.finalPage);
  const reportOverflow = useCallback(
    (overflow: boolean) => onOverflowChange?.(fragment.pageIndex, overflow),
    [fragment.pageIndex, onOverflowChange],
  );

  return (
    <div
      data-letter-document-page
      data-letter-document-page-index={fragment.pageIndex}
      data-letter-document-final-page={fragment.finalPage ? "true" : "false"}
      data-letter-continuation-page={fragment.pageIndex > 0 ? "true" : undefined}
      data-letter-nonfinal-page={!fragment.finalPage ? "true" : undefined}
    >
      <LetterCanvas
        data={contextualData}
        design={contextualDesign}
        chromeOptions={contextualChrome}
        chromeContact={chromeContact}
        exportMode={exportMode}
        onOverflowChange={onOverflowChange ? reportOverflow : undefined}
        onImageChange={onImageChange}
        onImageRemove={onImageRemove}
        ariaLabel={ariaLabel}
      />
    </div>
  );
}

function MeasurementProbe({
  name,
  pageIndex,
  finalPage,
  bodyHtml,
  images,
  data,
  design,
  chromeOptions,
  chromeContact,
}: {
  name: string;
  pageIndex: number;
  finalPage: boolean;
  bodyHtml: string;
  images: LetterFlowImage[];
  data: LetterData;
  design: LetterDesign;
  chromeOptions?: DossierChromeOptions;
  chromeContact?: DossierChromeContact;
}) {
  const fragment: LetterPageFragment = { pageIndex, finalPage, bodyHtml, images };
  return (
    <div data-letter-pagination-probe={name} aria-hidden="true">
      <LetterPageShell
        fragment={fragment}
        data={data}
        design={design}
        chromeOptions={chromeOptions}
        chromeContact={chromeContact}
        exportMode
        ariaLabel="Messseite Motivationsschreiben"
      />
    </div>
  );
}

async function settleMeasurementImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(async (image) => {
      if (image.complete) {
        try {
          await image.decode();
        } catch {
          // A decoded data URL is preferable, but the browser still exposes
          // measurable dimensions for already-complete images when decode fails.
        }
        return;
      }
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

export function LetterDocument({
  data,
  design,
  exportMode = false,
  chromeOptions,
  chromeContact,
  onPaginationChange,
  onImageChange,
  onImageRemove,
  scaledPreview = false,
  ariaLabel = "Vorschau Motivationsschreiben",
}: Props) {
  const bodyHtml = useMemo(() => resolvedBodyHtml(data, exportMode), [data, exportMode]);
  const allImages = useMemo(() => data.images ?? [], [data.images]);
  const freeImages = useMemo(
    () => allImages.filter((image) => typeof image.xMm === "number" && Number.isFinite(image.xMm)),
    [allImages],
  );
  const flowImages = useMemo(
    () => allImages.filter((image) => typeof image.xMm !== "number" || !Number.isFinite(image.xMm)),
    [allImages],
  );
  const documentRootRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const fallback = useMemo<LetterPageFragment[]>(
    () => [
      {
        pageIndex: 0,
        finalPage: true,
        bodyHtml: bodyHtml || EMPTY_BODY_HTML,
        images: allImages,
      },
    ],
    [allImages, bodyHtml],
  );
  const [pages, setPages] = useState<LetterPageFragment[]>(fallback);
  const [algorithmIssue, setAlgorithmIssue] = useState<LetterPaginationIssue | null>(null);
  const [pageOverflow, setPageOverflow] = useState<Record<number, boolean>>({});
  const [pagination, setPagination] = useState<LetterPaginationState>({
    ready: false,
    pageCount: fallback.length,
    issue: null,
    warning: null,
  });

  useEffect(() => {
    onPaginationChange?.(pagination);
  }, [onPaginationChange, pagination]);

  useLayoutEffect(() => {
    let cancelled = false;
    setAlgorithmIssue(null);
    setPageOverflow({});
    setPagination((current) =>
      current.ready || current.issue || current.warning
        ? { ready: false, pageCount: current.pageCount, issue: null, warning: null }
        : current,
    );

    const measure = async () => {
      const root = measurementRef.current;
      if (!root) return;
      await document.fonts?.ready;
      await settleMeasurementImages(root);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (cancelled || !measurementRef.current) return;

      // Probe canvases are real LetterCanvas instances so typography and chrome
      // are exact, but they are not document pages and must never enter PDF page
      // collection or page-count assertions.
      for (const page of root.querySelectorAll<HTMLElement>("[data-letter-page]")) {
        page.removeAttribute("data-letter-page");
        page.setAttribute("data-letter-measurement-page", "true");
      }

      // Free images are page overlays, not flow content. Only left/right images
      // reduce text capacity; free images stay on the first page at their x/y.
      const result = paginateMeasuredLetter(root, flowImages);
      if (cancelled) return;
      setPageOverflow({});

      if (result.issue) {
        // A pagination heuristic failure is not proof that the A4 output is bad.
        // Render the complete fallback page and let the final rendered-page
        // geometry decide whether PDF export is actually unsafe.
        setAlgorithmIssue(result.issue);
        setPages(fallback);
        setPagination({ ready: false, pageCount: fallback.length, issue: null, warning: null });
        return;
      }

      const resolvedPages = result.pages.map((fragment) =>
        fragment.pageIndex === 0
          ? { ...fragment, images: [...fragment.images, ...freeImages] }
          : fragment,
      );
      setAlgorithmIssue(null);
      setPages(resolvedPages);
      setPagination({ ready: false, pageCount: resolvedPages.length, issue: null, warning: null });
    };

    void measure();
    return () => {
      cancelled = true;
    };
  }, [bodyHtml, chromeContact, chromeOptions, data, design, fallback, flowImages, freeImages]);

  // Pagination owns the page assignment, while interactive image geometry must
  // follow pointer updates immediately. Keep each image on its last valid page
  // during measurement, but render its newest saved geometry.
  const renderedPages = useMemo(() => {
    const latestImages = new Map(allImages.map((image) => [image.id, image]));
    return pages.map((fragment) => ({
      ...fragment,
      images: fragment.images.flatMap((image) => {
        const latest = latestImages.get(image.id);
        return latest ? [latest] : [];
      }),
    }));
  }, [allImages, pages]);

  const recordPageOverflow = useCallback((pageIndex: number, reportedOverflow: boolean) => {
    const page = documentRootRef.current?.querySelector<HTMLElement>(
      `[data-letter-document-page-index="${pageIndex}"] [data-letter-page]`,
    );
    const overflow = page ? letterPageOverflows(page) : reportedOverflow;
    setPageOverflow((current) =>
      current[pageIndex] === overflow ? current : { ...current, [pageIndex]: overflow },
    );
  }, []);

  useEffect(() => {
    const pageIndexes = renderedPages.map((fragment) => fragment.pageIndex);
    if (!pageIndexes.length || pageIndexes.some((pageIndex) => pageOverflow[pageIndex] === undefined)) {
      return;
    }

    const physicallyOverflows = pageIndexes.some((pageIndex) => pageOverflow[pageIndex]);
    const issue: LetterBlockingIssue | null = physicallyOverflows
      ? {
          code: "physical-overflow",
          message:
            "Mindestens eine A4-Seite enthält sichtbaren Inhalt ausserhalb des verfügbaren Seitenbereichs. Verkleinere den Inhalt oder passe die Abstände an.",
        }
      : null;
    const warning = issue ? null : algorithmIssue;
    const next: LetterPaginationState = {
      ready: true,
      pageCount: renderedPages.length,
      issue,
      warning,
    };

    setPagination((current) =>
      current.ready === next.ready &&
      current.pageCount === next.pageCount &&
      current.issue?.code === next.issue?.code &&
      current.issue?.message === next.issue?.message &&
      current.warning?.code === next.warning?.code &&
      current.warning?.message === next.warning?.message
        ? current
        : next,
    );
  }, [algorithmIssue, pageOverflow, renderedPages]);

  return (
    <div
      ref={documentRootRef}
      data-letter-document-root
      data-letter-pagination-ready={pagination.ready ? "true" : "false"}
      data-letter-page-count={renderedPages.length}
      data-letter-pagination-error={pagination.issue?.code}
      data-letter-pagination-error-message={pagination.issue?.message}
      data-letter-pagination-warning={pagination.warning?.code}
      data-letter-pagination-warning-message={pagination.warning?.message}
      data-letter-physical-overflow={
        pagination.issue?.code === "physical-overflow" ? "true" : undefined
      }
    >
      <div data-letter-document-pages className={scaledPreview ? "grid w-full gap-6" : undefined}>
        {renderedPages.map((fragment) => {
          const page = (
            <LetterPageShell
              key={`letter-page-${fragment.pageIndex}`}
              fragment={fragment}
              data={data}
              design={design}
              chromeOptions={chromeOptions}
              chromeContact={chromeContact}
              exportMode={exportMode}
              onOverflowChange={recordPageOverflow}
              onImageChange={onImageChange}
              onImageRemove={onImageRemove}
              ariaLabel={`${ariaLabel} – Seite ${fragment.pageIndex + 1}`}
            />
          );
          return scaledPreview ? (
            <ScaledPreview key={`scaled-letter-page-${fragment.pageIndex}`} max={1}>
              {page}
            </ScaledPreview>
          ) : (
            page
          );
        })}
      </div>

      <div ref={measurementRef} data-letter-pagination-measurements aria-hidden="true">
        <MeasurementProbe
          name="source"
          pageIndex={1}
          finalPage={false}
          bodyHtml={bodyHtml || EMPTY_BODY_HTML}
          images={[]}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
        <MeasurementProbe
          name="first-flow"
          pageIndex={0}
          finalPage={false}
          bodyHtml={bodyHtml || EMPTY_BODY_HTML}
          images={[]}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
        <MeasurementProbe
          name="first-final"
          pageIndex={0}
          finalPage
          bodyHtml={PROBE_BODY_HTML}
          images={[]}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
        <MeasurementProbe
          name="continuation-flow"
          pageIndex={1}
          finalPage={false}
          bodyHtml={bodyHtml || EMPTY_BODY_HTML}
          images={[]}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
        <MeasurementProbe
          name="continuation-final"
          pageIndex={1}
          finalPage
          bodyHtml={PROBE_BODY_HTML}
          images={[]}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
        <MeasurementProbe
          name="image-source"
          pageIndex={1}
          finalPage={false}
          bodyHtml={PROBE_BODY_HTML}
          images={flowImages}
          data={data}
          design={design}
          chromeOptions={chromeOptions}
          chromeContact={chromeContact}
        />
      </div>
    </div>
  );
}
