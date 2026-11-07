export type PdfChromeTextField = {
  selector: string;
  text: string;
};

/** The source is the resolved page content, before any text reaches the DOM. */
export function pdfChromeTextContract(fields: readonly PdfChromeTextField[]): string {
  return JSON.stringify({
    version: 1,
    fields: fields
      .map(({ selector, text }) => ({ selector, text: text.replace(/\s+/g, "") }))
      .filter(({ text }) => text.length > 0),
  });
}

export function readPdfChromeTextContract(value: string | undefined): PdfChromeTextField[] | null {
  try {
    const contract = JSON.parse(value ?? "null");
    if (contract?.version !== 1 || !Array.isArray(contract.fields)) return null;
    const selectors = new Set<string>();
    for (const field of contract.fields) {
      if (
        !field ||
        typeof field.selector !== "string" ||
        !field.selector ||
        selectors.has(field.selector) ||
        typeof field.text !== "string" ||
        !field.text
      )
        return null;
      selectors.add(field.selector);
    }
    return contract.fields;
  } catch {
    return null;
  }
}
