/**
 * Minimal WOFF2 -> TrueType decoder with variable-font instancing, for Open Graph images only.
 *
 * Satori (next/og) reads TTF, OTF and WOFF but not WOFF2, and Fontsource ships Fraunces only as a
 * WOFF2 variable font. Rather than fetch a font over the network or commit a converted copy, we
 * decode the Fontsource file from node_modules at build time:
 *  - WOFF2 table directory + brotli stream, transformed glyf/loca and hmtx (WOFF2 spec §4-5);
 *  - optional instancing at fixed axis values (e.g. wght 340, opsz 144) by applying gvar deltas
 *    (with IUP for untouched points), then dropping the variation tables, which the bundled font
 *    parser cannot read anyway.
 * Not a general-purpose decoder: no collections, no CFF, no metadata/private blocks.
 */
import { brotliDecompressSync } from 'node:zlib';

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ',
  'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc',
  'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];
const VARIATION_TABLES = ['fvar', 'gvar', 'avar', 'cvar', 'HVAR', 'VVAR', 'MVAR', 'STAT'];

class Reader {
  pos: number;
  readonly b: Uint8Array;
  constructor(b: Uint8Array, pos = 0) {
    this.b = b;
    this.pos = pos;
  }
  u8() {
    return this.b[this.pos++];
  }
  i8() {
    const v = this.u8();
    return v & 0x80 ? v - 0x100 : v;
  }
  u16() {
    const v = (this.b[this.pos] << 8) | this.b[this.pos + 1];
    this.pos += 2;
    return v;
  }
  i16() {
    const v = this.u16();
    return v & 0x8000 ? v - 0x10000 : v;
  }
  u32() {
    const v = ((this.b[this.pos] << 24) >>> 0) + (this.b[this.pos + 1] << 16) + (this.b[this.pos + 2] << 8) + this.b[this.pos + 3];
    this.pos += 4;
    return v;
  }
  f2dot14() {
    return this.i16() / 16384;
  }
  fixed() {
    const v = this.u32();
    return (v | 0) / 65536;
  }
  base128() {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const c = this.u8();
      v = v * 128 + (c & 0x7f);
      if (!(c & 0x80)) return v;
    }
    throw new Error('woff2: bad UIntBase128');
  }
  u255() {
    const c = this.u8();
    if (c === 253) return this.u16();
    if (c === 255) return 253 + this.u8();
    if (c === 254) return 506 + this.u8();
    return c;
  }
  bytes(n: number) {
    const out = this.b.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
}

class Writer {
  private chunks: number[] = [];
  u8(v: number) {
    this.chunks.push(v & 0xff);
  }
  u16(v: number) {
    this.chunks.push((v >> 8) & 0xff, v & 0xff);
  }
  u32(v: number) {
    this.chunks.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff);
  }
  bytes(b: Uint8Array) {
    for (const x of b) this.chunks.push(x);
  }
  pad4() {
    while (this.chunks.length % 4) this.chunks.push(0);
  }
  get length() {
    return this.chunks.length;
  }
  out() {
    return Uint8Array.from(this.chunks);
  }
}

type Component = { flags: number; glyph: number; a1: number; a2: number; transform: Uint8Array };
type Glyph =
  | { kind: 'empty' }
  | { kind: 'simple'; endPts: number[]; xs: number[]; ys: number[]; on: boolean[]; instr: Uint8Array; bbox: number[] }
  | { kind: 'composite'; comps: Component[]; instr: Uint8Array | null; bbox: number[] };

const withSign = (flag: number, v: number) => (flag & 1 ? v : -v);

