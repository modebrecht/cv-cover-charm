import { letterPageOverflows } from "@/components/letter/preflight";

export const DOSSIER_PRINT_PAGE_SELECTOR =
  '[data-dossier-document="cover"], [data-letter-document-pages] [data-letter-page], [data-cv-page]';

export function dossierNativePrintPages(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(DOSSIER_PRINT_PAGE_SELECTOR));
}

/** Read the production renderers' signals without changing their pagination. */
export function dossierNativePrintReadiness(root: HTMLElement) {
  const pages = dossierNativePrintPages(root);
  const letter = root.querySelector<HTMLElement>("[data-letter-document-root]");
  const letterPages = pages.filter((page) => page.hasAttribute("data-letter-page"));
  const cvPages = pages.filter((page) => page.hasAttribute("data-cv-page"));
  const coverPages = pages.filter((page) => page.dataset.dossierDocument === "cover");
  const error =
    letter?.dataset.letterPaginationReady === "true" &&
    (letter.dataset.letterPaginationError || letterPages.some(letterPageOverflows))
      ? letter.dataset.letterPaginationErrorMessage ||
        "Mindestens eine Briefseite läuft über. Bitte den Briefinhalt prüfen."
      : null;
  return {
    pages,
    error,
    ready:
      !error &&
      coverPages.length === 1 &&
      letter?.dataset.letterPaginationReady === "true" &&
      letterPages.length > 0 &&
      letterPages.length === Number(letter.dataset.letterPageCount) &&
      root.dataset.dossierCvReady === "true" &&
      cvPages.length > 0 &&
      cvPages.length === Number(root.dataset.dossierCvPageCount),
  };
}

function aborted() {
  return new DOMException("Druckvorbereitung abgebrochen", "AbortError");
}

/** Event-driven wait: no fixed delay, and broken images never silently disappear. */
async function waitForReadyDossier(root: HTMLElement, signal?: AbortSignal) {
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error("Die Druckansicht ist noch nicht verfügbar.");
  await new Promise<void>((resolve, reject) => {
    let fontsReady = !doc.fonts;
    let frame = 0;
    let finished = false;
    const cleanup = () => {
      observer.disconnect();
      view.cancelAnimationFrame(frame);
      view.clearTimeout(timeout);
      root.removeEventListener("load", schedule, true);
      root.removeEventListener("error", schedule, true);
      signal?.removeEventListener("abort", cancel);
    };
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const check = () => {
      frame = 0;
      if (finished) return;
      if (signal?.aborted) return finish(aborted());
      if (!root.isConnected) return finish(new Error("Die Druckansicht wurde geschlossen."));
      const state = dossierNativePrintReadiness(root);
      if (state.error) return finish(new Error(state.error));
      const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
      if (images.some((image) => image.complete && image.naturalWidth === 0 && image.src))
        return finish(new Error("Ein Bild konnte nicht geladen werden. Bitte das Bild prüfen."));
      if (fontsReady && state.ready && images.every((image) => image.complete)) finish();
    };
    function schedule() {
      if (finished || frame) return;
      frame = view!.requestAnimationFrame(check);
    }
    const cancel = () => finish(aborted());
    const observer = new view.MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        "data-dossier-cv-ready",
        "data-dossier-cv-page-count",
        "data-letter-pagination-ready",
        "data-letter-page-count",
        "data-letter-pagination-error",
        "src",
      ],
    });
    root.addEventListener("load", schedule, true);
    root.addEventListener("error", schedule, true);
    signal?.addEventListener("abort", cancel, { once: true });
    const timeout = view.setTimeout(
      () => finish(new Error("Die Druckansicht ist noch nicht bereit. Bitte erneut versuchen.")),
      20_000,
    );
    void doc.fonts?.ready.then(
      () => {
        fontsReady = true;
        schedule();
      },
      (error: Error) => finish(error),
    );
    schedule();
  });
  await Promise.all(
    Array.from(root.querySelectorAll<HTMLImageElement>("img"), async (image) => {
      // A loaded image with valid dimensions can already be painted even if its
      // format does not implement decode(). The readiness check rejects failures.
      try {
        await image.decode();
      } catch {
        /* already loaded above */
      }
    }),
  );
  await new Promise<void>((resolve) =>
    view.requestAnimationFrame(() => view.requestAnimationFrame(() => resolve())),
  );
  if (signal?.aborted) throw aborted();
}

