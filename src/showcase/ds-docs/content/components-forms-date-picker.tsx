import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Date Picker — how Birdie moves between days. MUI X's pickers are themed and in the bundle, but no
 * screen uses them: both surfaces draw their own calendar, because the calendar has to mark the days
 * that have bookings.
 */
const doc: DsDoc = {
  summary: (
    <>
      The control that changes <strong>which day you are looking at</strong>: the tee sheet, the court and bay sheets,
      restaurant reservations, orders and tips, order lookup. Birdie does not use MUI X's pickers. Both surfaces draw
      their own month calendar, because the calendar's real job is to show <strong>which days have tee times</strong> (a
      dot under the date). The <strong>tablet</strong> opens a month grid from the date in the toolbar. The{' '}
      <strong>handheld</strong> shows the week as a strip of days and opens the full month as a bottom sheet.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Choosing a day is on both surfaces, every shift. It is built from Birdie's own components:{' '}
      <code>DatePickerPopover</code> on the tablet, and <code>WeekStrip</code> with <code>CalendarSheet</code> on the
      handheld. No Birdie screen imports MUI X's <code>DatePicker</code> or <code>DateCalendar</code>, so the usage pills
      below say "Not on…".
    </>
  ),
  mui: ['DatePicker', 'DateCalendar', 'TimePicker', 'DateTimePicker'],
  useFor: [
    'Changing the day a screen shows: the tee sheet, a resource sheet, reservations, orders.',
    'Jumping far ahead or back: a month away, or next season.',
    'Showing at a glance which days already have bookings.',
  ],
  dontUseFor: [
    'Stepping one day: use the ‹ › arrows beside the date.',
    "Typing a known date into a form, such as a birthday: use a text field. See Input Date.",
    'Choosing a tee time: use the tee picker or a time list, not a clock.',
    'Ranges of days: Birdie has no range picker. Pick a day, then a span of rows.',
  ],
  inBirdie: [
    {
      label: 'The tee sheet calendar, tablet',
      caption: (
        <>
          The date in the toolbar opens a month grid. Days with tee times have a green dot. This is the far edge of the
          range: days more than a year out are greyed and can't be picked, and › stops.
        </>
      ),
      shot: 'ds-tablet-date-picker',
      tabletHash: '#/tee-sheet',
      storyId: 'weston-edits-9-·-date-navigation-tablet--calendar-range',
    },
    {
      label: 'The calendar sheet, handheld',
      caption: (
        <>
          Tapping <strong>Today · Thu, May 21 ▾</strong> opens the month as a bottom sheet. The selected day is filled, today
          is outlined, dots mark days with tee times. <strong>Today</strong> and <strong>Cancel</strong> sit at the bottom,
          in thumb reach.
        </>
      ),
      shot: 'mobile-date-navigation',
      frame: 'handheld',
      handheldRoute: 'weston-edits-9-·-date-navigation-mobile--calendar-sheet',
    },
    {
      label: 'The week strip, handheld',
      caption: (
        <>
          Under the date chip, the week you are in: one tap per day, a swipe for the next week. Fainter dots mean quieter
          days. Once the list scrolls, the header folds into one row whose arrows step a day.
        </>
      ),
      handheldRoute: 'weston-edits-9-·-date-navigation-mobile--week-strip',
      storyId: 'weston-edits-9-·-date-navigation-mobile--header-folds-on-scroll',
    },
  ],
  birdie: [
    {
      name: 'DatePickerPopover',
      file: 'src/pos/components/DatePickerPopover.tsx',
      use: 'any tablet screen that shows one day. Five screens share it, and they all set the same date.',
      surface: 'tablet',
    },
    {
      name: 'DateChip',
      file: 'src/pos/mobile/screens/tee/DateNavigation.tsx',
      use: 'the viewed date as a tappable field ("Today · Thu, May 21 ▾") that opens the calendar sheet.',
      surface: 'handheld',
    },
    {
      name: 'WeekStrip',
      file: 'src/pos/mobile/screens/tee/DateNavigation.tsx',
      use: 'moving between nearby days with one tap. Swipe pages a week.',
      surface: 'handheld',
    },
    {
      name: 'CalendarSheet',
      file: 'src/pos/mobile/screens/tee/DateNavigation.tsx',
      use: 'the full month, with a year and month chooser for far jumps.',
      surface: 'handheld',
    },
    {
      name: 'CompactDateBar',
      file: 'src/pos/mobile/screens/tee/DateNavigation.tsx',
      use: 'the folded header while the list scrolls: ‹ date › and search.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Trigger', description: 'The date itself. "Thu, May 21, 2026 ▾" in the tablet toolbar; a 40dp outlined chip on the handheld.' },
    { part: 'Day arrows', description: '‹ › beside the trigger step one day. On the handheld they page the week strip instead.' },
    { part: 'Month header', description: '"May 2026 ▾" opens the year chooser. ‹ › page by month and disable at the edge of the range.' },
    { part: 'Day grid', description: 'Seven columns, Sunday first. Single-letter weekday heads.' },
    { part: 'Day cell', description: 'The date, and a 4px dot under it when the day has tee times. Selected is filled green; today has a green ring.' },
    { part: 'Footer (handheld)', description: 'Today on the left, Cancel on the right. The tablet closes on a pick or a click outside.' },
  ],
  variants: [
    {
      name: 'Month popover (tablet)',
      use: 'Every tablet screen with a date in its toolbar. 296px wide, anchored under the date.',
      avoid: 'Inside a dialog. A dialog that needs a date takes it as a field.',
    },
    {
      name: 'Week strip (handheld)',
      use: 'The tee sheet header: the seven days around the viewed one, always visible.',
      avoid: 'Screens where the date rarely changes. The chip alone is enough.',
    },
    {
      name: 'Calendar sheet (handheld)',
      use: 'Anything further than this week. Opens from the date chip.',
      avoid: 'A centred dialog calendar. On the handheld, choices come up from the bottom.',
    },
    {
      name: 'Year and month chooser',
      use: 'Far jumps: tap the month header, pick a year, then a month.',
      avoid: 'Showing it first. It is one tap behind the month, not in front of it.',
    },
    {
      name: 'A date in a form',
      use: (
        <>
          Not this component. The event form uses a native date input (<code>Field type="date"</code>); the customer form
          takes a typed birthday (MM/DD/YYYY). See Input Date.
        </>
      ),
    },
  ],
  states: [
    { state: 'Default', tablet: 'Day number, 12.5px, medium weight.', handheld: 'Day number in a 40dp circle, inside a 48dp target.' },
    { state: 'Today', tablet: 'Green number, 1.5px green ring.', handheld: '1dp green ring. The week strip and the sheet agree.' },
    { state: 'Selected', tablet: 'Filled green circle, white number, white dot.', handheld: 'Same. The week strip marks it with aria-pressed; the sheet with aria-selected.' },
    { state: 'Has tee times', tablet: 'A green dot under the number.', handheld: 'A dot whose strength follows how full the day is: faint, medium, solid.' },
    { state: 'Out of range', tablet: 'More than 12 months from today: greyed, not pickable. The month arrows and years out of range are disabled too.', handheld: 'Same range, at 38% opacity, announced as "unavailable".' },
    { state: 'Another month', tablet: "Leading and trailing days of the next and previous month, faint but pickable.", handheld: 'Left blank. Six rows always, so paging months never jumps the sheet.' },
    { state: 'Hover', tablet: 'A surface-container wash. The tablet is mouse-first.', handheld: 'No hover. The ripple confirms the tap.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '296px popover, 34px day rows, 28px arrows', why: 'A mouse at a counter. Small enough to sit over the grid without hiding the time column.' },
    { surface: 'Handheld', size: '48dp day targets, 64dp week-strip cells, 48dp year and month pills', why: "A thumb, often one-handed at the first tee. Material's 48dp floor." },
  ],
  behavior: [
    'Picking a day sets it and closes the calendar. There is no confirm step: the day you tapped is the answer.',
    'One date for the whole tablet. The tee sheet, court and bay sheets, reservations, orders and order lookup all set the same date, so switching screens never changes the day.',
    'The range is today ± 12 months. Beyond it, days, months and years are disabled and the month arrows stop.',
    'Any day in range has a tee sheet. Dots count what is already booked and, for days not opened yet, what the demo would generate. A day cleared of bookings loses its dot.',
    'The handheld header folds into one row once the list scrolls. Its arrows step a day; the date still opens the sheet.',
    'Today is always one tap away: the Today button on the tablet toolbar, the Today button in the handheld sheet.',
  ],
  content: [
    'The trigger says the day in full, with the year on the tablet: "Thu, May 21, 2026". The handheld drops the year and adds "Today ·" when it is today.',
    'Weekday heads are one letter, Sunday first: S M T W T F S.',
    'Every day has a spoken label on the handheld: "Thursday, May 21, 2026, today, <n> tee times". The dot is never the only signal.',
  ],
  dos: [
    "Use the shared component. A screen that draws its own calendar will disagree about which days have bookings.",
    'Keep the arrows next to the date for one-day steps. Most moves are to tomorrow.',
    'Show the dot. It is the reason this calendar exists.',
    'Close on pick. Asking "OK?" after a date tap doubles the work.',
  ],
  donts: [
    "MUI X's DatePicker for navigation. It can't mark days with bookings.",
    'A centred calendar dialog on the handheld. Use the bottom sheet.',
    'Disabled days with no reason. Out-of-range days say "unavailable" to a screen reader; keep it that way.',
    'A date picker for birthdays. Nobody scrolls back forty years in a month grid.',
  ],
  a11y: [
    'Handheld: every day is a button with its full label, including today and the tee-time count. The sheet is a dialog; its month header says what it opens (aria-expanded).',
    <>
      Handheld gap: the month uses <code>role="grid"</code> and <code>gridcell</code> without <code>row</code> elements, so
      the grid structure is incomplete. An audit tool will flag it.
    </>,
    <>
      Tablet: in the current edition (V1 → V2, built on Weston Edits) each day has a spoken label and the month arrows are
      named. The archived base edition has neither. <strong>Gaps:</strong> the popover doesn't close on Escape and doesn't
      move focus into itself, and the tee sheet's trigger doesn't announce that it opens a calendar.
    </>,
    <>
      Contrast, computed: the selected day is <Contrast fg="#ffffff" bg={md3.primary} label="21" /> and today is{' '}
      <Contrast fg={md3.primary} bg="#ffffff" label="21" />. Both are under AA for 12.5–14px text. They pass as large text
      only, and the ring and fill carry the meaning too. Track a deeper green as an open decision (the Button page has the
      same gap).
    </>,
    <>
      The dot is decorative to the eye and spoken in the label. Its colour against white is{' '}
      <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />.
    </>,
  ],
  decisions: [
    {
      decision: 'Hand-built, not MUI X',
      why: "MUI X's calendar can't put a dot on a day. The dot is the operator's cue for which days are worth opening, so it decided the build (DatePickerPopover.tsx, header comment).",
    },
    {
      decision: 'A week strip on the handheld',
      why: (
        <>
          Weston's round-two feedback on the phone: "there's no way to select the month, so I just have to click." Reaching
          June took a dozen taps. The strip makes nearby days one tap, and the sheet makes far ones three
          (src/showcase/weston-edits/9-date-navigation).
        </>
      ),
    },
    { decision: 'Today ± 12 months', why: 'Covers any real booking horizon. It is an assumption: the date-navigation stories list it under Still open, because nobody has asked Weston whether the sheet should stop at a year.' },
    { decision: 'The same days on both devices', why: 'One generator fills a day for the tablet and the handheld (src/pos/state/use-demo-day-fill.ts), so June 12 has the same bookings wherever you open it.' },
    { decision: 'Bottom sheet, not a dialog, on the handheld', why: "Material's pattern for a phone, and it keeps Today and Cancel in thumb reach." },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Selected fill, today ring, booking dots' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px popover border, date chip outline' },
    { token: 'radius.lg', value: '16px', role: 'Popover corners' },
    { token: 'elevation.e3', value: '0 4px 8px 3px …', role: 'Popover lift over the grid' },
    { token: 'mobile.touchTarget', value: '48', role: 'Handheld day, year and month targets' },
  ],
  engineering: {
    import: `import { DatePickerPopover } from '../components/DatePickerPopover';                      // tablet
import { CalendarSheet, DateChip, WeekStrip } from '../mobile/screens/tee/DateNavigation'; // handheld`,
    themeOverride: (
      <>
        None. MUI X's pickers have no override in <code>src/theme/theme.ts</code>. <code>LocalizationProvider</code> with
        Day.js is mounted in <code>src/main.tsx</code> and <code>.storybook/preview.tsx</code>, so a picker would work if
        one were ever needed.
      </>
    ),
    notes: [
      <>
        The date lives in the store: <code>state.currentDate</code>, changed with <code>setDate</code> or{' '}
        <code>shiftDate</code>. The components read and dispatch; they hold only the month on view.
      </>,
      <>
        Dots come from <code>state.bookings</code> plus <code>unfilledDemoDay</code> (<code>src/pos/state/demo-days.ts</code>
        ); the range from <code>demoRange()</code> and <code>clampToDemoRange()</code>. Use them rather than recomputing.
      </>,
      <>
        Tests find days by their label (<code>{"getByRole('button', { name: /^Friday, June 12, 2026, has tee times$/ })"}</code>
        ), so the label is part of the contract.
      </>,
    ],
    snippet: `const [anchor, setAnchor] = useState<HTMLElement | null>(null);

<Box sx={{ position: 'relative' }}>
  <ButtonBase onClick={(e) => setAnchor(anchor ? null : e.currentTarget)}>
    {dateLabel} <Icon name="expand_more" size={18} />
  </ButtonBase>
  {anchor && <DatePickerPopover onClose={() => setAnchor(null)} />}
</Box>`,
  },
  related: [
    { name: 'Input Date', id: 'components-forms-input-date' },
    { name: 'Tee Sheet', id: 'components-layout-structure-tee-sheet' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
