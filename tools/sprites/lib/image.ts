/**
 * A tiny RGBA image type plus the few operations the sprite scripts need:
 * draw from a text grid, add an outline, recolour, crop, and pack frames into sheets.
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { OUTLINE } from "../palette";

export type Rgba = readonly [number, number, number, number];

/** "#rrggbb" or "#rrggbbaa" to RGBA. */
export function rgba(hex: string): Rgba {
  const h = hex.replace("#", "");
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(h)) throw new Error(`Bad colour "${hex}"`);
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
}

export function toHex([r, g, b, a]: Rgba): string {
  const s = [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return a === 255 ? `#${s}` : `#${s}${a.toString(16).padStart(2, "0")}`;
}

export class Img {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
    data?: Uint8Array,
  ) {
    this.data = data ?? new Uint8Array(w * h * 4);
  }

  static read(file: string): Img {
    const png = PNG.sync.read(fs.readFileSync(file));
    return new Img(png.width, png.height, new Uint8Array(png.data));
  }

  write(file: string): void {
    const png = new PNG({ width: this.w, height: this.h });
    png.data = Buffer.from(this.data);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, PNG.sync.write(png));
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): Rgba {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  set(x: number, y: number, c: Rgba | string): void {
    if (!this.inside(x, y)) return;
    const v = typeof c === "string" ? rgba(c) : c;
    this.data.set(v, (y * this.w + x) * 4);
  }

  opaque(x: number, y: number): boolean {
    return this.get(x, y)[3] > 0;
  }

  /** Fills a rectangle (clipped to the image). */
  rect(x: number, y: number, w: number, h: number, c: Rgba | string): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }

  /** Copies `src` onto this image at (dx, dy). Transparent source pixels are skipped. */
  blit(src: Img, dx = 0, dy = 0): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) if (src.opaque(x, y)) this.set(dx + x, dy + y, src.get(x, y));
    return this;
  }

  crop(x: number, y: number, w: number, h: number): Img {
    const out = new Img(w, h);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) out.set(xx, yy, this.get(x + xx, y + yy));
    return out;
  }

  clone(): Img {
    return new Img(this.w, this.h, new Uint8Array(this.data));
  }
}

/**
 * Draws a sprite from rows of characters. Each character is looked up in `legend`
 * (a colour); "." and " " are transparent. Every row must be `rows[0].length` long.
 */
export function fromGrid(rows: readonly string[], legend: Readonly<Record<string, string>>): Img {
  const w = rows[0]?.length ?? 0;
  const img = new Img(w, rows.length);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Row ${y} is ${row.length} wide, expected ${w}: "${row}"`);
    [...row].forEach((ch, x) => {
      if (ch === "." || ch === " ") return;
      const colour = legend[ch];
      if (!colour) throw new Error(`No legend entry for "${ch}" (row ${y}: "${row}")`);
      img.set(x, y, colour);
    });
  });
  return img;
}

/**
 * Adds a 1px outline around every opaque area, the way Ninja Adventure outlines its
 * items: only orthogonal neighbours, so corners come out slightly rounded.
 */
export function outline(img: Img, colour: string = OUTLINE): Img {
  const out = img.clone();
  const c = rgba(colour);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (img.opaque(x, y)) continue;
      if (img.opaque(x - 1, y) || img.opaque(x + 1, y) || img.opaque(x, y - 1) || img.opaque(x, y + 1)) out.set(x, y, c);
    }
  return out;
}

/** Swaps exact colours: `map` is { "#from": "#to" }. Other pixels are untouched. */
export function recolor(img: Img, map: Readonly<Record<string, string>>): Img {
  const out = img.clone();
  const lookup = new Map(Object.entries(map).map(([from, to]) => [toHex(rgba(from)), rgba(to)]));
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const px = img.get(x, y);
      if (px[3] === 0) continue;
      const to = lookup.get(toHex([px[0], px[1], px[2], 255]));
      if (to) out.set(x, y, [to[0], to[1], to[2], px[3]]);
    }
  return out;
}

/** Lists the distinct colours in an image, for checking a recolour covered everything. */
export function colours(img: Img): Set<string> {
  const set = new Set<string>();
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const px = img.get(x, y);
      if (px[3] > 0) set.add(toHex([px[0], px[1], px[2], 255]));
    }
  return set;
}

/** Packs rows of equally sized frames into one sheet. Missing frames (null) stay empty. */
export function packRows(rows: readonly (readonly (Img | null)[])[], fw: number, fh: number): Img {
  const cols = Math.max(...rows.map((r) => r.length));
  const sheet = new Img(cols * fw, rows.length * fh);
  rows.forEach((row, ry) =>
    row.forEach((frame, rx) => {
      if (!frame) return;
      if (frame.w !== fw || frame.h !== fh) throw new Error(`Frame is ${frame.w}x${frame.h}, expected ${fw}x${fh}`);
      sheet.blit(frame, rx * fw, ry * fh);
    }),
  );
  return sheet;
}
