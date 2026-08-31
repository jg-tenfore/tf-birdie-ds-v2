#!/usr/bin/env node
/**
 * Import product photography into `src/assets/items/`.
 *
 * The source folder (`pos-item-imagery/`) is ~130MB of full-resolution screenshots and
 * scraped product galleries. It is **not** committed — this script is what turns it into
 * the handful of megabytes the app actually ships.
 *
 * Each source image is downscaled to 240px on its long edge (tiles render it around
 * 110–120px, so 240 covers a 2× display) and written as `<item-slug>.png`. The slug is
 * derived from the catalog item name, which is how `item-images.ts` finds it again — so
 * adding a photo later means adding one line to `MAP` below and re-running, or simply
 * dropping a correctly-named file into `src/assets/items/`.
 *
 *   node scripts/import-item-images.mjs
 *
 * Re-running is safe and idempotent. `npm run test:unit` will tell you if a filename here
 * doesn't correspond to a real catalog item.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'pos-item-imagery');
const OUT = join(root, 'src/assets/items');
const BALLS = join(SRC, 'PGA TOUR Superstore Ball Imagery');

/** Long-edge pixels. Tiles show ~110–120px, so this covers a 2× display. */
const SIZE = 240;

/** Catalog item name → asset filename. Must match `slugify` in `item-images.ts`. */
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * The loose screenshots, keyed by the timestamp in their filename.
 *
 * Matched on a substring because macOS writes these with a narrow no-break space (U+202F)
 * before "PM", which is invisible and breaks naive string equality.
 */
const LOOSE = [
  // RENTALS
  ['1.07.02', 'Club Rental Full Set'],
  ['1.07.11', 'Pull Cart'],
  ['1.07.46', 'Riding Cart 18'],
  // Same physical cart, sold by duration — one photo legitimately serves both.
  ['1.07.46', 'Riding Cart 9'],
  ['1.07.59', 'GPS Unit'],
  ['1.08.10', 'Rain Poncho'],
  ['1.08.20', 'Umbrella'],
  ['1.08.26', 'Shoe Rental'],

  // APPAREL
  ['1.10.21', 'Golf Polo Brand'],
  ['1.10.26', 'Golf Polo Course Logo'],
  ['1.10.41', 'Ladies Golf Shirt'],
  ['1.10.59', 'Golf Shorts'],
  ['1.13.52', 'Golf Hat Structured'],
  ['1.14.02', 'Visor'],
  ['1.14.10', 'Windbreaker'],
  ['1.14.25', 'Rain Jacket'],
  ['1.14.34', 'Golf Belt'],

  // ACCESSORIES
  ['1.14.45', 'Golf Glove Mens'],
  ['1.14.51', 'Golf Glove Ladies'],
  ['1.15.00', 'Tee Pack 50ct'],
  ['1.15.20', 'Ball Marker'],
  ['1.15.37', 'Divot Tool'],
  ['1.15.46', 'Towel Course Logo'],
  ['1.15.56', 'Headcover'],
  ['1.16.04', 'Scorecard Holder'],

  // SNACKS
  ['1.24.34', 'Hot Dog'],
  ['1.24.54', 'Hamburger'],
  ['1.25.08', 'Pretzel'],
  ['1.25.18', 'Chips'],
  ['1.25.35', 'Candy Bar'],
  ['1.26.17', 'Granola Bar'],
  ['1.26.32', 'Fruit Cup'],
  ['1.26.52', 'Cookie'],

  // DRINKS
  ['1.27.34', 'Water'],
  ['1.27.49', 'Gatorade'],
  ['1.28.02', 'Soda'],
  ['1.28.23', 'Coffee'],
  ['1.28.39', 'Iced Tea'],
  ['1.28.59', 'Energy Drink'],
  ['1.29.49', 'Smoothie'],

  // ALCOHOL
  ['1.30.07', 'Beer Domestic'],
  ['1.30.39', 'Beer Craft'],
  ['1.31.12', 'Seltzer'],
  ['1.31.45', 'Wine Glass'],
  ['1.32.08', 'Cocktail'],
  ['1.32.25', 'Bloody Mary'],

  // 1.08.34 is a screenshot of the POS item grid itself, not a product.
  // 1.18.47 / 1.18.50 / 1.19.16 duplicate ball folders 01 / 02 / 03; the folder
  // versions are used instead so all 25 ball shots come from one source and match.
];

