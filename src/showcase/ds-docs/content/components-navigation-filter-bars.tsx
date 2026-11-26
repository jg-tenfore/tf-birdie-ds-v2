import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Filter Bars — a pattern, not one MUI component. A row of chips under a toolbar that narrows what
 * the screen shows, with counts. Birdie has it on both surfaces, built four slightly different ways;
 * the page names the best one (the Bay Sheet's) and lists the drift.
 */
const doc: DsDoc = {
  summary: (
    <>
      A row of chips under a screen's toolbar that narrows what the screen shows: <strong>Unpaid 27</strong> on the tee
      sheet's list, <strong>Bay 3</strong> on the Bay Sheet, <strong>Front 9</strong> on the phone's tee sheet,{' '}
      <strong>Mine</strong> on the phone's Tabs. Each chip says what it keeps and, where it helps, how many. The fuller set
      of filters sits one tap away: a side panel on the tablet, a full-screen dialog on the handheld. It's a Birdie pattern,
      built on <code>ButtonBase</code> on the tablet and MUI <code>Chip</code> on the handheld, not one MUI component.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      On both surfaces: the tablet's tee sheet list, Bay and Court Sheets and Tables; the handheld's tee sheet, People, Tabs
      and Tables. Built four ways today (see Decisions); the Bay Sheet's row is the model to converge on.
    </>
  ),
  useFor: [
    'Narrowing a list or sheet the operator is working down: unpaid tee times, one course, my tabs.',
    'Showing or hiding columns on a resource sheet (bays, courts), with the count each one holds.',
    'Switching rooms on a floor (Dining Room, Patio, Bar).',
  ],
  dontUseFor: [
    'Choosing a value in a form (holes, transport, a role): Toggle Button or PillGroup.',
    'Switching between sections of one record (Players, Financial, Notes): Tabs.',
    'More than about eight options, or filters that combine: the full filter panel or dialog.',
    'Sorting: a sort chip with a menu (Status ▾), kept at the end of the row.',
  ],
  inBirdie: [
    {
      label: 'The unpaid worklist, tablet',
      caption: (
        <>
          The tee sheet's list view: <strong>All filters</strong> (with a count once any are on), then one chip per payment
          status with its count, then <strong>Status ▾</strong> to sort and a search toggle. One status at a time; the
          selected chip is dark.
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
    },
    {
      label: 'Switching bays off, tablet',
      caption: (
        <>
          The Bay Sheet's row: <strong>All 10</strong>, then one chip per bay with its bookings for the day. Tap one to hide
          its column; the others share the width. While any are off, the toolbar says "Showing 6 of 10 bays · 20 bookings
          hidden", because hiding a column never hides a booking.
        </>
      ),
      shot: 'tablet-bay-sheet',
      tabletHash: '#/bays',
      storyId: 'prototypes-tablet-bay-sheet-switching-bays-off--switch-two-off',
    },
    {
      label: 'Courses and filters, handheld',
      caption: (
        <>
          Course chips under the date (All courses, Front 9, Back 9) narrow the day in place. Everything else is behind the
          filter icon: a full-screen dialog with a live count of matching tee times and Apply. The icon carries a badge
          with how many are on.
        </>
      ),
      shot: 'mobile-tee-sheet',
      handheldRoute: 'mobile-screens-2-·-tee-sheet--filters',
    },
  ],
  birdie: [
    {
      name: 'ResourceFilterRow',
      file: 'src/pos/components/ResourceSheetView.tsx',
      use: 'the model: MD3 filter chips with a check when on, counts, role="group" and aria-pressed. Bay and Court Sheets.',
      surface: 'tablet',
    },
    {
      name: 'ListView filter bar',
      file: 'src/pos/components/ListView.tsx',
      use: 'the tee sheet list: All filters, status chips with counts, SortChip, search. Opens FilterDrawer for the rest.',
      surface: 'tablet',
    },
    {
      name: 'FilterChip (tee)',
      file: 'src/pos/mobile/screens/tee/parts.tsx',
      use: 'course chips on the phone tee sheet, and every chip in the Filters dialog. Optional count.',
      surface: 'handheld',
    },
    {
      name: 'FilterChip (people)',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'People’s chips (All, Members, Guests, membership types with a colour dot). Has aria-pressed.',
      surface: 'handheld',
    },
    {
      name: 'Pill + ScrollRow',
      file: 'src/pos/mobile/screens/restaurant/parts.tsx',
      use: 'the restaurant screens: rooms on Tables, All · 7 / Mine · 3 on Tabs. 40dp, aria-pressed, in a labelled group.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Row', description: 'Directly under the toolbar or top app bar, full width. Scrolls sideways inside itself on the handheld; never wraps the page.' },
    { part: 'All / the panel', description: 'First: "All" (show everything) or "All filters" (open the full set, with a count of what’s on).' },
    { part: 'Chip', description: 'A label and, where it helps, a count ("Unpaid 27", "Bay 3 7"). Selected chips carry a check (MD3 filter chip) or a solid fill (tablet status).' },
    { part: 'Sort and search', description: 'At the end of the row on the tablet: a sort chip with a menu, then a search toggle.' },
    { part: 'Summary', description: 'When filtering hides something, say so near the toolbar ("Showing 6 of 10 bays · 20 bookings hidden") or above the choices ("… of … tee times match").' },
  ],
  variants: [
    {
      name: 'Single-select (status)',
      use: 'Mutually exclusive slices: payment status on the list view, All / Mine on Tabs, a room.',
      avoid: 'Slices that could combine. Make them multi-select or move them into the panel.',
    },
    {
      name: 'Multi-select (show / hide)',
      use: 'Columns or groups that can each be on or off: bays, courts, courses. "All" puts everything back.',
      avoid: 'Letting the last one go off silently. The Bay Sheet shows "Every bay is switched off" and one way back.',
    },
    {
      name: 'Full panel or dialog',
      use: 'Everything else: check-in, membership, holes, party size, special cases. Tablet: FilterDrawer, applies live. Handheld: a full-screen dialog with a draft and Apply.',
      avoid: 'Putting six chip rows on the screen itself.',
    },
  ],
  states: [
    {
      state: 'Off',
      tablet: 'White, 1.5px outline-variant border, onSurfaceVariant label.',
      handheld: 'Outlined, 32dp (Chip) or 40dp (Pill).',
    },
    {
      state: 'On',
      tablet: 'Bay Sheet: primaryContainer with a check. List view status: dark fill (onSurface), white label. Filter panel: solid green.',
      handheld: 'secondaryContainer with a check (MD3 filter chip).',
    },
    {
      state: 'Hover',
      tablet: 'surfaceContainer wash on off chips. Mouse-first, so it matters.',
      handheld: 'No hover. Ripple on press.',
    },
    {
      state: 'With a count',
      tablet: 'The count sits after the label, a little lighter. Counts are live and follow the day and shift.',
    },
    {
      state: 'Nothing matches',
      tablet: 'An empty state in the list ("No tee times match these filters"), never a blank area.',
      handheld: 'The dialog’s live count reaches 0 before Apply, so the operator sees it coming.',
    },
  ],
  sizing: [
    { surface: 'Tablet', size: '28–32px chips, 12–12.5px bold labels, 6px gaps', why: 'Mouse-first and dense: ten bays and a label fit on one row of a 1280px Clover Mini.' },
    { surface: 'Handheld', size: '32dp Chip with 8dp gaps; 40dp Pill', why: 'A thumb. The 8dp gaps bring each chip to a 48dp touch area.' },
  ],
  behavior: [
    'Filters change the view, never the data: hiding a bay hides its column, not its bookings, and the toolbar says how many are hidden.',
    'On the tablet chips apply at once. On the handheld the dialog works on a draft: Apply commits, ✕ throws it away, so a half-set filter never leaks onto the sheet.',
    'Filter state lives in the store (listFilters, hiddenResources) so it survives a trip to the register, and rides in the deep link (#/tee-sheet/list?status=open, #/bays?hide=bay-3,palmer).',
    'Course chips on the phone and the course filter in the dialog write the same field (listFilters.courses), so the two can’t disagree.',
  ],
  content: [
    'Labels are the slice, in sentence case: "Unpaid", "No show", "Rain check", "Guests only".',
    'Counts are numbers after the label, not in brackets: "Unpaid 27", "All · 7".',
    '"All" or "All courses" is always first, and says what it shows.',
  ],
  dos: [
    'Show counts where the operator is hunting (statuses, bays).',
    'Say what’s hidden when a filter hides something.',
    'Put filter state in the store and the URL.',
    'Use the Bay Sheet’s row as the reference for new filter rows.',
  ],
  donts: [
    'Invent a fifth "selected" look. Pick the MD3 filter chip.',
    'Let a filter row wrap onto two lines; scroll it, or move the rest into the panel.',
    'Use a filter chip to submit or change data.',
  ],
  a11y: [
    'Wrap the row in role="group" with a name ("Bays shown", "Whose tabs") and give each chip aria-pressed. The Bay Sheet, People and the restaurant Pills do; the list view’s status chips, the filter panel’s chips and the tee FilterChip don’t yet.',
    <>
      Contrast, computed. The Bay Sheet's on chip is <Contrast fg={md3.onPrimaryContainer} bg={md3.primaryContainer} label="Bay 3" />,
      the handheld's is <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} label="Front 9" />, and the list
      view's dark chip is <Contrast fg="#ffffff" bg={md3.onSurface} label="Unpaid" />.{' '}
      <strong>The filter panel's solid green chip fails:</strong> <Contrast fg="#ffffff" bg={md3.primary} label="Any" /> at 12px
      bold.
    </>,
    'Selected state is never colour alone on the reference chips: they add a check. The list view’s dark chip relies on fill only.',
    'Targets: 28–32px on the tablet (mouse) is deliberate; anything on the handheld reaches 48dp with its gaps.',
  ],
  decisions: [
    {
      decision: 'Chips on screen, the rest in a panel',
      why: 'The two or three slices people hunt by all day (status, course, bay) stay one tap away. The long tail (party size, membership, notes) would bury the screen.',
    },
    {
      decision: 'Live on the tablet, draft on the handheld',
      why: 'The tablet shows the result beside the chips as you click. On the phone the dialog covers the sheet, so a draft and Apply, with a live match count, stops a filter from emptying the day by surprise.',
    },
    {
      decision: 'Hide columns, never bookings',
      why: 'From the Bay Sheet: switching a bay off narrows the view, and the toolbar counts the bookings it hides, so nobody thinks a booking was lost.',
    },
    {
      decision: 'Open: four "selected" styles',
      why: 'Dark fill (list status), solid green (filter panel), tonal with a check (Bay Sheet), secondary container with a check (handheld). They grew screen by screen. Recommendation: the MD3 filter chip everywhere, primaryContainer on the tablet and secondaryContainer on the handheld.',
    },
  ],
  tokens: [
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Tablet filter chip, on (Bay Sheet)' },
    { token: 'md3.onPrimaryContainer', value: '#002112', role: 'Its label and check' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'Handheld filter chip, on' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px border on an off chip' },
    { token: 'radius.xl / radius.sm', value: '28px / 8px', role: 'Pill chips (list view) / MD3 filter chips (Bay Sheet, handheld)' },
  ],
  engineering: {
    import: `import { FilterChip } from './parts';                     // handheld tee sheet
import { Pill, ScrollRow } from '../restaurant/parts';      // handheld restaurant`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiChip</code> (pill, 1.5px outline, 12px bold) and{' '}
        <code>src/theme/mobile-theme.ts → MuiChip</code> (32dp, 8dp corners). The tablet's filter rows don't use MuiChip; they
        style <code>ButtonBase</code> in place.
      </>
    ),
    notes: [
      <>
        Two components are called <code>FilterChip</code> (in <code>tee/parts.tsx</code> and <code>people/parts.tsx</code>), and{' '}
        <code>Pill</code> does the same job in the restaurant. One shared handheld FilterChip with an optional count and dot,
        and aria-pressed, would replace all three.
      </>,
      <>
        The list view's full filter set opens in MUI's <code>Drawer</code>, which portals to the page body. In the prototype it
        opens against the browser window, outside the terminal frame. See the Drawer page.
      </>,
      <>
        State: <code>listFilters</code> (<code>patchListFilters</code>, <code>clearListFilters</code>) and{' '}
        <code>hiddenResources</code> (<code>setResourceShown</code>, <code>showAllResources</code>) in the POS store; both are in
        the deep-link codec (<code>src/pos/state/url-state.ts</code>).
      </>,
    ],
    snippet: `<Stack direction="row" gap={0.75} role="group" aria-label="Bays shown">
  <ButtonBase aria-pressed={hidden.length === 0} onClick={showAll} sx={chip(hidden.length === 0)}>
    {hidden.length === 0 && <Icon name="check" size={14} />}
    All {bays.length}
  </ButtonBase>
  {bays.map((b) => (
    <ButtonBase key={b.id} aria-pressed={on(b)} aria-label={\`\${b.name}, \${count(b)} bookings\`} onClick={() => toggle(b)} sx={chip(on(b))}>
      <Icon name={on(b) ? 'check' : 'visibility_off'} size={14} />
      {b.short} <span>{count(b)}</span>
    </ButtonBase>
  ))}
</Stack>`,
  },
  related: [
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
  ],
};

export default doc;
