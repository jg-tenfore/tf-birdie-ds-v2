#!/usr/bin/env node
/**
 * Screenshots for the docs pages: .storybook/static/docs/screens/<name>.webp.
 *
 * Drives the running prototype (and, for the few states a URL can't express, the running
 * Storybook) in headless Chromium, clips the device's screen out of the page, and converts it
 * with cwebp. Run it from inside the repo, so Playwright resolves from this package:
 *
 *   npx vite --port 5193                       # the prototype (both apps, every edition)
 *   npx storybook dev -p 6044 --no-open        # only for the shots marked `story`
 *   PROTOTYPE_URL=http://localhost:5193 STORYBOOK_URL=http://localhost:6044 \
 *     node scripts/capture-screens.mjs [--only tablet-tee-sheet,mobile-register] [--canvas]
 *
 * Each shot is taken on the device it is for, through the prototype's own device switch:
 * `?device=<id>&presenter=0` renders the app at that device's CSS viewport with no presenter
 * chrome (`src/pos/devices.ts`). The tablet shots are the Clover Mini (1280×800), the phone shots
 * the Quest handheld (360×800, at 2× so they stay sharp), and the `device-*` shots one per device
 * for Start Here › Devices.
 *
 * `--canvas` is the fallback from before devices existed: the current editions by query string
 * (`?edition=v1v2`, `/mobile/?edition=weston`) at the two design canvases, 1366×840 and 402×797.
 *
 * The screen is found by its size — the one element exactly as big as the device's viewport — not
 * by a selector, so the script survives the app's markup changing under it.
 *
 * Output: cwebp -q 78, tablets resized to 1200 wide; phones keep their 2× width (720) rather than
 * being blown up to 1200.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.storybook/static/docs/screens');
const PROTO = (process.env.PROTOTYPE_URL ?? 'http://localhost:5193').replace(/\/$/, '');
const SB = (process.env.STORYBOOK_URL ?? 'http://localhost:6044').replace(/\/$/, '');
const CWEBP = process.env.CWEBP ?? (fs.existsSync('/opt/homebrew/bin/cwebp') ? '/opt/homebrew/bin/cwebp' : 'cwebp');
const CANVAS = process.argv.includes('--canvas');
const onlyArg = process.argv.find((a) => a.startsWith('--only'));
const ONLY = onlyArg ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : process.argv[process.argv.indexOf(onlyArg) + 1]).split(',') : null;

/** CSS viewport per device (mirrors src/pos/devices.ts; the canvases are the old fixed frames). */
const DEVICES = {
  'clover-mini': { app: 'tablet', width: 1280, height: 800, scale: 1 },
  'large-display': { app: 'tablet', width: 1920, height: 1080, scale: 1 },
  'tablet-canvas': { app: 'tablet', width: 1366, height: 840, scale: 1 },
  'quest-handheld': { app: 'mobile', width: 360, height: 800, scale: 2 },
  'clover-flex': { app: 'mobile', width: 360, height: 720, scale: 2 },
  'phone-canvas': { app: 'mobile', width: 402, height: 797, scale: 2 },
};
const DEFAULT_DEVICE = { tablet: CANVAS ? 'tablet-canvas' : 'clover-mini', mobile: CANVAS ? 'phone-canvas' : 'quest-handheld' };

// A reservation at the 18-hole club with a record behind its booker (Foster, A., three players),
// and a paid one (Reed, M.) — the same bookings Prototypes › Tablet › Global Nav › Deep links uses.
const RES = 'p04_m6';
const PAID = 'p03_m6';

/**
 * Every shot. `hash` is a tablet route; `route` is a phone screen (its story id, or '' for the
 * free-running app); `story` clips a Storybook story instead, for state no URL can express.
 */
