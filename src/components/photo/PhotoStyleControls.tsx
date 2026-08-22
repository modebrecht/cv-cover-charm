import { DOSSIER_PHOTO_SHAPES, type DossierPhotoStyle } from "@/lib/dossier-photo";

const btn = "rounded-md border px-2 py-1 text-xs transition-colors border-input hover:bg-accent";
const btnOn =
  "rounded-md border px-2 py-1 text-xs border-primary bg-primary text-primary-foreground";

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

type Props = {
  value: DossierPhotoStyle;
  onChange: (patch: Partial<DossierPhotoStyle>) => void;
  hasPhoto: boolean;
  compact?: boolean;
  cropOnly?: boolean;
};

/** One control surface used by title page and CV. */
export function PhotoStyleControls({ value, onChange, hasPhoto, compact, cropOnly }: Props) {
  return (
    <div className={`flex flex-col gap-3 ${compact ? "" : "min-w-56"}`}>
      {!cropOnly && (
        <Row label="Form">
          <div className="flex flex-wrap gap-1">
            {DOSSIER_PHOTO_SHAPES.map((shape) => (
              <button
                key={shape.id}
                type="button"
                className={value.shape === shape.id ? btnOn : btn}
                onClick={() => onChange({ shape: shape.id })}
                aria-pressed={value.shape === shape.id}
              >
                {shape.label}
              </button>
            ))}
          </div>
        </Row>
      )}

      {!cropOnly && (
        <Row label={`Rahmen ${Math.round(value.borderWidth * 10) / 10} mm`}>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={value.borderWidth}
            onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </Row>
      )}

      {hasPhoto ? (
        <>
          <Row label={`Zuschnitt ${Math.round(value.zoom * 100)} %`}>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={value.zoom}
              onChange={(e) => onChange({ zoom: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            {(value.zoom > 1 || value.x !== 50 || value.y !== 50) && (
              <button
                type="button"
                className={btn}
                onClick={() => onChange({ zoom: 1, x: 50, y: 50 })}
              >
                Reset
              </button>
            )}
          </Row>

          {value.zoom > 1 && (
            <div className="grid grid-cols-2 gap-3">
              <Row label="Ausschnitt ↔">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value.x}
                  onChange={(e) => onChange({ x: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Row>
              <Row label="Ausschnitt ↕">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={value.y}
                  onChange={(e) => onChange({ y: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
              </Row>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Zuschneiden ist möglich, sobald ein Bild gewählt ist.
        </p>
      )}
    </div>
  );
}
