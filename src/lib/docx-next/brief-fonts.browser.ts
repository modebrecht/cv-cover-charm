import { FONT_STACKS, lineText, type Block } from "@/components/cover/types";

// Closed, bounded profile already exercised by the Brief prototype. The local
// face and actual Web stack must have matching metrics; family names alone do
// not certify fonts installed in a different application (Microsoft Word).
const PROFILES = [
  { name: "Arial", regular: ["Arial", "ArialMT"], bold: ["Arial Bold", "Arial-BoldMT"] },
  {
    name: "Liberation Sans",
    regular: ["Liberation Sans", "LiberationSans"],
    bold: ["Liberation Sans Bold", "LiberationSans-Bold"],
  },
] as const;
const PROBE = "MWil 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz ÄÖÜäöüéèàß";
// The bounded profile covers western application text, not arbitrary fallback
// glyphs. A wider script/font policy needs its own Word acceptance evidence.
const LATIN =
  /^[\t\n\r\x20-\x7e\u00a0-\u00ac\u00ae-\u00ff\u0152\u0153\u2010-\u201f\u2022\u2026\u20ac]*$/u;

export async function fontDeadline<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Brief DOCX Next: Schriftmessung nicht verfügbar (Zeitlimit).")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Browser-only validation. No font bytes, DOM geometry or font API enters the model. */
export async function prepareBriefFontProfile(blocks: Block[]) {
  if (typeof document === "undefined" || typeof FontFace === "undefined" || !document.fonts)
    throw new Error("Brief DOCX Next: Schriftmessung benötigt einen unterstützten Browser.");
  const visible = blocks.filter(
    (b) =>
      !b.style.hidden &&
      b.kind !== "shape" &&
      (b.kind !== "text" || b.lines.some((line) => lineText(line).trim())),
  );
  for (const b of visible) {
    const text = b.lines.map(lineText).join("\n");
    if (
      b.style.font !== "sans" ||
      b.style.italic ||
      ![400, 600, 700].includes(b.style.weight) ||
      !LATIN.test(text) ||
      b.lines.some(
        (line) =>
          typeof line !== "string" &&
          line.some((run) => run.weight !== undefined && run.weight !== b.style.weight),
      )
    )
      throw new Error(
        `Brief DOCX Next: Nicht unterstützte Schrift oder Textformatierung in «${b.id}». Der Test unterstützt Sans, normal/fett und westeuropäische Zeichen.`,
      );
  }
  const canvas = document.createElement("canvas").getContext("2d");
  if (!canvas) throw new Error("Brief DOCX Next: Schriftmessung ist nicht verfügbar.");
  await fontDeadline(document.fonts.ready);
  const fingerprint = (family: string, weight: number, text: string) => {
    canvas.font = `${weight} 48px ${family}`;
    const m = canvas.measureText(text);
    const values = [
      m.width,
      m.actualBoundingBoxLeft,
      m.actualBoundingBoxRight,
      m.actualBoundingBoxAscent,
      m.actualBoundingBoxDescent,
      m.fontBoundingBoxAscent,
      m.fontBoundingBoxDescent,
    ];
    if (!values.every(Number.isFinite))
      throw new Error("Brief DOCX Next: Der Browser liefert keine vollständigen Schriftmesswerte.");
    return values;
  };
  let mismatch: unknown;
  for (const profile of PROFILES) {
    const faces = [400, 700].map((weight) => {
      const family = `DocxNextBrief${profile.name.replaceAll(" ", "")}${weight}`;
      const names = weight === 400 ? profile.regular : profile.bold;
      return new FontFace(family, names.map((name) => `local("${name}")`).join(", "), {
        weight: String(weight),
      });
    });
    try {
      await fontDeadline(Promise.all(faces.map((face) => face.load())));
    } catch (error) {
      if (error instanceof Error && error.message.includes("Zeitlimit")) throw error;
      continue;
    }
    faces.forEach((face) => document.fonts.add(face));
    const dispose = () => faces.forEach((face) => document.fonts.delete(face));
    const verify = () => {
      if (document.fonts.status !== "loaded")
        throw new Error(
          "Brief DOCX Next: Schriften haben sich geändert. Bitte erneut exportieren.",
        );
      for (const weight of [400, 600, 700]) {
        for (const text of [
          PROBE,
          ...visible.map((b) => {
            const text = b.lines.map(lineText).join(" ");
            return b.style.uppercase ? text.toUpperCase() : text;
          }),
        ]) {
          const actual = fingerprint(FONT_STACKS.sans, weight, text);
          // Compare system-family realization with system-family realization.
          // A local() FontFace registered under an alias can use different
          // browser metrics even for the same installed font; its load is an
          // availability check, not the measurement reference.
          const expected = fingerprint(`"${profile.name}"`, weight >= 600 ? 700 : 400, text);
          if (actual.some((n, i) => Math.abs(n - expected[i]) > 0.001))
            throw new Error(
              "Brief DOCX Next: Die aktuelle Browser-Ersatzschrift passt nicht zum geprüften Arial-/Liberation-Sans-Profil. Bitte Sans mit Arial oder Liberation Sans verwenden.",
            );
        }
      }
    };
    try {
      verify();
      return {
        profile: `brief-sans-v1; browser=${profile.name}; Word=Arial; target-font-identity=unverified`,
        verify,
        dispose,
      };
    } catch (error) {
      dispose();
      mismatch = error;
      // A present Arial face may differ from the actual Web fallback. Try only
      // the other declared profile; never accept an arbitrary fallback font.
      if (profile === PROFILES[PROFILES.length - 1]) throw error;
    }
  }
  if (mismatch) throw mismatch;
  throw new Error("Brief DOCX Next: Arial oder Liberation Sans ist im Browser nicht verfügbar.");
}
