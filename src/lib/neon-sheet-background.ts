/** Keep the live CSS and the PDF's precomposited Neon motif identical. */
export const NEON_SHEET_SPOTS = [
  { x: 0.18, y: 0.18 },
  { x: 0.82, y: 0.78 },
] as const;
export const NEON_SHEET_FADE = 0.34;

export function neonSheetBackground(primary: string, secondary: string, paper: string) {
  return `${NEON_SHEET_SPOTS.map(
    ({ x, y }, index) =>
      `radial-gradient(circle at ${x * 100}% ${y * 100}%, ${[primary, secondary][index]} 0, transparent ${NEON_SHEET_FADE * 100}%)`,
  ).join(", ")}, ${paper}`;
}
