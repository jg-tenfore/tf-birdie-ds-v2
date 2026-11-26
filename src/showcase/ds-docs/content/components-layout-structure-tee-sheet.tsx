import { md3, noteColors, payBadges } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Tee Sheet — Birdie's signature component. Not an MUI component: the grid, the list, the
 * slide-over it opens and the handheld's list are all Birdie's own, built on ButtonBase and Box.
 * Every number here was read from the code or measured in the running prototype (Nov 26).
 */
const doc: DsDoc = {
  summary: (
    <>
      The day at a golf course: every tee time, on every course, with who is playing and whether they have paid. It is the
      screen the counter opens on and the one staff come back to between every sale. On the <strong>tablet</strong> it is a
      grid, courses across and time down, where a booking's width is its party size and its colour is its payment. Clicking a
      tee time opens its <strong>reservation</strong> over the sheet: golf first, order second. On the{' '}
      <strong>handheld</strong> the same day is a list, one row per time, because a 360px screen cannot hold the grid.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Birdie's own component on both surfaces, built on <code>ButtonBase</code> and <code>Box</code>, so the MUI usage scan
      does not see it. The tablet draws <code>TeeSheetView</code> (toolbar, then <code>TeeSheetGrid</code> or{' '}
      <code>ListView</code>); the handheld draws <code>TeeSheetScreen</code>. It has 39 stories here, 120 under Prototypes › Tablet › Tee Sheet
      and 105 under Prototypes › Mobile › Tee Sheet.
    </>
  ),
  useFor: [
    'Seeing a day of tee times at once: what is booked, what is open, who still owes money.',
    'Starting a booking: an open cell is the party-size picker.',
    'Opening a reservation to check players in, change holes, rates or transport, then Check in & pay.',
    'Day-level operations from the row and course menus: block a time, pin a note, override a price, lock a course.',
  ],
  dontUseFor: [
    'Courts and bays: those are the resource sheets (ResourceSheetView), which share the toolbar but not the grid.',
    'Finding one booking by name: use Search bookings in the toolbar, or the list view with a filter.',
    'Taking payment: the sheet hands the reservation to the register through Check in & pay.',
    'Any other schedule (lessons, events). The grid encodes golf: slots per course, players per slot.',
  ],
  inBirdie: [
    {
      label: 'The grid, Clover Mini',
      caption: (
        <>
          The 18-hole club's front and back nines, early morning. Solid green is paid, white with a green outline is unpaid,
          orange is refunded, hatched grey is a no-show. A foursome fills the row; a single takes one cell. The ⊕ cells are open.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
      storyId: 'prototypes-tablet-tee-sheet-sheet-views--calendar-grid',
    },
    {
      label: 'The list view, the unpaid worklist',
      caption: (
        <>
          The same day as cards, filtered to Unpaid and sorted by status. The status chips carry live counts, and each card
          leads with the balance, because this view exists to answer "who still owes".
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
      storyId: 'prototypes-tablet-tee-sheet-sheet-views--unpaid-worklist',
    },
    {
      label: 'The reservation, over the sheet',
      caption: (
        <>
          Clicking a tee time opens its reservation as an 820px slide-over. The sheet behind is dimmed to 70% black and frozen
          (inert), not narrowed. Players, holes, rate and transport first; <strong>Check in & pay all</strong> last.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--over-the-tee-sheet',
    },
    {
      label: 'The handheld: a list, not a grid',
      caption: (
        <>
          One row per tee time. Bookings are outlined cards with a payment stripe on the left; open capacity is a dashed Book
          target. The week strip and course chips scroll away with the list and a one-line date bar docks in their place.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--from-the-tee-sheet',
      storyId: 'prototypes-mobile-tee-sheet-sheet-views--default',
    },
    {
      label: 'On the 21.5″ display',
      caption: (
        <>
          The grid keeps its 46px rows and its density, so a taller screen shows more of the day: about 20 rows on the large
          display against about 14 on the Clover Mini. Columns do not multiply; each course group gets wider. See Start Here ›
          Devices, or open the prototype with <code>?device=large-display</code>.
        </>
      ),
      storyId: 'start-here-devices--overview',
    },
    {
      label: 'Archived: the original port and Tee Sheet Actions',
      caption: (
        <>
          The first port opened a tee time straight into the register; Weston's round 1 changed that. Tee Sheet Actions (Sep 3)
          showed every write as a before and after sheet. Both are kept under Archive for history. Do not build from them.
        </>
      ),
      shot: 'archive-tablet-tee-sheet',
      storyId: 'tee-sheet-actions-1-·-create--new-booking',
    },
  ],
  birdie: [
    {
      name: 'TeeSheetView',
      file: 'src/pos/components/TeeSheetView.tsx',
      use: 'the tablet tee sheet: toolbar, the multi-select bar when active, then the grid or the list. What the app mounts.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheetGrid',
      file: 'src/pos/components/TeeSheetGrid.tsx',
      use: 'the calendar grid: sticky course headers, time gutter, band separators, chips, open cells, the now line, row banners.',
      surface: 'tablet',
    },
    {
      name: 'ListView',
      file: 'src/pos/components/ListView.tsx',
      use: 'the same day as filterable cards, grouped by band, status or course. The worklist view.',
      surface: 'tablet',
    },
    {
      name: 'ReservationPanel',
      file: 'src/pos/components/ReservationPanel.tsx',
      use: 'the slide-over a tee time opens: Players, Financial, Notes, Activity, then Check in & pay.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheetSidebar',
      file: 'src/pos/components/TeeSheetSidebar.tsx',
      use: 'the day or course summary drawer: golfers out, carts, who has not paid, then the day in time order.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheetSettingsPanel',
      file: 'src/pos/components/TeeSheetSettingsPanel.tsx',
      use: 'per-terminal view preferences under the toolbar’s tune icon: compact rows, hide empty rows, auto-scroll.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheet',
      file: 'src/pos/components/TeeSheet.tsx',
      use: 'the sheet standalone, with its own provider and frame. For stories and reviews; the app never mounts it.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheetScreen',
      file: 'src/pos/mobile/screens/tee/TeeSheetScreen.tsx',
      use: 'the handheld tee sheet: time rows, booking cards, Book targets, long-press sheets.',
      surface: 'handheld',
    },
    {
      name: 'BookingCard',
      file: 'src/pos/mobile/screens/tee/parts.tsx',
      use: 'one booking at phone size, with the payment colour as a 4px stripe. Also used by search and the day summary.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Toolbar (56px)', description: 'Date (‹ date ›, Today), the band selector, the golfers count, Calendar / List, Search, Day summary, Settings, and a dark Register pill. Fixed while the day scrolls.' },
    { part: 'Course header (sticky)', description: 'Course name and holes ("FRONT 9"), golfers · carts · walkers for the day, ⓘ for rates, ⋮ for the course menu, then a "SLOT 1…4" label row (18px). A course note pins under the name.' },
    { part: 'Time gutter (60px)', description: 'The tee time ("6:08 AM"). Clicking it opens the row menu: block, note, price, league, move. A green $ marks a price override on that row.' },
    { part: 'Band separator (28px)', description: 'Early Morning, Peak Hours, Twilight, named at each boundary on the full-day view, over a faint band tint.' },
    { part: 'Booking chip', description: 'One cell per player, so its width is the party size. Name in caps, then players · transport · holes, or a status word. Colour is payment state. A member dot and a note icon when they apply.' },
    { part: 'Open cell', description: 'A ⊕ button. The Nth open cell in a run books N players, starting at the run’s first slot.' },
    { part: 'Now line', description: 'A 2px red rule with a dot, inside the row that holds the current time. Today only.' },
    { part: 'Row banners', description: 'A time note (frost delay, lightning hold) under its row, in one of five note colours; a price override above its first row, in green.' },
    { part: 'Multi-select bar (52px)', description: 'Dark, under the toolbar, while selecting: count, Select all, Mark paid, No show, Rain check, Message, Clear.' },
  ],
  variants: [
    {
      name: 'Grid (Calendar)',
      use: 'The default. The shape of the day: capacity, payment and gaps at a glance.',
      avoid: 'Hunting for one party in a busy day. Search or the list is faster.',
    },
    {
      name: 'List',
      use: 'Worklists: unpaid, no-shows, notes. Filter chips with counts, a filter drawer, sort by time, status or course.',
      avoid: 'Booking a new tee time. The list shows bookings, not openings.',
    },
    {
      name: 'One band (Early Morning, Peak, Twilight)',
      use: 'Working one part of the day. The grid narrows to that band and takes its tint.',
      avoid: '"Week" in the same menu: it shows the same day without band labels (see Decisions).',
    },
    {
      name: 'Compact rows',
      use: '30px rows, name only, for scanning a busy day. About 21 rows show on the Clover Mini instead of 14.',
      avoid: 'When status matters: the status word (REFUNDED, NO SHOW) drops with the meta line.',
    },
    {
      name: 'Hide empty rows',
      use: 'A quiet day: removes rows with nothing booked on any course.',
      avoid: 'Booking. The empty rows are where the openings are.',
    },
    {
      name: 'Focused course',
      use: 'One busy track at full width, from the course ⋮ menu. Show all courses puts the rest back.',
    },
    {
      name: 'Club layout: three nines · 18 · nine',
      use: (
        <>
          Set by the club, not the operator: one column group per course in <code>venues.ts</code>. Three nines is 12 cells a
          row, an 18 is front and back nines (8 cells), a single nine is 4.
        </>
      ),
    },
    {
      name: 'Handheld list',
      use: 'The phone. A time list with booking cards and Book targets; course chips pick one course or all.',
      avoid: 'Porting the grid to the phone. It does not fit and was never designed to.',
    },
  ],
  states: [
    {
      state: 'Paid',
      tablet: 'Solid green chip, white text. A party where every player has paid.',
      handheld: <>Green stripe and a PAID badge.</>,
    },
    {
      state: 'Unpaid (open)',
      tablet: 'White chip, green 1.5px outline, dark text. A party that is partly paid still reads as unpaid: money outstanding is the thing not to miss.',
      handheld: 'Grey stripe and an OPEN badge.',
    },
    {
      state: 'No show · rain check',
      tablet: 'Hatched grey, grey text, the status word. The two look the same on the grid; only the word differs.',
      handheld: 'NO SHOW is a red badge, RAIN CHK an indigo one, and a no-show name is struck through.',
    },
    { state: 'Refunded', tablet: 'Orange chip, white text, REFUNDED.', handheld: 'Orange badge; the card dims to 70%.' },
    {
      state: 'Blocked',
      tablet: 'Hatched slate across the whole course group, with a block icon. A closed row reads as closed, not as a big booking.',
      handheld: 'A flat tinted card with no stripe: it holds a slot, it is not a party.',
    },
    { state: 'League or event', tablet: 'Violet, a trophy icon, not bookable one by one.', handheld: 'Flat violet card with a groups icon.' },
    {
      state: 'Open slot',
      tablet: 'A ⊕ cell; on hover a faint green wash and a green icon. Its accessible name says what a click books: "Book 2 players on Front Valley at 9:12 AM".',
      handheld: 'A 44px dashed "Book · 2 slots open" on one course, or one 32px chip per course on All courses.',
    },
    { state: 'Locked course', tablet: 'Header at 72% opacity with a lock; open cells are disabled and lose the ⊕.', handheld: 'The Book target says "Front 9 locked" and is disabled.' },
    {
      state: 'Hover',
      tablet: 'The chip darkens (brightness 92%) and grows 3%. The tablet is mouse-first, so hover is a real cue.',
      handheld: 'No hover. Long-press opens the booking’s actions as a bottom sheet.',
    },
    {
      state: 'Open in the panel',
      tablet: 'The booking the reservation is showing gets a 2.5px dark outline, so the sheet still says which tee time is being worked.',
      handheld: 'Not needed: the reservation is a full screen.',
    },
    { state: 'Multi-selected', tablet: '3px blue outline and a soft halo; the rest dim to 82%.', handheld: 'Not available.' },
    { state: 'Past day · future day', tablet: 'No now line. A past day is settled; a future day is mostly unpaid.', handheld: 'Same.' },
  ],
  sizing: [
    {
      surface: 'Clover Mini 1280×800',
      size: '46px rows (30 compact), 60px gutter, 56px toolbar. About 14 rows in view, 21 compact. Three nines leave ~97px a slot.',
      why: 'Measured in the prototype: the scroller is 744px tall under a 91px sticky header. Chips are dense on purpose: the whole morning should be scannable.',
    },
    {
      surface: 'Large display 1920×1080',
      size: 'Same rows and type. About 20 rows in view, 31 compact. Each course group widens; no extra columns.',
      why: 'More of the day, not bigger controls (src/pos/devices.ts). The register and nav add tiles; the sheet adds rows.',
    },
    {
      surface: 'With the reservation open',
      size: 'The panel is 820px. On the Clover Mini, 404px of sheet shows beside it with the rail collapsed, 140px with the 320px order rail open.',
      why: '1280 − 56 − 820 and 1280 − 320 − 820. Weston chose room for the reservation over room for the sheet. The 140px case is an open decision.',
    },
    {
      surface: 'Handheld 360×800',
      size: '64px time column, booking cards that grow with their content, 44px Book targets, 36px sticky band headers.',
      why: 'A thumb, often outdoors. The compact Book chips on All courses are 32px, under the 48dp floor (an open decision).',
    },
  ],
  behavior: [
    <>
      <strong>Golf first, order second.</strong> Clicking a booking opens its reservation, never the register. Nothing reaches the
      cart until Check in & pay. One hook, <code>useOpenBooking</code>, decides this for the grid, the list, the summary and search.
    </>,
    <>
      <strong>Open cells are a party-size picker.</strong> Openings are contiguous runs, not a count: with slots 1 and 3 free and 2
      taken, each is a run of one and neither can seat a pair (<code>logic/openings.ts</code>, unit-tested).
    </>,
    <>
      <strong>The reservation freezes the sheet.</strong> A 70% scrim covers the whole terminal and the background is{' '}
      <code>inert</code>. Escape closes it unless a dialog is open over it; a tap on the scrim does not, so a stray tap cannot
      discard edits. A booking off screen scrolls into view, smoothly, only if it is not already visible.
    </>,
    'Right-click on a chip opens its menu: Booking details, Check in all players, Mark all paid, Refund, Issue rain check, Select multiple, Move players, Mark no-show, Delete booking. Clicking a time opens the row menu: Block this time, a note, Override price, Create league / outing, Move players out, Mark row paid, Check in row. The handheld uses long-press for both and shows them as bottom sheets.',
    'The sheet never scrolls sideways. Every column shrinks to fit the frame; the course headers and the time gutter stay pinned while the rows scroll.',
    'It opens near now, not at 6 AM: the row holding the current time sits about 180px from the top (Auto-scroll to now, on by default).',
    'The band selector also scopes the list view, so both views agree about which part of the day is showing.',
    'Course load in the header counts carts as riders ÷ 2, rounded up: a riding cart seats two.',
    'Settings are per-terminal view preferences, not club configuration. A course’s bookable window lives in its own Time settings dialog.',
  ],
  content: [
    'Names are "Surname, I." and render in caps on the chip and the tablet list card ("HARRISON, T."). The handheld shows the name as written.',
    'The meta line is players, a car or walker icon, and holes: "4P", icon, "18H". A status word replaces it. PAID is never written on a green chip; the colour says it.',
    'Times are "6:08 AM" in the gutter and "6:08AM" in banners. Links carry them as 24-hour "0608".',
    'Band names are Early Morning, Peak Hours, Twilight, with their hours beside them.',
    'Counts lead: "244 golfers", "Unpaid 27". On the handheld: "Book · 2 slots open".',
  ],
  dos: [
    'Let colour mean payment and nothing else. New booking types get an icon or a word, not a new fill.',
    'Book from the open cell the party needs: the Nth cell seats N.',
    'Keep the reservation as the only way from a tee time to the register.',
    'Pin notes to the row or the course where everyone will see them, not in a booking.',
  ],
  donts: [
    'A horizontal scroll on the grid. If a club has more courses, focus or hide one.',
    'Green for anything that is not paid.',
    'Squeezing the sheet beside the panel. It was tried and replaced by the scrim.',
    'A second tee sheet for a new club shape. Add a venue to venues.ts instead.',
  ],
  a11y: [
    <>
      Open cells are real buttons with names that carry the party size ("Book 2 players on Front Valley at 9:12 AM"). A locked
      cell says "course locked". <strong>Booking chips are not buttons:</strong> they are a <code>Box</code> with a click and a
      context-menu handler, so a keyboard cannot reach them and a screen reader hears only the name. Make each chip a{' '}
      <code>ButtonBase</code> named "Harrison, T., 4 players, paid" before this ships.
    </>,
    <>
      Chip text fails AA. The name is 9px, 800 weight, and the status word 7.5px, both below the 12–14px the rest of the tablet
      uses. Paid: <Contrast fg="#ffffff" bg={md3.primary} label="REED" />. Its meta line, 75% white:{' '}
      <Contrast fg="#c5e8d2" bg={md3.primary} label="2P" />. Refunded: <Contrast fg="#ffffff" bg="#ea580c" label="REF" />. No-show
      name: <Contrast fg="#888888" bg="#d0d4d0" label="NO" />. Unpaid passes: <Contrast fg={md3.onSurface} bg="#ffffff" label="WHITE" />.
    </>,
    <>
      Band labels: Early Morning <Contrast fg="#f59e0b" bg="#ffffff" label="EARLY" /> and Peak Hours{' '}
      <Contrast fg="#16a34a" bg="#ffffff" label="PEAK" /> fail at 11px; Twilight passes (<Contrast fg="#7c3aed" bg="#ffffff" label="TWI" />).
      The open cell’s ⊕ is <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" label="⊕" />, the only sign a cell is
      bookable. The gutter times and SLOT labels miss AA by a hair:{' '}
      <Contrast fg={md3.outline} bg="#ffffff" label="6:00" />: it rounds to 4.5:1 but sits just under it, at 10px and 9px.
    </>,
    <>
      Colour is not the only signal for most states: paid is a fill, unpaid an outline, blocks and no-shows a hatch, and each has
      a word. Two gaps: in <strong>compact rows</strong> the word drops, leaving paid green and refunded orange told apart by hue
      alone; and the <strong>Colourblind mode</strong> toggle in Settings changes nothing on the grid today.
    </>,
    <>
      The pay badges (the list view, the summary and the handheld) share <code>payBadges</code>. Three miss AA: PAID{' '}
      <Contrast fg={payBadges.paid.text} bg={payBadges.paid.bg} label="PAID" />, OPEN{' '}
      <Contrast fg={payBadges.open.text} bg={payBadges.open.bg} label="OPEN" /> and REFUNDED{' '}
      <Contrast fg={payBadges.refund.text} bg={payBadges.refund.bg} label="REF" />. The others pass: NO SHOW{' '}
      <Contrast fg={payBadges.no_show.text} bg={payBadges.no_show.bg} label="NO" />, RAIN CHK{' '}
      <Contrast fg={payBadges.rain_chk.text} bg={payBadges.rain_chk.bg} label="RAIN" />, BLOCKED{' '}
      <Contrast fg={payBadges.block.text} bg={payBadges.block.bg} label="BLK" />, EVENT{' '}
      <Contrast fg={payBadges.event.text} bg={payBadges.event.bg} label="EVT" />. Notes read well:{' '}
      <Contrast fg={noteColors.yellow.text} bg={noteColors.yellow.bg} label="Frost" />.
    </>,
    'The scrimmed reservation is modal: the background is inert, out of the tab order and the accessibility tree. Escape closes it.',
  ],
  decisions: [
    {
      decision: 'Colour encodes payment state, not booking type',
      why: 'The counter’s first question is who still owes money, so money gets the strongest signal. Type gets an icon or a word.',
    },
    {
      decision: 'A booking’s width is its party size',
      why: 'One cell per player makes each row read as capacity without a number: a foursome fills the course, a single leaves three ⊕.',
    },
    {
      decision: 'A tee time opens the reservation, not the register (Weston, round 1)',
      why: '"The order comes after the golf." Players, holes, fees and transport are adjusted first; Check in & pay loads exactly that into the register.',
    },
    {
      decision: 'The panel is 820 and the sheet is frozen behind it (round 4)',
      why: 'Weston: "I like the 820… the more real estate we can have, probably the better." Squeezing the sheet beside it compressed it to about one nine; dimming keeps every column at its natural width.',
    },
    {
      decision: 'The handheld is a list, not a small grid',
      why: 'The grid does not shrink to 360px. A time list with cards keeps the same signals (payment colour, party, transport, holes) at touch size.',
    },
    {
      decision: 'A club’s shape is its courses array',
      why: 'Three nines, an 18 and a single nine are one codebase: venues.ts changes the column groups, nothing else, so three prototypes cannot drift into three apps.',
    },
    {
      decision: 'Open: about 140px of sheet beside the 820 panel on the Clover Mini',
      why: 'With the order rail open, 1280 − 320 − 820 leaves 140px (226px on the 1366 design canvas). Options: collapse the rail while the panel is open, cap the panel at 640 on compact frames, or accept it as background. For Justin.',
    },
    {
      decision: 'Open: the grid ignores Interval and Start/End hour',
      why: 'TeeSheetGrid draws its rows from the default 8-minute, 6 AM–6 PM times and the band, not from settings. The 7/10/15-minute and 5 AM–8 PM settings change nothing on the tablet (they do on the handheld). Fix the grid or remove the settings.',
    },
    {
      decision: 'Open: "Week" in the band menu, and Colourblind mode',
      why: 'Week is listed beside the bands but shows the same day without band labels. Colourblind mode is a toggle with no effect. Build both or remove them.',
    },
  ],
  tokens: [
    { token: 'grid.rowH / rowHCompact', value: '46 / 30px', role: 'Row height, comfortable and compact' },
    { token: 'grid.timeGutterW', value: '60px', role: 'The time column' },
    { token: 'grid.slotHeaderH', value: '18px', role: 'The SLOT 1…4 label row' },
    { token: 'grid.topbarH', value: '56px', role: 'Toolbar height, shared with the other sheets' },
    { token: 'shifts.early / peak / twilight', value: '6–10 · 10–14 · 14–18', role: 'Bands: label, icon, colour, 7% row tint (bandBg)' },
    { token: 'md3.primary', value: '#17a34a', role: 'Paid fill, unpaid outline, open-cell hover' },
    { token: 'payBadges', value: '7 states', role: 'Badges in the list, the summary and on the handheld' },
    { token: 'noteColors', value: '5 colours', role: 'Time-row notes' },
    { token: 'reservationPanel.motion', value: '.22s', role: 'The slide-over and its scrim' },
    { token: 'radius.sm', value: '8px', role: 'Chip corners' },
  ],
  engineering: {
    import: `import { TeeSheetView, ToolbarButton } from '../components/TeeSheetView'; // tablet, inside PosShell
import { TeeSheet } from '../components/TeeSheet';                   // standalone, for stories
import { TeeSheetScreen } from './screens/tee/TeeSheetScreen';       // handheld (via the screen registry)`,
    themeOverride: (
      <>
        None. The sheet is <code>ButtonBase</code>, <code>Box</code>, <code>Tooltip</code> and <code>Typography</code> styled from{' '}
        <code>src/theme/tokens.ts</code> (<code>grid</code>, <code>shifts</code>, <code>md3</code>). Chip colours come from{' '}
        <code>chipStyle()</code> in <code>TeeSheetGrid.tsx</code>, which hand-codes its fills; the list and the handheld use{' '}
        <code>payBadges</code>. The two maps disagree on no-show (grey hatch vs red) and rain check (grey hatch vs indigo).
      </>
    ),
    notes: [
      <>
        Everything the sheet shows is store state: <code>teeSheetMode</code>, <code>shift</code>, <code>currentDate</code>,{' '}
        <code>settings</code>, <code>courses</code>, <code>listFilters</code>, <code>reservationPanel</code>. A story pins a
        condition by passing <code>initialState</code>; nothing is component state that a link cannot reach.
      </>,
      <>
        Deep links (<code>src/pos/state/url-state.ts</code>): <code>#/tee-sheet?date=2026-05-23&shift=peak</code>,{' '}
        <code>#/tee-sheet/list?status=open&sort=status</code>, <code>#/tee-sheet?res=p04_m6&res-tab=financial</code>, plus{' '}
        <code>rate=0</code>, <code>pw=cover</code>, <code>compact=1</code>, <code>hide-empty=1</code> and <code>?venue=nine</code>.
      </>,
      <>
        Weston’s four switches (panel width, row density, transport, rate catalog) are Storybook toolbar globals, threaded into
        state by <code>weston-globals.tsx</code>, and also link params (<code>width</code>, <code>density</code>,{' '}
        <code>transport</code>, <code>catalog</code>). The panel’s widths are <code>PANEL_WIDTHS</code> in{' '}
        <code>pos-store.ts</code>: 640, 820 (default), cover.
      </>,
      <>
        Bookings are indexed by <code>course:time</code> once per render, so each of ~1,000 cells is a map lookup. The now line
        and the opening scroll are measured from row elements, not computed, because band separators, banners and hidden rows
        change where a row is.
      </>,
      <>
        Test hooks, not a11y: <code>data-booking-id</code>, <code>data-booking</code> (name|players|pay|status|ci|paid),{' '}
        <code>data-tee-sheet-scroller</code>, <code>data-sticky-header</code>. Story play functions and the panel’s scroll-into-view
        rely on them.
      </>,
      <>
        <code>usePanelSqueeze</code> is dormant: only a <code>backdrop=squeeze</code> link param turns it on. Keep it or delete it, but do
        not build on it.
      </>,
    ],
    snippet: `// A story: the 18-hole club, peak hours, compact, one booking open in the panel.
<TeeSheet
  state={{
    venueId: 'eighteen',
    bookings: venueBookings('eighteen'),
    courses: venue('eighteen').courses,
    shift: 'peak',
    settings: withSettings({ compactMode: true }),
  }}
/>`,
  },
  related: [
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
