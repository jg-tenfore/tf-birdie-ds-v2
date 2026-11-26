import type { Meta, StoryObj } from '@storybook/react-vite';
import { useTheme } from '@mui/material/styles';
import { grid, md3, mobile, radius } from '../../theme/tokens';
import { Card, Group, Sheet, Table, mono } from './foundation-parts';

/**
 * Design System › Styles › Spacing.
 *
 * MUI's 8px unit (the theme leaves `spacing` at its default), in the steps each surface uses. The
 * px values are computed from `theme.spacing`, not typed. The write-up is
 * `src/showcase/ds-docs/content/foundations-spacing.tsx`.
 */

/** Steps, in theme units, and the surface that leans on each. */
const STEPS: { units: number; tablet?: string; handheld?: string }[] = [
  { units: 0.25, tablet: '2px nudges: badge offsets, hairline gaps' },
  { units: 0.5, tablet: 'Icon to label, badge padding, stacked lines', handheld: 'Icon to label' },
  { units: 0.75, tablet: 'Inline groups: icon · value · note (InfoRow)' },
  { units: 1, tablet: 'The default gap between controls in a row', handheld: 'Tight groups, chip rows' },
  { units: 1.25, tablet: 'Row and chip padding (10px)' },
  { units: 1.5, tablet: 'Card padding, gaps between cards', handheld: 'Gaps between cards on a list' },
  { units: 2, tablet: 'Panel padding, section gaps; a dialog body\'s top and bottom', handheld: 'Screen margin and list padding: the most-used step' },
  { units: 2.5, tablet: 'A dialog\'s side padding (ModalFrame: 16px × 20px)' },
  { units: 3, tablet: 'Side padding of a FilledButton', handheld: 'Headers and text set in from the edge; a list item\'s end padding' },
  { units: 4, tablet: 'Large empty-state margins' },
];

function SpacingSheet() {
  const t = useTheme();
  return (
    <Sheet>
      <Group title={`The unit: theme.spacing(1) = ${t.spacing(1)}`} intro="Spacing is written in theme units (p: 1.5, gap: 0.75). The tablet works in fine steps between 4 and 18px, ported from the prototype as drawn; the handheld keeps to MD3's 8px grid with 4px half-steps.">
        <Table
          head={['Units', 'px', '', 'Tablet', 'Handheld']}
          widths={[64, 64, 180, 'auto', 'auto']}
          rows={STEPS.map((s) => [
            <span key="u" style={{ fontFamily: mono, fontSize: 12 }}>{s.units}</span>,
            <span key="p" style={{ fontFamily: mono, fontSize: 12 }}>{t.spacing(s.units)}</span>,
            <span key="b" style={{ display: 'block', height: 14, width: t.spacing(s.units), background: md3.primary, borderRadius: 2 }} />,
            <span key="t" style={{ fontSize: 12.5, color: s.tablet ? md3.onSurface : md3.outline }}>{s.tablet ?? '—'}</span>,
            <span key="h" style={{ fontSize: 12.5, color: s.handheld ? md3.onSurface : md3.outline }}>{s.handheld ?? '—'}</span>,
          ])}
        />
      </Group>
    </Sheet>
  );
}

/** The same list row at each surface's density. */
function DensitySheet() {
  const t = useTheme();
  const row = (dense: boolean, name: string, meta: string, amount: string) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: dense ? t.spacing(1) : t.spacing(2),
        minHeight: dense ? 38 : mobile.listItem.two,
        padding: dense ? `${t.spacing(0.75)} ${t.spacing(1.25)}` : `${t.spacing(1)} ${t.spacing(3)} ${t.spacing(1)} ${t.spacing(2)}`,
        borderTop: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <span style={{ width: dense ? 26 : 40, height: dense ? 26 : 40, borderRadius: '50%', background: md3.primary, color: '#fff', fontSize: dense ? 10 : 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>FA</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: dense ? 13 : 16, fontWeight: dense ? 700 : 500 }}>{name}</span>
        <span style={{ display: 'block', fontSize: dense ? 11.5 : 14, color: md3.onSurfaceVariant }}>{meta}</span>
      </span>
      <span style={{ fontSize: dense ? 13 : 16, fontWeight: 700 }}>{amount}</span>
    </div>
  );
  return (
    <Sheet>
      <Group title="One row, two densities" intro={`The tablet row is 38px tall (MuiListItemButton) with 6px × 10px padding and 8px gaps; the handheld row is MD3's two-line item, ${mobile.listItem.two}dp, with 16dp start and 24dp end padding. Same content, sized for a mouse and for a thumb.`}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Card style={{ width: 380 }}>
            <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 800, letterSpacing: '.5px', textTransform: 'uppercase', color: md3.onSurfaceVariant }}>Tablet</div>
            {row(true, 'Foster, A.', '6:08 AM · Front 9 · 3P', '$215.64')}
            {row(true, 'Reed, M.', '6:08 AM · Front 9 · 2P', '$108.00')}
          </Card>
          <Card style={{ width: 360, borderRadius: radius.lg }}>
            <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 500, color: md3.onSurfaceVariant }}>Handheld</div>
            {row(false, 'Foster, A.', '6:08 AM · Front 9 · 3P', '$215.64')}
            {row(false, 'Reed, M.', '6:08 AM · Front 9 · 2P', '$108.00')}
          </Card>
        </div>
      </Group>
      <Group title="Fixed geometry" intro="A few measures are tokens rather than spacing, because layouts depend on them: the tee-sheet grid (grid in tokens.ts) and the handheld chrome (mobile in tokens.ts).">
        <Table
          head={['Token', 'Value', 'What it sizes']}
          rows={[
            ['grid.rowH / rowHCompact', `${grid.rowH} / ${grid.rowHCompact}px`, 'A tee-sheet time row, comfortable and compact'],
            ['grid.timeGutterW', `${grid.timeGutterW}px`, 'The time column on the left of the grid'],
            ['grid.topbarH', `${grid.topbarH}px`, "The tablet's top bar"],
            ['grid.leftPanelW', `${grid.leftPanelW}px`, 'The order rail'],
            ['mobile.topAppBarH / navBarH', `${mobile.topAppBarH} / ${mobile.navBarH}dp`, "The handheld's top app bar and navigation bar"],
            ['mobile.touchTarget', `${mobile.touchTarget}dp`, 'The handheld minimum target'],
            ['mobile.listItem', `${mobile.listItem.one} / ${mobile.listItem.two} / ${mobile.listItem.three}dp`, 'One-, two- and three-line list items'],
          ].map((r) => [<span key="t" style={{ fontFamily: mono, fontSize: 12 }}>{r[0]}</span>, r[1], r[2]])}
        />
      </Group>
    </Sheet>
  );
}

const meta = {
  title: 'Design System/Styles/Spacing',
  id: 'foundations-spacing',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Spacing_: Story = {
  name: 'Spacing',
  render: () => <SpacingSheet />,
  parameters: { docs: { description: { story: 'The steps in use, in theme units and px, and which surface leans on each.' } } },
};

export const Densities: Story = {
  name: 'Densities and fixed geometry',
  render: () => <DensitySheet />,
  parameters: { docs: { description: { story: 'The same row at tablet and handheld density, and the measures that are tokens.' } } },
};
