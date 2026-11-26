/**
 * Start Here › Buck and Birdie: `BUCK_SOURCES` (src/pos/data/buck-sources.ts) as a table, in the
 * nav's order, with its counts. Nothing on the page is typed twice: add a row to `BUCK_SOURCES`
 * and it appears here, counted.
 */
import { Fragment } from 'react';
import { NAV_GROUPS } from '../../pos/data/nav';
import { BUCK_SOURCES, buckAlignmentCounts } from '../../pos/data/buck-sources';
import type { BuckAlignment } from '../../pos/data/buck-sources';
import { DOC, DocTable, Pill, StatusPill } from '../docs-kit/docs-kit';
import type { StatusTone } from '../docs-kit/docs-kit';

const TONE: Record<BuckAlignment, { tone: StatusTone; label: string }> = {
  aligned: { tone: 'done', label: 'Aligned' },
  partial: { tone: 'open', label: 'Partial' },
  'not yet': { tone: 'next', label: 'Not yet' },
};

export const BuckStatus = ({ status }: { status: BuckAlignment }) => <StatusPill tone={TONE[status].tone}>{TONE[status].label}</StatusPill>;

const NAV_ORDER = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.label));

/** The rows in nav order (stable within an area, so each area keeps the file's order). */
const rows = () => [...BUCK_SOURCES].sort((a, b) => NAV_ORDER.indexOf(a.birdieArea) - NAV_ORDER.indexOf(b.birdieArea));

/** The Birdie areas Buck feeds, in nav order. */
export const buckAreas = () => [...new Set(rows().map((r) => r.birdieArea))];

/** One pill per status with its count, and the total. */
export const BuckPills = () => {
  const n = buckAlignmentCounts();
  return (
    <>
      <Pill tone="brand">{BUCK_SOURCES.length} things Buck sets up</Pill>
      <Pill>{buckAreas().length} Birdie areas</Pill>
      <Pill tone="mint">{n.aligned} aligned</Pill>
      <Pill tone="amber">{n.partial} partial</Pill>
      <Pill>{n['not yet']} not yet</Pill>
    </>
  );
};

const small = { display: 'block', marginTop: 4, color: DOC.muted, fontSize: 12.5, lineHeight: '18px' } as const;

/** The table: Birdie area, what the counter shows (and what differs), the Buck screen, status. */
export const BuckSourcesTable = () => {
  let last = '';
  return (
    <DocTable
      columns={['Birdie area', 'What the counter shows', 'Set up in Buck', 'Status']}
      widths={['15%', '45%', '28%', '12%']}
      rows={rows().map((r, i) => {
        const first = r.birdieArea !== last;
        last = r.birdieArea;
        return [
          <Fragment key={`a${i}`}>{first ? <strong style={{ fontWeight: 600 }}>{r.birdieArea}</strong> : <span style={{ color: DOC.muted }}>{r.birdieArea}</span>}</Fragment>,
          <span key={`s${i}`}>
            {r.shows}
            {r.note && <span style={{ ...small, color: DOC.body }}>{r.note}</span>}
          </span>,
          <span key={`b${i}`}>
            {r.buckScreen}
            {r.birdieFile !== '—' && <span style={small}>Birdie: {r.birdieFile}</span>}
          </span>,
          <BuckStatus key={`t${i}`} status={r.status} />,
        ];
      })}
    />
  );
};