const SHOTS = [
  // ── Tablet: the 18 nav destinations, in nav order ──
  { name: 'tablet-pro-shop', hash: '#/register/GOLF%20BALLS' },
  { name: 'tablet-tee-sheet', hash: '#/tee-sheet?shift=early' },
  { name: 'tablet-court-sheet', hash: '#/courts' },
  { name: 'tablet-bay-sheet', hash: '#/bays' },
  { name: 'tablet-quick-order', hash: '#/quick-order' },
  { name: 'tablet-tabs', hash: '#/tabs?tab=T-1003' },
  { name: 'tablet-tables', hash: '#/tables' },
  { name: 'tablet-reservations', hash: '#/reservations' },
  { name: 'tablet-orders-tips', hash: '#/orders-tips' },
  { name: 'tablet-table-chart', hash: '#/table-chart' },
  { name: 'tablet-customer-search', hash: '#/customers?cid=M005' },
  { name: 'tablet-settings', hash: '#/settings' },
  { name: 'tablet-order-lookup', hash: '#/order-lookup' },
  { name: 'tablet-time-clock', hash: '#/time-clock' },
  { name: 'tablet-gift-cards', hash: '#/gift-cards' },
  { name: 'tablet-events', hash: '#/events?ev=EV-301' },
  { name: 'tablet-inventory', hash: '#/inventory' },
  { name: 'tablet-shift', hash: '#/shift' },
  // ── Tablet: key states ──
  { name: 'tablet-main-nav', hash: '#/register?nav=1' },
  { name: 'tablet-reservation', hash: `#/tee-sheet?res=${RES}` },
  { name: 'tablet-rate-editor', hash: `#/tee-sheet?res=${RES}&rate=0` },
  { name: 'tablet-customer-record', hash: `#/tee-sheet?res=${RES}&cust=607469&cust-seat=0` },
  { name: 'tablet-check-in-pay', hash: `#/register/GOLF%20BALLS?booking=${RES}` },
  { name: 'tablet-paid-reservation', hash: `#/tee-sheet?res=${PAID}` },
  { name: 'tablet-register-order', hash: '#/register?order=retail' },
  { name: 'tablet-checkout', hash: '#/register?order=walkin&modal=checkout' },
  { name: 'tablet-tee-sheet-list', hash: '#/tee-sheet/list?status=open&sort=status' },
  { name: 'tablet-sign-in', story: 'v1-→-v2-migration-sign-in-tablet--demo-pins' },
  { name: 'tablet-settings-buck', hash: '#/settings?section=taxes' },
  { name: 'tablet-dish-dialog', story: 'prototypes-tablet-quick-order-menu-photography--the-dish-dialog' },
  // ── Phone: the key screens (routes are story ids, as the phone prototype routes) ──
  { name: 'mobile-tee-sheet', route: '' },
  { name: 'mobile-reservation', route: 'weston-edits-1-·-reservation-panel-mobile--reservation' },
  { name: 'mobile-player-rows', route: 'weston-edits-2-·-player-rows-mobile--player-rows' },
  { name: 'mobile-rate-selector', route: 'weston-edits-11-·-rate-selector-mobile--the-whole-editor' },
  { name: 'mobile-check-in-pay', route: 'weston-edits-6-·-check-in-pay-mobile--check-in-and-pay' },
  { name: 'mobile-date-navigation', route: 'weston-edits-9-·-date-navigation-mobile--calendar-sheet' },
  { name: 'mobile-cart-signout', route: 'weston-edits-16-·-cart-signout-mobile--the-key-picker' },
  { name: 'mobile-customer-record', route: 'weston-edits-4-·-customer-profile-mobile--booker-record' },
  { name: 'mobile-register', route: 'mobile-screens-1-·-register-order--order-in-progress' },
  { name: 'mobile-golf-summary', route: 'weston-edits-7-·-register-golf-summary-mobile--golf-summary' },
  { name: 'mobile-checkout', route: 'mobile-screens-5-·-payment--checkout' },
  { name: 'mobile-card-reader', route: 'mobile-screens-5-·-payment--reader-card' },
  { name: 'mobile-people', route: 'mobile-screens-7-·-people--people-list' },
  { name: 'mobile-more', route: 'mobile-screens-6-·-operations--more-root' },
  // The restaurant on the handheld (V1 → V2 phone, Nov 26).
  { name: 'mobile-tables', route: 'prototypes-mobile-tables-floor-on-the-handheld--the-dining-room' },
  { name: 'mobile-tab', route: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat' },
  { name: 'mobile-menu', route: 'prototypes-mobile-tabs-tabs-on-the-handheld--the-menu' },
  { name: 'mobile-quick-order', route: 'prototypes-mobile-quick-order-counter-on-the-handheld--the-counter' },
  { name: 'mobile-reservations', route: 'prototypes-mobile-reservations-today-on-the-handheld--todays-book' },
  { name: 'mobile-orders-tips', route: 'prototypes-mobile-orders-tips-today-on-the-handheld--the-day-so-far' },
  // ── Design System › Forms: the same choices on both devices (date, select, checkbox, radio, form) ──
  { name: 'ds-tablet-date-picker', story: 'weston-edits-9-·-date-navigation-tablet--calendar-range' },
  { name: 'ds-tablet-block-time', hash: '#/tee-sheet?modal=block&t=0912' },
  { name: 'ds-mobile-block-time', route: 'mobile-screens-6-·-operations--block-time' },
  { name: 'ds-mobile-dish-dialog', route: 'prototypes-mobile-tabs-tabs-on-the-handheld--the-dish-dialog' },
  // ── The archive: the original port, before Weston's rounds (`query` adds to the prototype URL) ──
  { name: 'archive-tablet-tee-sheet', hash: '#/tee-sheet?shift=early', query: 'edition=base&venue=three-nines' },
  { name: 'archive-mobile-tee-sheet', route: '', query: 'edition=base&venue=three-nines' },
  // ── How to switch device: the prototype's Device panel, and Storybook's Device toolbar ──
  // Whole-window shots (`page`), not a device clip.
  { name: 'prototype-device-panel', page: () => `${PROTO}/?device=large-display#/tee-sheet?shift=early`, click: /Open the device panel/, deviceOnly: true },
  {
    name: 'storybook-device-toolbar',
    page: () => `${SB}/?path=/story/${encodeURIComponent('weston-edits-1-·-reservation-panel-tablet--over-the-tee-sheet')}&globals=device:clover-mini`,
    // The toolbar control is named by its description; the sidebar is left out of the clip.
    click: /^Render the story on a device/,
    x: 300,
    height: 600,
    deviceOnly: true,
  },
  // ── One per device, for Start Here › Devices (device mode only) ──
  { name: 'device-clover-mini', hash: `#/tee-sheet?res=${RES}`, device: 'clover-mini', deviceOnly: true },
  { name: 'device-large-display', hash: `#/tee-sheet?res=${RES}`, device: 'large-display', deviceOnly: true },
  { name: 'device-tablet-canvas', hash: `#/tee-sheet?res=${RES}`, device: 'tablet-canvas', deviceOnly: true },
  { name: 'device-quest-handheld', route: '', device: 'quest-handheld', deviceOnly: true },
  { name: 'device-clover-flex', route: '', device: 'clover-flex', deviceOnly: true },
  { name: 'device-phone-canvas', route: '', device: 'phone-canvas', deviceOnly: true },
];

const appOf = (shot) => (shot.route !== undefined ? 'mobile' : 'tablet');


function urlFor(shot, deviceId) {
  if (shot.story) {
    const q = new URLSearchParams({ id: shot.story, viewMode: 'story' });
    if (!CANVAS) q.set('globals', `device:${deviceId}`);
    return `${SB}/iframe.html?${q}`;
  }
  const app = appOf(shot);
  if (CANVAS) {
    if (app === 'mobile') return `${PROTO}/mobile/?edition=weston&venue=eighteen${shot.route ? `#/${encodeURI(shot.route)}` : ''}`;
    const sep = shot.hash.includes('?') ? '&' : '?';
    return `${PROTO}/?edition=v1v2${shot.hash}${sep}venue=eighteen`;
  }
  const q = `?device=${deviceId}&presenter=0${shot.query ? `&${shot.query}` : ''}`;
  if (app === 'mobile') return `${PROTO}/mobile/${q}${shot.route ? `#/${encodeURI(shot.route)}` : ''}`;
  return `${PROTO}/${q}${shot.hash}`;
}

/** The rect of the one element exactly the device's size: the app's screen. */
async function screenRect(page, w, h) {
  return page.evaluate(
    ([w, h]) => {
      const fits = (el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.width - w) < 1.5 && Math.abs(r.height - h) < 1.5;
      };
      // Outermost match: the frame itself, not a full-size child inside it.
      const el = [...document.querySelectorAll('body *')].find(fits);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: w, height: h };
    },
    [w, h],
  );
}

