import {
  cvContentBox,
  cvSurface,
  sidebarWidthMm,
  type CvFrame,
} from "./archetype";
import type { DossierChromeOptions } from "@/lib/dossier-chrome";
import type { DossierPageMargins } from "@/lib/dossier-page-margins";

export type CvSidebarGeometry = ReturnType<typeof cvSidebarGeometry>;

/** Automatic rail portraits use the reviewed compact sizes, not free-photo width. */
export function cvSidebarPhotoWidthMm(
  frame: CvFrame,
  sidebarPct: number | undefined,
  veryCompact: boolean,
): number {
  return Math.min(
    veryCompact ? 25 : 28,
    sidebarWidthMm(frame, "modern", sidebarPct) -
      (frame.id === "column" ? 19 : 15.5),
  );
}

/** Authored A4 geometry shared by Web and native export. No DOM/page fragments. */
export function cvSidebarGeometry(
  frame: CvFrame,
  pageIndex: number,
  sidebarPct: number | undefined,
  chrome: DossierChromeOptions,
  presentation: {
    pageMargins: DossierPageMargins | null;
    continuationTopMarginMm: number | null;
  },
  side: "left" | "right",
  sidebarPhoto = false,
  personLayoutCustomized = false,
) {
  const pageWidthMm = 210;
  const surface = cvSurface(frame, pageIndex, "modern", sidebarPct, chrome);
  const logicalMain = cvContentBox(
    frame,
    pageIndex,
    "modern",
    sidebarPct,
    chrome,
    presentation,
  );
  const column = frame.id === "column";
  const insetMm = column ? 0 : frame.id === "card" ? surface.left : 0;
  const widthMm = sidebarWidthMm(frame, "modern", sidebarPct);
  const leftMm = side === "left" ? insetMm : pageWidthMm - insetMm - widthMm;
  const topMm = column
    ? 0
    : Math.max(
        surface.top,
        frame.id === "card" && pageIndex === 0 && !personLayoutCustomized
          ? logicalMain.top + 38
          : surface.top,
      );
  const padding = {
    top: column ? (sidebarPhoto ? 16 : 13) : sidebarPhoto ? 12.5 : 9.5,
    right: column ? 9 : 7.5,
    bottom: column ? Math.max(12, frame.footMm + 8) : 12,
    left: column ? 10 : 8,
  };
  // Web keeps physical inner padding when the complete rail changes sides.
  const main =
    side === "right"
      ? { ...logicalMain, left: logicalMain.right, right: logicalMain.left }
      : logicalMain;
  return {
    side,
    rail: {
      leftMm,
      topMm,
      widthMm,
      bottomMm: column ? 0 : surface.bottom,
      insetMm,
      padding,
    },
    sideText: {
      leftMm: leftMm + padding.left,
      widthMm: widthMm - padding.left - padding.right,
      topMm: topMm + padding.top,
    },
    mainText: {
      leftMm: main.left,
      widthMm: pageWidthMm - main.left - main.right,
      topMm: main.top,
      bottomMm: main.bottom,
    },
  };
}
