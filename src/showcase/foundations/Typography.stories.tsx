import type { ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeProvider, Typography } from '@mui/material';
import type { Theme, TypographyVariant } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import { mobileTheme } from '../../theme/mobile-theme';
import { md3 } from '../../theme/tokens';
import { InfoRow, PayBadge, SectionLabel } from '../../pos/components/primitives';
import { MINUS, deltaMoney, money, moneyShort } from '../../pos/logic/cart';
import { formatTimeLabel } from '../../pos/data/courses';
import { Card, Group, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Typography.
 *
 * Two ramps from two themes: the counter terminal's (`theme.ts`, a 13px base) and the handheld's
 * (`mobile-theme.ts`, MD3's type scale). Sizes and weights are read from the theme objects, not
 * restated. The write-up is `src/showcase/ds-docs/content/foundations-typography.tsx`.
 */

const VARIANTS: TypographyVariant[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'subtitle1', 'subtitle2', 'body1', 'body2', 'button', 'caption', 'overline'];

/** The MD3 role each handheld variant stands for (from mobile-theme.ts's header). */
const MD3_ROLE: Partial<Record<TypographyVariant, string>> = {
  h1: 'display small',
  h2: 'headline large',
  h3: 'headline medium',
  h4: 'headline small',
  h5: 'title large',
  h6: 'title medium',
  subtitle1: 'title medium',
  subtitle2: 'title small',
  body1: 'body large',
  body2: 'body medium',
  caption: 'body small',
  overline: 'label medium',
  button: 'label large',
};

const px = (v: unknown) => (typeof v === 'number' ? `${v}px` : String(v ?? '—'));

function Ramp({ t, label, sample }: { t: Theme; label: string; sample: string }) {
  return (
    <ThemeProvider theme={t}>
      <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: md3.onSurfaceVariant }}>{label}</div>
        {VARIANTS.map((v) => {
          const s = t.typography[v] as { fontSize?: number | string; fontWeight?: number | string };
          return (
            <div key={v} style={{ display: 'grid', gridTemplateColumns: '92px 1fr', alignItems: 'baseline', gap: 10, borderTop: `1px solid ${md3.surfaceHigh}`, paddingTop: 6 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant, lineHeight: '15px' }}>
                {v}
                <br />
                {px(s.fontSize)} · {String(s.fontWeight ?? 400)}
                {t === mobileTheme && MD3_ROLE[v] ? (
                  <>
                    <br />
                    {MD3_ROLE[v]}
                  </>
                ) : null}
              </span>
              <Typography variant={v} sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sample}
              </Typography>
            </div>
          );
        })}
      </Card>
    </ThemeProvider>
  );
}

function TwoRamps() {
  return (
    <Sheet>
      <Group
        title="The theme ramps"
        intro="The same variant names, two densities. On the tablet the ramp is a 13px base for a mouse at a counter; on the handheld it is MD3's touch scale with a 16px body. Roboto renders on both (Google Sans is first in the stack, where a machine has it)."
      >
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          <Ramp t={theme} label="Tablet · theme.ts" sample="Check in & pay · $154.98" />
          <Ramp t={mobileTheme} label="Handheld · mobile-theme.ts" sample="Check in & pay · $154.98" />
        </div>
      </Group>
    </Sheet>
  );
}

