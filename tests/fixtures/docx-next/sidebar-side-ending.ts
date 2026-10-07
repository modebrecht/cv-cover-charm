/** Isolate only the spanning side cell's empty ending; semantic tail stays detached. */
import { sidebarSideTerminalFixture } from "./sidebar-side-terminal";

export const SIDEBAR_SIDE_ENDING_CASES = (["right", "left"] as const).flatMap((orientation) =>
  ([false, true] as const).map((sideEndingKeepNext) => ({
    name: `${orientation}-${sideEndingKeepNext ? "attached" : "detached"}-220`,
    orientation,
    variant: sideEndingKeepNext ? ("ending-only" as const) : ("detached" as const),
    scope: "main-only" as const,
    policy: "split-attached" as const,
    leadMm: 220 as const,
    sideSemanticKeepNext: false as const,
    sideEndingKeepNext,
  })),
);
export type SidebarSideEndingCase = (typeof SIDEBAR_SIDE_ENDING_CASES)[number];
export const sidebarSideEndingFixture = (value: SidebarSideEndingCase) =>
  sidebarSideTerminalFixture(value);
