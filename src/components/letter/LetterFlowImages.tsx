import type { LetterFlowImage } from "./types";

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
