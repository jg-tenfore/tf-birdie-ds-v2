import type { DsDoc } from '../types';

/**
 * Speed Dial — documented as Avoid. Birdie's answer to "several actions on one thing" is a list
 * with labels: the right-click menu on the tablet, a bottom sheet on the handheld.
 */
const doc: DsDoc = {
  summary: (
    <>
      A floating button that fans out into a few more icon buttons. <strong>Birdie doesn't use it.</strong> When one thing
      (a booking, a tee time, an order) has several actions, Birdie lists them with words: a <strong>right-click menu</strong>{' '}
      on the tablet, a <strong>bottom sheet</strong> on the handheld. Both name every action, group them, and keep the
      destructive ones apart, which a fan of unlabeled icons can't do.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used, and not themed. A candidate to remove from the system. For several actions on one thing, use Menu (tablet) or
      the handheld's <code>BottomSheet</code>.
    </>
  ),
  mui: ['SpeedDial'],
  useFor: ['Nothing in Birdie.'],
  dontUseFor: [
    "A booking's or a tee time's actions on the tablet: the right-click menu (ContextMenus), with a header naming the booking.",
    'The same on the handheld: long-press opens a bottom sheet of labelled rows.',
    'A screen’s one create action: an extended FAB.',
    'An order’s overflow (Change customer, Tax exempt, Clear order): the ⋮ menu in the top app bar.',
  ],
  inBirdie: [
    {
      label: 'Instead, tablet: the booking menu',
      caption: (
        <>
          Right-click a booking on the tee sheet. A header names it (<strong>HARRISON, T.</strong>, paid, 6:00 AM, 4 players),
          then sections: Open, Check-in, Payment, Manage. Mark no-show and Delete booking sit at the bottom, in red. Thirteen
          actions, all readable at once.
        </>
      ),
      shot: 'ds-tablet-context-menu',
      storyId: 'prototypes-tablet-tee-sheet-booking-check-in--chip-context-menu',
    },
    {
      label: 'Instead, handheld: a bottom sheet',
      caption: (
        <>
          Long-press a booking on the phone's tee sheet. The sheet rises with the booking's name and time, then full-width
          rows: Open reservation, Check in all players (with 2/2 in), Move tee time, and Mark no-show in red. Every row is
          a 56dp list item and says what it does.
        </>
      ),
      shot: 'ds-mobile-booking-actions',
      handheldRoute: 'mobile-screens-2-·-tee-sheet--booking-actions-sheet',
    },
  ],
  birdie: [
    {
      name: 'ContextMenus',
      file: 'src/pos/components/ContextMenus.tsx',
      use: 'several actions on a booking or a time row, on the tablet. Right-click a booking; click a time.',
      surface: 'tablet',
    },
    {
      name: 'BottomSheet',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'several actions on one thing, on the handheld. Long-press, or a ⋮ that opens a sheet.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'What a speed dial has', description: 'A trigger, and three to six icon buttons that fan out with tooltips.' },
    { part: 'What it lacks', description: 'Labels you can read without hovering, a header naming what the actions apply to, groups, and a safe place for destructive actions.' },
  ],
  variants: [
    { name: 'Speed Dial', use: 'Not used.', avoid: 'Everywhere.' },
    { name: 'Context menu (tablet)', use: 'Several actions on one thing the operator can point at.', avoid: 'A single action: just a button.' },
    { name: 'Bottom sheet (handheld)', use: 'Several actions on one thing, or a short choice that doesn’t deserve a screen.', avoid: 'Anything with a form: a full-screen dialog.' },
  ],
  states: [
    { state: 'Any', tablet: 'Not used. See Menu.', handheld: 'Not used. See BottomSheet on the Menu page.' },
  ],
  behavior: [
    'A speed dial hides its actions until opened, then shows icons whose names appear only on hover. The tablet is mouse-first but the handheld has no hover at all.',
    'Its actions have no context: nothing on screen says which booking they apply to. Birdie’s menus and sheets always start with a header that does.',
    'A fan of icons can’t be grouped or ordered by risk. Birdie’s menus put destructive actions last, in red.',
  ],
  dos: ['Use a context menu or a bottom sheet for several actions.', 'Name the thing the actions apply to at the top.'],
  donts: ['Fan icons out of a FAB.', 'Hide an action’s name behind a tooltip on a touch screen.'],
  a11y: [
    'Tooltip-only labels fail on touch: there is no hover on the handheld, and nothing to read until something is pressed.',
    'Birdie’s alternatives carry their labels as text, so the visible name is the accessible name.',
  ],
  decisions: [
    {
      decision: 'Lists with words, not fans of icons',
      why: 'At a counter the operator reads an action before pressing it, especially Refund, No-show or Delete. A labelled list with a header does that; a speed dial does not.',
    },
    {
      decision: 'Keep the page, mark it Avoid',
      why: 'The component ships with MUI, so someone will find it. The page says what to use instead before anyone builds with it.',
    },
  ],
  engineering: {
    themeOverride: <>None. There is no <code>MuiSpeedDial</code> entry in either theme.</>,
    notes: [
      <>
        Tablet: menus open from <code>state.contextMenu</code> (<code>openContextMenu</code> / <code>closeContextMenu</code> in{' '}
        <code>src/pos/state/pos-store.ts</code>), rendered by <code>ContextMenus</code>.
      </>,
      <>
        Handheld: the tee sheet drives its sheets from the same <code>state.contextMenu</code> slot, so a story can open either
        one declaratively (<code>src/pos/mobile/screens/tee/TeeSheetScreen.tsx</code>).
      </>,
    ],
  },
  related: [
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Floating Action Button', id: 'components-actions-floating-action-button' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
