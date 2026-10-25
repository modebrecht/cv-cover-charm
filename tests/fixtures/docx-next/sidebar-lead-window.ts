/** A bounded lead-height window; no inferred pagination threshold or export policy. */
import { sidebarLeadBoundaryFixture } from "./sidebar-lead-boundary";

export const SIDEBAR_LEAD_WINDOW_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([220, 205, 210, 215] as const).map((leadMm) => ({
    name: `${orientation}-window-${leadMm}`,
    orientation,
    variant: "detached" as const,
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext: false as const,
  })),
);
export const sidebarLeadWindowFixture = sidebarLeadBoundaryFixture;
