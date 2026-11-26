import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Divider — a thin rule between things. Birdie's main use is the vertical rule between groups in a
 * toolbar, and the line above a total. Rows separate themselves with their own bottom border.
 */
const doc: DsDoc = {
  summary: (
    <>
      A thin rule between things that belong apart. In Birdie it has two real jobs: the <strong>vertical rule between groups in a
      toolbar</strong> (date controls | band selector) on seven tablet screens, and the <strong>line above a total</strong> in
      checkout and payment summaries. Rows in lists, tables and the tee sheet do not use it; they draw their own 1px bottom border.
      On the handheld it appears once, between three stats.
    </>
  ),
  statusNote: (
    <>
      MUI Divider in 10 tablet files (seven of them toolbars) and 1 handheld file. Themed to the outline-variant hairline. Most of
      Birdie’s separation is a <code>borderBottom</code> on the row itself, which is the right call for rows.
    </>
  ),
  mui: ['Divider'],
  useFor: [
    'Splitting a toolbar into groups: navigation on the left of the rule, view controls on the right.',
    'The line above a total in a summary (Checkout, the last-payment receipt on the rail).',
    'Between stats in a single bordered strip (the handheld golfer’s Handicap | Upcoming | Type).',
  ],
  dontUseFor: [
    'Between every row of a list or table: give the row a bottom border (it moves with the row, and hover covers it).',
    'Between sections of a handheld screen: use a section header and space.',
    'Between course columns on the tee sheet: those are 2px borders on the column.',
    'To label a group: use SectionLabel with `rule`, or the tee sheet’s band separator.',
  ],
  inBirdie: [
    {
      label: 'Toolbar groups, tee sheet',
      caption: (
        <>
          Between <strong>Today</strong> and the band selector: a vertical rule inset 10px top and bottom. The same rule splits the
          toolbars of Tables, Reservations, Orders & Tips, Table Chart, the court and bay sheets and the back office.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
    },
    {
      label: 'A labelled rule, register',
      caption: (
        <>
          "GOLF BALLS 27 items" with a hairline trailing to the edge: <code>SectionLabel</code>’s <code>rule</code>, in the
          category’s colour at 18%. A heading and a divider in one.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'Rows that bring their own line',
      caption: (
        <>
          Orders & Tips: the vertical rule in the toolbar is a Divider; the lines between payments are each row’s own bottom
          border. That is the pattern for every list and table.
        </>
      ),
      shot: 'tablet-orders-tips',
      tabletHash: '#/orders-tips',
    },
    {
      label: 'Between stats, handheld',
      caption: (
        <>
          The golfer page: Handicap | Upcoming | Type in one bordered strip, split by two full-height vertical dividers. The only
          Divider on the handheld.
        </>
      ),
      storyId: 'components-layout-structure-app-chrome--handheld-pushed-screen',
    },
  ],
  birdie: [
    { name: 'SectionLabel (rule)', file: 'src/pos/components/primitives.tsx', use: 'a small caps label with a hairline trailing to the edge, in the label’s colour.', surface: 'tablet' },
    { name: 'OpsToolbar', file: 'src/pos/components/operations/OpsToolbar.tsx', use: 'the back office’s toolbar: title, a vertical Divider, then its controls.', surface: 'tablet' },
    { name: 'Band separator', file: 'src/pos/components/TeeSheetGrid.tsx', use: 'a 28px labelled row between the tee sheet’s time bands.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Rule', description: '1px in outline-variant (#c0c9c1). On the dark multi-select bar, white at 18%.' },
    { part: 'Inset (vertical)', description: 'In toolbars, 10px off the top and bottom (my: 1.25) and 2px either side, so it reads as a pause, not a wall.' },
    { part: 'Spacing (horizontal)', description: '4–12px above and below, depending on the density of the summary it sits in.' },
  ],
  variants: [
    { name: 'Vertical, in a toolbar', use: 'Between groups of controls. One per toolbar, rarely two.', avoid: 'Between every button.' },
    { name: 'Horizontal, above a total', use: 'Separating line items from the figure they add up to.' },
    { name: 'Vertical, between stats', use: 'Three short figures in one strip (handheld).' },
    { name: 'Labelled (SectionLabel rule)', use: 'A group heading that also separates.', avoid: 'Divider with children: Birdie does not use MUI’s text-in-divider.' },
    { name: 'Inset / middle', use: 'Not used.' },
  ],
  states: [{ state: 'Default', tablet: 'Static. Dividers are never interactive.', handheld: 'Same.' }],
  sizing: [
    { surface: 'Tablet', size: '1px, inset 10px in a 56px toolbar.', why: 'Toolbars are dense; a full-height rule would read as two toolbars.' },
    { surface: 'Handheld', size: '1px, full height of its strip.', why: 'Used once, inside a bordered card.' },
  ],
  behavior: [
    'A divider separates groups that sit side by side or stack; a border belongs to the thing it outlines. If the line should move or highlight with a row, it is the row’s border.',
    'Heavier separation (between tee sheet courses) is a 2px border, not a thicker Divider.',
  ],
  dos: [
    'Use one vertical Divider to split a toolbar into "where" and "what".',
    'Give rows their own bottom border.',
    'Use SectionLabel’s rule when a group needs a name and a line.',
  ],
  donts: [
    'A Divider between list rows.',
    'Two rules in a row (a section border plus a Divider).',
    'Colour other than outline-variant, except on dark surfaces.',
  ],
  a11y: [
    'MUI Divider renders a separator that screen readers can announce. Keep dividers to real group boundaries, so the announcements mean something.',
    <>
      The rule is <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" label="—" /> against white. It is decorative (the
      grouping is also carried by spacing), so the 3:1 non-text rule does not apply.
    </>,
  ],
  decisions: [
    { decision: 'Rows carry their own border', why: 'A row’s line moves, hides and highlights with it. Dividers between rows double up with hover and selection outlines.' },
    { decision: 'One hairline colour', why: 'outline-variant everywhere (the theme sets it on MuiDivider), so a rule never competes with content.' },
  ],
  tokens: [{ token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The rule (MuiDivider’s borderColor)' }],
  engineering: {
    import: `import { Divider } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiDivider</code>: <code>borderColor: md3.outlineVariant</code>. The handheld theme inherits it.
      </>
    ),
    notes: [
      <>
        In a flex toolbar a vertical divider needs <code>flexItem</code>, or it has no height: <code>&lt;Divider orientation="vertical"
        flexItem sx={'{{ my: 1.25, mx: 0.25 }}'} /&gt;</code> is the exact line in six of the seven toolbars (Table Chart insets 12px).
      </>,
      <>For a row’s line, use <code>{'borderBottom: `1px solid ${md3.outlineVariant}`'}</code> on the row.</>,
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.75} sx={{ height: 56, px: 1.75 }}>
  <ToolbarButton icon="chevron_left" title="Previous day" onClick={prev} />
  {/* the date, with its popover */}
  <ToolbarButton label="Today" onClick={today} />
  <Divider orientation="vertical" flexItem sx={{ my: 1.25, mx: 0.25 }} />
  {/* the band selector */}
</Stack>`,
  },
  related: [
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Table', id: 'components-layout-structure-table' },
    { name: 'Border', id: 'foundations-border' },
    { name: 'Spacing', id: 'foundations-spacing' },
    { name: 'Paper', id: 'components-layout-structure-paper' },
  ],
};

export default doc;
