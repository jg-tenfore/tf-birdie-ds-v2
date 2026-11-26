#!/usr/bin/env node
/**
 * Every in-Storybook link on the docs pages points at a story or docs page that exists.
 *
 *   npx storybook dev -p 6044 --no-open      # Storybook running
 *   node scripts/check-doc-links.mjs         (STORYBOOK_URL=… to point elsewhere)
 *
 * Reads the docs kit's link targets from the source, as written (`to="<id>"`, `to: '<id>'`,
 * `route: '<id>'`, `mobilePrototype('<id>')`) in src/stories and the review summaries, plus every
 * id the generated screen index links to. Checks each against /index.json. Also fails on a
 * hand-written `?path=` link in MDX, which breaks under the Pages base path and that this check
 * can't follow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.STORYBOOK_URL ?? 'http://localhost:6044').replace(/\/$/, '');

const res = await fetch(`${BASE}/index.json`).catch(() => null);
if (!res?.ok) {
  console.error(`Couldn't read ${BASE}/index.json. Start Storybook first.`);
  process.exit(1);
}
const known = new Set(Object.keys((await res.json()).entries));

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.(mdx|tsx|ts)$/.test(d.name) ? [p] : [];
  });

const files = [
  ...walk(path.join(ROOT, 'src/stories')),
  path.join(ROOT, 'src/showcase/weston-edits/0-overview.mdx'),
  path.join(ROOT, 'src/showcase/v1-v2/100126/0-overview.mdx'),
  path.join(ROOT, 'src/showcase/v1-v2/100226/0-overview.mdx'),
];

// `to=` / `to:` (DocLink, NavCard, ScreenCard links), `route:` (a phone screen, which the phone
// prototype routes by story id) and `mobilePrototype('<story id>')`.
const LINK = /\b(?:to|route)(?:=|:\s*)(?:\{\s*)?(["'`])([^"'`]+?)\1|mobilePrototype\((["'`])([^"'`]+?)\3\)/g;
// Generated rows: every story id and phone route the Screen index links to.
const GENERATED = /"(?:id|route|docs|firstId)":"([^"]+)"/g;

const missing = [];
let checked = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(ROOT, file);
  const ids = [...src.matchAll(LINK)].map((m) => m[2] ?? m[4]).filter((id) => /--/.test(id));
  if (rel.endsWith('screen-index-data.ts')) ids.push(...[...src.matchAll(GENERATED)].map((m) => m[1]));
  for (const id of ids) {
    checked++;
    if (!known.has(id)) missing.push(`${rel}: ${id}`);
  }
  if (file.endsWith('.mdx') && /\?path=\//.test(src)) missing.push(`${rel}: a hand-written ?path= link (use DocLink to="…")`);
}

if (missing.length) {
  console.error(`✗ ${missing.length} broken of ${checked} links:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`✓ ${checked} links in ${files.length} files, every target in index.json`);
