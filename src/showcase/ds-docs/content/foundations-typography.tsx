import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Typography — the two ramps (tablet theme.ts, handheld mobile-theme.ts), the sizes the tablet
 * actually sets, weights, and how money and times are written. Reference sheets:
 * src/showcase/foundations/Typography.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-typography',
  summary: (
    <>
      One typeface, Roboto, at <strong>two densities</strong>. The counter terminal reads at arm's length with a mouse, so its
      text is small and heavy: a 13px base, 11px capital labels over every group, names at 700 to 800. The handheld follows
      Material Design 3's type scale for a thumb: a 16px body, 22px titles, 500 weight. Money and times are written one way
      everywhere, by shared formatters.
      <ArtNote>Banner: baseline, x-height and cap-height guides in three sizes, with the parts of glyphs resting on them.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      A foundation for both surfaces. The handheld uses the theme's variants (<code>variant="body2"</code>); the tablet mostly sets
      size and weight inline, which is the main thing to tidy.
    </>
  ),
  useFor: [
    <>The handheld: always a variant (<code>body1</code>, <code>subtitle2</code>, <code>caption</code>…), mapped to MD3 roles in <code>mobile-theme.ts</code>.</>,
    <>The tablet: <code>SectionLabel</code> for group labels, the theme base (13px) for body, and the size steps on the reference below.</>,
    <>Every amount through <code>money()</code>, every time through <code>formatTimeLabel()</code>.</>,
  ],
  dontUseFor: [
    'Sizes between the steps (a 12.25px label). Pick the nearest step.',
    'All-caps for anything longer than a label or a status word.',
    <>Hand-rolled money (<code>`$${'{'}n.toFixed(2){'}'}`</code>): it drops the thousands separator and the true minus.</>,
    'A second typeface, or the TenFore wordmark as a heading.',
  ],
  inBirdie: [
    {
      label: 'A reservation, tablet',
      caption: (
        <>
          Density in one panel: the name at 18px 800, the 11px tracked label PLAYERS · 3/3 CHECKED IN, 13px rows, italic rate names
          with bold amounts, and the total at 18px 800 with "before tax" smaller beside it.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'A tab, handheld',
      caption: (
        <>
          MD3's scale: a 22px title, 16px dish names, 14px secondary lines, and amounts right-aligned at the same size as the
          names. Status words stay sentence case ("Not sent", "Sent 11:51 AM").
        </>
      ),
      shot: 'mobile-tab',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
    {
      label: 'The tee sheet, tablet',
      caption: (
        <>
          The smallest text in Birdie: chip names at 9px 800 in capitals, so a foursome's name and load fit in a 46px row. Times
          in the gutter are 10px; course headers are 14px 700.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
    },
  ],
  birdie: [
    { name: 'SectionLabel', file: 'src/pos/components/primitives.tsx', use: 'the 11px, 800, tracked capital label over a group. Optionally trails a hairline.', surface: 'tablet' },
    { name: 'InfoRow', file: 'src/pos/components/primitives.tsx', use: 'icon · value · note at 12px, the booking detail row.', surface: 'tablet' },
    { name: 'money · moneyShort · deltaMoney', file: 'src/pos/logic/cart.ts', use: 'every amount: $6,632.00, −$12.50, +$20.00, Free.', surface: 'both' },
    { name: 'formatTimeLabel', file: 'src/pos/data/courses.ts', use: 'every tee time and timestamp: 6:08 AM.', surface: 'both' },
  ],
  variants: [
    { name: 'Overline · section label', use: 'Tablet: 11px, 800, 0.6px tracking, capitals (PLAYERS · 3/3 CHECKED IN). Handheld: label medium, 12px 500, sentence case.', avoid: 'Anything a person reads as a sentence.' },
    { name: 'Body · 13px tablet / 16px handheld', use: 'Rows, descriptions, field values: the default.', avoid: '—' },
    { name: 'Secondary · 12px / 14px', use: <>Supporting lines under a name, in <code>onSurfaceVariant</code>.</>, avoid: <>Lighter colours than <code>onSurfaceVariant</code> for text you must read.</> },
    { name: 'Titles · 17–22px tablet / 22–24px handheld', use: 'Dialog titles (17px), panel names (18px), back-office screen headings (20–22px). Handheld: the top app bar title (22px).', avoid: 'More than one title size on a screen.' },
    { name: 'Readouts · 24–30px, 800', use: 'An amount the operator must confirm: checkout total, the cash pad, a payout, expected cash.', avoid: 'Labels. Big is for the number.' },
    { name: 'Chip text · 9–10px, 800, capitals', use: 'Tee-sheet chips and PayBadge, where the grid sets the room.', avoid: 'Anywhere with room for 11px. It is the floor, not a style.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '9–30px; body 13px (theme base); labels 11px; weights 600–800', why: 'Arm\'s length, mouse-first, dense. The tee sheet and the order rail have to be readable side by side at 1280×800.' },
    { surface: 'Handheld', size: '12–24px (MD3); body 16px; weights 400–500, with 600–700 for emphasis', why: 'Held close, read in sun, touched. MD3\'s scale is tuned for that; the handheld uses its variants as given.' },
  ],
  behavior: [
    'Weight carries hierarchy on the tablet (800 for names and labels, 600 for values, 400 for notes); size carries it on the handheld.',
    'Long names truncate with an ellipsis and keep their full text in a tooltip or the detail view. Amounts never truncate.',
    'Amounts are right-aligned in lists and totals. Columns of amounts use tabular figures (font-variant-numeric: tabular-nums).',
  ],
  content: [
    'Sentence case for labels, buttons, titles and status words in running text. Capitals only for the tablet\'s section labels, table headers, badges and chip text.',
    'Money: $6,632.00, with a dollar sign, thousands separator and two decimals; negatives take a true minus (−$12.50), not a hyphen or parentheses. moneyShort drops .00 only on compact labels that always showed whole dollars.',
    'Differences are signed (+$20.00, −$3.00), and zero reads Free.',
    'Times: 6:08 AM, 12-hour with a space before AM or PM. Dates: Thu, May 21, 2026 in headers; Thursday, May 21 in sentences.',
    'Counts with their noun: 3/3 checked in, 2 items, 8 guests. Never a bare number on its own.',
  ],
  dos: [
    'Use SectionLabel for a group label on the tablet; it carries the size, weight, tracking and colour.',
    'Put the amount in a money button\'s label, formatted by money().',
    'Use tabular figures where amounts stack in a column.',
    'On the handheld, use a variant; don\'t set fontSize.',
  ],
  donts: [
    'Text-transform on buttons. The theme turns it off; keep it off.',
    'Half-pixel sizes that aren\'t on the reference.',
    'Grey text lighter than onSurfaceVariant for anything that matters.',
    'Mix figures: a total in proportional figures over a column in tabular ones.',
  ],
  a11y: [
    <>
      Text colours: <code>onSurface</code> <Contrast fg={md3.onSurface} bg="#ffffff" /> and <code>onSurfaceVariant</code>{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" /> pass at any size. <code>outline</code>, used for hints and disabled text, is{' '}
      <Contrast fg={md3.outline} bg="#ffffff" />. See Colors for every pair.
    </>,
    'Size: 9px chip text is below what WCAG assumes for comfortable reading. It is the tee sheet\'s trade-off for fitting a foursome in a row; the same booking opens at 13–18px in the panel. Don\'t use 9–10px anywhere with room for more.',
    'The tablet sets sizes in px, so browser zoom scales them but a user\'s base font setting does not. The handheld theme is also px. Open: move to rem if Birdie ever runs in a browser people configure.',
    'Headings are real headings where it matters (component="h1" on sign-in\'s facility, h2 on back-office screens), so a screen reader can jump between them.',
  ],
  decisions: [
    { decision: 'A 13px base on the tablet', why: 'Most of the prototype\'s chrome was 12–13px. With fontSize: 13 in the theme, "1rem" in a component lands on the design\'s default (theme.ts).' },
    { decision: "MD3's scale on the handheld, unchanged", why: 'The terminal\'s density rules are exactly wrong on a phone (tokens.ts says so). mobile-theme.ts maps MUI\'s variant names onto MD3 roles instead.' },
    { decision: 'Roboto renders; Google Sans is asked for first', why: 'Google Sans isn\'t redistributable. Roboto ships with the app (@fontsource-variable/roboto) and is what every screenshot shows; machines with Google Sans get the prototype\'s look.' },
    { decision: 'One money formatter', why: 'A total must read the same in the row, the panel, the register, checkout and the reader. money() in cart.ts is the only way an amount reaches the screen.' },
    { decision: 'A true minus', why: 'U+2212 is the width of a plus, so signed amounts line up in a column, on both surfaces.' },
    { decision: 'Open: name the tablet steps', why: 'The tablet\'s components set size inline in half-pixel steps (10.5, 11.5, 12.5, 13.5px are all common). Map them onto theme variants or a small size token set so a screen can\'t invent a new one.' },
    { decision: 'Open: tabular figures everywhere money stacks', why: 'Only the shift, drawer, time clock and inventory set tabular-nums today. The cart, the order rail and checkout totals should too.' },
  ],
  tokens: [
    { token: 'fontFamily', value: 'Google Sans, Roboto…', role: 'The stack (tokens.ts); Roboto is what renders' },
    { token: 'theme.typography.fontSize', value: '13', role: 'Tablet base: 1rem in a component = 13px' },
    { token: 'theme.typography.overline', value: '11px · 800 · .6px · caps', role: 'SectionLabel, the tablet\'s group label' },
    { token: 'theme.typography.button', value: '13px · 600 · none', role: 'Tablet button labels, no text-transform' },
    { token: 'mobileTheme.typography.body1 / body2', value: '16px / 14px', role: 'Handheld body large / body medium' },
    { token: 'mobileTheme.typography.h5', value: '22px · 400', role: 'Handheld title large: the top app bar' },
  ],
  engineering: {
    import: `import { Typography } from '@mui/material';
import { SectionLabel, InfoRow } from '../components/primitives';
import { money, deltaMoney } from '../logic/cart';
import { formatTimeLabel } from '../data/courses';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → typography</code>: the tablet ramp (h1 22px … caption 11px, overline 11px 800 caps, button 13px
        600 with no text-transform). <code>src/theme/mobile-theme.ts → typography</code> replaces it with MD3's scale, and the
        component overrides (inputs at 16px, menu items at 16px) follow.
      </>
    ),
    notes: [
      <>
        The tablet's components mostly write <code>sx={'{{'} fontSize: 12.5, fontWeight: 700 {'}}'}</code> rather than a variant, so
        changing the theme ramp moves little on the tablet. The handheld uses variants throughout.
      </>,
      <>
        Tests find amounts by their formatted text (<code>'$154.98'</code>). Change the formatter and you change the tests, on
        purpose.
      </>,
      <>Editable amount fields are the exception to <code>money()</code>: they hold the plain number the operator types.</>,
    ],
    snippet: `<SectionLabel>Players · {checkedIn}/{players} checked in</SectionLabel>
<Typography sx={{ fontSize: 18, fontWeight: 800 }}>{booking.name}</Typography>
<Box sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>{money(total)}</Box>

// Handheld
<Typography variant="body1">{dish.name}</Typography>
<Typography variant="body2" color="text.secondary">{formatTimeLabel(sentAt)}</Typography>`,
  },
  related: [
    { name: 'Colors', id: 'foundations-colors' },
    { name: 'Spacing', id: 'foundations-spacing' },
    { name: 'Icons', id: 'foundations-icons' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
  ],
};

export default doc;
