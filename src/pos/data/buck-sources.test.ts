import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUCK_SOURCES, buckAlignmentCounts } from './buck-sources';
import { NAV_GROUPS } from './nav';

const ROOT = join(__dirname, '..', '..', '..');

describe('the Buck sources table', () => {
  it('names only real nav destinations', () => {
    const labels = new Set(NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label)));
    for (const s of BUCK_SOURCES) expect(labels.has(s.birdieArea), s.birdieArea).toBe(true);
  });

  it('points at Birdie files that exist', () => {
    for (const s of BUCK_SOURCES.filter((x) => x.birdieFile !== '—')) expect(existsSync(join(ROOT, s.birdieFile)), s.birdieFile).toBe(true);
  });

  it('explains every row that is not aligned', () => {
    for (const s of BUCK_SOURCES.filter((x) => x.status === 'partial')) expect(s.note, s.shows).toBeTruthy();
    const n = buckAlignmentCounts();
    expect(n.aligned + n.partial + n['not yet']).toBe(BUCK_SOURCES.length);
  });
});
