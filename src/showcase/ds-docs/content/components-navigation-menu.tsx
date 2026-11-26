import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Menu — a list of actions that opens from the thing it acts on. On the tablet the heavy menus
 * (right-click, course ⋮) are Birdie's own, because they need a header and sections; MUI Menu is
 * used for simple lists. On the handheld a menu is a bottom sheet, with one MUI Menu exception.
 */
const doc: DsDoc = {
  summary: (
    <>
      A short list of actions that opens from the thing it acts on. On the <strong>tablet</strong> menus carry most of the tee
      sheet's power: right-click a booking for thirteen actions in four labelled sections, click a time for the row's, open a
      course's ⋮ for its settings. Those are Birdie's own menus, because they need a <strong>header naming the target</strong>{' '}
      and <strong>grouped sections</strong>; MUI's <code>Menu</code> is used for simpler lists. On the{' '}
      <strong>handheld</strong> a menu is a <strong>bottom sheet</strong> that rises from the thumb, with one MUI Menu left on
      the order screen.
    </>
  ),
  statusNote: (
    <>
      On both surfaces. MUI <code>Menu</code> in four files (the order rail's settings cog, the walk-in time picker, the
      restaurant's More menus, the handheld order's ⋮). The tee sheet's context and course menus, the sort chip and the round
      status chip are Birdie-drawn; the handheld's long-press and ⋮ menus are <code>BottomSheet</code>s.
    </>
  ),
  mui: ['Menu', 'MenuItem'],
  useFor: [
    'Several actions on one thing the operator can point at: a booking, a time row, a course.',
    'An overflow (⋮) for the rarer actions of a screen or panel.',
    'A short pick-one list anchored to its trigger: another open tee time for a walk-in, another menu to sell from.',
  ],
  dontUseFor: [
    'Choosing a value in a form: Select, or a PillGroup / Toggle Button for a few options.',
    'Going to another screen: the main navigation (tablet) or the navigation bar (handheld).',
    'One action: a button.',
    'A question that blocks everything: a dialog.',
  ],
  inBirdie: [
    {
      label: 'The booking menu, tablet',
      caption: (
        <>
          Right-click a booking. A grey header names it (HARRISON, T., PAID, 6:00 AM · Ponds · 4P · 18H), then sections:{' '}
          <strong>Open</strong>, <strong>Check-in</strong>, <strong>Payment</strong>, <strong>Manage</strong>. Counts ride on
          the right (4/4). Mark no-show and Delete booking are last, in red.
        </>
      ),
      shot: 'ds-tablet-context-menu',
      storyId: 'prototypes-tablet-tee-sheet-booking-check-in--chip-context-menu',
    },
    {
      label: 'A booking’s actions, handheld',
      caption: (
        <>
          Long-press a booking on the phone's tee sheet: a bottom sheet with the name and time, then full-width rows with a
          second line where it helps (2/2 in). The phone version of the right-click menu, driven by the same state.
        </>
      ),
      shot: 'ds-mobile-booking-actions',
      handheldRoute: 'mobile-screens-2-·-tee-sheet--booking-actions-sheet',
    },
    {
      label: 'The course ⋮ menu, tablet',
      caption: (
        <>
          Each course header has a ⋮: Course (lock, note, time settings, prices), View (summary, focus, show all), Danger (hide).
          Two-line items say what each does. It now hangs off its own button; it used to open at the far right over the last
          course (Oct 1 proposal 12: "Well, that's a bug").
        </>
      ),
      storyId: 'components-navigation-menu--in-birdie-course-menu',
    },
  ],
  birdie: [
    {
      name: 'ContextMenus (MenuShell)',
      file: 'src/pos/components/ContextMenus.tsx',
      use: 'right-click on a booking, or a click on a time: header, labelled sections, badges, destructive last. Kept on screen and inside the terminal frame.',
      surface: 'tablet',
    },
    {
      name: 'MenuPopover',
      file: 'src/pos/components/TeeSheetGrid.tsx',
      use: 'a ⋮ menu with sections and two-line items (label + what it does), anchored to its own button.',
      surface: 'tablet',
    },
    {
      name: 'RoundStatusChip',
      file: 'src/pos/components/SeatChips.tsx',
      use: 'a chip that opens a short menu to change one value (a player’s round status). role="menu" / "menuitem".',
      surface: 'tablet',
    },
    {
      name: 'BottomSheet',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'every handheld menu: long-press actions, ⋮ options, pickers. Renders inside the phone frame.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Header (context menus)', description: 'What the actions apply to: the booking’s name, pay badge, time, course, party. On a grey band.' },
    { part: 'Section label', description: '9px, uppercase, tracked, grey: OPEN, CHECK-IN, PAYMENT, MANAGE.' },
    { part: 'Item', description: '17–18px icon, a 13–14px label, and optionally a second line (what it does) or a badge on the right (4/4).' },
    { part: 'Destructive item', description: 'Red icon and label, red-tinted hover, always last.' },
    { part: 'Surface', description: 'White, 16px radius (12 for ⋮ popovers), 1.5px outline-variant border, e3 shadow.' },
  ],
  variants: [
    {
      name: 'Context menu (tablet)',
      use: 'Everything an operator can do to a booking or a time row without opening a dialog.',
      avoid: 'Being the only way to an action. Most are also in the reservation panel; Select multiple is only here today.',
    },
    {
      name: '⋮ popover (tablet)',
      use: 'A course’s or a panel’s settings: few, rare, each needing a one-line explanation.',
      avoid: 'Frequent actions: put them on the screen.',
    },
    {
      name: 'MUI Menu (tablet)',
      use: 'A plain list from a button: the order cog, Change walk-in time, More menus.',
      avoid: 'Menus that need a header or sections: use the Birdie shell.',
    },
    {
      name: 'Bottom sheet (handheld)',
      use: 'Every handheld menu: long-press actions, ⋮ options, a pick-one list.',
      avoid: 'Forms: a full-screen dialog.',
    },
    {
      name: 'MUI Menu (handheld)',
      use: 'One place: the order screen’s ⋮ (Add player, Change customer, Tax exempt, Clear order), with disablePortal.',
      avoid: 'New handheld menus. The rule in people/parts.tsx is a bottom sheet, never a portalled menu.',
    },
  ],
  states: [
    {
      state: 'Open',
      tablet: 'At the click (context menus) or under the trigger. Flipped back from the right and bottom edges, never clipped.',
      handheld: 'The sheet rises from the bottom with a drag handle; a scrim covers the screen.',
    },
    {
      state: 'Hover / pressed',
      tablet: 'Mint wash and a green label (context menus); grey wash (⋮ and MUI menus). Red wash on destructive items.',
      handheld: 'Ripple on the row.',
    },
    {
      state: 'Selected',
      tablet: 'A check on the right and the MUI selected tint: the walk-in’s current tee time, the active sort.',
    },
    { state: 'Disabled', tablet: 'Shown, greyed, with the reason as the label: "No other open tee times today".' },
    {
      state: 'Closing',
      tablet: 'Picking an item closes the menu first, then runs it. A click or right-click anywhere else closes it.',
      handheld: 'Tap the scrim, or pick a row.',
    },
  ],
  sizing: [
    { surface: 'Tablet', size: '38px items, 13px labels (theme); context menus 250px wide, ⋮ popovers 224px', why: 'Mouse-first. Thirteen actions fit without scrolling on an 800px-tall terminal.' },
    { surface: 'Handheld', size: '56dp sheet rows; 48dp MUI menu items, 16px labels', why: 'A thumb. The sheet rows are full width, so the target is the whole row.' },
  ],
  behavior: [
    'The header says what the menu acts on. Without it, a destructive action in a menu is a guess.',
    'Blocks and league events get a shorter menu (edit or clear the slot); there is no payment or check-in to offer.',
    'Round progress from the menu moves only players who turned up; a no-show stays a no-show.',
    'Menus are state (state.contextMenu), so a story or test can open one declaratively, and the handheld’s sheets read the same slot as the tablet’s menus.',
    'A context menu opened inside a scaled terminal (Storybook, Fit to window) maps the click into the frame and stays inside it.',
  ],
  content: [
    'Items are verbs: "Load into register", "Mark teed off", "Issue rain check". Sentence case.',
    'Section labels are one or two words: Open, Check-in, Payment, Manage, Danger.',
    'A second line says what an item will do or what it’s set to: "Prevent new bookings", "10 min · 6:00 AM–7:00 PM".',
  ],
  dos: [
    'Name the target in a header when the menu holds anything destructive.',
    'Group long menus with section labels, destructive last.',
    'Use a bottom sheet on the handheld.',
    'Show a disabled item with the reason rather than hiding it, when the absence would confuse.',
  ],
  donts: [
    'Put the only path to an action in a right-click menu.',
    'Open a menu from somewhere other than the thing it acts on.',
    'Portal an MUI Menu out of the phone or terminal frame.',
  ],
  a11y: [
    'MUI Menu brings role="menu", arrow keys, Escape and focus return. The Birdie-drawn menus don’t: the context menus’ and the ⋮ popover’s items are clickable rows with no role, not focusable, with no Escape. That is the largest accessibility gap on this page.',
    'The course ⋮ trigger (MenuPopover) has no aria-label; give it one ("Course options, Front 9").',
    'RoundStatusChip is the good example: a button with aria-label and aria-expanded, and role="menu" / "menuitem" on its options.',
    'Right-click needs a mouse, or a long-press where the browser maps one to it. Keep every action reachable another way too; Select multiple is the one that isn’t yet.',
    <>
      Contrast, computed: item labels <Contrast fg={md3.onSurface} bg="#ffffff" label="Refund" />, destructive{' '}
      <Contrast fg={md3.error} bg="#ffffff" label="Delete" />. Section labels and second lines are{' '}
      <Contrast fg={md3.outline} bg="#ffffff" label="OPEN" /> at 9–10px, just under AA; darken them to onSurfaceVariant (
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />). The hover state's green label on mint is{' '}
      <Contrast fg={md3.primary} bg={md3.primaryContainer} label="Refund" />, which fails while hovered.
    </>,
  ],
  decisions: [
    {
      decision: 'Birdie’s own shell for the tee sheet’s menus',
      why: 'From ContextMenus.tsx: both need a header summarising the target and labelled sections. A flat item list would lose the context that makes a destructive action safe to pick.',
    },
    {
      decision: 'The course menu hangs off its own button (Oct 1 proposal 12, approved Oct 2)',
      why: 'It anchored to the whole sheet header, so every course’s ⋮ opened at the far right over the last course. Weston, Sep 30: "Well, that’s a bug."',
    },
    {
      decision: 'Menus are bottom sheets on the handheld',
      why: 'A sheet rises to the thumb and renders inside the phone frame; a portalled MUI menu would open outside it. The order screen’s ⋮ is the exception, kept in frame with disablePortal.',
    },
  ],
  tokens: [
    { token: 'radius.lg', value: '16px', role: 'Context menus and MUI Menu paper (MuiMenu override)' },
    { token: 'elevation.e3', value: 'box-shadow', role: 'Menu shadow' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px menu border' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Destructive items' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Context menu hover wash' },
  ],
  engineering: {
    import: `import { Menu, MenuItem } from '@mui/material';              // simple lists
import { MenuPopover } from '../components/TeeSheetGrid';      // ⋮ with sections`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiMenu</code> paper: 16px radius, 1.5px outline-variant border, e3 shadow ("the{' '}
        <code>.ctx-menu</code> treatment"); <code>MuiMenuItem</code> 38px, 13px. <code>src/theme/mobile-theme.ts →
        MuiMenuItem</code> 48dp, 16px.
      </>
    ),
    notes: [
      <>
        Context menus open with <code>dispatch({'{'} type: 'openContextMenu', menu: {'{'} kind: 'booking', bookingId, x, y {'}'}{' '}
        {'}'})</code> and close with <code>closeContextMenu</code>. <code>placeMenu</code> keeps them on screen and inside a
        scaled frame.
      </>,
      <>
        MenuPopover items are <code>{'{ section }'}</code> or <code>{'{ icon, label, sub?, destructive?, active?, run }'}</code>.
        To close the accessibility gap, render items as <code>ButtonBase role="menuitem"</code>, give the popover{' '}
        <code>role="menu"</code>, and add Escape.
      </>,
      <>
        On the handheld, the MUI Menu needs <code>disablePortal</code> or it renders outside the phone frame. Prefer{' '}
        <code>BottomSheet</code>.
      </>,
    ],
    snippet: `<MenuPopover
  icon="more_vert"
  items={[
    { section: 'Course' },
    { icon: 'lock', label: 'Lock course', sub: 'Prevent new bookings', run: lock },
    { icon: 'sell', label: 'Tee time prices', sub: 'By time band & rate', run: openRates },
    { section: 'Danger' },
    { icon: 'visibility_off', label: 'Hide course', sub: 'Remove from tee sheet', destructive: true, run: hide },
  ]}
/>`,
  },
  related: [
    { name: 'Speed Dial', id: 'components-actions-speed-dial' },
    { name: 'Menubar', id: 'components-navigation-menubar' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

export default doc;
