#!/usr/bin/env node
/**
 * Assemble the GitHub Pages site.
 *
 * GitHub Pages serves one site per repository, so every deliverable shares one tree:
 *
 *   /                    Storybook        — the design system, the front door
 *   /prototype/          the current tablet — V1 → V2 (Weston Edits plus every nav
 *                                             destination), at the 18-hole club
 *   /mobile/             the current phone  — Weston Edits, at the 18-hole club
 *   /archive/prototype/  the original port, tablet — before Weston's rounds, three nines
 *   /archive/mobile/     the original port, phone  — the same, on the phone
 *   /reference/          the original HTML — read-only, what the port is measured against
 *
 * Every prototype runs at any club (`?venue=eighteen|nine|three-nines`) and on any device
 * (`?device=…`, see `src/pos/devices.ts`) without a rebuild, so there is one build per app per
 * edition rather than one per club. The paths the site used to publish — a build per club, and
 * the Weston Edits and V1 → V2 builds — are now tiny redirect pages to their current
 * equivalent, keeping the hash (the screen) and the query (see REDIRECTS below).
 *
 * The builds are the *same app* with a different `VITE_EDITION` / `VITE_VENUE` (and
 * `VITE_APP=mobile` for the phone). They are not forks: an edition is a context
 * (`src/pos/edition.tsx`) and a venue is a course layout (`src/pos/data/venues.ts`).
 *
 * Storybook is the root because that matches goose-kds and tf-fox-ds-v1, so every
 * TenFore design-system site behaves the same way.
 *
 * Both builds need a base path, and it differs per target, so this script drives them
 * rather than baking the value into the config. `BASE_PATH` defaults to the repo's Pages
 * path and can be overridden for a local preview.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'site');
const BASE = process.env.BASE_PATH ?? '/tf-birdie-ds-v2/';

const run = (cmd, args, env = {}) => {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
};

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });

// ── 1. Storybook at the root ───────────────────────────────────────────────
// Storybook emits relative asset paths, so it needs no base configuration to sit
// under a repository subpath.
run('npx', ['storybook', 'build', '--output-dir', 'site']);

// Storybook hard-codes "storybook - Storybook" in its manager template, and `managerHead`
// can only *append* to <head> — a second <title> loses to the first. So rewrite it here,
// which also keeps the tab title correct without relying on JS.
const managerIndex = join(site, 'index.html');
writeFileSync(
  managerIndex,
  readFileSync(managerIndex, 'utf8').replace(
    /<title>[^<]*<\/title>/,
    '<title>TenFore · Birdie Design System</title>',
  ),
);

// ── 2. The prototypes: current and archive, tablet and phone ──────────────
// Each needs its own build because the base path is baked into asset URLs and the edition and
// app into the bundle; one artifact cannot serve two paths. The editions mirror
// `CURRENT_EDITION` / `ARCHIVED_EDITION` in `src/pos/edition.tsx` (this script can't import
// TypeScript) — change one, change both.
//
// The phone build uses the same entry (`src/main.tsx`), which picks the phone app from
// `VITE_APP`. Its screens are the phone story files themselves
// (`src/mobile-prototype/screen-index.ts`), so there's nothing to keep in sync. Routing is
// hash-only everywhere — Pages has no SPA fallback.
const PROTOTYPES = [
  { dir: 'prototype', app: 'tablet', venue: 'eighteen', edition: 'v1v2', label: 'current tablet · V1 → V2' },
  { dir: 'mobile', app: 'mobile', venue: 'eighteen', edition: 'v1v2', label: 'current phone · V1 → V2' },
  { dir: 'archive/prototype', app: 'tablet', venue: 'three-nines', edition: 'base', label: 'archive tablet · the original port' },
  { dir: 'archive/mobile', app: 'mobile', venue: 'three-nines', edition: 'base', label: 'archive phone · the original port' },
];

for (const { dir, app, venue, edition } of PROTOTYPES) {
  run(
    'npx',
    ['vite', 'build', '--base', `${BASE}${dir}/`, '--outDir', `site/${dir}`],
    { VITE_APP: app === 'mobile' ? 'mobile' : '', VITE_VENUE: venue, VITE_EDITION: edition },
  );
}

// ── 3. Redirects from the paths the site used to publish ──────────────────
// Links to these are out in the world — in Loom descriptions, Linear tickets, review notes.
// Each becomes a page that forwards to its current equivalent, keeping the hash (which screen,
// which dialog) and the query, and adding the club the old path implied. Script first, so the
// hash survives; a meta refresh for anyone without JavaScript, which can't carry a hash.
const REDIRECTS = [
  { from: 'prototype-18', to: 'prototype/', venue: 'eighteen' },
  { from: 'prototype-9', to: 'prototype/', venue: 'nine' },
  { from: 'mobile-18', to: 'mobile/', venue: 'eighteen' },
  { from: 'mobile-9', to: 'mobile/', venue: 'nine' },
  { from: 'weston-edits', to: 'prototype/' },
  { from: 'weston-edits-mobile', to: 'mobile/' },
  { from: 'v1-v2', to: 'prototype/' },
];

const redirectPage = ({ to, venue }) => {
  const target = `${BASE}${to}`;
  const fallback = venue ? `${target}?venue=${venue}` : target;
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>Moved — TenFore · Birdie</title>
<script>
  (function () {
    var url = new URL(${JSON.stringify(target)}, location.href);
    var query = new URLSearchParams(location.search);
    ${venue ? `if (!query.has('venue')) query.set('venue', ${JSON.stringify(venue)});` : ''}
    url.search = query.toString();
    url.hash = location.hash;
    location.replace(url.toString());
  })();
</script>
<noscript><meta http-equiv="refresh" content="0; url=${fallback}"></noscript>
<body style="font:15px/1.6 system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">
<p>This prototype moved to <a href="${fallback}">${fallback}</a> — the current Birdie.</p>
</body>
</html>
`;
};

for (const r of REDIRECTS) {
  const dir = join(site, r.from);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), redirectPage(r));
}
console.log(`\n✓ ${REDIRECTS.length} redirect pages written`);

// ── 4. The original single-file prototype at /reference/ ──────────────────
const reference = join(
  root,
  'references',
  'prototoype',
  'GolfCoursePOS_Package',
  'Golf_Course_POS.html',
);
const referenceDir = join(site, 'reference');
mkdirSync(referenceDir, { recursive: true });

if (existsSync(reference)) {
  // Fonts are embedded as data URIs inside the HTML, so it's genuinely self-contained
  // — no sibling files to copy.
  cpSync(reference, join(referenceDir, 'index.html'));
  console.log('\n✓ reference prototype copied');
} else {
  // Never fail the deploy over the reference page; publish a note instead so the
  // missing piece is visible rather than a 404.
  console.warn(`\n! reference prototype not found at ${reference} — writing a placeholder`);
  writeFileSync(
    join(referenceDir, 'index.html'),
    `<!doctype html><meta charset="utf-8"><title>Reference prototype unavailable</title>
<body style="font:15px/1.6 system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem">
<h1>Reference prototype unavailable</h1>
<p>The original single-file prototype was not present at build time. It lives at
<code>references/prototoype/GolfCoursePOS_Package/Golf_Course_POS.html</code>.</p>
<p><a href="${BASE}">Back to the design system</a></p>`,
  );
}

// Pages runs the output through Jekyll unless told not to, and Jekyll drops files and
// directories beginning with an underscore — which Storybook and Vite both emit.
writeFileSync(join(site, '.nojekyll'), '');

console.log(`\n✓ site assembled at ${site}`);
console.log(`   ${BASE}`.padEnd(BASE.length + 24) + 'Storybook');
for (const { dir, label } of PROTOTYPES) {
  console.log(`   ${BASE}${dir}/`.padEnd(BASE.length + 24) + label);
}
for (const { from, to, venue } of REDIRECTS) {
  console.log(`   ${BASE}${from}/`.padEnd(BASE.length + 24) + `→ ${BASE}${to}${venue ? `?venue=${venue}` : ''}`);
}
console.log(`   ${BASE}reference/`.padEnd(BASE.length + 24) + 'original HTML');
