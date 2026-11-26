#!/usr/bin/env node
/**
 * Generates src/stories/prototypes/screen-index-data.ts: the rows behind
 * Prototypes › Tablet › Screen index and Prototypes › Mobile › Screen index, and the Archive's
 * folder counts for Archive › About the archive.
 *
 * Regenerate after adding, renaming or moving a prototype story:
 *   1. Storybook running:  npx storybook dev -p 6044 --no-open
 *   2. node scripts/gen-screen-index.mjs        (STORYBOOK_URL=… to point elsewhere)
 *
 * CI runs it as a check against the built site, so a renamed story or a stale DESCRIPTIONS key
 * fails the build rather than a review:
 *   STORYBOOK_INDEX=site/index.json node scripts/gen-screen-index.mjs --check
 * `--check` writes nothing; it fails if the committed file differs from what it would write.
 *
 * It also records the review folders (Reviews/<Mon D – Topic>/Summary), newest first, so the
 * Start Here cards that say "the latest review" follow the newest folder by themselves.
 *
 * What it does:
 *   - Reads /index.json from the running Storybook. Its order is the sidebar's (the server sorts the
 *     index with `storySort` from .storybook/preview.tsx), so rows come out in sidebar order, which
 *     for Prototypes is the nav's own order (src/pos/data/nav.ts).
 *   - Keeps every *story* (not docs) under "Prototypes/Tablet/" and "Prototypes/Mobile/".
 *   - Description, first match wins: DESCRIPTIONS below → the story's parameters.docs.description
 *     .story → the JSDoc right above its export (for the current-edition re-export files, the JSDoc
 *     on the archived story it copies) → "<topic>: <story name>.".
 *   - Phone rows get their prototype route. The phone prototype routes by story id (`#/<id>`) and
 *     indexes the original port's story files plus Weston's phone files, so a current-edition copy
 *     routes to the archived story it copies (same state, same play).
 *   - Areas: the third title segment, checked against the nav's labels (plus Global Nav first and
 *     Sign-in last) so a misspelt folder fails here instead of drifting out of nav order.
 *   - Asserts every id exists, the row count matches the stories under each root, and every
 *     DESCRIPTIONS key is still a story (a stale key throws).
 *
 * Edit descriptions HERE (DESCRIPTIONS), not in the generated file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/stories/prototypes/screen-index-data.ts');
const BASE = (process.env.STORYBOOK_URL ?? 'http://localhost:6044').replace(/\/$/, '');
const ROOTS = { tablet: 'Prototypes/Tablet/', mobile: 'Prototypes/Mobile/' };
const CHECK = process.argv.includes('--check');

/**
 * The Storybook index: from a built Storybook's index.json when STORYBOOK_INDEX names one (CI,
 * after `npm run build:site`), otherwise from the running dev server at STORYBOOK_URL.
 */
async function readIndex() {
  if (process.env.STORYBOOK_INDEX) return JSON.parse(fs.readFileSync(process.env.STORYBOOK_INDEX, 'utf8'));
  const res = await fetch(`${BASE}/index.json`).catch(() => null);
  if (!res?.ok) {
    console.error(`Couldn't read ${BASE}/index.json. Start Storybook first (npx storybook dev -p 6044 --no-open), or set STORYBOOK_INDEX.`);
    process.exit(1);
  }
  return res.json();
}


/* --------------------------------------------------------------- overrides */
// One line about the state a story shows, where the story's own comment doesn't lead with one.
// Keyed by story id. Keep each under ~20 words, plain, about what is on screen.
const DESCRIPTIONS = {
  'weston-edits-19-·-deep-links-tablet--every-link': 'Every deep link the tablet understands, built from the 18-hole club’s real bookings, each with Open and Copy.',
  'prototypes-mobile-global-nav-navigation--interactive': 'The whole phone app, clickable: four destinations on the navigation bar, everything else one level down.',
  'prototypes-mobile-global-nav-navigation--order-in-progress': 'The whole phone app with an order on the Register tab, so its badge shows the line count.',
  'weston-edits-20-·-main-nav-tablet--the-navigation': 'The main nav: a full-screen sheet of v1’s destinations in v1’s groups, every one live.',
};

/* -------------------------------------------------------------------- areas */
// The nav's own labels, in order, read from src/pos/data/nav.ts rather than restated.
const navSource = fs.readFileSync(path.join(ROOT, 'src/pos/data/nav.ts'), 'utf8');
const NAV_BLOCK = navSource.slice(navSource.indexOf('export const NAV_GROUPS'), navSource.indexOf('export const NAV_KEYS'));
const NAV_LABELS = [...NAV_BLOCK.matchAll(/key: '([a-z]+)', label: '([^']+)'/g)].map((m) => ({ key: m[1], label: m[2] }));
if (NAV_LABELS.length < 18) throw new Error(`Read only ${NAV_LABELS.length} nav destinations from nav.ts`);
const AREAS = ['Global Nav', ...NAV_LABELS.map((n) => n.label), 'Sign-in'];

/* ------------------------------------------------------------------ helpers */

