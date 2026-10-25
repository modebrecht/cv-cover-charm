import type { DecorativeArtwork } from "./model";
import { crc32 } from "./zip";

const concat = (...parts: Uint8Array[]) => {
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
};
const u32 = (value: number) => {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
};
function chunk(type: string, data: Uint8Array) {
  const payload = concat(new TextEncoder().encode(type), data);
  return concat(u32(data.length), payload, u32(crc32(payload)));
}

/** Tiny sRGB paint ramp, independent of browser/normalization and devoid of text. */
export function paintPng(fill: DecorativeArtwork["fill"]): Uint8Array {
  if (![fill.color, fill.endColor ?? fill.color].every((value) => /^[0-9A-F]{6}$/.test(value)))
    throw new Error("DOCX Next invalid artwork color");
  const rgb = (hex: string) => [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const start = rgb(fill.color),
    end = rgb(fill.endColor ?? fill.color);
  const height = fill.endColor && fill.endColor !== fill.color ? 256 : 1;
  const pixels = new Uint8Array(height * 4);
  for (let row = 0; row < height; row++)
    for (let channel = 0; channel < 3; channel++)
      pixels[row * 4 + channel + 1] = Math.round(
        start[channel] + ((end[channel] - start[channel]) * row) / Math.max(1, height - 1),
      );
  let a = 1,
    b = 0;
  for (const byte of pixels) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  // One uncompressed DEFLATE block; at most 1024 pixel bytes.
  const length = pixels.length;
  const zlib = concat(
    new Uint8Array([
      0x78,
      0x01,
      0x01,
      length & 255,
      length >>> 8,
      ~length & 255,
      (~length >>> 8) & 255,
    ]),
    pixels,
    u32((b * 65536 + a) >>> 0),
  );
  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", concat(u32(1), u32(height), new Uint8Array([8, 2, 0, 0, 0]))),
    chunk("sRGB", new Uint8Array([0])),
    chunk("IDAT", zlib),
    chunk("IEND", new Uint8Array()),
  );
}
