import { getCvLayoutChoice, getCvLayoutMirror, setCvLayout, setCvLayoutMirror, type CvLayoutId } from "./layout";
import { getCvPlacements, setCvPlacement, type CvPlacements } from "./placement";
import { getCvPhotoStyle, setCvPhotoStyle } from "./photo";
import {
  getCvPhotoPlacement,
  setCvPhotoPlacement,
  type CvPhotoPlacement,
} from "./photo-place";
import type { DossierPhotoStyle } from "@/lib/dossier-photo";
import { DEFAULT_CV_PLACEMENTS, type CvPlacementKey } from "./types";

/**
 * CV settings that historically lived in dedicated localStorage keys.
 * Keeping them inside the portable CV snapshot makes Save -> clear browser
 * state -> Load deterministic without changing the legacy keys themselves.
 */
export type PortableCvState = {
  layout?: CvLayoutId;
  mirrored?: boolean;
  placements?: Partial<CvPlacements>;
  photoStyle?: Partial<DossierPhotoStyle>;
  photoPlacement?: Partial<CvPhotoPlacement>;
};

export function readPortableCvState(): PortableCvState {
  return {
    layout: getCvLayoutChoice(),
    mirrored: getCvLayoutMirror(),
    placements: getCvPlacements(),
    photoStyle: getCvPhotoStyle(),
    photoPlacement: getCvPhotoPlacement(),
  };
}

/**
 * Missing values are intentionally ignored. Older dossier/CV files therefore
 * never wipe newer browser-local choices merely because they predate M7.
 */
export function applyPortableCvState(state?: PortableCvState | null) {
  if (!state || typeof state !== "object") return;

  if (state.layout) setCvLayout(state.layout);
  if (typeof state.mirrored === "boolean") setCvLayoutMirror(state.mirrored);

  if (state.placements && typeof state.placements === "object") {
    for (const key of Object.keys(DEFAULT_CV_PLACEMENTS) as CvPlacementKey[]) {
      const value = state.placements[key];
      if (value === "side" || value === "main") setCvPlacement(key, value);
    }
  }

  if (state.photoStyle && typeof state.photoStyle === "object") {
    setCvPhotoStyle(state.photoStyle);
  }
  if (state.photoPlacement && typeof state.photoPlacement === "object") {
    setCvPhotoPlacement(state.photoPlacement);
  }
}