const clean = (s) =>
  s
    .replace(/^\s*\*\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,;:!?]|$)/g, '$1$2')
    .replace(/`/g, '')
    .replace(/\*/g, '')
    .replace(/\\(["'`])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const sentences = (s) => s.split(/(?<=[.!?…])\s+(?=[A-Z0-9(“"‘'*])/);
const words = (s) => s.split(/\s+/).filter(Boolean).length;

/** One line: the first sentence, or the first two when the first is a bold four-word lead-in. */
const oneLine = (text) => {
  const ss = sentences(text);
  let line = ss[0] ?? '';
  let i = 1;
  if (words(line) <= 6 && ss[i]) line = `${line} ${ss[i++]}`;
  // Don't stop inside a quotation.
  const open = (t) => ((t.match(/"/g) ?? []).length % 2 === 1) || (t.match(/“/g) ?? []).length > (t.match(/”/g) ?? []).length;
  while (open(line) && ss[i] && words(line) < 40) line = `${line} ${ss[i++]}`;
  if (words(line) > 32) line = `${line.split(/\s+/).slice(0, 30).join(' ').replace(/[,;:—–-]$/, '')}…`;
  return line;
};

/** The JSDoc right above `export const <name>`, or its parameters.docs.description.story. */
const sourceDescription = (src, exportName) => {
  const m = new RegExp(`export const ${exportName}\\b`).exec(src);
  if (!m) return null;
  const before = src.slice(0, m.index);
  const rest = src.slice(m.index + 1);
  const stop = rest.search(/\n(?:export |\/\*\*|const |function |type )/);
  const body = stop < 0 ? rest : rest.slice(0, stop);
  const sd = /story:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(body);
  if (sd) return clean(sd[1].slice(1, -1));
  const start = before.lastIndexOf('/**');
  const end = before.lastIndexOf('*/');
  if (start >= 0 && end > start && before.slice(end + 2).trim() === '') return clean(before.slice(start + 3, end));
  return null;
};

/** For a re-export file (`export const X: Story = { ...Archived.X }`), the archived file's path. */
const archivedImport = (src, file) => {
  const m = /import \* as Archived from '([^']+)'/.exec(src);
  if (!m) return null;
  return path.join(path.dirname(file), `${m[1]}.tsx`);
};

const srcCache = new Map();
const source = (p) => {
  if (!srcCache.has(p)) srcCache.set(p, fs.readFileSync(path.join(ROOT, p), 'utf8'));
  return srcCache.get(p);
};
const rel = (p) => `./${path.relative(ROOT, path.join(ROOT, p)).split(path.sep).join('/')}`;

/* --------------------------------------------------------------------- main */

const index = await readIndex();
const entries = Object.values(index.entries);
const known = new Set(entries.map((e) => e.id));

const stale = Object.keys(DESCRIPTIONS).filter((k) => !known.has(k));
if (stale.length) throw new Error(`DESCRIPTIONS keys that are no longer stories:\n  ${stale.join('\n  ')}`);

/** The archived story a current-edition copy re-exports: its id is the phone prototype's route. */
const archivedId = (importPath, exportName) => entries.find((e) => e.type === 'story' && e.importPath === importPath && e.exportName === exportName)?.id;

const tally = {};
const build = (app) => {
  const root = ROOTS[app];
  const stories = entries.filter((e) => e.type === 'story' && e.title.startsWith(root));
  const docsByTitle = new Map(entries.filter((e) => e.type === 'docs').map((e) => [e.title, e.id]));
  return stories.map((e) => {
    const [area, ...topicParts] = e.title.slice(root.length).split('/');
    if (!AREAS.includes(area)) throw new Error(`${e.id}: "${area}" is not a nav area (${AREAS.join(', ')})`);
    const topic = topicParts.join(' · ') || area;
    const src = source(e.importPath);
    const archivedFile = archivedImport(src, e.importPath);

    let description = DESCRIPTIONS[e.id];
    let from = 'override';
    if (!description) {
      const own = sourceDescription(src, e.exportName);
      const copied = !own && archivedFile ? sourceDescription(source(archivedFile), e.exportName) : null;
      if (own || copied) {
        description = oneLine(own ?? copied);
        from = own ? 'source' : 'archived source';
      } else {
        description = `${topic}: ${e.name.charAt(0).toLowerCase()}${e.name.slice(1)}.`;
        from = 'default';
      }
    }
    tally[`${app} ${from}`] = (tally[`${app} ${from}`] ?? 0) + 1;

    const row = { id: e.id, area, topic, name: e.name, description };
    const docs = docsByTitle.get(e.title);
    if (docs) row.docs = docs;
    if (app === 'mobile') {
      // Weston's phone files route as themselves; a current-edition copy routes to its original.
      const route = archivedFile ? archivedId(rel(archivedFile), e.exportName) : e.id;
      if (!route) throw new Error(`${e.id}: no archived story behind it in ${archivedFile}`);
      row.route = route;
    }
    return row;
  });
};

const tablet = build('tablet');
const mobile = build('mobile');

/* Assertions */
for (const [app, rows] of [['tablet', tablet], ['mobile', mobile]]) {
  const expected = entries.filter((e) => e.type === 'story' && e.title.startsWith(ROOTS[app])).length;
  if (rows.length !== expected) throw new Error(`${app}: ${rows.length} rows but ${expected} stories under ${ROOTS[app]}`);
  for (const r of rows) {
    if (!known.has(r.id)) throw new Error(`Unknown story id ${r.id}`);
    if (r.route && !known.has(r.route)) throw new Error(`Unknown phone route ${r.route}`);
  }
  // Areas must come out in nav order; the sidebar sort is what puts them there.
  const order = [...new Set(rows.map((r) => r.area))];
  const sorted = [...order].sort((a, b) => AREAS.indexOf(a) - AREAS.indexOf(b));
  if (order.join() !== sorted.join()) throw new Error(`${app}: areas out of nav order:\n  ${order.join(' → ')}`);
}

/* The Archive's folders, counted, for Archive › About the archive. "Original port" splits by app. */
const archive = [];
for (const e of entries.filter((x) => x.title.startsWith('Archive/'))) {
  const parts = e.title.split('/');
  const name = parts[1] === 'Original port' ? `Original port/${parts[2]}` : parts[1];
  let f = archive.find((a) => a.name === name);
  if (!f) archive.push((f = { name, stories: 0, docs: 0, firstId: e.id }));
  if (e.type === 'story') f.stories++;
  else f.docs++;
}

/* ------------------------------------------------------------- the reviews */
// Folders are "Mon D – Topic". Reviews are all 2026 so far; a folder from another year should
// carry it ("Jan 6 2027 – …") and this parse picks it up.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const reviews = entries
  .filter((e) => e.type === 'docs' && /^Reviews\/[^/]+\/Summary$/.test(e.title))
  .map((e) => {
    const folder = e.title.split('/')[1];
    const m = folder.match(/^([A-Z][a-z]{2}) (\d{1,2})(?: (\d{4}))? –/);
    if (!m || !MONTHS.includes(m[1])) throw new Error(`Review folder "${folder}" isn't "Mon D – Topic"`);
    const date = `${m[3] ?? '2026'}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return { id: e.id, folder, date };
  })
  .sort((a, b) => b.date.localeCompare(a.date));
if (!reviews.length) throw new Error('No Reviews/<folder>/Summary pages found');

const fmt = (rows) => rows.map((row) => `  ${JSON.stringify(row)},`).join('\n');
const out = `// Generated by scripts/gen-screen-index.mjs. Do not edit by hand.
// Edit descriptions in that script (DESCRIPTIONS), then run it with Storybook up:
//   node scripts/gen-screen-index.mjs
// Rows are in sidebar order, which is nav order. ${tablet.length} tablet stories · ${mobile.length} phone stories.

export interface ScreenIndexRow {
  /** Storybook story id. */
  id: string;
  /** Nav area: the third title segment, a label from src/pos/data/nav.ts (or Global Nav, Sign-in). */
  area: string;
  /** The folder under the area ("Reservation panel"). */
  topic: string;
  /** Story name as the sidebar shows it. */
  name: string;
  /** One line on the state the story shows. */
  description: string;
  /** The topic's docs page, when it has one. */
  docs?: string;
  /** Phone only: the phone prototype's route for this screen (a story id). */
  route?: string;
}

/** Every nav area, in nav order: Global Nav, the nav's destinations, then Sign-in. */
export const NAV_AREAS = ${JSON.stringify(AREAS)} as const;

export const TABLET_SCREENS: ScreenIndexRow[] = [
${fmt(tablet)}
];

export const MOBILE_SCREENS: ScreenIndexRow[] = [
${fmt(mobile)}
];

/** Review folders, newest first: each Summary page's id, its folder name and its date. */
export const REVIEWS: { id: string; folder: string; date: string }[] = [
${reviews.map((r) => `  ${JSON.stringify(r)},`).join('\n')}
];

/** The newest review — what "the latest review" links on Start Here point at. */
export const LATEST_REVIEW = REVIEWS[0];

/** Archive folders in sidebar order, with their story and docs-page counts and first entry. */
export const ARCHIVE_FOLDERS: { name: string; stories: number; docs: number; firstId: string }[] = [
${archive.map((a) => `  ${JSON.stringify(a)},`).join('\n')}
];
`;
if (CHECK) {
  const committed = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (committed !== out) {
    console.error(`✗ ${path.relative(ROOT, OUT)} is stale. Run node scripts/gen-screen-index.mjs with Storybook up, and commit it.`);
    process.exit(1);
  }
  console.log(`✓ ${path.relative(ROOT, OUT)} is up to date`);
  process.exit(0);
}
fs.writeFileSync(OUT, out);

console.log(`✓ ${path.relative(ROOT, OUT)}`);
console.log(`  tablet: ${tablet.length} stories in ${new Set(tablet.map((r) => r.area)).size} areas`);
console.log(`  phone:  ${mobile.length} stories in ${new Set(mobile.map((r) => r.area)).size} areas`);
console.log(' ', tally);
