/**
 * Live pieces for Design System › Overview, computed rather than typed:
 *
 * - `DsInventory` reads Storybook's own index (`index.json`, the file the sidebar is built from,
 *   in sidebar order) and lists every Design System page with the status and usage its page
 *   shows, from the same functions (`statusOf`, `usageOf`, `dsDocFor` in DsDocsPage.tsx). A page
 *   filed under Design System appears here by existing; nothing is counted by hand.
 * - `StatusLegend` is the page template's own legend (`STATUS`).
 * - `Pipeline` draws tokens → themes → components → screens with counts read from the code.
 */
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { DOC, DocLink, DocTable, Grid, NavCard, Pill, StatusPill } from '../docs-kit/docs-kit';
import { STATUS, dsDocFor, statusOf, usageOf } from '../../showcase/ds-docs/DsDocsPage';
import type { DsStatus } from '../../showcase/ds-docs/types';
import { MUI_USAGE } from '../../showcase/ds-docs/ds-usage-data';
import { md3, mobile, payBadges, radius } from '../../theme/tokens';
import { ICONS } from '../../pos/icons';
import { CATALOG } from '../../pos/data/catalog';
import { Contrast, contrastRatio } from '../../showcase/ds-docs/Contrast';

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: 'docs' | 'story';
}

export interface DsPage {
  /** The docs entry id (`<meta id>--overview`). */
  id: string;
  metaId: string;
  group: string;
  name: string;
  status: DsStatus;
  written: boolean;
  tablet: number;
  handheld: number;
  usesMui: boolean;
}