/**
 * Expose the existing physical pages to print CSS; never clone or re-render them.
 * Returns an idempotent release used after printing, cancellation or unmount.
 */
export async function prepareDossierNativePrint(root: HTMLElement, signal?: AbortSignal) {
  const printRoot = root.closest<HTMLElement>("[data-dossier-native-print-root]");
  if (!printRoot || printRoot.parentElement !== root.ownerDocument.body)
    throw new Error("Der native Drucksatz ist noch nicht montiert.");
  if (root.ownerDocument.body.hasAttribute("data-dossier-native-print"))
    throw new Error("Ein Druckdialog ist bereits geöffnet.");
  await waitForReadyDossier(root, signal);
  // A different caller may have completed preparation while this one waited.
  if (root.ownerDocument.body.hasAttribute("data-dossier-native-print"))
    throw new Error("Ein Druckdialog ist bereits geöffnet.");
  const state = dossierNativePrintReadiness(root);
  if (!state.ready) throw new Error(state.error || "Die Seitenaufteilung ist noch nicht bereit.");
  const pages = state.pages;
  // Both collection and native fragmentation follow canonical DOM order.
  const kinds = pages.map((page) =>
    page.hasAttribute("data-cv-page")
      ? "cv"
      : page.hasAttribute("data-letter-page")
        ? "letter"
        : "cover",
  );
  if (
    kinds.join(",") !==
    [
      "cover",
      ...kinds.filter((kind) => kind === "letter"),
      ...kinds.filter((kind) => kind === "cv"),
    ].join(",")
  )
    throw new Error("Die Reihenfolge der Dossierseiten ist ungültig.");
  const containers = new Set<HTMLElement>();
  pages.forEach((page, index) => {
    page.dataset.dossierPrintPage = kinds[index];
    if (index === pages.length - 1) page.dataset.dossierPrintLast = "true";
    for (
      let parent = page.parentElement;
      parent && parent !== printRoot;
      parent = parent.parentElement
    )
      containers.add(parent);
  });
  containers.forEach((container) => {
    container.dataset.dossierPrintContainer = "true";
  });
  printRoot.dataset.nativePrintActive = "true";
  printRoot.setAttribute("aria-hidden", "false");
  const body = root.ownerDocument.body;
  body.dataset.dossierNativePrint = "true";
  let released = false;
  return {
    pages,
    release() {
      if (released) return;
      released = true;
      delete body.dataset.dossierNativePrint;
      delete printRoot.dataset.nativePrintActive;
      printRoot.setAttribute("aria-hidden", "true");
      pages.forEach((page) => {
        delete page.dataset.dossierPrintPage;
        delete page.dataset.dossierPrintLast;
      });
      containers.forEach((container) => {
        delete container.dataset.dossierPrintContainer;
      });
    },
  };
}

/** The product path opens the normal dialog; only tests use Chromium's PDF API. */
export async function printDossierNative(root: HTMLElement, signal?: AbortSignal) {
  const prepared = await prepareDossierNativePrint(root, signal);
  const view = root.ownerDocument.defaultView!;
  const focus = root.ownerDocument.activeElement;
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        view.removeEventListener("afterprint", done);
        signal?.removeEventListener("abort", cancel);
      };
      const done = () => {
        cleanup();
        resolve();
      };
      const cancel = () => {
        cleanup();
        reject(aborted());
      };
      view.addEventListener("afterprint", done, { once: true });
      signal?.addEventListener("abort", cancel, { once: true });
      if (signal?.aborted) return cancel();
      try {
        view.print();
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  } finally {
    prepared.release();
    if (focus instanceof HTMLElement && focus.isConnected) focus.focus();
  }
}
