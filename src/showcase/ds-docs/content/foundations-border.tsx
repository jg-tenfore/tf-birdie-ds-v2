import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import { ArtNote, Hex } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Border — the 1.5px outline rule, the 1px rule between things, and the few lines that mean
 * something (selected, owed, whose, danger). Reference sheet: src/showcase/foundations/Border.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-border',
  summary: (
    <>
      On the counter terminal, <strong>everything you can touch has a 1.5px outline</strong> in <code>outlineVariant</code>, and
      things are divided by a <strong>1px rule</strong> in the same colour. That one hairline does most of Birdie's structure, so
      shadows can stay rare. A line changes colour or weight only when it means something: green for selected or still owed, a
      dark outline for the selected booking, a coloured left edge for whose row it is, red for danger. The handheld's outlined
      buttons and cards use MD3's 1dp lines.
      <ArtNote>Banner: the crisp edges of a green, a bunker and a row of white stakes.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: <>A foundation. The tablet theme sets 1.5px outlines on every outlined MUI component; Birdie's own components repeat it.</>,
  useFor: [
    <>The outline of a card, chip, input, outlined button, tile, menu or popover: <code>1.5px solid md3.outlineVariant</code>.</>,
    <>A rule between rows or sections: <code>1px solid md3.outlineVariant</code>, on one side only.</>,
    'A meaning: selected (primary), the selected booking (a dark outline), multi-select (blue), whose row (an accent on the left), danger (error).',
  ],
  dontUseFor: [
    'Boxing everything. If space or a fill already separates two things, leave the line out.',
    'Decoration in a colour. A coloured line always means something here.',
    'Showing selection with a heavier border that shifts the layout. Use an outline (it sits outside the box) or a fill.',
  ],
  inBirdie: [
    {
      label: 'The tee sheet, tablet',
      caption: (
        <>
          1px rules divide the time rows and slots; an unpaid chip is white with a 1.5px green outline, which is how the grid says
          "still owes" at a glance.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
      storyId: 'components-layout-structure-tee-sheet--multi-select',
    },
    {
      label: 'A reservation, tablet',
      caption: (
        <>
          Each player row carries its accent as a 4px left edge. The Delete button is outlined in red; Close and Move are the
          neutral 1.5px outline.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'The tee sheet, handheld',
      caption: (
        <>
          MD3's 1px outlines on chips and the date field, and booking cards outlined with a payment-coloured left edge: green
          paid, grey open.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-global-nav-navigation--interactive',
    },
  ],
  variants: [
    { name: 'Outline · 1.5px outlineVariant', use: 'Around anything you can touch on the tablet: cards, chips, inputs, outlined buttons, tiles, menus.', avoid: 'Between rows.' },
    { name: 'Rule · 1px outlineVariant', use: "Between things: list rows, a dialog's header and footer, panel edges. MuiDivider is this colour.", avoid: 'Around a control.' },
    { name: 'Selected · 1.5px primary', use: 'A selected toggle or chip (with primaryContainer fill); the unpaid tee-sheet chip.', avoid: 'Focus. Focus needs its own ring.' },
    { name: 'The selected booking · 2.5px onSurface outline', use: 'The one booking open in the panel, on the grid. An outline with a 1px offset, so the chip doesn\'t move.', avoid: '—' },
    { name: 'Multi-select · 3px blue outline + ring', use: 'Bookings picked to move or cancel together. Blue, so it can\'t be read as paid.', avoid: 'Single selection.' },
    { name: 'Dashed · 1.5px', use: 'A place to add something: an empty player slot, the order rail\'s Add items. The handheld\'s open tee times are 1px dashed.', avoid: 'Anything already there.' },
    { name: 'Accent edge · 3–4px left', use: "Whose row: a player's accent on player rows; green on the golf summary and a loaded booking; a stat's colour in the day summary.", avoid: 'Status. Status is a fill or a badge.' },
    { name: 'Danger · 2px error', use: 'An alert that must not be missed: an allergy on a dish.', avoid: 'Validation errors, which use the field\'s own error state.' },
  ],
  states: [
    { state: 'Rest', tablet: <>1.5px <Hex c={md3.outlineVariant} /></>, handheld: <>Outlined buttons 1dp <Hex c={md3.outline} /> (MD3). Text fields inherit the tablet's 1.5px <code>outlineVariant</code> (see Decisions).</> },
    { state: 'Hover', tablet: <>Inputs darken to <code>outline</code>; outlined buttons add a <code>surfaceContainer</code> wash, the line stays.</>, handheld: 'No hover.' },
    { state: 'Focused input', tablet: <><code>primary</code>, still 1.5px (theme.ts keeps the width on focus, where MUI would thicken it).</>, handheld: 'The same 1.5px, inherited.' },
    { state: 'Selected', tablet: <><code>primary</code> outline with a <code>primaryContainer</code> fill.</>, handheld: 'Same on chips; the nav bar uses a fill only.' },
    { state: 'Error', tablet: <><code>error</code>, on the field's own outline.</>, handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '1.5px outlines, 1px rules; 2.5–3px for selection', why: "The prototype drew 1.5px outlines, not MUI's 1px. At a counter's viewing distance 1px goes grey and soft; 1.5px holds the shape." },
    { surface: 'Handheld', size: '1dp outlines and rules (buttons, cards, chips); text fields 1.5px, inherited', why: "MD3's spec. At phone distance and pixel density, 1dp is crisp. The fields are the exception by accident, not by choice." },
  ],
  behavior: [
    '1.5px around, 1px between: a card has an outline, the rows inside it have rules.',
    'Selection is drawn with outline, not border, so it never shifts the layout by a pixel.',
    'A line\'s colour changes only with state; its width stays the same between rest and focus on the tablet.',
  ],
  dos: [
    'Use the theme\'s outlined variants (they carry 1.5px) before drawing your own line.',
    'Put a rule on one side only (borderBottom), not a box around each row.',
    'Use the accent edge for "whose", with the accent from playerAccents.',
  ],
  donts: [
    "MUI's default 1px outline on the tablet.",
    'Two lines meeting: a card\'s outline and its first row\'s rule both drawn on the same edge.',
    'Colour a border for decoration.',
  ],
  a11y: [
    <>
      The hairline is <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" /> against white. That's fine for a card or a chip,
      which has a fill and content too, but WCAG asks 3:1 for the boundary of an input you must locate, and a tablet text field has
      no other. The hover colour <code>outline</code> passes (<Contrast fg={md3.outline} bg="#ffffff" size="non-text" />).
    </>,
    <>
      <strong>Focus has no line of its own.</strong> The theme defines no focus-visible style, and <code>ButtonBase</code> removes the
      browser outline, so keyboard focus on Birdie's own controls (FilledButton, ToolbarButton, tiles, chips on ButtonBase) is
      invisible. MUI's Button shows only a ripple.
    </>,
    'The selected and multi-selected outlines are 2.5px and 3px with an offset, well above 3:1 against both a green chip and the grid.',
  ],
  decisions: [
    { decision: '1.5px, not 1px', why: "Ported from the prototype, which drew 1.5px on .lv-card, .lv-chip and inputs. theme.ts overrides MUI's 1px on every outlined component so stock MUI matches." },
    { decision: 'Neutral outlines, brand colour for state', why: "theme.ts's outlined button is outlineVariant on grey, not brand-tinted: green is kept for the active state, so a green line always means selected or owed." },
    { decision: 'Outlines over shadows', why: 'Cards are white on the surface ground with a hairline; elevation is saved for what floats (see Effect Styles).' },
    { decision: 'Open: handheld fields inherit the tablet outline', why: <>Set the notched outline in <code>mobile-theme.ts</code> to 1px <code>md3.outline</code> (MD3's outlined field), which also passes 3:1, or decide the 1.5px is wanted on both and say so in the theme.</> },
    { decision: 'Open: input boundaries', why: <>Move text-field outlines to <code>outline</code> (4.5:1) at rest, or keep <code>outlineVariant</code> and add a fill, so a field can be found without hovering.</> },
    { decision: 'Open: a focus ring', why: <>Add one focus-visible style to the theme (a 2px <code>primary</code> outline with a 2px offset) and apply it to <code>MuiButtonBase</code>, so every Birdie control shows keyboard focus.</> },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: <Hex c={md3.outlineVariant} />, role: 'Every outline and rule' },
    { token: 'md3.outline', value: <Hex c={md3.outline} />, role: 'Input hover on the tablet; outlines on the handheld' },
    { token: 'md3.primary', value: <Hex c={md3.primary} />, role: 'Selected, focused, unpaid chip' },
    { token: 'md3.onSurface', value: <Hex c={md3.onSurface} />, role: 'The selected booking\'s outline' },
    { token: 'playerAccents[i]', value: 'ramp', role: 'The accent edge on a player\'s row' },
    { token: 'md3.error', value: <Hex c={md3.error} />, role: 'Danger lines, error fields' },
  ],
  engineering: {
    import: `import { md3 } from '../../theme/tokens';`,
    themeOverride: (
      <>
        <code>theme.ts</code> sets <code>borderWidth: 1.5</code> and <code>md3.outlineVariant</code> on <code>MuiButton</code> (outlined),{' '}
        <code>MuiToggleButton</code>, <code>MuiChip</code> (outlined), <code>MuiOutlinedInput</code> (and keeps 1.5 when focused),{' '}
        <code>MuiCard</code> and <code>MuiMenu</code>; <code>MuiDivider</code> and <code>MuiTableCell</code> use the colour at 1px.{' '}
        <code>mobile-theme.ts</code> puts the handheld's outlined button back to 1px <code>md3.outline</code>, but it is built with{' '}
        <code>createTheme(theme, …)</code>, which deep-merges: its <code>MuiOutlinedInput</code> override only changes the corner and
        font size, so handheld text fields keep the tablet's 1.5px <code>outlineVariant</code> outline.
      </>
    ),
    notes: [
      <>The tee sheet's selection outlines are in <code>BookingChip</code> (<code>src/pos/components/TeeSheetGrid.tsx</code>).</>,
      <>In <code>sx</code>, <code>border: 1</code> means 1px; write the full string with the token for 1.5px.</>,
    ],
    snippet: `<Box sx={{ border: \`1.5px solid \${md3.outlineVariant}\`, borderRadius: \`\${radius.md}px\` }}>
  {rows.map((r) => (
    <Box key={r.id} sx={{ borderBottom: \`1px solid \${md3.outlineVariant}\`, '&:last-child': { borderBottom: 0 } }}>…</Box>
  ))}
</Box>`,
  },
  related: [
    { name: 'Colors', id: 'foundations-colors' },
    { name: 'Radius', id: 'foundations-radius' },
    { name: 'Effect Styles', id: 'foundations-effect-styles' },
    { name: 'Divider', id: 'components-layout-structure-divider' },
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Tee Sheet', id: 'components-layout-structure-tee-sheet' },
  ],
};

export default doc;
