import { useEffect, useRef, useState, type ReactNode } from "react";

const A4_W = 794; // 210mm @96dpi
const A4_H = 1123; // 297mm @96dpi

/**
 * Skaliert das A4-Blatt so, dass es in die verfügbare Breite *und* Höhe passt.
 * `overlay` wird unskaliert über das Blatt gelegt (für Bedien-Elemente, die
 * nicht mitschrumpfen sollen) und bekommt den aktuellen Massstab übergeben.
 */
export function ScaledPreview({
  children,
  max = 1,
  fitHeight,
  overlay,
}: {
  children: ReactNode;
  max?: number;
  fitHeight?: number;
  overlay?: (scale: number) => ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const byWidth = width > 0 ? width / A4_W : 0.4;
  const byHeight = fitHeight && fitHeight > 0 ? fitHeight / A4_H : Infinity;
  const scale = Math.max(0.12, Math.min(max, byWidth, byHeight));

  return (
    <div ref={boxRef} className="w-full">
      <div className="relative mx-auto" style={{ width: A4_W * scale, height: A4_H * scale }}>
        <div
          style={{
            width: A4_W,
            height: A4_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
        {overlay?.(scale)}
      </div>
    </div>
  );
}