/** Parse the WOFF2 transformed glyf table into glyph records. */
function decodeGlyf(data: Uint8Array): Glyph[] {
  const h = new Reader(data);
  h.u16(); // reserved
  h.u16(); // optionFlags (overlap bitmap is irrelevant here)
  const numGlyphs = h.u16();
  h.u16(); // indexFormat
  const sizes = Array.from({ length: 7 }, () => h.u32());
  let off = h.pos;
  const [nContourS, nPointsS, flagS, glyphS, compositeS, bboxS, instrS] = sizes.map((s) => {
    const r = new Reader(data.subarray(off, off + s));
    off += s;
    return r;
  });
  const bboxBitmap = bboxS.bytes(4 * Math.floor((numGlyphs + 31) / 32));
  const hasBbox = (i: number) => (bboxBitmap[i >> 3] & (0x80 >> (i & 7))) !== 0;
  const readBbox = () => [bboxS.i16(), bboxS.i16(), bboxS.i16(), bboxS.i16()];

  const glyphs: Glyph[] = [];
  for (let g = 0; g < numGlyphs; g++) {
    const nContours = nContourS.i16();
    if (nContours === 0) {
      glyphs.push({ kind: 'empty' });
      continue;
    }
    if (nContours === -1) {
      const comps: Component[] = [];
      let flags = 0;
      let haveInstr = false;
      do {
        flags = compositeS.u16();
        const glyph = compositeS.u16();
        const xy = (flags & 0x0002) !== 0;
        let a1: number;
        let a2: number;
        if (flags & 0x0001) {
          a1 = xy ? compositeS.i16() : compositeS.u16();
          a2 = xy ? compositeS.i16() : compositeS.u16();
        } else {
          a1 = xy ? compositeS.i8() : compositeS.u8();
          a2 = xy ? compositeS.i8() : compositeS.u8();
        }
        const tlen = flags & 0x0008 ? 2 : flags & 0x0040 ? 4 : flags & 0x0080 ? 8 : 0;
        comps.push({ flags, glyph, a1, a2, transform: compositeS.bytes(tlen) });
        if (flags & 0x0100) haveInstr = true;
      } while (flags & 0x0020);
      const bbox = readBbox();
      const instr = haveInstr ? instrS.bytes(glyphS.u255()) : null;
      glyphs.push({ kind: 'composite', comps, instr, bbox });
      continue;
    }
    const endPts: number[] = [];
    let total = 0;
    for (let c = 0; c < nContours; c++) {
      total += nPointsS.u255();
      endPts.push(total - 1);
    }
    const xs: number[] = [];
    const ys: number[] = [];
    const on: boolean[] = [];
    let x = 0;
    let y = 0;
    for (let p = 0; p < total; p++) {
      let flag = flagS.u8();
      on.push(!(flag & 0x80));
      flag &= 0x7f;
      let dx: number;
      let dy: number;
      if (flag < 10) {
        dx = 0;
        dy = withSign(flag, ((flag & 14) << 7) + glyphS.u8());
      } else if (flag < 20) {
        dx = withSign(flag, (((flag - 10) & 14) << 7) + glyphS.u8());
        dy = 0;
      } else if (flag < 84) {
        const b0 = flag - 20;
        const b1 = glyphS.u8();
        dx = withSign(flag, 1 + (b0 & 0x30) + (b1 >> 4));
        dy = withSign(flag >> 1, 1 + ((b0 & 0x0c) << 2) + (b1 & 0x0f));
      } else if (flag < 120) {
        const b0 = flag - 84;
        dx = withSign(flag, 1 + (Math.floor(b0 / 12) << 8) + glyphS.u8());
        dy = withSign(flag >> 1, 1 + (((b0 % 12) >> 2) << 8) + glyphS.u8());
      } else if (flag < 124) {
        const a = glyphS.u8();
        const b2 = glyphS.u8();
        const c = glyphS.u8();
        dx = withSign(flag, (a << 4) + (b2 >> 4));
        dy = withSign(flag >> 1, ((b2 & 0x0f) << 8) + c);
      } else {
        const a = glyphS.u8();
        const b = glyphS.u8();
        const c = glyphS.u8();
        const d = glyphS.u8();
        dx = withSign(flag, (a << 8) + b);
        dy = withSign(flag >> 1, (c << 8) + d);
      }
      x += dx;
      y += dy;
      xs.push(x);
      ys.push(y);
    }
    const instr = instrS.bytes(glyphS.u255());
    const bbox = hasBbox(g) ? readBbox() : [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    glyphs.push({ kind: 'simple', endPts, xs, ys, on, instr, bbox });
  }
  return glyphs;
}

const xMinOf = (g: Glyph) => (g.kind === 'empty' ? 0 : g.bbox[0]);

/** Advance widths and left side bearings, from a plain or WOFF2-transformed hmtx. */
function readHmtx(data: Uint8Array, transformed: boolean, glyphs: Glyph[], numHMetrics: number) {
  const n = glyphs.length;
  const r = new Reader(data);
  const adv: number[] = [];
  const lsb: number[] = [];
  if (transformed) {
    const flags = r.u8();
    for (let i = 0; i < numHMetrics; i++) adv.push(r.u16());
    for (let i = 0; i < numHMetrics; i++) lsb.push(flags & 1 ? xMinOf(glyphs[i]) : r.i16());
    for (let i = numHMetrics; i < n; i++) lsb.push(flags & 2 ? xMinOf(glyphs[i]) : r.i16());
  } else {
    for (let i = 0; i < numHMetrics; i++) {
      adv.push(r.u16());
      lsb.push(r.i16());
    }
    for (let i = numHMetrics; i < n; i++) lsb.push(r.i16());
  }
  for (let i = numHMetrics; i < n; i++) adv.push(adv[numHMetrics - 1]);
  return { adv, lsb };
}

/* ------------------------------------------------------------------ instancing (gvar) */

type Axis = { tag: string; min: number; def: number; max: number };

function readFvar(data: Uint8Array): Axis[] {
  const r = new Reader(data);
  r.u32();
  const axesOffset = r.u16();
  r.u16();
  const axisCount = r.u16();
  const axisSize = r.u16();
  const axes: Axis[] = [];
  for (let i = 0; i < axisCount; i++) {
    const a = new Reader(data, axesOffset + i * axisSize);
    const tag = String.fromCharCode(...a.bytes(4));
    axes.push({ tag, min: a.fixed(), def: a.fixed(), max: a.fixed() });
  }
  return axes;
}

function normalize(axes: Axis[], at: Record<string, number>, avar?: Uint8Array): number[] {
  const coords = axes.map((a) => {
    const v = Math.min(a.max, Math.max(a.min, at[a.tag] ?? a.def));
    if (v < a.def) return (v - a.def) / (a.def - a.min);
    if (v > a.def) return (v - a.def) / (a.max - a.def);
    return 0;
  });
  if (!avar) return coords;
  const r = new Reader(avar, 6);
  const count = r.u16();
  for (let i = 0; i < count && i < coords.length; i++) {
    const pairs = r.u16();
    const map: [number, number][] = [];
    for (let j = 0; j < pairs; j++) map.push([r.f2dot14(), r.f2dot14()]);
    const v = coords[i];
    for (let j = 1; j < map.length; j++) {
      const [f0, t0] = map[j - 1];
      const [f1, t1] = map[j];
      if (v >= f0 && v <= f1) {
        coords[i] = f1 === f0 ? t0 : t0 + ((v - f0) * (t1 - t0)) / (f1 - f0);
        break;
      }
    }
  }
  return coords;
}

function readPoints(r: Reader): number[] | null {
  let count = r.u8();
  if (count === 0) return null; // all points
  if (count & 0x80) count = ((count & 0x7f) << 8) | r.u8();
  const pts: number[] = [];
  let last = 0;
  while (pts.length < count) {
    const ctrl = r.u8();
    const run = (ctrl & 0x7f) + 1;
    for (let i = 0; i < run && pts.length < count; i++) {
      last += ctrl & 0x80 ? r.u16() : r.u8();
      pts.push(last);
    }
  }
  return pts;
}

function readDeltas(r: Reader, count: number): number[] {
  const out: number[] = [];
  while (out.length < count) {
    const ctrl = r.u8();
    const run = (ctrl & 0x3f) + 1;
    for (let i = 0; i < run && out.length < count; i++) {
      out.push(ctrl & 0x80 ? 0 : ctrl & 0x40 ? r.i16() : r.i8());
    }
  }
  return out;
}

function scalar(coords: number[], peak: number[], start: number[] | null, end: number[] | null): number {
  let s = 1;
  for (let i = 0; i < coords.length; i++) {
    const p = peak[i];
    const c = coords[i];
    if (p === 0 || c === p) continue;
    if (start && end) {
      const lo = start[i];
      const hi = end[i];
      if (lo > p || p > hi || (lo < 0 && hi > 0 && p !== 0)) continue;
      if (c < lo || c > hi) return 0;
      s *= c < p ? (c - lo) / (p - lo) : (hi - c) / (hi - p);
    } else {
      if (c === 0 || c * p < 0 || Math.abs(c) > Math.abs(p)) return 0;
      s *= c / p;
    }
  }
  return s;
}

/** Interpolate deltas for untouched points within one contour (gvar "IUP"). */
function iup(orig: number[], delta: number[], touched: boolean[], start: number, end: number) {
  const idx: number[] = [];
  for (let i = start; i <= end; i++) if (touched[i]) idx.push(i);
  if (idx.length === 0) return;
  if (idx.length === 1) {
    for (let i = start; i <= end; i++) if (!touched[i]) delta[i] = delta[idx[0]];
    return;
  }
  for (let k = 0; k < idx.length; k++) {
    const a = idx[k];
    const b = idx[(k + 1) % idx.length];
    let x1 = orig[a];
    let x2 = orig[b];
    let d1 = delta[a];
    let d2 = delta[b];
    if (x1 > x2) {
      [x1, x2] = [x2, x1];
      [d1, d2] = [d2, d1];
    }
    // walk the untouched points strictly between a and b (cyclically)
    for (let i = a === end ? start : a + 1; i !== b; i = i === end ? start : i + 1) {
      const x = orig[i];
      if (x1 === x2) delta[i] = d1 === d2 ? d1 : 0;
      else if (x <= x1) delta[i] = d1;
      else if (x >= x2) delta[i] = d2;
      else delta[i] = d1 + ((x - x1) * (d2 - d1)) / (x2 - x1);
    }
  }
}

function instance(glyphs: Glyph[], adv: number[], lsb: number[], gvar: Uint8Array, coords: number[]) {
  const r = new Reader(gvar);
  r.u32();
  const axisCount = r.u16();
  const sharedCount = r.u16();
  const sharedOffset = r.u32();
  const glyphCount = r.u16();
  const flags = r.u16();
  const dataStart = r.u32();
  const offsets: number[] = [];
  for (let i = 0; i <= glyphCount; i++) offsets.push(flags & 1 ? r.u32() : r.u16() * 2);
  const shared: number[][] = [];
  const sr = new Reader(gvar, sharedOffset);
  for (let i = 0; i < sharedCount; i++) shared.push(Array.from({ length: axisCount }, () => sr.f2dot14()));

  for (let g = 0; g < glyphs.length && g < glyphCount; g++) {
    const glyph = glyphs[g];
    if (offsets[g] === offsets[g + 1] || glyph.kind === 'empty') continue;
    const base = dataStart + offsets[g];
    const h = new Reader(gvar, base);
    const tvc = h.u16();
    const serialOffset = h.u16();
    const tupleCount = tvc & 0x0fff;
    const ser = new Reader(gvar, base + serialOffset);
    const sharedPoints = tvc & 0x8000 ? readPoints(ser) : null;

    // points: outline points (or component offsets) + 4 phantom points
    const nOutline = glyph.kind === 'simple' ? glyph.xs.length : glyph.comps.length;
    const n = nOutline + 4;
    const ox = glyph.kind === 'simple' ? [...glyph.xs] : glyph.comps.map((c) => c.a1);
    const oy = glyph.kind === 'simple' ? [...glyph.ys] : glyph.comps.map((c) => c.a2);
    const p0 = glyph.bbox[0] - lsb[g];
    ox.push(p0, p0 + adv[g], 0, 0);
    oy.push(0, 0, 0, 0);
    const accX = new Array<number>(n).fill(0);
    const accY = new Array<number>(n).fill(0);

    for (let t = 0; t < tupleCount; t++) {
      const size = h.u16();
      const index = h.u16();
      const peak = index & 0x8000 ? Array.from({ length: axisCount }, () => h.f2dot14()) : shared[index & 0x0fff];
      let start: number[] | null = null;
      let end: number[] | null = null;
      if (index & 0x4000) {
        start = Array.from({ length: axisCount }, () => h.f2dot14());
        end = Array.from({ length: axisCount }, () => h.f2dot14());
      }
      const next = ser.pos + size;
      const s = scalar(coords, peak, start, end);
      if (s !== 0) {
        const pts = index & 0x2000 ? readPoints(ser) : sharedPoints;
        const count = pts ? pts.length : n;
        const dx = readDeltas(ser, count);
        const dy = readDeltas(ser, count);
        if (!pts) {
          for (let i = 0; i < n; i++) {
            accX[i] += dx[i] * s;
            accY[i] += dy[i] * s;
          }
        } else {
          const tx = new Array<number>(n).fill(0);
          const ty = new Array<number>(n).fill(0);
          const touched = new Array<boolean>(n).fill(false);
          pts.forEach((p, i) => {
            if (p < n) {
              tx[p] = dx[i];
              ty[p] = dy[i];
              touched[p] = true;
            }
          });
          if (glyph.kind === 'simple') {
            let st = 0;
            for (const e of glyph.endPts) {
              iup(ox, tx, touched, st, e);
              iup(oy, ty, touched, st, e);
              st = e + 1;
            }
          }
          for (let i = 0; i < n; i++) {
            accX[i] += tx[i] * s;
            accY[i] += ty[i] * s;
          }
        }
      }
      ser.pos = next;
    }

    const shift = accX[nOutline]; // phantom 0 moves the origin
    adv[g] = Math.max(0, Math.round(adv[g] + accX[nOutline + 1] - shift));
    if (glyph.kind === 'simple') {
      glyph.xs = glyph.xs.map((v, i) => Math.round(v + accX[i] - shift));
      glyph.ys = glyph.ys.map((v, i) => Math.round(v + accY[i]));
      glyph.bbox = [Math.min(...glyph.xs), Math.min(...glyph.ys), Math.max(...glyph.xs), Math.max(...glyph.ys)];
      lsb[g] = glyph.bbox[0];
    } else {
      glyph.comps.forEach((c, i) => {
        if (c.flags & 0x0002) {
          c.a1 = Math.round(c.a1 + accX[i] - shift);
          c.a2 = Math.round(c.a2 + accY[i]);
        }
      });
    }
  }
}

/* ------------------------------------------------------------------ encoding */

function encodeGlyf(glyphs: Glyph[]) {
  const w = new Writer();
  const offsets: number[] = [];
  for (const g of glyphs) {
    offsets.push(w.length);
    if (g.kind === 'empty') continue;
    if (g.kind === 'composite') {
      w.u16(0xffff);
      g.bbox.forEach((v) => w.u16(v & 0xffff));
      g.comps.forEach((c) => {
        // always write word args so moved offsets cannot overflow a byte
        w.u16(c.flags | 0x0001);
        w.u16(c.glyph);
        w.u16(c.a1 & 0xffff);
        w.u16(c.a2 & 0xffff);
        w.bytes(c.transform);
      });
      if (g.instr) {
        w.u16(g.instr.length);
        w.bytes(g.instr);
      }
      w.pad4();
      continue;
    }
    w.u16(g.endPts.length);
    g.bbox.forEach((v) => w.u16(v & 0xffff));
    g.endPts.forEach((e) => w.u16(e));
    w.u16(g.instr.length);
    w.bytes(g.instr);
    g.on.forEach((o) => w.u8(o ? 1 : 0)); // no short/repeat flags: every delta is an int16
    let px = 0;
    g.xs.forEach((v) => {
      w.u16((v - px) & 0xffff);
      px = v;
    });
    let py = 0;
    g.ys.forEach((v) => {
      w.u16((v - py) & 0xffff);
      py = v;
    });
    w.pad4();
  }
  offsets.push(w.length);
  const loca = new Writer();
  offsets.forEach((o) => loca.u32(o));
  return { glyf: w.out(), loca: loca.out() };
}

const checksum = (b: Uint8Array) => {
  let sum = 0;
  for (let i = 0; i < b.length; i += 4) {
    sum = (sum + (((b[i] << 24) >>> 0) + ((b[i + 1] ?? 0) << 16) + ((b[i + 2] ?? 0) << 8) + (b[i + 3] ?? 0))) >>> 0;
  }
  return sum;
};

/**
 * Decode a WOFF2 (TrueType-flavoured) file into an ArrayBuffer holding a static TrueType font.
 * `at` pins variable axes, e.g. { wght: 340, opsz: 144 }; unspecified axes use their default.
 */
export function woff2ToTtf(input: Uint8Array, at: Record<string, number> = {}): ArrayBuffer {
  const r = new Reader(input);
  if (r.u32() !== 0x774f4632) throw new Error('woff2: bad signature');
  const flavor = r.u32();
  r.u32(); // length
  const numTables = r.u16();
  r.u16();
  r.u32(); // totalSfntSize
  const compressedSize = r.u32();
  r.pos += 2 + 2 + 4 * 5; // version, meta*, priv*

  const dir: { tag: string; transformed: boolean; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = r.u8();
    const tag = (flags & 63) === 63 ? String.fromCharCode(...r.bytes(4)) : KNOWN_TAGS[flags & 63];
    const version = (flags >> 6) & 3;
    const origLength = r.base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    dir.push({ tag, transformed, length: transformed ? r.base128() : origLength });
  }
  const stream = new Uint8Array(brotliDecompressSync(input.subarray(r.pos, r.pos + compressedSize)));
  const tables = new Map<string, Uint8Array>();
  const transformed = new Set<string>();
  let off = 0;
  for (const t of dir) {
    tables.set(t.tag, stream.subarray(off, off + t.length));
    if (t.transformed) transformed.add(t.tag);
    off += t.length;
  }
  if (!transformed.has('glyf')) throw new Error('woff2: expected a transformed glyf table');

  const glyphs = decodeGlyf(tables.get('glyf')!);
  const hhea = Uint8Array.from(tables.get('hhea')!);
  const { adv, lsb } = readHmtx(tables.get('hmtx')!, transformed.has('hmtx'), glyphs, (hhea[34] << 8) | hhea[35]);

  const fvar = tables.get('fvar');
  const gvar = tables.get('gvar');
  if (fvar && gvar) instance(glyphs, adv, lsb, gvar, normalize(readFvar(fvar), at, tables.get('avar')));

  const { glyf, loca } = encodeGlyf(glyphs);
  tables.set('glyf', glyf);
  tables.set('loca', loca);
  const hmtx = new Writer();
  glyphs.forEach((_, i) => {
    hmtx.u16(adv[i]);
    hmtx.u16(lsb[i] & 0xffff);
  });
  tables.set('hmtx', hmtx.out());
  hhea[34] = (glyphs.length >> 8) & 0xff; // numberOfHMetrics = numGlyphs (full table written)
  hhea[35] = glyphs.length & 0xff;
  tables.set('hhea', hhea);
  const head = Uint8Array.from(tables.get('head')!);
  head.fill(0, 8, 12); // checksumAdjustment: not verified by font parsers
  head[50] = 0; // indexToLocFormat = 1 (long offsets)
  head[51] = 1;
  tables.set('head', head);
  for (const t of VARIATION_TABLES) tables.delete(t);

  const tags = [...tables.keys()].sort();
  const n = tags.length;
  let pow = 1;
  let log = 0;
  while (pow * 2 <= n) {
    pow *= 2;
    log++;
  }
  const out = new Writer();
  out.u32(flavor);
  out.u16(n);
  out.u16(pow * 16);
  out.u16(log);
  out.u16(n * 16 - pow * 16);
  let dataOff = 12 + 16 * n;
  for (const tag of tags) {
    const t = tables.get(tag)!;
    for (let i = 0; i < 4; i++) out.u8(tag.charCodeAt(i));
    out.u32(checksum(t));
    out.u32(dataOff);
    out.u32(t.length);
    dataOff += Math.ceil(t.length / 4) * 4;
  }
  for (const tag of tags) {
    out.bytes(tables.get(tag)!);
    out.pad4();
  }
  const bytes = out.out();
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
