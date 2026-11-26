import { withCodeSpans } from './_lib/code-spans';
import { md3, payBadges } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Chip — the small pill for a choice, a filter or a status. Everywhere in Birdie's look; MUI's
 * Chip only on the handheld. The tablet draws its own, one component per job.
 */
const doc: DsDoc = {
  summary: (
    <>
      A small pill that carries a choice, a filter or a status: <em>8 min</em>, <em>Unpaid 27</em>,{' '}
      <em>Bay 3</em>, <em>Finished ▾</em>, <em>Check requested</em>. The pill shape is everywhere in Birdie, but the{' '}
      <strong>tablet never uses MUI's Chip</strong>: it draws its chips on <code>ButtonBase</code>, one small component
      per job. The <strong>handheld</strong> uses MUI's Chip, themed to Material 3 (32dp tall, 8dp corners), through its
      own <code>FilterChip</code> and <code>TierChip</code>.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      The chip look is on both surfaces. MUI's <code>Chip</code> is imported by 4 handheld files and no tablet file. The
      theme's comment calls chips "the prototype's most-used control"; that describes the source HTML prototype, not this
      codebase's use of MUI Chip (see Decisions).
    </>
  ),
  mui: ['Chip'],
  useFor: [
    'Choosing among a few options in place: the tee interval, a cash float, a staff role, a booking\'s tags (PillGroup).',
    'Filtering a list, with the count each filter would show: Unpaid 27, Paid 53.',
    'Switching columns on and off: the Bay Sheet\'s bays.',
    'A status you can change from where it is: the round status chip opens a menu of steps.',
    'A read-only status with an icon and a word: Check requested, 2 not sent.',
  ],
  dontUseFor: [
    'The main action. That is a filled Button.',
    'Navigation between screens or tabs: use Tabs or the navigation bar.',
    'A payment state: that is a Badge (PayBadge), squarer and never clickable.',
    'On/off settings: use a Switch.',
  ],
  inBirdie: [
    {
      label: 'Status chips, Tabs list',
      caption: (
        <>
          The Status column is what a server reads from across the room. Each chip is icon + word + colour:{' '}
          <strong>Check requested</strong> (dark amber, receipt), <strong>2 not sent</strong> (pale amber, send),{' '}
          <strong>Nothing ordered</strong> (grey), <strong>All sent</strong> (outline only). Two can show at once.
        </>
      ),
      shot: 'ds-tablet-tab-list',
      tabletHash: '#/tabs',
      storyId: 'v1-→-v2-migration-6-·-tabs-tablet--the-list',
    },
    {
      label: 'The same states, handheld',
      caption: (
        <>
          The phone's Tabs list puts the same states under each row as flags: <strong>Check requested</strong> (solid
          orange), <strong>2 not sent</strong> (kitchen amber), <strong>Nothing ordered</strong> (grey). Words and colour,
          no icons; rows come in the tablet's status order. The <em>All · 6</em> / <em>Mine · 2</em> filters above are the
          restaurant's <code>Pill</code>.
        </>
      ),
      shot: 'ds-mobile-open-tabs',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--open-tabs',
    },
    {
      label: 'Filter chips, tee sheet list',
      caption: (
        <>
          Status filters with a coloured dot, the word and the count. The selected one fills dark (<strong>Unpaid 27</strong>
          ). The dots repeat the payment colours so the filter and the badges below it match.
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
    },
    {
      label: 'Bay toggles, Bay Sheet',
      caption: (
        <>
          One chip per bay with its booking count. On is tonal green with a check; off is outlined with a struck eye.{' '}
          <strong>All 10</strong> puts every bay back.
        </>
      ),
      shot: 'tablet-bay-sheet',
      tabletHash: '#/bays',
      storyId: 'prototypes-tablet-bay-sheet-switching-bays-off--switch-two-off',
    },
    {
      label: 'Course chips, handheld',
      caption: (
        <>
          MD3 filter chips under the date strip: <strong>All courses</strong> selected (secondary container, check),{' '}
          <em>Front 9</em> and <em>Back 9</em> outlined.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--default',
    },
  ],
  birdie: [
    { name: 'PillGroup', file: 'src/pos/modals/ModalFrame.tsx', use: 'one or several choices inside a dialog (20 uses). `multi` adds a check to selected pills.', surface: 'tablet' },
    { name: 'FilterChip (tablet)', file: 'src/pos/components/operations/OpsParts.tsx', use: '40px filter pills with a count, for the operations screens (Inventory, Events, Gift Cards).', surface: 'tablet' },
    { name: 'RoundStatusChip', file: 'src/pos/components/SeatChips.tsx', use: 'a player\'s step in the round that opens a menu to change it.', surface: 'tablet' },
    { name: 'Status (Tabs list)', file: 'src/pos/components/restaurant/TabList.tsx', use: 'read-only status chips with an icon. Private to the file.', surface: 'tablet' },
    { name: 'Resource toggles', file: 'src/pos/components/ResourceSheetView.tsx', use: 'the Bay and Court sheets\' column switches, with counts and aria-pressed.', surface: 'tablet' },
    { name: 'FilterChip (tee)', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'MD3 filter chips on the handheld Tee Sheet and its filters, with an optional count.', surface: 'handheld' },
    { name: 'FilterChip (people)', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'MD3 filter chips for People, with an optional tier dot. Has aria-pressed; the tee one does not.', surface: 'handheld' },
    { name: 'TierChip', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a member\'s tier: dot and label on the tier\'s tint.', surface: 'handheld' },
    { name: 'Pill', file: 'src/pos/mobile/screens/restaurant/parts.tsx', use: 'restaurant filters and choices: 40dp with 8dp gaps so each has a 48dp touch area, aria-pressed, an optional swatch. The best-built handheld chip.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Container', description: 'Tablet: a full pill (radius xl), 1.5px outline at rest. Handheld: MD3\'s 8dp corners; the 1.5px outline is inherited from the tablet theme.' },
    { part: 'Leading mark (optional)', description: 'A check when selected, a coloured dot for a status, or an icon that names the state (receipt, send).' },
    { part: 'Label', description: 'One or two words, 12–12.5px bold on the tablet, 14px medium on the handheld.' },
    { part: 'Count (optional)', description: 'After the label, lighter: "Unpaid 27", "Bay 3 4".' },
    { part: 'Trailing chevron (status you can change)', description: 'RoundStatusChip ends in ▾ to say it opens.' },
  ],
  variants: [
    { name: 'Choice (PillGroup)', use: 'Pick one (or several, with `multi`) in a dialog. Selected: the option\'s colour as outline and a 12% tint.', avoid: 'More than about eight options; use a select.' },
    { name: 'Filter', use: 'Narrow a list; show the count. Tap again to clear (or tap All).', avoid: 'Filters that do not change the list in view.' },
    { name: 'Toggle (bays)', use: 'Show or hide a column. On is filled with a check, off is outlined with a struck eye.', avoid: 'Settings that persist beyond the session; use a Switch in Settings.' },
    { name: 'Status you can change (RoundStatusChip)', use: 'A state that staff correct from the row. Green once the player has started, with a chevron.', avoid: 'Read-only states; they should not look tappable.' },
    { name: 'Status, read-only', use: 'Icon + word + colour, never clickable: Check requested, Nothing ordered, the League\'s chips, membership chips.', avoid: 'Payment state; that is a Badge.' },
    { name: 'Input (deletable)', use: 'Not used in Birdie.', avoid: 'Adding one without a reason; removing a thing goes through its own control.' },
  ],
  states: [
    { state: 'Rest', tablet: 'White with a 1.5px `outlineVariant` outline.', handheld: 'Transparent with the same 1.5px outline.' },
    { state: 'Hover', tablet: 'A `surfaceContainer` wash; selected chips darken their tint.', handheld: 'No hover.' },
    { state: 'Selected', tablet: 'Varies by component today (see Decisions): dark fill (list status), green container (bays, ops filters), accent tint (PillGroup).', handheld: 'Secondary container with a check (MD3).' },
    { state: 'Disabled', tablet: 'Half opacity. Say why nearby.', handheld: 'MUI\'s disabled chip.' },
    { state: 'Open (status chip)', tablet: 'A 170px menu under the chip; the current step is bold green. A tap outside closes it.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '28px (bays, theme small), 32px (round status), 40px (ops filters, for a thumb)', why: 'Most chips are worked with a mouse at a dense counter; the operations screens\' filters are used standing, so they are 40.' },
    { surface: 'Handheld', size: '32dp tall, 8dp corners (mobile theme MuiChip)', why: 'Material 3\'s filter chip. The visual is 32dp; see Accessibility for the touch target.' },
  ],
  behavior: [
    'Filters in a row are single-select unless the screen says otherwise; tapping the selected one goes back to All.',
    'Toggles never hide data, only columns: the toolbar says how many bookings the hidden bays hold.',
    'A status chip that opens a menu closes it after a pick and dispatches straight to the store.',
    'Rows of chips scroll sideways on the handheld (`ChipRow`), never wrap the page wider.',
  ],
  content: [
    <>
      <strong>The status language.</strong> A status chip is colour plus an icon plus a word, never colour alone. "2 not
      sent" says how many; "Check requested" says what the table is waiting for. The same rule as Badge.
    </>,
    'Filters are the noun and the count: "Unpaid 27", "Front 9". No verbs.',
    'Choices are the option, not a sentence: "8 min", "18", "Manager".',
    'Sentence case on chips. (Payment badges are the capitals; chips are not.)',
  ],
  dos: [
    'Pick the Birdie chip for the job before writing a new one.',
    'Put counts on filter chips.',
    'Give every toggle or filter chip aria-pressed.',
    'Use an icon on status chips so the state reads without colour.',
  ],
  donts: [
    'MUI Chip on the tablet. Nothing there uses it; the theme override would make it the odd one out.',
    'A chip that looks tappable but is not, or the other way round.',
    'Colour-only status chips.',
    'Another selected style.',
  ],
  a11y: [
    'Filter and toggle chips need aria-pressed. The bay toggles, the operations FilterChip and the People FilterChip have it; the tee sheet list\'s status chips, PillGroup and the handheld tee FilterChip do not, so a screen reader cannot tell which is on.',
    <>
      Contrast, computed. Tablet <em>Check requested</em> <Contrast fg="#ffffff" bg="#b45309" label="Check" />; handheld{' '}
      <em>Check requested</em> <Contrast fg="#ffffff" bg="#ea580c" label="Check" />, which fails at 12px. Not sent{' '}
      <Contrast fg="#92400e" bg="#fef3c7" label="2 not sent" />. The round status chip once started{' '}
      <Contrast fg={payBadges.paid.text} bg={payBadges.paid.bg} label="Finished" /> fails; it borrows the PAID colours.{' '}
      <em>All sent</em> <Contrast fg={md3.outline} bg="#ffffff" label="All sent" /> is just under.
    </>,
    'The MUI-based handheld chips are 32dp tall, under the 48dp touch target Birdie uses on the phone. MD3 keeps chips at 32dp and extends the touch area; MUI\'s Chip does not. The restaurant\'s Pill solves it (40dp plus 8dp gaps = a 48dp area); do the same for the tee and people FilterChips.',
  ],
  decisions: [
    {
      decision: 'The tablet draws its own chips',
      why: 'Each job needs a different density and behaviour (a 40px filter for a standing operator, a 28px toggle in a busy toolbar, a chip that opens a menu). Small components with one job, as with the tablet\'s buttons.',
    },
    {
      decision: 'MD3 chips on the handheld',
      why: 'The phone follows Material 3 throughout (mobile-theme.ts): 32dp, 8dp corners, secondary container when selected. A pill there would read as a button.',
    },
    {
      decision: 'The round status became a chip',
      why: 'Weston on the five-stop rail: "it does take up a lot of space… they could click on it and change it"; seeing the chip: "I like… it\'s just showing the status chip." Source: SeatChips.tsx.',
    },
    {
      decision: '"The most-used control" is not a usage fact',
      why: 'The MuiChip override in theme.ts calls chips the prototype\'s most-used control. In this codebase no tablet file renders MUI Chip, so that override styles nothing on the tablet. The claim is true of the look, which a dozen Birdie components draw by hand. Either move the tablet\'s chips onto it, or move what the handheld inherits from it (the 1.5px outline, the label padding) into the handheld override and drop the rest.',
    },
    {
      decision: 'Open: one selected style',
      why: 'Selected chips look six ways: dark fill (tee sheet list), green container with outline (ops filters), green container with check (bays), accent tint (PillGroup), secondary container with check (handheld FilterChip), green outline with secondary container (handheld restaurant Pill). Pick one for filters and toggles (green container with a check is closest to the handheld), and keep PillGroup\'s accent only where the option has its own colour.',
    },
    {
      decision: 'Open: Check requested is two colours',
      why: 'Dark amber `#b45309` on the tablet (passes), orange `#ea580c` on the handheld (fails). Use the tablet\'s, and make "kitchen amber" a token; today it is a literal in TabList, DishLine and `KITCHEN` in restaurant-helpers.ts.',
    },
  ],
  tokens: [
    { token: 'radius.xl', value: '28px', role: 'Tablet pill' },
    { token: 'radius.sm', value: '8px', role: 'Handheld MD3 corner' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Rest outline' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Selected fill (bays, ops filters)' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'Selected fill on the handheld' },
    { token: 'KITCHEN (restaurant-helpers.ts)', value: '#b45309 · #92400e · #d97706', role: 'Kitchen amber, not yet in tokens.ts' },
  ],
  engineering: {
    import: `import { PillGroup } from '../modals/ModalFrame';                    // tablet, choices in dialogs
import { FilterChip } from '../components/operations/OpsParts';       // tablet, filters
import { RoundStatusChip } from '../components/SeatChips';            // tablet, status with a menu
import { FilterChip } from './parts';                                 // handheld (tee or people)`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiChip</code>: small by default, pill radius, 700 weight, 1.5px outline, 28/32px. No
        tablet screen renders an MUI Chip, so on the tablet it styles only stories. <code>src/theme/mobile-theme.ts →
        MuiChip</code> is built on top of it (<code>createTheme(theme, …)</code>) and replaces the root: medium, 32dp, 8dp
        corners, 14px/500. The 1.5px outline and the label padding still come through from the tablet override.
      </>
    ),
    notes: [
      'Most tablet chips carry a `data-` hook the stories assert on (`data-resource-toggle`, `data-check-requested`, `data-round-status`). Keep them when restyling.',
      'RoundStatusChip draws its own menu with a fixed full-screen click-catcher (z-index 199/200), not an MUI Menu. If it moves to MUI Menu, keep the aria-expanded and the label "{name}: {step}. Change".',
      'The two handheld FilterChips differ only in their extras (count vs dot) and aria-pressed. Merge them into one in a shared handheld file.',
    ],
    snippet: `<PillGroup
  label="Interval"
  value={intervalMin}
  onChange={setIntervalMin}
  options={[7, 8, 10, 12, 15].map((m) => ({ label: \`\${m} min\`, value: m }))}
/>`,
  },
  related: [
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Badge Group', id: 'components-feedback-status-badge-group' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