/**
 * The scraped ball galleries: folder prefix → catalog item name.
 *
 * `01_product_image.png` is the packaging hero in every folder — verified by eye — which is
 * the right shot for a POS tile.
 *
 * Folders 26 and 27 (RANGE BUCKET SMALL / LARGE) are deliberately absent: the scrape
 * matched a home practice net kit, not a bucket of range balls. A wrong photo is worse
 * than none, so those two tiles stay text-only until real imagery exists.
 */
const BALL_MAP = [
  ['01', 'Titleist Pro V1 Box'],
  ['02', 'Titleist Pro V1x Box'],
  ['03', 'Titleist Pro V1 Sleeve'],
  ['04', 'Titleist Pro V1x Sleeve'],
  ['05', 'Titleist AVX Box'],
  ['06', 'Titleist AVX Sleeve'],
  ['07', 'Titleist Tour Speed Box'],
  ['08', 'Titleist TruFeel Box'],
  ['09', 'Callaway Chrome Soft Box'],
  ['10', 'Callaway Chrome Soft Sleeve'],
  ['11', 'Callaway Chrome Soft X Box'],
  ['12', 'Callaway Supersoft Box'],
  ['13', 'Callaway Warbird Box'],
  ['14', 'TaylorMade TP5x Box'],
  ['15', 'TaylorMade TP5 Box'],
  ['16', 'TaylorMade TP5 Sleeve'],
  ['17', 'TaylorMade Distance+ Box'],
  ['18', 'TaylorMade Tour Response Box'],
  ['19', 'Srixon Z-Star Box'],
  ['20', 'Srixon Q-Star Tour Box'],
  ['21', 'Srixon Soft Feel Box'],
  ['22', 'Bridgestone Tour B X Box'],
  ['23', 'Bridgestone Tour B XS Box'],
  ['24', 'Bridgestone e6 Box'],
  ['25', 'Logo Ball Single'],
];

// ─── Run ────────────────────────────────────────────────────────────────────

if (!existsSync(SRC)) {
  console.error(`Source imagery not found at ${SRC}`);
  console.error('It is intentionally not committed — see README, "Product imagery".');
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const looseFiles = readdirSync(SRC).filter((f) => f.endsWith('.png'));
let written = 0;
const problems = [];

/** Downscale one image to `OUT/<slug>.png`. */
function emit(sourcePath, itemName) {
  const out = join(OUT, `${slugify(itemName)}.png`);
  try {
    execFileSync('sips', ['-Z', String(SIZE), sourcePath, '--out', out], { stdio: 'pipe' });
    written++;
  } catch {
    problems.push(`could not convert ${sourcePath}`);
  }
}

for (const [stamp, item] of LOOSE) {
  const match = looseFiles.find((f) => f.includes(stamp));
  if (!match) {
    problems.push(`no source screenshot matching "${stamp}" for ${item}`);
    continue;
  }
  emit(join(SRC, match), item);
}

if (existsSync(BALLS)) {
  const folders = readdirSync(BALLS);
  for (const [prefix, item] of BALL_MAP) {
    const folder = folders.find((f) => f.startsWith(`${prefix} -`));
    if (!folder) {
      problems.push(`no ball folder "${prefix} - …" for ${item}`);
      continue;
    }
    const hero = join(BALLS, folder, '01_product_image.png');
    if (!existsSync(hero)) {
      problems.push(`${folder} has no 01_product_image.png`);
      continue;
    }
    emit(hero, item);
  }
} else {
  problems.push('ball imagery folder missing — GOLF BALLS tiles will have no photos');
}

const bytes = readdirSync(OUT).reduce(
  (sum, f) => sum + execFileSync('stat', ['-f%z', join(OUT, f)], { encoding: 'utf8' }).trim() * 1,
  0,
);

console.log(`\n✓ ${written} images → src/assets/items/  (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ! ${p}`);
}
console.log('\nRun `npm run test:unit` to check every filename maps to a real catalog item.');
