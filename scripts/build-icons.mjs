#!/usr/bin/env node
/**
 * Writes the site's icons from the LogoMark drawing (src/components/Logo.tsx), redrawn on a
 * pixel grid with heavier strokes so it reads at 16px:
 *   src/app/icon.svg          blueprint tile; paper tile when the browser UI is dark
 *   src/app/favicon.ico       16, 32, 48 (PNG entries)
 *   src/app/apple-icon.png    180 (full bleed: iOS rounds the corners)
 *   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png (web manifest)
 * Needs Playwright's Chromium (dev only; the site build never runs this):
 *   NODE_PATH=$(npm root -g) node scripts/build-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const C = {
  blueprint: '#0f2b4b', // --paper (dark)
  pale: '#ecf2f9', // --ink (dark)
  paleLine: '#9cc4ec', // --line (dark)
  paper: '#f4efe4', // --paper (light)
  ink: '#1f2328', // --ink (light)
  line: '#2b5d8c', // --line (light)
};

/**
 * The mark on a 32-unit grid: gable, walls, door, dimension line. `detail` adds the door and the
 * dimension ticks (dropped at 16px, where they would smear). `pad` shrinks it into a safe zone.
 */
function mark({ detail = true, pad = 0, weight = 2.2 } = {}) {
  const s = (32 - pad * 2) / 32;
  const t = `translate(${pad} ${pad}) scale(${s})`;
  const w = weight;
  return `<g transform="${t}" fill="none" stroke-linecap="square">
    <path class="i" d="M4.5 15.5 16 5.6 27.5 15.5" stroke-width="${w}" stroke-linejoin="miter"/>
    <path class="i" d="M8.5 13.2V24H23.5V13.2" stroke-width="${w}" stroke-linejoin="miter"/>
    ${detail ? `<path class="i" d="M14 24V18.5H18V24" stroke-width="${w * 0.75}"/>` : ''}
    <path class="l" d="M5 28H27" stroke-width="${detail ? 1.4 : 1.8}"/>
    ${detail ? `<path class="l" d="M5 26.3V29.7M27 26.3V29.7" stroke-width="1.4"/>` : ''}
  </g>`;
}

/** 16px: the same mark snapped to whole pixels (1px strokes on pixel centres), no door or ticks. */
const mark16 = `<g fill="none" stroke-width="2" stroke-linecap="square">
    <path class="i" d="M5 16 16 6 27 16" stroke-linejoin="miter"/>
    <path class="i" d="M9 14V25H23V14" stroke-linejoin="miter"/>
    <path class="l" d="M5 29H27"/>
  </g>`;

/** A square icon: tile + mark. `round` = corner radius in units of 32 (0 = full bleed). */
function svg({ size = 32, round = 6, detail = true, pad = 0, weight, adaptive = false, px16 = false } = {}) {
  const style = adaptive
    ? `<style>.t{fill:${C.blueprint}}.i{stroke:${C.pale}}.l{stroke:${C.paleLine}}@media (prefers-color-scheme:dark){.t{fill:${C.paper}}.i{stroke:${C.ink}}.l{stroke:${C.line}}}</style>`
    : `<style>.t{fill:${C.blueprint}}.i{stroke:${C.pale}}.l{stroke:${C.paleLine}}</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">${style}<rect class="t" width="32" height="32" rx="${round}"/>${px16 ? mark16 : mark({ detail, pad, weight })}</svg>`;
}

async function render(page, markup, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`)}</body></html>`);
  return page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

/** ICO with PNG entries (supported by every current browser and Windows Vista+). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

writeFileSync('src/app/icon.svg', svg({ adaptive: true }) + '\n');

const small = svg({ px16: true, round: 4 });
const medium = svg({ round: 6 });
writeFileSync(
  'src/app/favicon.ico',
  ico([
    { size: 16, data: await render(page, small, 16) },
    { size: 32, data: await render(page, medium, 32) },
    { size: 48, data: await render(page, medium, 48) },
  ]),
);
writeFileSync('src/app/apple-icon.png', await render(page, svg({ round: 0, pad: 4, weight: 1.9 }), 180));
mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', await render(page, svg({ round: 6, pad: 1.5, weight: 1.9 }), 192));
writeFileSync('public/icons/icon-512.png', await render(page, svg({ round: 6, pad: 1.5, weight: 1.9 }), 512));
// maskable: full-bleed tile, mark inside the 80% safe circle
writeFileSync('public/icons/icon-maskable-512.png', await render(page, svg({ round: 0, pad: 6.5, weight: 1.9 }), 512));

await browser.close();
console.log('icons written');
