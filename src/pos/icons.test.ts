import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICONS } from './icons';

/**
 * Every icon name a component asks for must exist.
 *
 * `iconFor` falls back to a neutral dot for a name it does not know. That is the right runtime
 * behaviour — a missing glyph should not take a screen down — but it means a typo renders a
 * bullet and nothing anywhere complains. Three of them shipped that way in round 3: the order
 * rail's hamburger, the cart-key glyph and the customer search icon all drew as dots while the
 * whole suite stayed green, because no test looks at pixels.
 *
 * So the check lives here instead, over the source.
 *
 * ## Why it scans ternaries too
 *
 * The first version of this test matched only literal props — `name="tune"` — and said so:
 * *"a dynamic name is not matched by the scan and is not meant to be; this catches the literal
 * case, which is the one that has actually gone wrong."*
 *
 * That was wrong within a day. `expand_less` shipped unregistered in
 * `name={open ? 'expand_less' : 'expand_more'}`, and because the customer record's sections
 * open by default, **every section bar drew a dot until you clicked it** — at which point it
 * became a real chevron, since `expand_more` *was* registered. A toggle where one state is a
 * glyph and the other is a bullet is exactly the failure this file exists to prevent, and the
 * waiver above is what let it through.
 *
 * A toggle is in fact the *most* likely place to lose a glyph: half of it is invisible until
 * someone interacts, so a screenshot of the default state looks fine.
 *
 * ## What the scan deliberately skips
 *
 * Both exclusions exist because they produced false positives on real code:
 *
 * - **Comments**, so that the `icon={cond ? 'a' : 'b'}` written in this very docblock — and the
 *   same example in `8 · Bug Fixes` — are not read as icon names.
 * - **Expressions containing JSX** (`[^}<]*`). `icon={<InfoOutlined fontSize="small" />}` passes
 *   a rendered element, not a registry key, and its props are not icon names.
 *
 * And within an expression, the right-hand side of a comparison is stripped before literals are
 * read: in `b.pay === 'event' ? 'groups' : 'block'` only `groups` and `block` are icon names —
 * `event` is the value being tested.
 */

/** `name="tune"` — the simple case. */
const LITERAL_PROP = /\b(?:name|icon)=["']([a-z][a-z_0-9]*)["']/g;

/** `name={open ? 'expand_less' : 'expand_more'}` — no JSX inside, or it isn't a name. */
const DYNAMIC_PROP = /\b(?:name|icon)=\{([^}<]*)\}/g;

/** Values being compared against, and object keys, are not icon names. */
const stripNonNames = (expr: string): string =>
  expr.replace(/[!=]==?\s*['"][^'"]*['"]/g, '').replace(/\[\s*['"][^'"]*['"]\s*\]/g, '');

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function iconNamesIn(dir: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (name: string, path: string) => found.set(name, [...(found.get(name) ?? []), path]);

  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const src = stripComments(readFileSync(path, 'utf8'));

      for (const m of src.matchAll(LITERAL_PROP)) add(m[1], path);

      for (const m of src.matchAll(DYNAMIC_PROP)) {
        for (const q of stripNonNames(m[1]).matchAll(/['"]([a-z][a-z_0-9]*)['"]/g)) add(q[1], path);
      }
    }
  };
  walk(dir);
  return found;
}

describe('icon registry', () => {
  it('knows every icon name the source asks for', () => {
    const used = iconNamesIn('src');
    const unregistered = [...used.entries()]
      .filter(([name]) => !(name in ICONS))
      .map(([name, files]) => `${name} — ${[...new Set(files)].join(', ')}`);

    // Named rather than counted, so the failure says which glyph and where.
    expect(unregistered).toEqual([]);
  });

  it('scans both halves of a ternary, not just literal props', () => {
    // The regression guard for `expand_less`. If this scan ever stops reading dynamic names,
    // the first test above goes quiet again and toggles lose a glyph silently.
    const used = iconNamesIn('src');
    expect([...used.keys()]).toContain('expand_less');
    expect([...used.keys()]).toContain('expand_more');
  });

  it('registers the glyphs the Weston rounds introduced', () => {
    // These shipped as dots. Pinned so a tidy-up of the registry cannot quietly drop them.
    for (const name of ['menu', 'vpn_key', 'person_search', 'badge', 'expand_less']) {
      expect(ICONS).toHaveProperty(name);
    }
  });
});
