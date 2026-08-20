import type { BlockStyle } from "./types";
import { PhotoStyleControls } from "@/components/photo/PhotoStyleControls";
import {
  dossierPhotoPatchToBlockStyle,
  dossierPhotoStyleFromBlockStyle,
} from "@/lib/dossier-photo";

type Props = {
  style: BlockStyle;
  onChange: (patch: Partial<BlockStyle>) => void;
  /** Zuschnitt nur zeigen, wenn überhaupt ein Foto da ist. */
  hasPhoto: boolean;
  compact?: boolean;
  /** Nur den Zuschnitt zeigen, z. B. bei einem Hintergrundbild. */
  cropOnly?: boolean;
};

/**
 * Adapter zwischen dem historischen Titelblatt-BlockStyle und dem gemeinsamen
 * DossierPhotoStyle. Form, Crop/Zoom/Position und Rahmen werden dadurch mit
 * exakt derselben Bedienung wie im Lebenslauf bearbeitet.
 */
export function PhotoControls({ style, onChange, hasPhoto, compact, cropOnly }: Props) {
  const value = dossierPhotoStyleFromBlockStyle(style);
  return (
    <PhotoStyleControls
      value={value}
      hasPhoto={hasPhoto}
      compact={compact}
      cropOnly={cropOnly}
      onChange={(patch) => onChange(dossierPhotoPatchToBlockStyle(patch, value))}
    />
  );
}
