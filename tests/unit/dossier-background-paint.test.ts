import { expect, test } from "bun:test";
import { hasAlphaGradient } from "../../src/lib/dossier-background-paint";

test("resolved paint distinguishes translucent gradient stops from opaque artwork", () => {
  expect(
    hasAlphaGradient("linear-gradient(120deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0))"),
  ).toBe(true);
  expect(
    hasAlphaGradient("radial-gradient(circle, color(srgb 1 0.5 0 / 0.3), rgba(0, 0, 0, 0))"),
  ).toBe(true);
  expect(hasAlphaGradient("repeating-linear-gradient(rgb(20, 30, 40), rgb(40, 50, 60))")).toBe(
    false,
  );
  expect(hasAlphaGradient("linear-gradient(color(srgb 1 0.5 0), color(srgb 0 0.5 1))")).toBe(false);
  expect(hasAlphaGradient("none")).toBe(false);
  expect(hasAlphaGradient('url("data:image/png;base64,...")')).toBe(false);
});
