import type { BlockStyle } from "./types";

type Props = {
  style: BlockStyle;
  onChange: (patch: Partial<BlockStyle>) => void;
  /** Zuschnitt nur zeigen, wenn überhaupt ein Foto da ist. */
  hasPhoto: boolean;
  compact?: boolean;
};

/** Rahmenformen wie in Office: Kreis, Quadrat, Hochformat, abgerundet. */
const SHAPES: { label: string; patch: Partial<BlockStyle> }[] = [
  { label: "Kreis", patch: { radius: 999, ratio: 1 } },
  { label: "Quadrat", patch: { radius: 0, ratio: 1 } },
  { label: "Hochformat", patch: { radius: 0, ratio: 1.25 } },
  { label: "Abgerundet", patch: { radius: 4, ratio: 1.15 } },
];

const btn = "rounded-md border px-2 py-1 text-xs transition-colors border-input hover:bg-accent";
const btnOn =
  "rounded-md border px-2 py-1 text-xs border-primary bg-primary text-primary-foreground";

function matches(st: BlockStyle, patch: Partial<BlockStyle>) {
  return (st.radius ?? 0) === patch.radius && Math.abs((st.ratio ?? 1) - (patch.ratio ?? 1)) < 0.01;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </label>
  );
}

/** Form und Bildausschnitt des Fotos – genutzt in der Leiste und im Formular. */
export function PhotoControls({ style: st, onChange, hasPhoto, compact }: Props) {
  const zoom = st.imgZoom ?? 1;

  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "min-w-56"}`}>
      <Row label="Rahmenform">
        <div className="flex flex-wrap gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.label}
              type="button"
              className={matches(st, s.patch) ? btnOn : btn}
              onClick={() => onChange(s.patch)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Row>

      {hasPhoto ? (
        <>
          <Row label={`Zuschnitt ${Math.round(zoom * 100)} %`}>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => onChange({ imgZoom: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            {zoom > 1 && (
              <button
                type="button"
                className={btn}
                onClick={() => onChange({ imgZoom: 1, imgX: 50, imgY: 50 })}
              >
                Reset
              </button>
            )}
          </Row>
          {zoom > 1 && (
            <div className="grid grid-cols-2 gap-3">
              <Row label="Ausschnitt ↔">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={st.imgX ?? 50}
                  onChange={(e) => onChange({ imgX: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Row>
              <Row label="Ausschnitt ↕">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={st.imgY ?? 50}
                  onChange={(e) => onChange({ imgY: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Row>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Zuschneiden ist möglich, sobald ein Foto hochgeladen ist.
        </p>
      )}
    </div>
  );
}
