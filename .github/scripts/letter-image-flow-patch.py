from pathlib import Path


def replace_exact(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


types = Path("src/components/letter/types.ts")
replace_exact(
    types,
    'export type LetterBodyColumns = 1 | 2 | 3;\n\nexport type LetterData = {',
    '''export type LetterBodyColumns = 1 | 2 | 3;\n\n/** Frei platzierbares Foto/Bild im Anschreiben. Der Textumbruch ist immer rechteckig (Word: Quadrat). */\nexport type LetterFlowImage = {\n  id: string;\n  src: string;\n  side: "left" | "right";\n  /** Vertikaler Versatz ab Beginn des Brieftext-Bereichs in mm. */\n  topMm: number;\n  widthMm: number;\n  /** Abstand des Textes zum Bild in mm. */\n  gapMm: number;\n};\n\nexport type LetterData = {''',
    "letter image type",
)
replace_exact(
    types,
    '  gruss: string;\n  unterschrift: string;\n  /** Beilagen am Ende des Motivationsschreibens. */',
    '''  gruss: string;\n  unterschrift: string;\n  /** Optionale frei platzierbare Fotos/Bilder. Alte Entwürfe ohne Feld bleiben kompatibel. */\n  images?: LetterFlowImage[];\n  /** Beilagen am Ende des Motivationsschreibens. */''',
    "letter data images",
)
replace_exact(
    types,
    '  unterschrift: "Lea Müller",\n  showBeilagen: true,',
    '  unterschrift: "Lea Müller",\n  images: [],\n  showBeilagen: true,',
    "demo images",
)
replace_exact(
    types,
    '  unterschrift: "",\n  showBeilagen: true,',
    '  unterschrift: "",\n  images: [],\n  showBeilagen: true,',
    "empty images",
)

Path("src/components/letter/LetterFlowImages.tsx").write_text(r'''import type { LetterFlowImage } from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type Props = {
  images: LetterFlowImage[];
  contentWidthMm: number;
  exportMode?: boolean;
  onChange?: (id: string, patch: Partial<LetterFlowImage>) => void;
  onRemove?: (id: string) => void;
};

/**
 * Fotos/Bilder im Anschreiben nutzen bewusst echten CSS-Float statt eine
 * absolute Ebene. Dadurch wird der Platz nicht nur optisch ausgespart: Text,
 * Gruss, Name und Beilagen fliessen wie bei Word „Quadrat“ um das Bild herum.
 */
export function LetterFlowImages({
  images,
  contentWidthMm,
  exportMode = false,
  onChange,
  onRemove,
}: Props) {
  const valid = images.filter(
    (image) =>
      image &&
      typeof image.id === "string" &&
      typeof image.src === "string" &&
      image.src.startsWith("data:"),
  );

  const startMove = (image: LetterFlowImage) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (exportMode || !onChange || event.button !== 0) return;
    const layer = event.currentTarget.closest<HTMLElement>("[data-letter-text-layer]");
    if (!layer) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = layer.getBoundingClientRect();
    if (!rect.width) return;
    const mmPerPx = contentWidthMm / rect.width;
    const startY = event.clientY;
    const fromTop = image.topMm;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      const nextTop = clamp(fromTop + (moveEvent.clientY - startY) * mmPerPx, 0, 150);
      const side = moveEvent.clientX < rect.left + rect.width / 2 ? "left" : "right";
      onChange(image.id, {
        topMm: Math.round(nextTop * 10) / 10,
        side,
      });
    };

    const up = () => {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  const startResize = (image: LetterFlowImage) => (event: React.PointerEvent<HTMLButtonElement>) => {
    if (exportMode || !onChange || event.button !== 0) return;
    const layer = event.currentTarget.closest<HTMLElement>("[data-letter-text-layer]");
    if (!layer) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = layer.getBoundingClientRect();
    if (!rect.width) return;
    const mmPerPx = contentWidthMm / rect.width;
    const startX = event.clientX;
    const fromWidth = image.widthMm;
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    target.setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      const direction = image.side === "right" ? -1 : 1;
      const delta = (moveEvent.clientX - startX) * mmPerPx * direction;
      const widthMm = clamp(fromWidth + delta, 16, Math.min(78, contentWidthMm - 12));
      onChange(image.id, { widthMm: Math.round(widthMm * 10) / 10 });
    };

    const up = () => {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  return (
    <>
      {valid.map((image) => {
        const widthMm = clamp(Number(image.widthMm) || 34, 16, Math.min(78, contentWidthMm - 12));
        const topMm = clamp(Number(image.topMm) || 0, 0, 150);
        const gapMm = clamp(Number(image.gapMm) || 4, 0, 12);
        const side = image.side === "left" ? "left" : "right";

        return (
          <div
            key={image.id}
            data-letter-flow-image={image.id}
            data-wrap="square"
            data-side={side}
            onPointerDown={startMove(image)}
            className={exportMode ? "relative" : "relative cursor-move touch-none"}
            style={{
              float: side,
              width: `${widthMm}mm`,
              marginTop: `${topMm}mm`,
              marginBottom: `${gapMm}mm`,
              marginLeft: side === "right" ? `${gapMm}mm` : 0,
              marginRight: side === "left" ? `${gapMm}mm` : 0,
              shapeOutside: "margin-box",
              zIndex: 3,
            }}
          >
            <img
              src={image.src}
              alt=""
              draggable={false}
              className="block h-auto w-full select-none"
            />

            {!exportMode && onChange ? (
              <>
                {onRemove ? (
                  <button
                    type="button"
                    aria-label="Foto entfernen"
                    title="Foto entfernen"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(image.id);
                    }}
                    className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border bg-background text-xs font-bold shadow"
                  >
                    ×
                  </button>
                ) : null}
                <button
                  type="button"
                  data-letter-flow-resize
                  aria-label="Foto skalieren"
                  title="Foto skalieren"
                  onPointerDown={startResize(image)}
                  className={`absolute -bottom-2 grid h-5 w-5 touch-none place-items-center rounded border bg-background text-[10px] shadow ${
                    side === "right" ? "-left-2 cursor-nesw-resize" : "-right-2 cursor-nwse-resize"
                  }`}
                >
                  ↘
                </button>
              </>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
''', encoding="utf-8")

canvas = Path("src/components/letter/LetterCanvas.tsx")
replace_exact(
    canvas,
    '''  type LetterData,\n  type LetterDesign,\n  type LetterTemplateId,\n} from "./types";\nimport { letterRichHtml, plainTextToRichHtml } from "./rich-text";''',
    '''  type LetterData,\n  type LetterDesign,\n  type LetterFlowImage,\n  type LetterTemplateId,\n} from "./types";\nimport { letterRichHtml, plainTextToRichHtml } from "./rich-text";\nimport { LetterFlowImages } from "./LetterFlowImages";''',
    "letter canvas imports",
)
replace_exact(
    canvas,
    '''  exportMode = false,\n  onOverflowChange,\n  ariaLabel = "Vorschau Motivationsschreiben",\n}: {\n  data: LetterData;\n  design: LetterDesign;\n  exportMode?: boolean;\n  onOverflowChange?: (overflow: boolean) => void;\n  ariaLabel?: string;\n}) {\n  const layout = layoutFor(design.template);''',
    '''  exportMode = false,\n  onOverflowChange,\n  onImageChange,\n  onImageRemove,\n  ariaLabel = "Vorschau Motivationsschreiben",\n}: {\n  data: LetterData;\n  design: LetterDesign;\n  exportMode?: boolean;\n  onOverflowChange?: (overflow: boolean) => void;\n  onImageChange?: (id: string, patch: Partial<LetterFlowImage>) => void;\n  onImageRemove?: (id: string) => void;\n  ariaLabel?: string;\n}) {\n  const layout = layoutFor(design.template);\n  const contentWidthMm = 210 - layout.left - layout.right;''',
    "letter canvas props",
)
replace_exact(
    canvas,
    '''          <p data-letter-pdf-text="salutation" className="mb-[5mm]">\n            {data.anrede || (exportMode ? "" : "Guten Tag")}\n          </p>\n\n          <div\n            data-letter-pdf-richtext="body"''',
    '''          <div data-letter-flow-zone>\n            <p data-letter-pdf-text="salutation" className="mb-[5mm]">\n              {data.anrede || (exportMode ? "" : "Guten Tag")}\n            </p>\n\n            <LetterFlowImages\n              images={data.images ?? []}\n              contentWidthMm={contentWidthMm}\n              exportMode={exportMode}\n              onChange={onImageChange}\n              onRemove={onImageRemove}\n            />\n\n            <div\n              data-letter-pdf-richtext="body"''',
    "open letter flow zone",
)
replace_exact(
    canvas,
    '''          {showBeilagen ? (\n            <div className="mt-[9mm] text-[10pt] leading-[1.45]">\n              <div data-letter-pdf-text="attachments-heading" className="font-semibold">\n                Beilagen:\n              </div>\n              <div data-letter-pdf-text="attachments-body" className="mt-[1.5mm]">\n                <Lines values={beilagen} />\n              </div>\n            </div>\n          ) : null}\n        </div>''',
    '''            {showBeilagen ? (\n              <div className="mt-[9mm] text-[10pt] leading-[1.45]">\n                <div data-letter-pdf-text="attachments-heading" className="font-semibold">\n                  Beilagen:\n                </div>\n                <div data-letter-pdf-text="attachments-body" className="mt-[1.5mm]">\n                  <Lines values={beilagen} />\n                </div>\n              </div>\n            ) : null}\n          </div>\n        </div>''',
    "close letter flow zone",
)

route = Path("src/routes/anschreiben.tsx")
replace_exact(
    route,
    'import { downloadLetterPdf } from "@/lib/dossier-pdf";\n',
    'import { downloadLetterPdf } from "@/lib/dossier-pdf";\nimport { readPhoto } from "@/lib/image";\n',
    "letter image reader import",
)
replace_exact(
    route,
    '''  type LetterData,\n  type LetterDesign,\n  type LetterTemplateId,\n  type SavedLetter,''',
    '''  type LetterData,\n  type LetterDesign,\n  type LetterFlowImage,\n  type LetterTemplateId,\n  type SavedLetter,''',
    "letter image type import",
)
replace_exact(
    route,
    '''  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));\n  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));''',
    '''  const patch = (value: Partial<LetterData>) => setData((current) => ({ ...current, ...value }));\n\n  const addLetterImage = async (file?: File) => {\n    if (!file) return;\n    try {\n      const src = await readPhoto(file);\n      const image: LetterFlowImage = {\n        id: `letter-image-${Date.now()}`,\n        src,\n        side: "right",\n        topMm: 8,\n        widthMm: 34,\n        gapMm: 4,\n      };\n      setData((current) => ({ ...current, images: [...(current.images ?? []), image] }));\n    } catch {\n      setTransferNote({ kind: "error", text: "Foto oder Bild konnte nicht gelesen werden." });\n    }\n  };\n\n  const patchLetterImage = (id: string, imagePatch: Partial<LetterFlowImage>) =>\n    setData((current) => ({\n      ...current,\n      images: (current.images ?? []).map((image) =>\n        image.id === id ? { ...image, ...imagePatch } : image,\n      ),\n    }));\n\n  const removeLetterImage = (id: string) =>\n    setData((current) => ({\n      ...current,\n      images: (current.images ?? []).filter((image) => image.id !== id),\n    }));\n\n  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));''',
    "letter image state actions",
)
replace_exact(
    route,
    '''                <LetterRichTextEditor\n                  text={data.text}\n                  richTextHtml={data.richTextHtml}\n                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}\n                />\n                <Field''',
    '''                <LetterRichTextEditor\n                  text={data.text}\n                  richTextHtml={data.richTextHtml}\n                  onChange={({ text, richTextHtml }) => patch({ text, richTextHtml })}\n                />\n                <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-2.5">\n                  <label className="cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent">\n                    + Foto\n                    <input\n                      type="file"\n                      accept="image/*"\n                      className="hidden"\n                      onChange={(event) => {\n                        void addLetterImage(event.target.files?.[0]);\n                        event.target.value = "";\n                      }}\n                    />\n                  </label>\n                  <span className="text-[11px] leading-relaxed text-muted-foreground">\n                    Foto oder Bild frei platzieren · Text fliesst automatisch im Quadrat darum.\n                  </span>\n                </div>\n                <Field''',
    "letter add photo ui",
)
replace_exact(
    route,
    '''              <LetterCanvas data={data} design={design} onOverflowChange={setLetterOverflow} />''',
    '''              <LetterCanvas\n                data={data}\n                design={design}\n                onOverflowChange={setLetterOverflow}\n                onImageChange={patchLetterImage}\n                onImageRemove={removeLetterImage}\n              />''',
    "editable letter canvas callbacks",
)

spec = Path("tests/e2e/dossier-transfer-regression.spec.ts")
text = spec.read_text(encoding="utf-8")
marker = '\n});\n'
if not text.endswith(marker):
    raise SystemExit("transfer spec: describe footer not found")
test = r'''

  test("Anschreiben wraps text around freely placed photos", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.evaluate((photo) => {
      localStorage.clear();
      localStorage.setItem(
        "anschreiben:v1",
        JSON.stringify({
          version: 1,
          data: {
            absenderName: "Mia Keller",
            text:
              "Dieser längere Brieftext prüft den Textfluss um ein frei platziertes Foto. ".repeat(12),
            anrede: "Guten Tag",
            gruss: "Freundliche Grüsse",
            unterschrift: "Mia Keller",
            images: [
              {
                id: "letter-flow-1",
                src: photo,
                side: "right",
                topMm: 8,
                widthMm: 34,
                gapMm: 4,
              },
            ],
          },
          design: {
            template: "brief",
            colors: { bg: "#ffffff", primary: "#111111", accent: "#111111" },
            font: "freundlich",
          },
        }),
      );
    }, PHOTO);

    await page.goto(`${BASE_URL}/anschreiben`, { waitUntil: "domcontentloaded" });
    const preview = page.getByLabel("Vorschau Motivationsschreiben");
    const image = preview.locator('[data-letter-flow-image="letter-flow-1"]');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute("data-wrap", "square");
    await expect(image).toHaveAttribute("data-side", "right");
    expect(await image.evaluate((element) => getComputedStyle(element).cssFloat)).toBe("right");

    const box = await image.boundingBox();
    if (!box) throw new Error("flow image has no bounding box");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 80, box.y + box.height / 2 + 30, { steps: 5 });
    await page.mouse.up();

    await expect(image).toHaveAttribute("data-side", "left");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const saved = JSON.parse(localStorage.getItem("anschreiben:v1") ?? "{}");
          const flow = saved.data?.images?.[0];
          return { side: flow?.side, topMm: flow?.topMm };
        }),
      )
      .toMatchObject({ side: "left" });
  });
'''
spec.write_text(text[:-len(marker)] + test + marker, encoding="utf-8")