/** A whole browser window at 1440×900 (2×), for the shots that show the tools around a screen. */
async function pageShot(shot) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try {
    await page.goto(shot.page(), { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    if (shot.click) {
      await page.getByRole('button', { name: shot.click }).first().click();
      await page.waitForTimeout(800);
    }
    const png = path.join(tmp, `${shot.name}.png`);
    const x = shot.x ?? 0;
    await page.screenshot({ path: png, clip: { x, y: 0, width: 1440 - x, height: shot.height ?? 900 } });
    execFileSync(CWEBP, ['-quiet', '-q', '78', '-resize', '1600', '0', png, '-o', path.join(OUT, `${shot.name}.webp`)]);
    console.log(`✓ ${shot.name}.webp  (window)`);
  } catch (e) {
    failed.push(shot.name);
    console.error(`✗ ${shot.name}: ${e.message}`);
  }
  await ctx.close();
}

fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'birdie-screens-'));
const browser = await chromium.launch();
const failed = [];
const shots = SHOTS.filter((s) => (!ONLY || ONLY.includes(s.name)) && !(CANVAS && s.deviceOnly));

for (const shot of shots) {
  if (shot.page) {
    await pageShot(shot);
    continue;
  }
  const deviceId = shot.device ?? DEFAULT_DEVICE[appOf(shot)];
  const d = DEVICES[deviceId];
  // Room around the device for whatever the page puts beside it, so the app renders at 1:1.
  const ctx = await browser.newContext({
    viewport: { width: Math.max(1600, d.width + 160), height: Math.max(1100, d.height + 160) },
    deviceScaleFactor: d.scale,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(urlFor(shot, deviceId), { waitUntil: 'networkidle' });
    // Fonts, lazy images and any play() setting the scene.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(shot.story ? 3500 : shot.route ? 2200 : 1400);
    const rect = await screenRect(page, d.width, d.height);
    if (!rect) throw new Error(`no ${d.width}×${d.height} element on the page`);
    const png = path.join(tmp, `${shot.name}.png`);
    await page.screenshot({ path: png, clip: rect });
    const resize = d.app === 'tablet' ? ['-resize', '1200', '0'] : [];
    execFileSync(CWEBP, ['-quiet', '-q', '78', ...resize, png, '-o', path.join(OUT, `${shot.name}.webp`)]);
    console.log(`✓ ${shot.name}.webp  (${deviceId}${errors.length ? `, ${errors.length} page error(s)` : ''})`);
  } catch (e) {
    failed.push(shot.name);
    console.error(`✗ ${shot.name}: ${e.message}`);
  }
  await ctx.close();
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
if (failed.length) {
  console.error(`\n${failed.length} failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\n${shots.length} screens → ${path.relative(ROOT, OUT)}/`);
