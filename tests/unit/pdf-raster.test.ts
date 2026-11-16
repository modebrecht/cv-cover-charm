import { expect, test } from "bun:test";
import { renderPdfRaster } from "../../src/lib/pdf-raster";

function fixture() {
  const calls: unknown[][] = [];
  const prototype = {
    fillText: (...args: unknown[]) => calls.push(["fill", ...args]),
    strokeText: (...args: unknown[]) => calls.push(["stroke", ...args]),
  };
  const context = Object.assign(Object.create(prototype), {
    textBaseline: "alphabetic",
    font: '700 40px "Courier New", monospace',
    measureText: () => ({ fontBoundingBoxAscent: 33 }),
  }) as CanvasRenderingContext2D;
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  const element = {
    ownerDocument: { createElement: () => canvas, defaultView: { devicePixelRatio: 1 } },
    getBoundingClientRect: () => ({ width: 210.2, height: 297.1 }),
  } as unknown as HTMLElement;
  return { calls, context, canvas, element, prototype };
}

test("PDF paint uses measured ascent for fill/stroke while preserving width and restoring this context", async () => {
  const f = fixture();
  const render = async (_element: HTMLElement, options: { canvas?: HTMLCanvasElement }) => {
    expect(options.canvas).toBe(f.canvas);
    f.context.fillText("Lea Müller", 10, 140);
    f.context.strokeText("Lea Müller", 10, 140, 200);
    return f.canvas;
  };
  expect(await renderPdfRaster(render, f.element, { width: 794, height: 1123, scale: 3 })).toBe(
    f.canvas,
  );
  expect(f.calls).toEqual([
    ["fill", "Lea Müller", 10, 133],
    ["stroke", "Lea Müller", 10, 133, 200],
  ]);
  expect([f.canvas.width, f.canvas.height]).toEqual([2382, 3369]);
  expect(Object.hasOwn(f.context, "fillText")).toBe(false);
  expect(f.context.fillText).toBe(f.prototype.fillText);
});

test("ideographic text and unsupported font metrics keep their original coordinates", async () => {
  const f = fixture();
  await renderPdfRaster(
    async () => {
      f.context.textBaseline = "ideographic";
      f.context.fillText("字", 10, 140);
      f.context.textBaseline = "alphabetic";
      f.context.measureText = () =>
        ({ fontBoundingBoxAscent: undefined }) as unknown as TextMetrics;
      f.context.fillText("Lea", 10, 140);
      f.context.font = "unrecognized";
      f.context.strokeText("Lea", 10, 140);
      return f.canvas;
    },
    f.element,
    {},
  );
  expect(f.calls).toEqual([
    ["fill", "字", 10, 140],
    ["fill", "Lea", 10, 140],
    ["stroke", "Lea", 10, 140],
  ]);
  expect([f.canvas.width, f.canvas.height]).toEqual([211, 298]);
});

test("failed rendering restores the owned context without changing another context", async () => {
  const f = fixture(),
    other = fixture();
  await expect(
    renderPdfRaster(
      async () => {
        expect(Object.hasOwn(other.context, "fillText")).toBe(false);
        throw new Error("render failed");
      },
      f.element,
      {},
    ),
  ).rejects.toThrow("render failed");
  expect(Object.hasOwn(f.context, "fillText")).toBe(false);
  expect(Object.hasOwn(f.context, "strokeText")).toBe(false);
  expect(other.context.fillText).toBe(other.prototype.fillText);
});
