#!/usr/bin/env node
/**
 * Assemble the GitHub Pages site.
 *
 * GitHub Pages serves one site per repository, so all three deliverables share one
 * tree:
 *
 *   /             Storybook          — the design system, the front door
 *   /prototype/   the React POS app  — built from the same components
 *   /reference/   the original HTML  — read-only, what the port is measured against
 *
 * Storybook is the root because that matches goose-kds and tf-fox-ds-v1, so every
 * TenFore design-system site behaves the same way.
 *
 * Both builds need a base path, and it differs per target, so this script drives them
 * rather than baking the value into the config. `BASE_PATH` defaults to the repo's Pages
 * path and can be overridden for a local preview.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

// ── 2. The React prototype at /prototype/ ─────────────────────────────────
run('npx', ['vite', 'build', '--base', `${BASE}prototype/`, '--outDir', 'site/prototype']);

// ── 3. The original single-file prototype at /reference/ ──────────────────
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
console.log(`   ${BASE}              Storybook`);
console.log(`   ${BASE}prototype/    POS prototype`);
console.log(`   ${BASE}reference/    original HTML`);