/** The sizes the tablet's components set inline, each with the real thing at that size. */
function TabletSizes() {
  const row = (size: string, sample: ReactNode, where: string) => [
    <span key="s" style={{ fontFamily: mono, fontSize: 12 }}>{size}</span>,
    <div key="x" style={{ minWidth: 0 }}>{sample}</div>,
    <span key="w" style={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>{where}</span>,
  ];
  return (
    <Sheet>
      <Group
        title="What the tablet actually sets"
        intro="Most tablet components set their size in sx rather than through a variant, in half-pixel steps between 9 and 15px. These are the steps in use and a real component at each."
      >
        <Table
          head={['Size', 'Sample', 'Where']}
          widths={[90, '44%', 'auto']}
          rows={[
            row('9px · 800', <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.3px', textTransform: 'uppercase' }}>Reed, M. · 2P · 18H</span>, 'Tee-sheet chips: the name and the load line (7.5–8px for the status word). The smallest text in Birdie'),
            row('9–10px · 800', <span style={{ display: 'flex', gap: 6 }}><PayBadge pay="paid" size="sm" /><PayBadge pay="open" /></span>, 'PayBadge: 9px small, 10px default'),
            row('11px · 800 caps', <SectionLabel>Players · 3/3 checked in</SectionLabel>, 'SectionLabel (variant overline): the label over almost every group; table headers'),
            row('12px · 600', <InfoRow icon="schedule" note="Front 9">6:08 AM</InfoRow>, 'InfoRow, table cells (MuiTableCell), chips (MuiChip), secondary lines'),
            row('12.5–13px · 400–700', <span style={{ fontSize: 13 }}>Weekday Senior Resident <strong>$54.00</strong></span>, 'Body text, buttons, inputs, menu items: the theme base (13px)'),
            row('14–15px · 700', <span style={{ fontSize: 15, fontWeight: 700 }}>Foster, A.</span>, "Names in rows, card titles, the order rail's Pay (15px)"),
            row('17–18px · 800', <span style={{ fontSize: 18, fontWeight: 800 }}>Foster, A.</span>, 'Dialog titles (ModalFrame, 17px), the reservation panel name (18px)'),
            row('20–22px · 800', <span style={{ fontSize: 22, fontWeight: 800 }}>Customers</span>, 'Screen headings in the back office (Settings 20px; Customers, Events, Order Lookup 22px), stat values'),
            row('24–30px · 800', <span style={{ fontSize: 28, fontWeight: 800 }}>{money(154.98)}</span>, 'Amount readouts: checkout (28px), the cash pad (26px), a payout (30px); the sign-in facility name (26px)'),
          ]}
        />
      </Group>
    </Sheet>
  );
}

const AMOUNTS = [6632, 54, -12.5, 1212.5, 0.5];

function Numerals() {
  return (
    <Sheet>
      <Group
        title="Money"
        intro="Every amount goes through money() in src/pos/logic/cart.ts: a dollar sign, thousands separators, two decimals, and a true minus (U+2212), the same width as a plus, so signed columns line up."
      >
        <Table
          head={['Formatter', 'Input', 'Output', 'Use']}
          rows={[
            ['money', '6632', money(6632), 'Every price, total and balance'],
            ['money', '-12.5', money(-12.5), `Negatives take ${MINUS} (U+2212), never a hyphen`],
            ['moneyShort', '45', moneyShort(45), 'Compact labels that have always shown whole dollars: quick tenders, list balances'],
            ['deltaMoney', '20 / -3 / 0', `${deltaMoney(20)} · ${deltaMoney(-3)} · ${deltaMoney(0)}`, 'A price difference: modifiers, rate choices. Zero reads Free'],
          ].map((r) => r.map((c, i) => (i < 3 ? <span key={i} style={{ fontFamily: i === 2 ? undefined : mono, fontSize: i === 2 ? 14 : 12, fontWeight: i === 2 ? 700 : 400 }}>{c}</span> : c)))}
        />
      </Group>
      <Group
        title="Numerals in columns"
        intro="Roboto's default figures are proportional. Where amounts stack in a column (the drawer count, a shift, inventory) the product sets font-variant-numeric: tabular-nums so the decimal points align. Prices inside running text keep the default."
      >
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {(['proportional-nums', 'tabular-nums'] as const).map((v) => (
            <Card key={v} style={{ padding: 14, width: 220 }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: md3.onSurfaceVariant, marginBottom: 6 }}>{v}</div>
              {AMOUNTS.map((a) => (
                <div key={a} style={{ textAlign: 'right', fontSize: 15, fontWeight: 700, fontVariantNumeric: v }}>
                  {money(a)}
                </div>
              ))}
            </Card>
          ))}
        </div>
      </Group>
      <Group title="Times" intro="Tee times and timestamps are 12-hour with a space before AM or PM, from formatTimeLabel in src/pos/data/courses.ts.">
        <div style={{ display: 'flex', gap: 18, fontSize: 15, fontWeight: 700 }}>
          {[360, 368, 720, 838].map((m) => (
            <span key={m}>{formatTimeLabel(m)}</span>
          ))}
        </div>
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Typography',
  id: 'foundations-typography',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Typography_: Story = {
  name: 'Typography',
  render: () => <TwoRamps />,
  parameters: { docs: { description: { story: 'Both theme ramps side by side, each rendered in its own theme. Sizes and weights are read from the theme.' } } },
};

export const TabletSizesInUse: Story = {
  name: 'Tablet sizes in use',
  render: () => <TabletSizes />,
  parameters: { docs: { description: { story: "The tablet's components mostly set size inline. The steps in use, with a real Birdie component at each." } } },
};

export const MoneyAndTime: Story = {
  name: 'Money, numerals and time',
  render: () => <Numerals />,
  parameters: { docs: { description: { story: 'The formatters every amount and time goes through, and tabular figures for columns.' } } },
};
