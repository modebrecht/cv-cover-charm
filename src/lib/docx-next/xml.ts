export const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const PR = "http://schemas.openxmlformats.org/package/2006/relationships";
export const DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
export const namespaces = `xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"`;
export function xml(value: string) {
  return value
    .split("")
    .filter((char) => char.charCodeAt(0) >= 32 || [9, 10, 13].includes(char.charCodeAt(0)))
    .join("")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
export const twips = (mm: number) => Math.round((mm * 1440) / 25.4);
export const emu = (mm: number) => Math.round(mm * 36000);
