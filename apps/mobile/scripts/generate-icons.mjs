/**
 * Generate Expo app icons from repo-root infinty.svg
 * Usage: node scripts/generate-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.join(__dirname, '..');
const repoRoot = path.join(mobileRoot, '../..');
const sourceSvg = path.join(repoRoot, 'infinty.svg');
const assetsDir = path.join(mobileRoot, 'assets');

const BRAND = '#4630EB';
const MARK = '#FFFFFF';

function readPathD(svgText) {
  const match = svgText.match(/<path[^>]*\s+d="([^"]+)"/);
  if (!match) throw new Error('Could not find <path d="..."> in source SVG');
  return match[1];
}

function buildIconSvg(size, { background, markColor, paddingRatio = 0.12 }) {
  const pad = size * paddingRatio;
  const inner = size - pad * 2;
  // Source artboard is wide (867.45 × 463.37)
  const srcW = 867.45;
  const srcH = 463.37;
  const scale = Math.min(inner / srcW, inner / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const x = (size - drawW) / 2;
  const y = (size - drawH) / 2;

  const bgRect =
    background ?
      `<rect width="${size}" height="${size}" fill="${background}"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bgRect}
  <g transform="translate(${x}, ${y}) scale(${scale})">
    <path fill="${markColor}" d="${pathD}"/>
  </g>
</svg>`;
}

const rawSvg = fs.readFileSync(sourceSvg, 'utf8');
const pathD = readPathD(rawSvg);

fs.mkdirSync(assetsDir, { recursive: true });
fs.copyFileSync(sourceSvg, path.join(assetsDir, 'infinity-source.svg'));

async function writePng(filename, svg, size) {
  const out = path.join(assetsDir, filename);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`Wrote ${out} (${size}×${size})`);
}

// iOS / web / fallback — purple tile + white mark
const iconSvg = buildIconSvg(1024, {
  background: BRAND,
  markColor: MARK,
  paddingRatio: 0.14,
});

// Android adaptive foreground — transparent, mark scaled for ~66% safe zone
const adaptiveSvg = buildIconSvg(1024, {
  background: null,
  markColor: MARK,
  paddingRatio: 0.22,
});

await writePng('icon.png', iconSvg, 1024);
await writePng('adaptive-icon.png', adaptiveSvg, 1024);
await writePng('favicon.png', iconSvg, 48);

// Apple requires 1024 icon; Expo also uses splash optionally
await writePng('icon-512.png', iconSvg, 512);

console.log('Done. Update app.json if paths changed.');
