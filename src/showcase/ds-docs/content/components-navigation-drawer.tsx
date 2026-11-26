import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Drawer — the side panel is everywhere on the tablet, but MUI's Drawer is not: every in-terminal
 * surface is a sibling positioned inside the frame. The one MUI Drawer left is the exception, and
 * it shows why (verified: it opens against the browser window, outside the terminal).
 */
const doc: DsDoc = {
  summary: (
    <>
      A panel that slides in from the edge of the screen. On the tablet it is <strong>everywhere</strong>: the reservation
      slides in from the right over the tee sheet, the order rail folds to a strip on the left, the day summary opens beside
      the sheet, and the main navigation covers the whole screen as a sheet of tiles. None of them is MUI's{' '}
      <code>Drawer</code>. Each is built <strong>inside the terminal frame</strong>, as a sibling of the screen it sits on,
      because MUI's Drawer opens against the browser window. The handheld has no side drawers: it uses bottom sheets,
      full-screen dialogs and its navigation bar.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      The pattern is core on the tablet; MUI's <code>Drawer</code> is not. One is left, the tee sheet list's Filters panel (
      <code>ListView.tsx</code>), and in the prototype it opens outside the terminal. Build new side panels the way{' '}
      <code>ReservationPanel</code> and <code>TeeSheetSidebar</code> are built, and migrate that one.
    </>
  ),
  mui: ['Drawer'],
  useFor: [
    'Working on one thing without losing the screen behind it: a reservation over the tee sheet.',
    'Reference beside the work: the day or course summary.',
    'The tablet’s main navigation, as a full-screen sheet from the hamburger.',
    'Folding a panel out of the way: the order rail, down to a 56px strip.',
  ],
  dontUseFor: [
    'The handheld: a bottom sheet for a short choice, a full-screen dialog for a form, More for extra destinations.',
    'A question that must be answered before anything else: a dialog.',
    'A few actions on one thing: a menu.',
  ],
  inBirdie: [
    {
      label: 'The reservation slide-over, tablet',
      caption: (
        <>
          A booking opens as an 820px panel from the right. The tee sheet stays in view behind a scrim, frozen so a stray tap
          can't throw away edits; the panel closes from its own ✕, Close, Move, Delete or <strong>Check in & pay</strong>, or
          Escape. Nothing reaches the cart until Check in & pay.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--over-the-tee-sheet',
    },
    {
      label: 'The main navigation, as a sheet',
      caption: (
        <>
          The hamburger opens every destination as tiles, grouped Pro Shop, Restaurant, then the rest, with the facility and
          build top left and Switch user / Log Out top right. In V1 → V2 it shows only what the signed-in role may use.
        </>
      ),
      shot: 'tablet-main-nav',
      tabletHash: '#/register?nav=1',
      storyId: 'weston-edits-20-·-main-nav-tablet--the-navigation',
    },
    {
      label: 'The order rail, folded to a strip',
      caption: (
        <>
          The strip on the left edge of this Bay Sheet is the order rail, folded: 56px, the hamburger at the top, the cart at
          the bottom, and the strip itself as the target to open it again. Adding anything to the order re-opens it.
        </>
      ),
      shot: 'tablet-bay-sheet',
      storyId: 'weston-edits-13-·-order-rail-tablet--the-collapsed-strip',
    },
  ],
  birdie: [
    {
      name: 'ReservationPanel',
      file: 'src/pos/components/ReservationPanel.tsx',
      use: 'the model for a side panel: a sibling of the tee sheet, absolutely positioned inside PosShell, 640 / 820px or full cover, over a scrim.',
      surface: 'tablet',
    },
    {
      name: 'TeeSheetSidebar',
      file: 'src/pos/components/TeeSheetSidebar.tsx',
      use: 'the day or course summary beside the sheet. It was an MUI Drawer, and was rebuilt as a sibling (its comment says why).',
      surface: 'tablet',
    },
    {
      name: 'NavOverlay',
      file: 'src/pos/components/NavOverlay.tsx',
      use: 'the main navigation: a full-screen sheet of tiles inside the frame, role="dialog", Escape closes.',
      surface: 'tablet',
    },
    {
      name: 'LeftPanel / RailStrip',
      file: 'src/pos/components/LeftPanel.tsx',
      use: 'the order rail: 320px (380 on the large display), folding to a 56px strip.',
      surface: 'tablet',
    },
    {
      name: 'BottomSheet',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'the handheld’s drawer: rises from the bottom, inside the phone frame, for short choices.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Panel', description: 'White, full height of the terminal, anchored to an edge. Its own header (name, close ✕), body, and footer of actions.' },
    { part: 'What’s behind', description: 'In view under a dark scrim (rgba 0,0,0 .7) and inert: frozen, not hidden. The scrim is deliberately not a way out.' },
    { part: 'Close', description: '✕ in the header, with an aria-label ("Close reservation"), plus Escape on any panel that freezes what’s behind it.' },
    { part: 'Motion', description: 'Slides or fades in over 0.22s on MD3 standard easing (reservationPanel.motion).' },
  ],
  variants: [
    {
      name: 'Slide-over over a scrim',
      use: 'The reservation panel: work on one booking with the sheet in view but frozen behind it.',
      avoid: 'Squeezing the sheet beside it: the old behaviour, kept only for a comparison story. At 820px it compressed the sheet to about one nine.',
    },
    {
      name: 'Full-screen sheet (modal)',
      use: 'The main navigation: one decision (where to go), then it closes.',
      avoid: 'Content you work in for a while.',
    },
    {
      name: 'Folding rail',
      use: 'The order rail: there by default, folded to a strip when empty or when the operator wants the width.',
      avoid: 'Hiding something completely. A panel you can’t get back is worse than one that is too wide.',
    },
    {
      name: 'MUI Drawer',
      use: 'Only the tee sheet list’s Filters panel, today.',
      avoid: 'Everything new. It portals out of the terminal frame.',
    },
  ],
  states: [
    {
      state: 'Open',
      tablet: 'The panel at its width (820px by default); the sheet behind under a scrim and inert.',
      handheld: 'Bottom sheet: up to 85% of the screen, a drag handle, a 32% scrim behind.',
    },
    {
      state: 'Closed',
      tablet: 'Gone, or folded to a strip (the order rail). The link updates, so a closed panel isn’t in a shared URL.',
      handheld: 'Gone.',
    },
    {
      state: 'Width',
      tablet: 'Standard 640px, wide 820px (the default), or cover; a link can set it (pw=cover).',
    },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Reservation 820px by default (640 or cover by option); order rail 320px (380 on the large display) or a 56px strip', why: 'Room for the rate tiles beside a two-column player row, with the sheet still in view to its left.' },
    { surface: 'Handheld', size: 'No side drawers; bottom sheets up to 85% height', why: 'A 360dp screen has no room beside anything. Things rise from the bottom, where the thumb is.' },
  ],
  behavior: [
    'The work behind a panel stays visible: the point of the reservation panel is "you’re not losing the context of where you’re working on the tee sheet". It is frozen, not hidden.',
    'One control, one job: the hamburger opens the navigation; tapping the rail’s strip expands the rail. They used to be the same button.',
    'The order rail starts folded when it’s empty, and re-expands when anything is added: an order you can’t see is one nobody checks before charging.',
    'Panels are state in the store, so they can be deep-linked (res=, nav=1) and survive a trip to another screen.',
  ],
  dos: [
    'Build side panels as siblings inside PosShell, positioned against it.',
    'Keep what’s behind the panel visible.',
    'Give every panel a ✕ with an aria-label.',
    'Use the handheld’s BottomSheet, which renders inside the phone frame.',
  ],
  donts: [
    'Use MUI Drawer (or any MUI Modal) for an in-terminal panel.',
    'Give one control two kinds of expansion.',
    'Slide a side drawer in on the handheld.',
  ],
  a11y: [
    'The main navigation is role="dialog" with aria-modal and the name "Main navigation"; Escape closes it. Unbuilt destinations are disabled buttons, skipped by the keyboard and announced as "— not built yet".',
    'Built inside the frame, a panel doesn’t put the app under aria-hidden. Handing MUI’s Drawer a container inside the app does, which is one reason TeeSheetSidebar stopped being one.',
    'The Filters panel’s close button (✕) has no aria-label; the reservation panel’s does ("Close reservation").',
    'While the reservation panel is open the sheet behind is inert (out of the tab order), and Escape closes the panel. The panel itself is role="complementary"; with the background frozen, role="dialog" with aria-modal would describe it better.',
    <>
      Contrast, computed: the navigation sheet's tile labels are <Contrast fg={md3.onSurface} bg="#ffffff" label="Tee" /> on
      white tiles; its header line <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} label="v. 5.6" /> on the sheet.
    </>,
  ],
  decisions: [
    {
      decision: 'In the frame, not MUI Drawer',
      why: 'From TeeSheetSidebar: a Drawer is a Modal; it portals to the page and positions itself against the browser window. That is invisible while the window is exactly the terminal and obvious the moment it isn’t. Checked on Nov 26: the list view’s Filters panel opens at the window’s right edge, outside the 1280 × 800 terminal.',
    },
    {
      decision: 'The sheet behind the reservation is frozen, not squeezed',
      why: 'Weston settled it on the fourth call: "I like the 820… seems like we’re always doing something to this screen, so the more real estate we can have, probably the better." Squeezing an 820px panel beside the sheet left about one nine; a scrim leaves the sheet’s widths alone.',
    },
    {
      decision: 'The main navigation is a sheet, not a drawer',
      why: 'Weston, fifth call: "I actually don’t hate this to be the main nav. But it can’t expand the nav and do the cart." The hamburger now opens the sheet and the rail expands by tapping its strip. Eighteen destinations as tiles fit one screen; in a list they were a scroll.',
    },
    {
      decision: 'The empty rail starts folded (Oct 1 proposal 6, approved Oct 2)',
      why: 'Weston: "Just collapsed if there’s nothing in it." It folds to a strip rather than vanishing, so the operator can always get it back.',
    },
    {
      decision: 'Menu by role (Oct 1 proposal 7, approved Oct 2)',
      why: 'In V1 → V2 the sheet leaves out what the signed-in role can’t use instead of dimming it; editing the role grid belongs to Buck.',
    },
  ],
  tokens: [
    { token: 'reservationPanel.motion', value: '.22s cubic-bezier(.2,0,0,1)', role: 'Slide and fade in; the sheet narrows on the same curve' },
    { token: 'PANEL_WIDTHS (pos-store.ts)', value: '640 / 820 / cover', role: 'Reservation panel widths' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Main navigation sheet background' },
    { token: 'mobile.surfaceContainerLow', value: '#f2f5f2', role: 'Bottom sheet background' },
  ],
  engineering: {
    import: `// Tablet: no import — a sibling inside PosShell (see ReservationPanel, TeeSheetSidebar).
import { BottomSheet } from '../chrome'; // handheld`,
    themeOverride: <>None. There is no <code>MuiDrawer</code> entry in either theme.</>,
    notes: [
      <>
        Pattern: render the panel as a sibling of the screen inside <code>PosShell</code>, <code>position: 'absolute'</code>,
        clipped by the shell's own <code>overflow: hidden</code>. No portal, no <code>aria-hidden</code>, and the rounded
        corners hold.
      </>,
      <>
        The handheld's <code>BottomSheet</code> portals into a <code>SheetHost</code> inside the phone frame, for the same
        reason: MUI's Drawer would render outside the 402 × 797 frame.
      </>,
      <>
        To migrate the list view's Filters panel: render it like <code>TeeSheetSidebar</code>, keep its sections and the{' '}
        <code>listFilters</code> it writes, and give its ✕ an aria-label.
      </>,
    ],
    snippet: `// The reservation panel: a sibling of the tee sheet, inside the terminal (ReservationPanel.tsx).
<Box
  role="complementary"
  aria-label={\`Reservation · \${b.name}\`}
  sx={{
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: panelWidth === 'cover' ? '100%' : PANEL_WIDTHS[panelWidth],
    zIndex: 80, bgcolor: md3.onPrimary, boxShadow: elevation.e3,
    animation: \`\${slideIn} \${reservationPanel.motion}\`,
  }}
>
  <ReservationContent booking={b} tab={panel.tab} />
</Box>`,
  },
  related: [
    { name: 'Bottom Navigation', id: 'components-navigation-bottom-navigation' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
  ],
};

export default doc;
