export function color(value: string | null | undefined, fallback: string): string {
  const text = value?.replace(/^#/, "");
  if (text && /^[\da-f]{3}$/i.test(text))
    return [...text]
      .map((c) => c + c)
      .join("")
      .toUpperCase();
  return text && /^[\da-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
}

/** Native Word text has no alpha channel. Composite authored ink against the
 * declared solid cell/paper color before rendering, retaining editable runs.
 */
export function compositeTextColor(ink: string, paper: string, opacity = 1): string {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1)
    throw new Error("DOCX Next invalid element opacity");
  return [0, 2, 4]
    .map((offset) =>
      Math.round(
        parseInt(ink.slice(offset, offset + 2), 16) * opacity +
          parseInt(paper.slice(offset, offset + 2), 16) * (1 - opacity),
      )
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")
    .toUpperCase();
}
