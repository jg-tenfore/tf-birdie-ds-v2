import type { DsDoc } from '../types';

/**
 * Paginations — Birdie doesn't page. Its lists are a day long and scroll; days move with arrows; the
 * one record-to-record stepper ("‹ 3 of 88 ›") was kept on the tablet and taken off the phone.
 */
const doc: DsDoc = {
  summary: (
    <>
      Numbered pages for a long list (‹ 1 2 3 … 10 ›). <strong>Birdie doesn't page.</strong> Everything it lists is one day,
      one floor or one search: short enough to scroll, and narrowed with filters and search rather than split into pages.
      Two things look like paging and aren't: the <strong>date arrows</strong> that move the tee sheet a day at a time, and a{' '}
      <strong>"‹ 3 of 88 ›" stepper</strong> that walks from one reservation to the next.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      MUI's <code>Pagination</code> isn't imported in <code>src/pos</code>, and the theme has no override. A candidate to
      remove from the system. Scroll, filter and search instead.
    </>
  ),
  mui: ['Pagination'],
  useFor: ['Nothing in Birdie today. A report or an order history that runs to thousands of rows might earn it; ask first.'],
  dontUseFor: [
    'A day of tee times, tabs or orders: one scrolling list, narrowed with filter chips and search.',
    'Moving between days: the date arrows and Today in the toolbar, or the week strip on the handheld.',
    'Going from one reservation to the next: the tablet panel’s ‹ › stepper.',
    'Finding one record among many: search (Customer Search, Order Lookup).',
  ],
  inBirdie: [
    {
      label: 'A day scrolls, tablet',
      caption: (
        <>
          The tee sheet's list view holds the whole day, grouped (Open balance, then the rest) and narrowed by the status
          chips. There's no page 2: the operator filters to what needs doing and scrolls.
        </>
      ),
      shot: 'tablet-tee-sheet-list',
      tabletHash: '#/tee-sheet/list?status=open&sort=status',
    },
    {
      label: 'Days move with arrows',
      caption: (
        <>
          ‹ and › beside the date, and <strong>Today</strong> to come back. On the phone, a week strip under the date, and a
          calendar sheet for anything further. Time is the unit, not pages.
        </>
      ),
      shot: 'mobile-tee-sheet',
      handheldRoute: 'weston-edits-9-·-date-navigation-mobile--week-strip',
    },
    {
      label: 'Next in line: a record stepper, tablet',
      caption: (
        <>
          In Weston Edits' reservation panel, <strong>‹ 3 of 88 ›</strong> sits beside the close button and steps to the next
          tee time without closing the panel. It skips empty slots and stops at the ends rather than wrapping.
        </>
      ),
      storyId: 'weston-edits-15-·-next-in-line-tablet--the-stepper',
    },
    {
      label: 'Taken off the phone',
      caption: (
        <>
          The phone's reservation had a "‹ 30 of 88 ›" line too. Weston, Oct 1: "I think we could get rid of this… it takes up
          a line." Approved Oct 2; stepping tee time to tee time is a league's need, and moved to the league's own view.
        </>
      ),
      storyId: 'v1-→-v2-migration-100126-11-·-phone-reservation-pager--proposal',
    },
  ],
  birdie: [
    {
      name: 'NextInLine',
      file: 'src/pos/components/ReservationPanel.tsx',
      use: 'stepping from one open reservation to the next in tee-time order, inside the panel.',
      surface: 'tablet',
    },
    {
      name: 'ToolbarButton (‹ › Today)',
      file: 'src/pos/components/TeeSheetView.tsx',
      use: 'moving the tee sheet, Order Lookup and the resource sheets a day at a time.',
      surface: 'tablet',
    },
    {
      name: 'DateNavigation',
      file: 'src/pos/mobile/screens/tee/DateNavigation.tsx',
      use: 'the handheld’s date row, week strip and calendar sheet.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Previous', description: '‹ as an icon button with an aria-label ("Previous tee time"). Disabled at the start, never wraps.' },
    { part: 'Position', description: '"3 of 88": where you are and how many there are. 10.5px, quiet.' },
    { part: 'Next', description: '› with an aria-label ("Next tee time"). Disabled at the end.' },
  ],
  variants: [
    { name: 'Numbered pages (MUI Pagination)', use: 'Not used.', avoid: 'Every list in Birdie. Scroll, filter, search.' },
    {
      name: 'Record stepper (‹ n of N ›)',
      use: 'Working through records in order without closing the one you’re in: the tablet reservation panel.',
      avoid: 'The handheld, where it cost a line of a 360dp screen (removed Oct 2).',
    },
    {
      name: 'Date arrows',
      use: 'Moving through days: tee sheet, Bay and Court Sheets, Order Lookup.',
      avoid: 'Anything that isn’t time.',
    },
  ],
  states: [
    {
      state: 'At the ends',
      tablet: 'The arrow at that end is disabled (30% opacity). The stepper never jumps from the last tee time back to the first.',
    },
    {
      state: 'Fewer than two',
      tablet: 'NextInLine renders nothing when there is nothing to step to.',
    },
    {
      state: 'Handheld',
      tablet: '—',
      handheld: 'No record stepper. Back to the tee sheet, then open the next one.',
    },
  ],
  behavior: [
    'A day is one list. If it’s too long, the answer is a filter or a search, not a page 2.',
    'The record stepper walks the tee times on the courses in view, in time order, skipping blocks, events and empty slots.',
    'It stops at the ends instead of wrapping: a silent jump back to the morning is disorienting when you’re moving fast.',
  ],
  content: ['Position reads "3 of 88": numbers, "of", no "Page".'],
  dos: ['Let lists scroll.', 'Give the operator filters and search to shorten a long list.', 'Disable an arrow at the end rather than wrapping.'],
  donts: ['Split a day into pages.', 'Add a pager line to a handheld screen.', 'Wrap from the last record to the first.'],
  a11y: [
    'The stepper’s arrows are icon buttons with aria-labels ("Previous tee time", "Next tee time"), and disabled at the ends so they drop out of the tab order.',
    'The position text is plain text; it is read in order between the two arrows.',
    'Its arrows are about 26px on the tablet (an 18px icon with 4px padding): fine for a mouse, small for a thumb. If the panel is used by touch, bring them to 34–44px.',
  ],
  decisions: [
    {
      decision: 'No numbered pages',
      why: 'The working set at a counter is one day. Scrolling and filtering keep the whole day in one place; pages would hide half of it behind a click.',
    },
    {
      decision: '"Next in line" on the tablet',
      why: 'From the code comment: after working one reservation you usually work the next, and closing the panel to click a chip two rows down buys nothing (Justin’s suggestion, which Weston took).',
    },
    {
      decision: 'No pager on the phone (Oct 1 proposal 11, approved Oct 2)',
      why: 'Weston: "I think we could get rid of this… it takes up a line." The summary and tabs took the line back.',
    },
  ],
  engineering: {
    themeOverride: <>None. There is no <code>MuiPagination</code> entry in either theme.</>,
    notes: [
      <>
        <code>NextInLine</code> dispatches <code>stepReservation</code> with <code>delta: 1 | -1</code>; the store finds the
        neighbour, so the panel and the sheet behind it move together.
      </>,
      <>
        In the current tablet build (V1 → V2), deep links to two reservations didn't show the stepper, while the Weston Edits
        story does. Worth checking before anyone documents it as current.
      </>,
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.25}>
  <ButtonBase aria-label="Previous tee time" disabled={at === 0} onClick={() => step(-1)}>
    <Icon name="chevron_left" size={18} />
  </ButtonBase>
  <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>{at + 1} of {day.length}</Typography>
  <ButtonBase aria-label="Next tee time" disabled={at === day.length - 1} onClick={() => step(1)}>
    <Icon name="chevron_right" size={18} />
  </ButtonBase>
</Stack>`,
  },
  related: [
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
    { name: 'Date Picker', id: 'components-forms-date-picker' },
    { name: 'Table', id: 'components-layout-structure-table' },
    { name: 'Stepper', id: 'components-navigation-stepper' },
  ],
};

export default doc;
