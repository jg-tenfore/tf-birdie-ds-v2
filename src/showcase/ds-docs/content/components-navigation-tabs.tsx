import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Tabs — MUI Tabs on both surfaces, for the sections of one record (a reservation). Plus the pill
 * room tabs on Table Chart, and the Settings section list, which do a neighbouring job.
 */
const doc: DsDoc = {
  summary: (
    <>
      A row of labels that switches between sections of <strong>one thing</strong>. In Birdie that thing is almost always a{' '}
      <strong>reservation</strong>: <strong>Players · Financial · Notes · Activity</strong>, the same four tabs in the
      tablet's slide-over panel and on the handheld's reservation screen. It is MUI's <code>Tabs</code>, themed per surface:
      dense and 40px on the counter, 48dp on the phone. (Not to be confused with the restaurant's <em>Tabs</em> screen, which
      lists open bar tabs.)
    </>
  ),
  statusNote: (
    <>
      MUI Tabs on both surfaces: the reservation panel and the Booking Detail dialog on the tablet; the reservation and the
      rate card on the handheld. Table Chart's room pills are tabs built on <code>ButtonBase</code>.
    </>
  ),
  mui: ['Tabs', 'Tab'],
  useFor: [
    'Sections of one record that don’t fit on one screen: a reservation’s players, money, notes and history.',
    'Two to five peers of the same kind, where the operator looks at one at a time: shift bands on the rate card, rooms on Table Chart.',
  ],
  dontUseFor: [
    'Narrowing a list (Unpaid, Mine, Front 9): filter chips.',
    'Moving between screens of the app: the main navigation (tablet) or the navigation bar (handheld).',
    'Choosing a value in a form: Toggle Button.',
    'A long list of sections (Settings has thirteen): a vertical section list.',
  ],
  inBirdie: [
    {
      label: 'The reservation panel, tablet',
      caption: (
        <>
          Four full-width tabs under the booking's header. <strong>Players</strong> is selected: green label and underline.
          Notes gets a yellow dot when the booking has a note, so a note isn't hidden just because nobody opened its tab.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--notes-tab',
    },
    {
      label: 'The same four, handheld',
      caption: (
        <>
          The phone's reservation keeps the tablet's four tabs in the top app bar, full width, 48dp tall, with a 3dp
          indicator. Switching tab replaces the route instead of pushing, so Back leaves the reservation rather than stepping
          through tabs.
        </>
      ),
      shot: 'mobile-reservation',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--reservation',
    },
    {
      label: 'Rooms as pill tabs, tablet',
      caption: (
        <>
          Table Chart's rooms sit in the toolbar as pills with <code>role="tab"</code>: Dining Room, Patio, Bar. A room with
          unsaved edits carries an orange dot until it is saved.
        </>
      ),
      shot: 'tablet-table-chart',
      tabletHash: '#/table-chart',
    },
  ],
  birdie: [
    {
      name: 'ReservationContent tabs',
      file: 'src/pos/components/ReservationPanel.tsx',
      use: 'the reservation panel: MUI Tabs, variant="fullWidth", driven by the store (setReservationTab) so a link can open any tab.',
      surface: 'tablet',
    },
    {
      name: 'RoomTab',
      file: 'src/pos/components/restaurant/TableChartView.tsx',
      use: 'rooms in the Table Chart toolbar: pill tabs on ButtonBase, role="tab", with an unsaved dot.',
      surface: 'tablet',
    },
    {
      name: 'Settings section list',
      file: 'src/pos/components/operations/SettingsView.tsx',
      use: 'thirteen sections down the left, each with a one-line blurb, aria-current on the open one. Tabs that outgrew a row.',
      surface: 'tablet',
    },
    {
      name: 'BookingDetailScreen tabs',
      file: 'src/pos/mobile/screens/tee/BookingDetailScreen.tsx',
      use: 'the reservation on the handheld: MUI Tabs inside the top app bar, the tab kept in the route.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Tab strip', description: 'Full width, under the record’s header, with a 1px outline-variant rule beneath it.' },
    { part: 'Label', description: 'One word, sentence case. 13px bold on the tablet; 14px medium on the handheld. Grey until selected.' },
    { part: 'Indicator', description: 'A green bar under the selected tab (3dp with rounded top corners on the handheld).' },
    { part: 'Notification dot (optional)', description: 'A 7px dot after a label when the tab holds something the operator should see: a group note.' },
  ],
  variants: [
    {
      name: 'Full width (default)',
      use: 'Four or fewer tabs that share the width: the reservation, the rate card’s shift bands.',
      avoid: 'Labels that won’t fit a quarter of the width.',
    },
    {
      name: 'Scrollable',
      use: 'The older Booking Detail dialog’s five tabs (Details, Players & Status, Financial, Group Notes, Activity).',
      avoid: 'New work. If tabs scroll, there are too many; merge or move to a section list.',
    },
    {
      name: 'Pill tabs (RoomTab)',
      use: 'Peers that live in a toolbar, like rooms on a floor plan editor.',
      avoid: 'Sections of a record: use the underline tabs.',
    },
    {
      name: 'Vertical section list',
      use: 'Many sections with descriptions: Settings.',
      avoid: 'Two to five sections.',
    },
  ],
  states: [
    {
      state: 'Selected',
      tablet: 'Green label, green underline.',
      handheld: 'Green label, 3dp green indicator.',
    },
    {
      state: 'Unselected',
      tablet: 'onSurfaceVariant label, 13px bold. Hover darkens the ripple; the tablet is mouse-first.',
      handheld: 'onSurfaceVariant label, 14px medium.',
    },
    {
      state: 'With a dot',
      tablet: 'Notes shows a yellow dot when the booking has a note.',
    },
    {
      state: 'Focus',
      tablet: 'Arrow keys move focus between tabs; Tab leaves the strip. MUI’s tablist behaviour.',
    },
  ],
  sizing: [
    { surface: 'Tablet', size: '40px in the panel (42px theme default), 13px bold', why: 'Dense, mouse-first; the panel needs its height for four player cards.' },
    { surface: 'Handheld', size: '48dp, 14px medium', why: 'The 48dp target, in the top app bar where a thumb reaches.' },
  ],
  behavior: [
    'Tabs switch content in place. The header, the footer (Check in & pay) and the panel stay put.',
    'The open tab is state the app can link to: res-tab=financial on the tablet, tab: \'financial\' in the handheld route. A review link lands on the tab being reviewed.',
    'On the handheld, switching tab replaces the route; Back leaves the reservation.',
    'Opening a note from elsewhere (a note icon on the sheet) opens the reservation on its Notes tab.',
  ],
  content: [
    'One word per tab: Players, Financial, Notes, Activity.',
    'The same tabs, in the same order, on both surfaces.',
    'Say "tab strip" for this component in specs; "Tabs" alone is also the restaurant screen of open bar tabs.',
  ],
  dos: [
    'Keep the reservation’s four tabs identical on both surfaces.',
    'Put a dot on a tab that holds something unseen and important.',
    'Keep the selected tab in state you can link to.',
  ],
  donts: [
    'Use tabs to filter a list.',
    'Add a fifth tab to the reservation without removing one (the Customer tab came out for a reason).',
    'Let tab labels wrap or truncate.',
  ],
  a11y: [
    'MUI Tabs give role="tablist", role="tab" and aria-selected, and arrow-key movement. RoomTab sets role="tab" and aria-selected itself.',
    <>
      Contrast, computed. <strong>The selected label fails</strong>: green on white is{' '}
      <Contrast fg={md3.primary} bg="#ffffff" label="Players" /> at 13px bold on the tablet, and on the handheld's surface it is{' '}
      <Contrast fg={md3.primary} bg={md3.surface} label="Players" /> at 14px. Unselected labels pass (
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />). The indicator passes as a non-text mark (
      <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />). Fix: a darker selected label (onSurface or
      onPrimaryContainer) and keep the green underline.
    </>,
    'The Notes dot has aria-label="has a group note". Inside a tab label it is read as part of the tab’s name.',
    'Tables (the live floor) switches rooms with a role="group" of pills, while Table Chart uses role="tablist" for the same rooms. Pick one: they are tabs.',
  ],
  decisions: [
    {
      decision: 'Four tabs on the reservation',
      why: 'The Customer tab went in Weston’s third round: "I don’t think it needs to be a tab on the reservation, I wonder if it’s its own thing." A customer record is not a property of a tee time; tapping a name opens it.',
    },
    {
      decision: 'Notes in its own tab, with a dot',
      why: 'Weston: "I like them in a separate tab, because you can have more space and write out the full note — they just go hidden if no one clicks on that tab. Maybe we could show group note as a notification here."',
    },
    {
      decision: 'Settings is a section list, not tabs',
      why: 'Thirteen sections, split into "Editable here" and "Set in Buck · read-only here", each with a one-line description. That doesn’t fit a row.',
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Selected label and indicator' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Unselected label' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The rule under the strip' },
    { token: 'noteColors.yellow.dot', value: '#f59e0b', role: 'The Notes dot' },
  ],
  engineering: {
    import: `import { Tab, Tabs } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiTab</code>: 42px, 13px, weight 700, no text-transform, onSurfaceVariant;{' '}
        <code>MuiTabs</code> 42px. <code>src/theme/mobile-theme.ts → MuiTab</code>: 48dp, 14px, weight 500;{' '}
        <code>MuiTabs</code> 48dp. Neither sets the selected colour, so it falls back to <code>palette.primary.main</code>.
      </>
    ),
    notes: [
      <>
        Tablet: the tab is store state (<code>reservationPanel.tab</code>, <code>setReservationTab</code>), so deep links can
        open it (<code>#/tee-sheet?res=p43&res-tab=financial</code>). Use <code>value</code> with the tab's key, not an index.
      </>,
      <>
        Handheld: the tab is part of the route (<code>{'{ name: \'bookingDetail\', bookingId, tab }'}</code>) and changes with{' '}
        <code>nav.replace</code>, never <code>push</code>.
      </>,
      'To fix the selected-label contrast once for both surfaces, set the selected colour in the MuiTab override rather than per screen.',
    ],
    snippet: `<Tabs
  value={tab}
  onChange={(_, v: ReservationTab) => dispatch({ type: 'setReservationTab', tab: v })}
  variant="fullWidth"
  sx={{ minHeight: 40, borderBottom: \`1px solid \${md3.outlineVariant}\` }}
>
  {RESERVATION_TABS.map((t) => (
    <Tab key={t} value={t} label={TAB_LABELS[t]} sx={{ minHeight: 40, py: 0, minWidth: 0, px: 1 }} />
  ))}
</Tabs>`,
  },
  related: [
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
    { name: 'Bottom Navigation', id: 'components-navigation-bottom-navigation' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Link', id: 'components-navigation-link' },
  ],
};

export default doc;
