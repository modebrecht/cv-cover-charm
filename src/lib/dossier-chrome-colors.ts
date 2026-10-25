import { cvPalette } from "@/components/cv/palette";

function normalizedHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const color = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : null;
}

export function automaticBorderColor({
  colors,
  headerBackground,
  headerGradient,
  footerBackground,
  footerGradient,
  palette,
}: {
  colors: Record<string, string>;
  headerBackground: string;
  headerGradient: string | null;
  footerBackground: string;
  footerGradient: string | null;
  palette: ReturnType<typeof cvPalette>;
}): string {
  const occupied = new Set(
    [headerBackground, headerGradient, footerBackground, footerGradient]
      .map(normalizedHex)
      .filter((value): value is string => value !== null),
  );
  const candidates = [
    colors.cvHeading,
    colors.accent,
    colors.secondary,
    colors.primary,
    palette.accent,
    palette.ink,
    palette.muted,
    "#94a3b8",
    "#cbd5e1",
  ];
  for (const candidate of candidates) {
    const normalized = normalizedHex(candidate);
    if (normalized && !occupied.has(normalized)) return normalized;
  }
  return "#94a3b8";
}
