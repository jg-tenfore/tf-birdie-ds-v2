import { md3, memberTypes, mobile, payBadges } from '../../../theme/tokens';
import { CATALOG } from '../../../pos/data/catalog';
import { KITCHEN } from '../../../pos/mobile/screens/restaurant/restaurant-helpers';
import { Contrast, contrastRatio } from '../Contrast';
import { ArtNote, Hex } from '../styles-kit';
import type { DsDoc } from '../types';

/** Category fills whose label fails AA at the tiles' 11px bold. Computed from the catalog. */
const failingTiles = Object.entries(CATALOG).filter(([, c]) => contrastRatio(c.tc, c.color) < 4.5);

/**
 * Colors — the MD3 roles and the semantic sets, what each means in Birdie, and the contrast of
 * every text pair, computed. The reference sheets are the stories in
 * src/showcase/foundations/Colors.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-colors',
  summary: (
    <>
      Birdie's colours are <strong>Material Design 3 roles on one POS green</strong>, plus a few sets that carry meaning at the
      counter: who has paid, what time of day it is, who is a member, whose seat it is, and what hasn't gone to the kitchen. A
      colour means the same thing on the counter terminal and the handheld, and it never carries meaning alone: a word or an icon
      always goes with it. Light mode only.
      <ArtNote>Banner: a putting green's contour map, its bands stepping through Birdie's greens to sand — a colour scale in line art.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      A foundation, used by every screen on both surfaces. Components read roles from <code>src/theme/tokens.ts</code>, through
      the theme or directly; the handheld adds three roles of its own.
    </>
  ),
  useFor: [
    <>Picking a colour by its job: <code>md3.primary</code> for go and paid, <code>md3.error</code> for loss, <code>md3.outlineVariant</code> for every hairline.</>,
    <>Domain state: <code>payBadges</code> for payment, <code>shifts</code> for time of day, <code>memberTypes</code> for membership, <code>playerAccents</code> for a seat or a player.</>,
    <>Text: <code>md3.onSurface</code> for primary text, <code>md3.onSurfaceVariant</code> for secondary text and labels.</>,
  ],
  dontUseFor: [
    'Decoration. On a working screen every colour means something.',
    'Meaning on its own. Pair it with a word (PAID, NO SHOW, Not sent) or an icon.',
    <>Small text in <code>md3.primary</code> or <code>md3.outline</code>: both fall under 4.5:1. Use <code>palette.primary.dark</code> or <code>md3.onSurfaceVariant</code>.</>,
    <>A new hex value in a component. A colour that recurs goes in <code>tokens.ts</code> first.</>,
  ],
  inBirdie: [
    {
      label: 'The tee sheet, early morning',
      caption: (
        <>
          Payment state first: solid green is paid, white with a green outline still owes, orange is refunded, hatched grey is a
          no-show. The pale amber on empty rows is the early-morning band. The dots before names are membership tiers.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
      storyId: 'components-layout-structure-tee-sheet--payment-states',
    },
    {
      label: 'A tab by seat, handheld',
      caption: (
        <>
          Seat stripes use the player accents: seat 1 green, seat 2 blue, shared grey. Amber marks what hasn't gone to the kitchen:
          the Not sent lines and the Send button. Pay is green and carries the total.
        </>
      ),
      shot: 'mobile-tab',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
    {
      label: 'Register categories, tablet',
      caption: (
        <>
          Each category has its own fill, so staff find it by colour and position. The fills are catalog data, not tokens, and
          several fail contrast with their white labels (see Category tiles below).
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'The one dark screen',
      caption: (
        <>
          Sign-in is drawn on <code>md3.scrim</code> with <code>primaryContainer</code> accents. It is the only dark surface in the
          product: a terminal waiting for a PIN should look locked.
        </>
      ),
      shot: 'tablet-sign-in',
      storyId: 'v1-→-v2-migration-sign-in-tablet--demo-pins',
    },
    {
      label: 'Reservation panel, tablet',
      caption: (
        <>
          The player accents run down each row's left edge and fill its avatar. Status pills are neutral (UNPAID) until money moves,
          and the main action is the dark FilledButton, not green.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Tee sheet, handheld',
      caption: (
        <>
          The same payment colours as badges (PAID, OPEN) and as each card's left stripe, the early-morning band as a header row,
          and the navigation bar's active pill in <code>secondaryContainer</code>.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-global-nav-navigation--interactive',
    },
  ],
  birdie: [
    { name: 'PayBadge', file: 'src/pos/components/primitives.tsx', use: 'payment state beside a name, from payBadges. A solid fill, because it is the first thing read.', surface: 'both' },
    { name: 'chipStyle', file: 'src/pos/components/TeeSheetGrid.tsx', use: "a tee-sheet chip's fill, outline and text for its payment state. The grid and the style guide both call it.", surface: 'tablet' },
    { name: 'MemberDot', file: 'src/pos/components/primitives.tsx', use: "a membership tier's dot, with its name in a tooltip.", surface: 'both' },
    { name: 'TABLE_STATUS_STYLE', file: 'src/pos/components/restaurant/floor-style.ts', use: "a table's status on the floor, in the tee sheet's grammar.", surface: 'both' },
    { name: 'KITCHEN · seatColor', file: 'src/pos/mobile/screens/restaurant/restaurant-helpers.ts', use: "the kitchen amber and a seat's accent on the handheld.", surface: 'handheld' },
  ],
  variants: [
    { name: 'Primary green', use: <>Go, paid, selected: green filled buttons, paid chips, the selected tab, focus. <Hex c={md3.primary} /></>, avoid: 'Text under 18.7px bold, and Cancel. Green means go.' },
    { name: 'Primary container', use: <>Selected or loaded: an active chip or toggle, the golf summary, a loaded customer. <Hex c={md3.primaryContainer} /></>, avoid: 'Large areas. It reads as "selected" wherever it sits.' },
    { name: 'Neutrals (surface, onSurface)', use: <>Almost everything: the ground, cards, text, the dark FilledButton. <Hex c={md3.onSurface} /> on <Hex c={md3.surface} /></>, avoid: '—' },
    { name: 'Outline variant', use: <>The 1.5px hairline on every card, chip, input and cell. <Hex c={md3.outlineVariant} /></>, avoid: "Text, and the only boundary of an input you must find (it's 1.7:1)." },
    { name: 'Error', use: <>Loss and refusal: Delete, Void, no-show, refused PINs, allergy flags. <Hex c={md3.error} /></>, avoid: 'Warnings that can be fixed. Use the amber callout.' },
    { name: 'Amber', use: <>Attention, and the kitchen: unsent dishes, Send, Check requested, reserved tables, warnings. <Hex c={KITCHEN.solid} /> <Hex c={KITCHEN.text} /></>, avoid: 'Money owed. That is the white unpaid chip or OPEN.' },
    { name: 'Semantic sets', use: 'Payment, time of day, membership, notes, player accents, table status, ID.me: each set means one thing and is read from its token.', avoid: 'Borrowing a set for another meaning (a member colour as a category).' },
  ],
  states: [
    { state: 'Hover', tablet: <>A wash: <code>surfaceContainer</code> on outlined buttons, <code>surfaceHigh</code> on icon buttons; filled tiles brighten.</>, handheld: 'No hover. The ripple confirms the press.' },
    { state: 'Selected', tablet: <><code>primaryContainer</code> fill with a <code>primary</code> outline (chips, toggles).</>, handheld: <><code>secondaryContainer</code> for the navigation bar's active pill; chips as on the tablet.</> },
    { state: 'Focus', tablet: <>No focus colour is defined. MUI's Button shows a focus ripple; Birdie's own controls on <code>ButtonBase</code> (FilledButton, ToolbarButton, tiles) show nothing, because ButtonBase removes the outline. Open: add a focus-visible ring in <code>primary</code> to the theme.</>, handheld: 'The same gap, for external keyboards.' },
    { state: 'Disabled', tablet: <><code>surfaceHighest</code> fill with <code>onSurfaceVariant</code> text; theme text.disabled is <code>outline</code>. Always with a reason nearby.</>, handheld: 'Same tokens.' },
    { state: 'Error', tablet: <><code>error</code> text and a 2px error border for alerts that must not be missed.</>, handheld: 'Same.' },
  ],
  behavior: [
    'Colour follows state, never the other way round: a chip is green because the booking is paid, and turns the moment it is.',
    'Payment colour wins. Where a booking has several attributes (member, band, note), the fill is its payment state and the others are a dot, a tint or an icon.',
    'One meaning per hue across the product: green paid and go, orange refunded or waiting on a check, amber the kitchen and attention, red loss, blue identity and multi-select, violet events.',
    'The same token draws the same state on both surfaces, so a PAID badge on the handheld matches the counter.',
  ],
  content: [
    'Status words go with status colours, in capitals on badges: PAID, OPEN, NO SHOW, REFUNDED.',
    'Name the colour by its role in specs and tickets ("primary container"), not by its hex or "light green".',
  ],
  dos: [
    'Read colours from tokens.ts (md3, payBadges, playerAccents…) or the theme palette.',
    'Pair every status colour with a word or an icon.',
    'Use palette.primary.dark for green text and links (the docs kit does).',
    <>Check a new pair with <code>&lt;Contrast&gt;</code> before shipping it.</>,
  ],
  donts: [
    'Type a hex value in a component. The amber family is already typed in dozens of places; don\'t add more.',
    'Put white text on the mid-tone category fills.',
    'Use green for anything that isn\'t go or paid.',
    'Add a dark mode by inverting colours. Add tones to the roles instead.',
  ],
  a11y: [
    <>
      Body text passes everywhere: <code>onSurface</code> on white is <Contrast fg={md3.onSurface} bg="#ffffff" />, and{' '}
      <code>onSurfaceVariant</code> on the deepest container is <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceHighest} />.
    </>,
    <>
      <strong>Green text fails.</strong> <code>md3.primary</code> on white is <Contrast fg={md3.primary} bg="#ffffff" label="$18" />,
      yet the product sets it as text in many places: menu prices, "+ Add", "4/4 in", the handheld's outlined button labels and list
      subheaders. And a selected ToggleButton's label is <Contrast fg={md3.primary} bg={md3.primaryContainer} />. The fix is ready:{' '}
      <code>palette.primary.dark</code> is <Contrast fg="#0f7a36" bg="#ffffff" />.
    </>,
    <>
      <strong>outline as text fails narrowly.</strong> <code>md3.outline</code> is <Contrast fg={md3.outline} bg="#ffffff" /> on white
      (just under 4.5) and <Contrast fg={md3.outline} bg={md3.surface} /> on the ground. It is the theme's disabled text, the OPEN
      badge's text (<Contrast fg={payBadges.open.text} bg={payBadges.open.bg} label="OPEN" />) and many hint lines.
    </>,
    <>
      <strong>Three payment badges fail</strong> at their 10px bold: PAID <Contrast fg={payBadges.paid.text} bg={payBadges.paid.bg} label="PAID" />,
      REFUNDED <Contrast fg={payBadges.refund.text} bg={payBadges.refund.bg} label="REF" /> and OPEN above. On the tee sheet, a
      refunded chip's white name is <Contrast fg="#ffffff" bg="#ea580c" /> and a no-show's grey name is{' '}
      <Contrast fg="#888888" bg="#e8ece8" />. The word on the chip carries the meaning, but it has to be readable.
    </>,
    <>
      <strong>Category tiles:</strong> {failingTiles.length} of the catalog's {Object.keys(CATALOG).length} category fills fail with their
      label ({failingTiles.map(([k]) => k.toLowerCase()).join(', ')}). Snacks is <Contrast fg={CATALOG.SNACKS.tc} bg={CATALOG.SNACKS.color} label="SNACKS" />.
      The newer Combos and Gift card tiles chose darker fills that pass.
    </>,
    <>
      Non-text: the 1.5px hairline is <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />. That is fine for a card, which
      has its fill and content too, but it is also the only boundary of a tablet text field. The annual member dot is{' '}
      <Contrast fg={memberTypes.annual.color} bg="#ffffff" size="non-text" />; its tooltip names the tier.
    </>,
    'Never colour alone: every payment state also prints its word, members have a tooltip, and the kitchen amber comes with "Not sent".',
  ],
  decisions: [
    { decision: 'MD3 role names, ported 1:1', why: "The HTML prototype's :root already used MD3 roles (primary, primary-container, on-surface-variant, outline-variant). Keeping the names means the port stays diffable and MUI's palette maps onto them without a parallel vocabulary." },
    { decision: 'One green', why: 'Green is the pay colour on the tee sheet and the "go" colour on buttons. A second green would ask staff to tell two meanings apart at a glance.' },
    { decision: 'Light mode only', why: 'The terminal sits on a lit pro-shop counter and the handheld is used outdoors; the prototype had no dark tone set. The roles are semantic, so a dark scheme later means adding tones to tokens.ts, not touching components. Sign-in is the one dark screen, on purpose.' },
    { decision: 'Payment state is the chip colour', why: 'The counter needs "who still owes" before anything else, so unpaid is the one white chip in a green row. Booking type, membership and band become a word, a dot or a tint.' },
    { decision: 'Player accents by position, not by person', why: 'Seat 2 is blue on the reservation, on the tab and on the handheld, whoever sits there. A colour per person would run out and mean nothing to the next server.' },
    { decision: 'Open: green text', why: <>Move text uses of <code>md3.primary</code> to <code>palette.primary.dark</code> (or add an <code>onPrimaryText</code> role), and decide whether green buttons get a deeper fill or a larger label (the Button page's open item).</> },
    { decision: 'Open: the amber family is not a token', why: <>Unsent, warning and reserved amber is defined once for the handheld (<code>KITCHEN</code>) and typed as literals across the tablet. Promote it to <code>tokens.ts</code> as an attention set.</> },
    { decision: 'Open: category fills', why: 'Either darken the failing fills, or compute the label colour from the fill when a club sets it up in Buck, so a club can never pick an unreadable tile.' },
    { decision: 'Open: badges and chips under AA', why: 'Deepen the PAID, OPEN and REFUNDED text colours and the no-show chip name, keeping the fills.' },
  ],
  tokens: [
    { token: 'md3.primary', value: <Hex c={md3.primary} />, role: 'The POS green: paid, go, selected' },
    { token: 'md3.primaryContainer · onPrimaryContainer', value: <Hex c={md3.primaryContainer} />, role: 'Selected and loaded fills, and their text' },
    { token: 'md3.surface · white', value: <Hex c={md3.surface} />, role: 'The ground; cards and panels are white on it' },
    { token: 'md3.surfaceContainer · High · Highest', value: <Hex c={md3.surfaceContainer} />, role: 'Wells, hover washes, disabled fills' },
    { token: 'md3.onSurface · onSurfaceVariant', value: <Hex c={md3.onSurface} />, role: 'Primary and secondary text' },
    { token: 'md3.outline · outlineVariant', value: <Hex c={md3.outlineVariant} />, role: 'Low-emphasis text; every hairline' },
    { token: 'md3.error', value: <Hex c={md3.error} />, role: 'Loss and refusal' },
    { token: 'md3.scrim', value: <Hex c={md3.scrim} />, role: 'Sign-in, tooltips, toasts' },
    { token: 'mobile.secondaryContainer', value: <Hex c={mobile.secondaryContainer} />, role: "Handheld navigation bar's active pill" },
    { token: 'payBadges · shifts · memberTypes · noteColors · playerAccents · idMeGroups', value: 'sets', role: 'Domain state, each with one meaning' },
  ],
  engineering: {
    import: `import { md3, payBadges, playerAccents } from '../../theme/tokens';
// or through the theme: theme.palette.md3, theme.palette.pay, theme.palette.playerAccents`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts</code> maps the roles onto MUI's palette (<code>primary</code>, <code>secondary</code>,{' '}
        <code>error</code>, <code>text</code>, <code>divider</code>, <code>background</code>) and passes the token groups through as
        custom palette keys (<code>palette.md3</code>, <code>palette.pay</code>, <code>palette.shifts</code>…, typed by module
        augmentation). <code>warning</code>, <code>info</code> and <code>success</code> are literals there, not MD3 roles.{' '}
        <code>mobile-theme.ts</code> keeps the palette and changes density only.
      </>
    ),
    notes: [
      <>
        <code>tokens.ts</code> imports nothing from MUI, so stories, the docs kit and plain CSS read the same values. Storybook's
        manager can't import from <code>src/</code>, so it repeats the green as a literal (<code>.storybook/manager.ts</code>).
      </>,
      <>
        Contrast on these pages is computed by <code>src/showcase/ds-docs/Contrast.tsx</code> (<code>contrastRatio</code>,{' '}
        <code>wcagLevel</code>). Use the same functions in a test if you add a pair that must pass.
      </>,
      <>
        The register's category fills live in <code>src/pos/data/catalog.ts</code> and <code>register-extras.ts</code> as data, because
        a club will set them in Buck. They are the one colour set that isn't a token.
      </>,
    ],
    snippet: `<Box sx={{ bgcolor: payBadges[b.pay].bg, color: payBadges[b.pay].text }}>
  {payBadges[b.pay].label}
</Box>

// Seat 2 is blue everywhere:
<Box sx={{ borderLeft: \`4px solid \${playerAccents[seat - 1]}\` }} />`,
  },
  related: [
    { name: 'Typography', id: 'foundations-typography' },
    { name: 'Border', id: 'foundations-border' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Tee Sheet', id: 'components-layout-structure-tee-sheet' },
  ],
};

export default doc;
