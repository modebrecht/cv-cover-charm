import type { LetterData } from "./types";

export const DEFAULT_LETTER_BEILAGEN = ["Lebenslauf", "Zeugnis"] as const;

export function letterAttachmentValues(data: Pick<LetterData, "beilagen">): string[] {
  return Array.isArray(data.beilagen) ? [...data.beilagen] : [...DEFAULT_LETTER_BEILAGEN];
}
