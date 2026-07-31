import { useEffect, useRef, useState, type ReactNode } from "react";

const A4_W = 794; // 210mm @96dpi
const A4_H = 1123; // 297mm @96dpi

/**
 * Scales the fixed A4 sheet down to the available width so the preview
 * never overflows on small screens.
 */
export function ScaledPreview({
  children,
  max = 1,
}: {
  children: ReactNode;
  max?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(max, w / A4_W));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  return (
    <div ref={boxRef} className="w-full">
      <div style={{ height: A4_H * scale }}>
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
      </div>
    </div>
  );
}
