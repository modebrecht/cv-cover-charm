export const FRESH_TEMPLATE_REGISTRY = [
  { id: "edge", name: "Edge" },
  { id: "glow", name: "Glow" },
  { id: "frame", name: "Frame" },
  { id: "monoLuxe", name: "Mono Luxe" },
  { id: "horizon", name: "Horizon" },
  { id: "sunrise", name: "Sunrise" },
  { id: "forestFlow", name: "Forest Flow" },
  { id: "violetPulse", name: "Violet Pulse" },
  { id: "studio2", name: "Studio 2" },
  { id: "studio3", name: "Studio 3" },
  { id: "warm2", name: "Warm 2" },
  { id: "warm3", name: "Warm 3" },
  { id: "ledger", name: "Ledger" },
  { id: "prism", name: "Prism" },
  { id: "gallery", name: "Gallery" },
  { id: "orbit", name: "Orbit" },
  { id: "ribbon", name: "Ribbon" },
  { id: "cove", name: "Cove" },
] as const;

export type FreshTemplateId = (typeof FRESH_TEMPLATE_REGISTRY)[number]["id"];

/**
 * Canonical, side-effect-free Fresh template sequence used by renderers,
 * contracts and Node-side tests. Keep CSS/runtime registration out of this
 * module so non-browser consumers can safely import it.
 */
export const FRESH_TEMPLATE_IDS = FRESH_TEMPLATE_REGISTRY.map(({ id }) => id) as FreshTemplateId[];

export function isFreshTemplateId(value: string): value is FreshTemplateId {
  return (FRESH_TEMPLATE_IDS as readonly string[]).includes(value);
}