/** Every Design System page, from Storybook's index, in sidebar order. */
export function useDsPages(): { pages: DsPage[] | null; error: boolean } {
  const [pages, setPages] = useState<DsPage[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    // Relative to iframe.html, so it resolves on `storybook dev` and under the Pages base path.
    fetch('index.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((index: { entries: Record<string, IndexEntry> }) => {
        if (!live) return;
        const rows = Object.values(index.entries)
          .filter((e) => e.type === 'docs' && e.title.startsWith('Design System/') && e.title !== 'Design System/Overview')
          .map((e): DsPage => {
            const metaId = e.id.replace(/--[^-]+$/, '');
            const parts = e.title.split('/');
            const doc = dsDocFor(metaId);
            const u = usageOf(doc?.mui);
            return {
              id: e.id,
              metaId,
              group: parts.slice(1, -1).join(' · '),
              name: parts[parts.length - 1],
              status: statusOf(doc),
              written: Boolean(doc),
              tablet: u.tablet.length,
              handheld: u.handheld.length,
              usesMui: Boolean(doc?.mui?.length),
            };
          });
        setPages(rows);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, []);
  return { pages, error };
}

const count = (pages: DsPage[], f: (p: DsPage) => boolean) => pages.filter(f).length;

/**
 * Summary pills over the inventory: pages, write-ups, and the written pages per status. A page
 * without a write-up has no status yet (its page shows the scan's default), so it is counted as
 * awaiting one rather than as Available.
 */
export function InventoryPills() {
  const { pages } = useDsPages();
  if (!pages) return null;
  const written = pages.filter((p) => p.written);
  return (
    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Pill>{pages.length} pages</Pill>
      {(Object.keys(STATUS) as DsStatus[])
        .filter((s) => count(written, (p) => p.status === s))
        .map((s) => (
          <Pill key={s} tone="mint">
            {count(written, (p) => p.status === s)} {STATUS[s].label.toLowerCase()}
          </Pill>
        ))}
      {pages.length > written.length && <Pill tone="amber">{pages.length - written.length} awaiting a write-up</Pill>}
    </span>
  );
}

const usageCell = (p: DsPage, n: number) =>
  !p.usesMui ? <span style={{ color: DOC.body }}>{p.group === 'Styles' ? 'Foundation' : '—'}</span> : n ? `${n} file${n === 1 ? '' : 's'}` : <span style={{ color: DOC.body }}>Not used</span>;

/** The table of every Design System page. */
export function DsInventory() {
  const { pages, error } = useDsPages();
  if (error) return <p style={{ fontSize: 14 }}>Couldn't read Storybook's index here. Open this page inside Storybook to see the inventory.</p>;
  if (!pages) return <p style={{ fontSize: 14 }}>Reading Storybook's index…</p>;
  return (
    <DocTable
      columns={['Group', 'Page', 'Status', 'Tablet', 'Handheld', 'Write-up']}
      widths={['24%', '20%', 130, 100, 100, 'auto']}
      rows={pages.map((p) => [
        <span key="g" style={{ fontSize: 13 }}>{p.group}</span>,
        <DocLink key="n" to={p.id}>
          {p.name}
        </DocLink>,
        p.written ? (
          <StatusPill key="s" tone={STATUS[p.status].tone}>
            {STATUS[p.status].label}
          </StatusPill>
        ) : (
          <span key="s" style={{ fontSize: 13, color: DOC.body }}>Not assessed</span>
        ),
        <span key="t" style={{ fontSize: 13 }}>{usageCell(p, p.tablet)}</span>,
        <span key="h" style={{ fontSize: 13 }}>{usageCell(p, p.handheld)}</span>,
        <span key="w" style={{ fontSize: 13, color: p.written ? DOC.ink : DOC.roseText, fontWeight: p.written ? 400 : 600 }}>
          {p.written ? 'Written' : 'Missing'}
        </span>,
      ])}
    />
  );
}

/** The status legend, as the page template defines it. */
export function StatusLegend() {
  return (
    <DocTable
      columns={['Status', 'Meaning', 'What to do']}
      widths={[120, '46%', 'auto']}
      rows={(Object.keys(STATUS) as DsStatus[]).map((s) => [
        <StatusPill key="p" tone={STATUS[s].tone}>
          {STATUS[s].label}
        </StatusPill>,
        STATUS[s].meaning,
        {
          core: 'Reach for it first.',
          'in-use': 'Use it where the page says it fits; check the surface.',
          available: 'Fine to adopt. Say so in the page when you do, and the scan will move it to In use.',
          avoid: 'Use what the page names instead.',
        }[s],
      ])}
    />
  );
}

const Box = ({ title, children, note }: { title: ReactNode; children: ReactNode; note?: ReactNode }) => (
  <div style={{ flex: '1 1 0', minWidth: 170, borderRadius: radius.lg, background: '#fff', boxShadow: `inset 0 0 0 1px ${DOC.line}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ fontFamily: DOC.mono, fontSize: 12.5, fontWeight: 700, color: DOC.ink }}>{title}</div>
    <div style={{ fontSize: 13.5, lineHeight: '20px' }}>{children}</div>
    {note && <div style={{ marginTop: 'auto', fontSize: 12.5, color: DOC.body }}>{note}</div>}
  </div>
);

const Arrow = () => (
  <span aria-hidden="true" style={{ alignSelf: 'center', fontSize: 22, color: DOC.brandText, padding: '0 2px' }}>
    →
  </span>
);

/** tokens.ts → theme.ts / mobile-theme.ts → components → screens, with counts from the code. */
export function Pipeline() {
  const muiNames = Object.keys(MUI_USAGE);
  const onTablet = muiNames.filter((n) => MUI_USAGE[n].tablet.length).length;
  const onHandheld = muiNames.filter((n) => MUI_USAGE[n].handheld.length).length;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
      <Box title="src/theme/tokens.ts" note="Imports nothing from MUI.">
        {Object.keys(md3).length} MD3 roles, {Object.keys(payBadges).length} payment states, the player accents, shifts, members, notes,
        radius, elevation, grid geometry, and the handheld's own block (<code>mobile</code>: {mobile.touchTarget}dp targets, bar heights,
        motion).
      </Box>
      <Arrow />
      <Box title="theme.ts · mobile-theme.ts" note="Same palette; the density inverts.">
        The tablet theme maps the roles onto MUI's palette, typography and component overrides (dense: 13px base, 34px controls,
        1.5px outlines). The handheld theme extends it with MD3's touch scale (16px body, 48dp targets).
      </Box>
      <Arrow />
      <Box title="Components" note={`${Object.keys(ICONS).length} icons in the registry.`}>
        Themed MUI ({muiNames.length} components in the product: {onTablet} on the tablet, {onHandheld} on the handheld, from the usage
        scan), and Birdie's own components on <code>ButtonBase</code> and <code>Box</code> where the density needs them.
      </Box>
      <Arrow />
      <Box title="src/pos · src/pos/mobile" note="The prototypes and Storybook import the same files.">
        The counter terminal's screens, and the handheld's. One state, one pricing, one set of data, so an order totals the same on
        either.
      </Box>
    </div>
  );
}

/* ------------------------------------------------------------ open decisions */

const failingTiles = Object.entries(CATALOG).filter(([, c]) => contrastRatio(c.tc, c.color) < 4.5);

/**
 * The open decisions the Design System pages have raised, each with its evidence computed and a
 * link to the page that explains it. Add a row when a page logs a new "Open:" decision.
 */
export function OpenDecisions() {
  // `to:` so scripts/check-doc-links.mjs checks every link here.
  const rows: { title: ReactNode; evidence: ReactNode; page: string; to: string }[] = [
    {
      title: 'White labels on green buttons',
      evidence: <>White on <code>md3.primary</code> is <Contrast fg="#ffffff" bg={md3.primary} label="Pay" /> at a 13–14px bold label; it passes only as large text. A deeper green fill or a larger label.</>,
      page: 'Button',
      to: 'components-actions-button--overview',
    },
    {
      title: 'Green used as text',
      evidence: <>Menu prices, "+ Add", "4/4 in", a selected toggle's label, the handheld's outlined buttons and list subheaders: <Contrast fg={md3.primary} bg="#ffffff" label="$18" />. <code>palette.primary.dark</code> is ready: <Contrast fg="#0f7a36" bg="#ffffff" label="$18" />.</>,
      page: 'Colors',
      to: 'foundations-colors--overview',
    },
    {
      title: 'outline as text',
      evidence: <>Hints, disabled text, tee-sheet times and the OPEN badge use <code>md3.outline</code>: <Contrast fg={md3.outline} bg="#ffffff" /> on white, just under AA.</>,
      page: 'Colors',
      to: 'foundations-colors--overview',
    },
    {
      title: 'Payment badges and chips under AA',
      evidence: <>PAID <Contrast fg={payBadges.paid.text} bg={payBadges.paid.bg} label="PAID" />, REFUNDED <Contrast fg={payBadges.refund.text} bg={payBadges.refund.bg} label="REF" />, a no-show chip's name <Contrast fg="#888888" bg="#e8ece8" />. Deepen the text, keep the fills.</>,
      page: 'Colors',
      to: 'foundations-colors--overview',
    },
    {
      title: 'Register category fills',
      evidence: <>{failingTiles.length} of {Object.keys(CATALOG).length} catalog fills fail with their white label ({failingTiles.map(([k]) => k.toLowerCase()).join(', ')}). Darken them, or compute the label colour when a club sets a fill in Buck.</>,
      page: 'Colors',
      to: 'foundations-colors--overview',
    },
    {
      title: 'No visible keyboard focus',
      evidence: <>The theme defines no focus-visible style, and <code>ButtonBase</code> removes the outline, so Birdie's own controls show no focus. Add one ring to the theme. (The Button page lists a focus ring in its anatomy; it isn't drawn today.)</>,
      page: 'Border',
      to: 'foundations-border--overview',
    },
    {
      title: 'Text field boundaries',
      evidence: <>A tablet field's only edge is the hairline, <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />. And the handheld's fields inherit that 1.5px outline from the tablet theme (<code>createTheme(theme, …)</code> deep-merges), not MD3's 1dp <code>outline</code>.</>,
      page: 'Border',
      to: 'foundations-border--overview',
    },
    {
      title: 'The amber family is not a token',
      evidence: <>Unsent, warning and reserved amber is <code>KITCHEN</code> on the handheld and typed literals across the tablet. Promote it to <code>tokens.ts</code>.</>,
      page: 'Colors',
      to: 'foundations-colors--overview',
    },
    {
      title: 'Tablet type sizes are inline',
      evidence: 'The tablet sets size in sx in half-pixel steps rather than theme variants; tabular figures only in the drawer, shift, time clock and inventory. Name the steps; use tabular figures wherever money stacks.',
      page: 'Typography',
      to: 'foundations-typography--overview',
    },
    {
      title: 'Three scrim strengths',
      evidence: '70% behind the reservation, 60% behind the court and bay panel, 50% behind the day summary, as literals. One modal scrim, as a token.',
      page: 'Effect Styles',
      to: 'foundations-effect-styles--overview',
    },
    {
      title: 'Corner and padding literals',
      evidence: "The stock badge is a pill where every other status tag is square; some corners and many tablet paddings are typed strings ('14px', '10px 12px'). Map them to the scales.",
      page: 'Radius',
      to: 'foundations-radius--overview',
    },
    {
      title: 'Two wordmarks, and a placeholder favicon',
      evidence: "The sidebar's tenfore-logo.svg and src/assets/images/tf-logo.svg use different greens; public/favicon.svg is the build tool's default mark. There is no brand guide in the repo.",
      page: 'Logos',
      to: 'foundations-logos--overview',
    },
    {
      title: 'Scraped, branded product photos',
      evidence: "The register's product photos came from screenshots and retailer galleries and show real packaging, which the regenerated menu photos were made to avoid. License, have clubs upload, or replace.",
      page: 'Images',
      to: 'foundations-images--overview',
    },
    {
      title: 'Two icon vocabularies',
      evidence: 'The tablet goes through the ligature registry and its test; the handheld imports icon components directly. Route both through the registry, or document the pairs.',
      page: 'Icons',
      to: 'foundations-icons--overview',
    },
  ];
  return (
    <DocTable
      columns={['Open decision', 'Evidence', 'Page']}
      widths={['22%', 'auto', 130]}
      rows={rows.map((r) => [
        <strong key="t" style={{ color: DOC.ink, fontWeight: 600 }}>{r.title}</strong>,
        r.evidence,
        <DocLink key="l" to={r.to}>
          {r.page}
        </DocLink>,
      ])}
    />
  );
}

/** Numbered cards in a grid that wraps cleanly past three (the kit's NumberedRow is one row). */
export function NumberedCards({ items }: { items: { title: ReactNode; body: ReactNode }[] }) {
  return (
    <Grid cols={3}>
      {items.map((it, i) => (
        <NavCard key={i} eyebrow={String(i + 1)} title={it.title}>
          {it.body}
        </NavCard>
      ))}
    </Grid>
  );
}
