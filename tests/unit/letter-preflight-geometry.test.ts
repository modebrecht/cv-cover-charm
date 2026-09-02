import { describe, expect, test } from "bun:test";
import { letterPageOverflows } from "../../src/components/letter/preflight";

const rect = (left: number, top: number, right: number, bottom: number) => ({
  left,
  top,
  right,
  bottom,
  width: right - left,
  height: bottom - top,
  x: left,
  y: top,
  toJSON: () => ({}),
});

function element(
  box: ReturnType<typeof rect>,
  {
    clientWidth = box.width,
    scrollWidth = box.width,
    clientHeight = box.height,
    scrollHeight = box.height,
  }: {
    clientWidth?: number;
    scrollWidth?: number;
    clientHeight?: number;
    scrollHeight?: number;
  } = {},
) {
  return {
    clientWidth,
    scrollWidth,
    clientHeight,
    scrollHeight,
    getBoundingClientRect: () => box,
  } as unknown as HTMLElement;
}

function pageWith({
  layer = element(rect(80, 100, 710, 1000)),
  contact = null,
  recipient = null,
  footer = null,
  images = [],
}: {
  layer?: HTMLElement;
  contact?: HTMLElement | null;
  recipient?: HTMLElement | null;
  footer?: HTMLElement | null;
  images?: HTMLElement[];
} = {}) {
  return {
    getBoundingClientRect: () => rect(0, 0, 794, 1123),
    querySelector: (selector: string) => {
      if (selector === "[data-letter-text-layer]") return layer;
      if (selector === "[data-letter-integrated-contact]") return contact;
      if (selector === '[data-letter-section="recipient"]') return recipient;
      if (selector === "[data-letter-footer]") return footer;
      return null;
    },
    querySelectorAll: (selector: string) => (selector === "[data-letter-flow-image]" ? images : []),
  } as unknown as ParentNode;
}

describe("M8 full-page motivation-letter preflight", () => {
  test("rejects a footer whose attachment content is internally clipped", () => {
    const footer = element(rect(0, 1010, 794, 1123), {
      clientHeight: 100,
      scrollHeight: 132,
    });

    expect(letterPageOverflows(pageWith({ footer }))).toBe(true);
  });

  test("rejects a long contact header that grows into the recipient block", () => {
    const contact = element(rect(90, 12, 700, 150));
    const recipient = element(rect(90, 130, 700, 250));

    expect(letterPageOverflows(pageWith({ contact, recipient }))).toBe(true);
  });

  test("rejects a floated image that crosses the safe text area", () => {
    const image = element(rect(620, 930, 730, 1040));

    expect(letterPageOverflows(pageWith({ images: [image] }))).toBe(true);
  });

  test("accepts healthy chrome and images inside their measured boxes", () => {
    const contact = element(rect(90, 12, 700, 75));
    const recipient = element(rect(90, 110, 700, 220));
    const footer = element(rect(0, 1060, 794, 1123));
    const image = element(rect(520, 360, 650, 500));

    expect(letterPageOverflows(pageWith({ contact, recipient, footer, images: [image] }))).toBe(
      false,
    );
  });
});
