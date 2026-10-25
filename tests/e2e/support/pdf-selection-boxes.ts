import { readFile } from "node:fs/promises";
type NormalizedBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PdfBox = NormalizedBox & {
  pageWidth: number;
  pageHeight: number;
};

export async function pdfSelectionBoxes(
  path: string,
  pageNumber = 1,
  targets: readonly string[] = [],
): Promise<Record<string, PdfBox>> {
  const { getDocument, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(path));
  const loading = getDocument({ data, disableFontFace: true });
  const document = await loading.promise;
  const pdfPage = await document.getPage(pageNumber);
  const viewport = pdfPage.getViewport({ scale: 1 });
  const content = await pdfPage.getTextContent();

  const items = content.items.flatMap((item) => {
    if (!("str" in item)) return [];
    const text = item.str.trim().replace(/\s+/gu, " ");
    if (!text) return [];

    const transform = Util.transform(viewport.transform, item.transform);
    const fontHeight = Math.hypot(transform[2], transform[3]);
    const style = content.styles[item.fontName] as
      | { ascent?: number; descent?: number }
      | undefined;
    const ascent =
      typeof style?.ascent === "number"
        ? style.ascent
        : typeof style?.descent === "number"
          ? 1 + style.descent
          : 0.8;

    return [
      {
        text,
        box: {
          left: transform[4],
          top: transform[5] - fontHeight * ascent,
          width: item.width * viewport.scale,
          height: fontHeight,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
        } satisfies PdfBox,
      },
    ];
  });

  const boxes: Record<string, PdfBox> = {};
  for (const target of targets) {
    for (let start = 0; start < items.length; start += 1) {
      const fragments: typeof items = [];
      let combined = "";

      for (let index = start; index < items.length; index += 1) {
        fragments.push(items[index]);
        combined = fragments
          .map((fragment) => fragment.text)
          .join(" ")
          .replace(/\s+/gu, " ");

        if (combined === target) {
          const left = Math.min(...fragments.map((fragment) => fragment.box.left));
          const top = Math.min(...fragments.map((fragment) => fragment.box.top));
          const right = Math.max(
            ...fragments.map((fragment) => fragment.box.left + fragment.box.width),
          );
          const bottom = Math.max(
            ...fragments.map((fragment) => fragment.box.top + fragment.box.height),
          );
          boxes[target] = {
            left,
            top,
            width: right - left,
            height: bottom - top,
            pageWidth: viewport.width,
            pageHeight: viewport.height,
          };
          break;
        }

        if (!target.startsWith(`${combined} `)) break;
      }

      if (boxes[target]) break;
    }
  }

  await loading.destroy();
  return boxes;
}
