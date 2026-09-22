import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ICONS } from './icons';

/**
 * Every icon name a component asks for must exist.
 *
 * `iconFor` falls back to a neutral dot for a name it does not know. That is the right runtime
 * behaviour — a missing glyph should not take a screen down — but it means a typo renders a
 * bullet and nothing anywhere complains. Three of them shipped that way in this round: the
 * order rail's hamburger, the cart-key glyph and the customer search icon all drew as dots
 * while the whole suite stayed green, because no test looks at pixels.
 *
 * So the check lives here instead, over the source: collect every `name="…"` and `icon="…"` in
 * `src` and assert the registry knows it. A dynamic name (`icon={cond ? 'a' : 'b'}`) is not
 * matched by the scan and is not meant to be — this catches the literal case, which is the one
 * that has actually gone wrong.
 */

const ICON_PROP = /\b(?:name|icon)=["']([a-z][a-z_0-9]*)["']/g;

function iconNamesIn(dir: string): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const path = join(d, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const src = readFileSync(path, 'utf8');
      for (const m of src.matchAll(ICON_PROP)) {
        found.set(m[1], [...(found.get(m[1]) ?? []), path]);
      }
    }
  };
  walk(dir);
  return found;
}

describe('icon registry', () => {
  it('knows every icon name the source asks for by literal', () => {
    const used = iconNamesIn('src');
    const unregistered = [...used.entries()]
      .filter(([name]) => !(name in ICONS))
      .map(([name, files]) => `${name} — ${[...new Set(files)].join(', ')}`);

    // Named rather than counted, so the failure says which glyph and where.
    expect(unregistered).toEqual([]);
  });

  it('registers the glyphs this round introduced', () => {
    // These three shipped as dots. Pinned so a tidy-up of the registry cannot quietly drop them.
    for (const name of ['menu', 'vpn_key', 'person_search']) {
      expect(ICONS).toHaveProperty(name);
    }
  });
});
