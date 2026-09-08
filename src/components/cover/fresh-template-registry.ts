import type { ColorSlot } from "./types";

export type FreshTemplateRegistryEntry = {
  id: string;
  name: string;
  description: string;
  slots: readonly ColorSlot[];
};

/**
 * Canonical, side-effect-free definitions for dossier templates 21-38.
 *
 * Runtime registration, renderers, contracts and Node-side tests all derive
 * their Fresh ids/names/default palettes from this module. Keep CSS imports and
 * TEMPLATES mutation out of here so it remains safe in browser and Node code.
 */
export const FRESH_TEMPLATE_REGISTRY = [
  { id: "edge", name: "Edge", description: "Klare Seitenkante, viel Ruhe, präzise Akzente", slots: [{ key: "bg", label: "Papier", default: "#f7f7f4" }, { key: "primary", label: "Kante", default: "#182433" }, { key: "secondary", label: "Signal", default: "#4da3ff" }, { key: "accent", label: "Akzent", default: "#2f7de1" }, { key: "ink", label: "Text", default: "#18202a" }] },
  { id: "glow", name: "Glow", description: "Weiche Farbräume, modern und freundlich", slots: [{ key: "bg", label: "Papier", default: "#f7f9ff" }, { key: "primary", label: "Glow 1", default: "#6d5dfb" }, { key: "secondary", label: "Glow 2", default: "#7dd3fc" }, { key: "accent", label: "Akzent", default: "#14b8a6" }, { key: "ink", label: "Text", default: "#172033" }] },
  { id: "frame", name: "Frame", description: "Geometrischer Rahmen, ruhig und markant", slots: [{ key: "bg", label: "Papier", default: "#f6f3ed" }, { key: "primary", label: "Rahmen", default: "#26352f" }, { key: "secondary", label: "Kontrast", default: "#d8894a" }, { key: "accent", label: "Akzent", default: "#b96b32" }, { key: "ink", label: "Text", default: "#1e2722" }] },
  { id: "monoLuxe", name: "Mono Luxe", description: "Reduziert, typografisch, mit feinem Metallakzent", slots: [{ key: "bg", label: "Papier", default: "#f8f6f1" }, { key: "primary", label: "Schwarz", default: "#171717" }, { key: "secondary", label: "Metall", default: "#b08d57" }, { key: "accent", label: "Akzent", default: "#8e6f42" }, { key: "ink", label: "Text", default: "#171717" }] },
  { id: "horizon", name: "Horizon", description: "Ruhiger Blauverlauf, klar und professionell", slots: [{ key: "bg", label: "Papier", default: "#f6f9ff" }, { key: "primary", label: "Navy", default: "#11233f" }, { key: "secondary", label: "Royal Blue", default: "#2f6dff" }, { key: "accent", label: "Sky Blue", default: "#6fc3ff" }, { key: "ink", label: "Text", default: "#152033" }] },
  { id: "sunrise", name: "Sunrise", description: "Warmer Verlauf, freundlich und optimistisch", slots: [{ key: "bg", label: "Papier", default: "#fff8f2" }, { key: "primary", label: "Coral", default: "#ff7a59" }, { key: "secondary", label: "Peach", default: "#ffb27a" }, { key: "accent", label: "Soft Gold", default: "#f4c76a" }, { key: "ink", label: "Text", default: "#3a2a24" }] },
  { id: "forestFlow", name: "Forest Flow", description: "Tiefe Grüntöne, ruhig und elegant", slots: [{ key: "bg", label: "Papier", default: "#f5f8f4" }, { key: "primary", label: "Deep Green", default: "#1f4d43" }, { key: "secondary", label: "Teal", default: "#2e8b7f" }, { key: "accent", label: "Sage", default: "#9abf9c" }, { key: "ink", label: "Text", default: "#1d2b27" }] },
  { id: "violetPulse", name: "Violet Pulse", description: "Digitaler Violettverlauf, frisch und markant", slots: [{ key: "bg", label: "Papier", default: "#faf7ff" }, { key: "primary", label: "Indigo", default: "#4338ca" }, { key: "secondary", label: "Violet", default: "#7c3aed" }, { key: "accent", label: "Magenta", default: "#d946ef" }, { key: "ink", label: "Text", default: "#1f1733" }] },
  { id: "studio2", name: "Studio 2", description: "Klarer Studio-Split mit starkem Signal-Farbblock", slots: [{ key: "bg", label: "Papier", default: "#fbfbf8" }, { key: "primary", label: "Spalte", default: "#202a3b" }, { key: "secondary", label: "Signalband", default: "#f2c84b" }, { key: "accent", label: "Akzent", default: "#e78a2f" }, { key: "ink", label: "Text", default: "#1b2430" }] },
  { id: "studio3", name: "Studio 3", description: "Asymmetrischer Editorial-Look mit Teal-Flächen", slots: [{ key: "bg", label: "Papier", default: "#f7fbfa" }, { key: "primary", label: "Spalte", default: "#173d3a" }, { key: "secondary", label: "Farbfläche", default: "#5ec6b6" }, { key: "accent", label: "Akzent", default: "#e2a94b" }, { key: "ink", label: "Text", default: "#18302d" }] },
  { id: "warm2", name: "Warm 2", description: "Peach und Apricot in grossen, weichen Farbräumen", slots: [{ key: "bg", label: "Papier", default: "#fff7f0" }, { key: "primary", label: "Coral", default: "#d95f4c" }, { key: "secondary", label: "Apricot", default: "#f6b26b" }, { key: "accent", label: "Sage", default: "#7f9b76" }, { key: "ink", label: "Text", default: "#3a2521" }] },
  { id: "warm3", name: "Warm 3", description: "Erwachsener Warm-Look mit Teal, Amber und organischer Kante", slots: [{ key: "bg", label: "Papier", default: "#fbf7ef" }, { key: "primary", label: "Teal", default: "#1e6f68" }, { key: "secondary", label: "Amber", default: "#e5a84f" }, { key: "accent", label: "Terracotta", default: "#c86648" }, { key: "ink", label: "Text", default: "#24312e" }] },
  { id: "ledger", name: "Ledger", description: "Editoriales Raster mit Masthead und ruhiger Indexspalte", slots: [{ key: "bg", label: "Papier", default: "#f7f4ee" }, { key: "primary", label: "Masthead", default: "#1f2933" }, { key: "secondary", label: "Indexfläche", default: "#d8c9b2" }, { key: "accent", label: "Kupfer", default: "#b56a43" }, { key: "ink", label: "Text", default: "#20262c" }] },
  { id: "prism", name: "Prism", description: "Klarer diagonaler Two-Tone-Look mit starker Hierarchie", slots: [{ key: "bg", label: "Papier", default: "#f7f9fc" }, { key: "primary", label: "Navy", default: "#172554" }, { key: "secondary", label: "Royal", default: "#2563eb" }, { key: "accent", label: "Sky", default: "#38bdf8" }, { key: "ink", label: "Text", default: "#172033" }] },
  { id: "gallery", name: "Gallery", description: "Markanter Portrait-Turm mit geerdeter Informationsfläche", slots: [{ key: "bg", label: "Papier", default: "#faf7f2" }, { key: "primary", label: "Plum", default: "#4b2e3f" }, { key: "secondary", label: "Sand", default: "#d7b9a5" }, { key: "accent", label: "Terracotta", default: "#b96852" }, { key: "ink", label: "Text", default: "#2c2530" }] },
  { id: "orbit", name: "Orbit", description: "Versetzte Kreisflächen mit klarer, moderner Hierarchie", slots: [{ key: "bg", label: "Papier", default: "#f7f8fc" }, { key: "primary", label: "Midnight", default: "#1e1b4b" }, { key: "secondary", label: "Indigo", default: "#6366f1" }, { key: "accent", label: "Cyan", default: "#22d3ee" }, { key: "ink", label: "Text", default: "#17172b" }] },
  { id: "ribbon", name: "Ribbon", description: "Tiefe Seitenfläche mit breitem, weich gerundetem Farbbanner", slots: [{ key: "bg", label: "Papier", default: "#f8fbf8" }, { key: "primary", label: "Forest", default: "#164e3f" }, { key: "secondary", label: "Gold", default: "#d7a449" }, { key: "accent", label: "Mint", default: "#7fc8b8" }, { key: "ink", label: "Text", default: "#17312b" }] },
  { id: "cove", name: "Cove", description: "Breiter Rundkopf mit markanter Portrait-Bucht", slots: [{ key: "bg", label: "Papier", default: "#fff8f3" }, { key: "primary", label: "Plum", default: "#5b214e" }, { key: "secondary", label: "Coral", default: "#e76f51" }, { key: "accent", label: "Gold", default: "#f4b942" }, { key: "ink", label: "Text", default: "#2d1f2a" }] },
] as const satisfies readonly FreshTemplateRegistryEntry[];

export type FreshTemplateId = (typeof FRESH_TEMPLATE_REGISTRY)[number]["id"];
export const FRESH_TEMPLATE_IDS = FRESH_TEMPLATE_REGISTRY.map(({ id }) => id) as FreshTemplateId[];

export function isFreshTemplateId(value: string): value is FreshTemplateId {
  return (FRESH_TEMPLATE_IDS as readonly string[]).includes(value);
}
