import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * List — a vertical stack of rows, each one thing. The handheld's backbone (the MUI List family,
 * themed to Material 3 touch sizes); the tablet builds its rows by hand and does not import it.
 */
const doc: DsDoc = {
  summary: (
    <>
      A vertical stack of rows, each one thing you can read or tap: a destination, a customer, a player, an action. On the{' '}
      <strong>handheld</strong> it is the backbone of nearly every screen, built from MUI's List family and themed to Material 3
      sizes: 56, 72 and 88dp rows, a 40dp icon column, green section headers. The <strong>tablet</strong> does not use MUI's List.
      Its rows are drawn by hand at desk density: two-line menu items, list cards, summary rows.
    </>
  ),
  statusNote: (
    <>
      Used on the handheld only: <code>ListItemButton</code> and <code>ListItemText</code> in 15 files,{' '}
      <code>ListSubheader</code> in 3. The tablet’s rows are <code>Stack</code>s and <code>ButtonBase</code>s; its{' '}
      <code>MuiListItemButton</code> override (38px) has nothing to style.
    </>
  ),
  mui: ['List', 'ListItemButton', 'ListItemIcon', 'ListItemText', 'ListSubheader'],
  useFor: [
    'Handheld screens made of rows: More, People, a reservation’s players, the day summary.',
    'Settings-like pages: an icon, a label, a line of supporting text, a chevron when it pushes a screen.',
    'Short lists of choices inside a bottom sheet (a tee time’s actions).',
  ],
  dontUseFor: [
    'A tee time’s bookings on the handheld: those are BookingCards, with a payment stripe.',
    'Records with columns to compare on the tablet: use Table.',
    'Options to pick between in place: use chips, a segmented button or radios.',
    'The tablet, today. Its rows are Birdie components (below); match those rather than mixing in MUI’s.',
  ],
  inBirdie: [
    {
      label: 'More: sectioned rows',
      caption: (
        <>
          A green section header, then rows of icon, label and supporting line. A chevron means the row pushes a screen; no chevron
          means it acts in place (Reprint last receipt).
        </>
      ),
      shot: 'mobile-more',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--more-root',
      storyId: 'components-layout-structure-list--in-birdie-handheld-more',
    },
    {
      label: 'People: the contacts pattern',
      caption: (
        <>
          Sticky letter headers, an avatar in the member tier’s colour, name and supporting line, HCP on the right. On the 360px
          Quest the phone number wraps to a third line.
        </>
      ),
      shot: 'mobile-people',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-7-·-people--people-list',
      storyId: 'components-layout-structure-list--in-birdie-handheld-people',
    },
    {
      label: 'Orders & Tips: figure-right rows',
      caption: (
        <>
          The handheld’s answer to a table: two lines on the left, the amount and its tip on the right. Note the order numbers
          read "##A-20918": a doubled hash, an open bug.
        </>
      ),
      shot: 'mobile-orders-tips',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-orders-tips-today-on-the-handheld--the-day-so-far',
    },
  ],
  birdie: [
    { name: 'Row · Section (More)', file: 'src/pos/mobile/screens/people/MoreScreen.tsx', use: 'icon + two lines + optional chevron, under a ListSubheader.', surface: 'handheld' },
    { name: 'GolferRow · GolferList', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'people: avatar, name, tier and phone, HCP; sticky letter headers.', surface: 'handheld' },
    { name: 'SectionHeader', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'a list header with a trailing action ("Everyone").', surface: 'handheld' },
    { name: 'MenuPopover', file: 'src/pos/components/TeeSheetGrid.tsx', use: 'the tablet’s two-line menu rows (label + sub-label) with section headers. MUI’s Menu is one line.', surface: 'tablet' },
    { name: 'ListCard', file: 'src/pos/components/ListView.tsx', use: 'the tee sheet’s list view: a card per booking, balance first.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Section header', description: 'ListSubheader: 14px, 500, primary green, 48px line. Sticky in long lists (People), not sticky in short ones (More).' },
    { part: 'Leading', description: 'A 24px icon in a 40dp column, or a 40px avatar.' },
    { part: 'Text', description: 'Primary at 16px (body large); supporting at 14px in on-surface-variant.' },
    { part: 'Trailing', description: 'A chevron (pushes a screen), a figure (HCP, an amount), a badge or a switch.' },
    { part: 'Row', description: 'The whole row is the target: 56dp with one line, 72 with two, 88 with three.' },
  ],
  variants: [
    { name: 'One-line (56dp)', use: 'An action or destination that needs no explanation: Sign out.' },
    { name: 'Two-line (72dp)', use: 'The default: a label and what it does or holds ("Rate card · Published rates by time of day").' },
    { name: 'Three-line (88dp)', use: 'A person or a player with two facts under the name.', avoid: 'As a default. A third line is usually a second screen’s job.' },
    { name: 'Sectioned', use: 'Grouping a long page (More: Restaurant, Tee sheet, Pricing & courses, Register, Session).' },
    { name: 'Indexed (sticky letters)', use: 'Looking up a name in a long list (People, the golfer picker).' },
    { name: 'In a bottom sheet', use: 'A tee time’s or a booking’s actions, three to eight rows.', avoid: 'More than a screenful: push a screen instead.' },
    { name: 'Tablet rows (Birdie)', use: 'Menu items, list cards and summary rows at 12–14px. Built by hand; see the Birdie components.' },
  ],
  states: [
    { state: 'Default', tablet: 'Not MUI List. MenuPopover rows: 13px, a hairline between, surface-container on hover.', handheld: 'Surface background, no dividers by default; sections separate the groups.' },
    { state: 'Pressed', tablet: 'Hover wash; the tablet is mouse-first.', handheld: 'MUI’s ripple across the full row.' },
    { state: 'Selected', tablet: 'Bold and green (the band menu), or a filled chip.', handheld: 'ListItemButton selected: a tinted row (the date list, booking tags).' },
    { state: 'Disabled', tablet: 'Not used in rows.', handheld: 'Dimmed and not tappable, with the reason in the supporting line ("Unpaid — nothing to refund").' },
    { state: 'Destructive', tablet: 'Red label and icon, red hover (Hide course).', handheld: 'Red label and icon in a booking’s action list.' },
  ],
  sizing: [
    { surface: 'Handheld', size: `${mobile.listItem.one} / ${mobile.listItem.two} / ${mobile.listItem.three}dp rows; 16px left, 24px right padding; 40dp icon column.`, why: 'Material 3 list sizes from mobile.listItem. A thumb, often one-handed.' },
    { surface: 'Handheld, narrow (360px)', size: 'List margins go from 16 to 12; row heights do not change.', why: 'The Quest and Clover Flex are 42px narrower than the design canvas.' },
    { surface: 'Tablet', size: 'MenuPopover rows: 11px padding around a 13px label and a 10px sub-label.', why: 'Mouse density. The theme’s 38px ListItemButton height would apply if MUI List were ever used.' },
  ],
  behavior: [
    'The whole row is the target. Never a small button inside a row that also opens something.',
    'A chevron promises a push. Rows that act in place (Reprint last receipt, Sign out) have none and show a toast.',
    'Supporting text says what a row holds or does now: "No sale yet this session", "2 overrides set · starts 6:00 AM".',
    'Long lists keep their headers in view (sticky subheaders); short pages do not need them.',
    'A filtered list says it is filtered and offers the way out ("12 matches · open times hidden · Clear filters").',
  ],
  content: [
    'Primary text is a noun or a verb phrase in sentence case: "Block time", "Tee sheet & courses".',
    'Supporting text is one line in plain words: "Maintenance, ranger hold, shift change".',
    'People are "Surname, First" in People, with the tier and phone under the name.',
    'Figures on the right are short: "HCP 20", "$45.90".',
  ],
  dos: [
    'Use the themed MUI List on the handheld; it is already at touch size.',
    'Group long pages into sections with a ListSubheader.',
    'Keep supporting text to one line at 360px; move the rest to the next screen.',
    'Match MenuPopover or ListCard on the tablet rather than importing MUI List there.',
  ],
  donts: [
    'Dividers between every row on the handheld. Sections do the grouping.',
    'A chevron on a row that does not navigate.',
    'Nested tappable controls inside a ListItemButton.',
    'MUI’s tablet-themed List in a handheld story: the playground below renders in the tablet theme, at 38px rows.',
  ],
  a11y: [
    'ListItemButton is a native button inside an li: it is focusable and announces its primary and secondary text. The More rows are wrapped in ul and li, so the list is announced with its length.',
    <>
      Section headers fail at their size: green 14px on the surface is <Contrast fg={md3.primary} bg={md3.surface} label="Tee" />,
      under 4.5:1. Use the theme’s darker green (primary.dark) for list subheaders:{' '}
      <Contrast fg="#0f7a36" bg={md3.surface} label="Tee" />. Supporting text passes:{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surface} label="Guest" />.
    </>,
    'Targets: 56dp and up on every handheld row. The tablet’s menu rows are mouse-sized; the two-line ones are tall enough for a thumb.',
  ],
  decisions: [
    { decision: 'MUI List on the handheld, hand-built rows on the tablet', why: 'The handheld follows Material 3 and the themed List is already right. The tablet’s rows carry a label and a sub-label at 13px, which MUI’s one-line Menu and 38px rows did not fit.' },
    { decision: 'Sections, not dividers', why: 'Material 3 lists separate groups, not rows. Fewer lines, clearer groups.' },
    { decision: 'Tee times are cards, not list rows', why: 'A booking carries payment, party, transport and holes. A card with a payment stripe holds that; a list row would need three lines.' },
    { decision: 'Open: wrapping supporting text on 360px', why: 'People rows wrap the phone number to a third line on the Quest. Shorten the line (tier only) or allow three-line rows deliberately.' },
  ],
  tokens: [
    { token: 'mobile.listItem', value: '56 / 72 / 88dp', role: 'One-, two- and three-line row heights' },
    { token: 'md3.primary', value: '#17a34a', role: 'ListSubheader text (handheld)' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Supporting text, icons' },
    { token: 'mobile.surfaceContainerLow', value: '#f2f5f2', role: 'Bottom sheet ground behind action lists' },
  ],
  engineering: {
    import: `import { List, ListItemButton, ListItemIcon, ListItemText, ListSubheader } from '@mui/material'; // handheld only`,
    themeOverride: (
      <>
        <code>src/theme/mobile-theme.ts</code>: <code>MuiListItemButton</code> min height 56, padding 16/24;{' '}
        <code>MuiListItemIcon</code> min width 40; <code>MuiListItemText</code> primary body1, secondary body2 in
        on-surface-variant; <code>MuiListSubheader</code> 14px 500 primary, 48px line. The tablet theme sets only{' '}
        <code>MuiListItemButton</code> min height 38.
      </>
    ),
    notes: [
      <>
        Pick the height by line count with <code>mobile.listItem</code> (<code>one</code>, <code>two</code>, <code>three</code>),
        as <code>MoreScreen</code>’s Row does: <code>minHeight: secondary ? mobile.listItem.two : mobile.listItem.one</code>.
      </>,
      <>
        For a list whose header should stick, wrap each group in its own <code>ul</code> with the subheader first (see{' '}
        <code>GolferList</code>); <code>disableSticky</code> for short pages.
      </>,
      <>
        The handheld Orders & Tips rows render <code>#{'{'}p.orderNumber{'}'}</code> on a number that already starts with #, so
        they read “##A-20918” (<code>src/pos/mobile/screens/restaurant/OrdersTipsScreen.tsx</code>).
      </>,
    ],
    snippet: `<Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
  <ListSubheader disableSticky>Pricing & courses</ListSubheader>
  <li>
    <ListItemButton onClick={() => nav.push({ name: 'rateCard' })} sx={{ minHeight: mobile.listItem.two }}>
      <ListItemIcon><RequestQuoteOutlined /></ListItemIcon>
      <ListItemText primary="Rate card" secondary="Published rates by time of day" />
      <ChevronRight sx={{ color: md3.onSurfaceVariant }} />
    </ListItemButton>
  </li>
</Box>`,
  },
  related: [
    { name: 'Divider', id: 'components-layout-structure-divider' },
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Table', id: 'components-layout-structure-table' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Avatar', id: 'components-media-visuals-avatar' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
  ],
};

export default doc;
