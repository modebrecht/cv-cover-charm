import type { BlockStyle } from "./types";
import { PhotoStyleControls } from "@/components/photo/PhotoStyleControls";
import {
  dossierPhotoPatchToBlockStyle,
  dossierPhotoStyleFromBlockStyle,
  type DossierPhotoStyle,
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

  const patchShared = (patch: Partial<DossierPhotoStyle>) => {
    if (cropOnly) {
      const next: Partial<BlockStyle> = {};
      if (patch.zoom !== undefined) next.imgZoom = patch.zoom;
      if (patch.x !== undefined) next.imgX = patch.x;
      if (patch.y !== undefined) next.imgY = patch.y;
      onChange(next);
      return;
    }
    onChange(dossierPhotoPatchToBlockStyle(patch, value));
  };

  return (
    <PhotoStyleControls
      value={value}
      hasPhoto={hasPhoto}
      compact={compact}
      cropOnly={cropOnly}
      onChange={patchShared}
    />
  );
}
