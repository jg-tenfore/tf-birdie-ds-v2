import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * App Chrome — the frame every Birdie screen lives in, on both surfaces. Birdie's own components
 * (PosShell, LeftPanel, NavOverlay on the tablet; MobileFrame, MobileScreen, TopAppBar,
 * NavigationBar, BottomSheet on the handheld), so the MUI usage scan has nothing to count.
 */
const doc: DsDoc = {
  summary: (
    <>
      The frame every screen lives in, and the rules for what sits on top of what. On the <strong>tablet</strong> it is one
      fixed device frame with a persistent <strong>order rail</strong> on the left and one view on the stage beside it; panels,
      the main nav and dialogs layer over that in a fixed order. On the <strong>handheld</strong> it is Material 3 scaffolding: a
      status bar, a top app bar, a scrolling body, an optional pinned action bar, and the navigation bar. Screens never draw their
      own chrome; they compose it.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Birdie's own components on both surfaces: <code>PosShell</code> and <code>LeftPanel</code> on the tablet,{' '}
      <code>src/pos/mobile/chrome.tsx</code> on the handheld. Every screen in the product renders inside them.
    </>
  ),
  useFor: [
    'The frame of any new tablet destination: a view on the stage, beside the order rail.',
    'Any new handheld screen: MobileScreen with a TopAppBar, and a BottomActionBar if it has one main action.',
    'Deciding where a new layer goes: slide-over, drawer, nav sheet, dialog or bottom sheet.',
  ],
  dontUseFor: [
    'A screen that draws its own status bar, back arrow or navigation bar. Use the chrome’s.',
    'MUI Drawer or Modal for a panel inside the terminal: they portal to the window. Build a sibling of PosShell, as the reservation panel does.',
    'A fluid, responsive layout. Each device is a fixed frame; components size by the room it gives them.',
  ],
  inBirdie: [
    {
      label: 'Rail and stage, tablet',
      caption: (
        <>
          The order rail (320px) with three items and the dark <strong>Pay $112.32</strong>, beside the register on the stage.
          The rail is the same component on every view, so an order survives a trip to the tee sheet and back.
        </>
      ),
      shot: 'tablet-register-order',
      tabletHash: '#/register?order=retail',
      storyId: 'components-layout-structure-app-chrome--order-panel-with-order',
    },
    {
      label: 'The collapsed rail, tablet',
      caption: (
        <>
          On the tee sheet an empty rail tucks into a 56px strip: the hamburger at the top opens the main nav, the cart at the
          bottom shows a count, and tapping the strip itself expands the rail.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet?shift=early',
      storyId: 'weston-edits-13-·-order-rail-tablet--the-collapsed-strip',
    },
    {
      label: 'The main nav, tablet',
      caption: (
        <>
          A full-screen sheet of tiles in three groups: Pro Shop, Restaurant, and the back office. The club and the signed-in
          operator top left and right. Destinations not built in an edition are disabled, not hidden.
        </>
      ),
      shot: 'tablet-main-nav',
      tabletHash: '#/register?nav=1',
      storyId: 'weston-edits-20-·-main-nav-tablet--the-navigation',
    },
    {
      label: 'Layers, tablet',
      caption: (
        <>
          Three layers at once: the tee sheet frozen under a scrim, the reservation slide-over, and the customer record as a
          dialog over both. Closing the record leaves the reservation exactly as it was.
        </>
      ),
      shot: 'tablet-customer-record',
      tabletHash: '#/tee-sheet?res=p04_m6&cust=607469&cust-seat=0',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--customer-record-over-panel',
    },
    {
      label: 'A root screen, handheld',
      caption: (
        <>
          More: a top app bar with the title and no back arrow, a scrolling body, and the navigation bar with the active
          destination in a green pill. The bar is the operator's menu, by role.
        </>
      ),
      shot: 'mobile-more',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--more-root',
      storyId: 'prototypes-mobile-global-nav-menu-by-role--a-managers-more',
    },
    {
      label: 'A pushed screen, handheld',
      caption: (
        <>
          A reservation: back arrow and overflow in the top app bar, tabs, and two pinned actions at the bottom. No navigation bar:
          a pushed screen is one step away from where it came from.
        </>
      ),
      shot: 'mobile-reservation',
      frame: 'handheld',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--reservation',
      storyId: 'components-layout-structure-app-chrome--handheld-pushed-screen',
    },
  ],
  birdie: [
    { name: 'PosShell', file: 'src/pos/PosApp.tsx', use: 'the device frame: sized to the device, rounded, clipping. Every panel positions against it.', surface: 'tablet' },
    { name: 'PosAppBody', file: 'src/pos/PosApp.tsx', use: 'the layer order: rail, stage, drawer, panel, record, nav, dialogs, menus, sign-in, snackbar.', surface: 'tablet' },
    { name: 'LeftPanel', file: 'src/pos/components/LeftPanel.tsx', use: 'the order rail: who is being served, what they are buying, Pay. Collapses to RailStrip.', surface: 'tablet' },
    { name: 'NavOverlay', file: 'src/pos/components/NavOverlay.tsx', use: 'the main nav: a full-screen sheet of destination tiles.', surface: 'tablet' },
    { name: 'MobileFrame', file: 'src/pos/mobile/chrome.tsx', use: 'the phone: status bar, gesture bar, and the layer bottom sheets portal into.', surface: 'handheld' },
    { name: 'MobileScreen', file: 'src/pos/mobile/chrome.tsx', use: 'one screen: top bar, scrolling body, optional bottom bar and FAB.', surface: 'handheld' },
    { name: 'TopAppBar', file: 'src/pos/mobile/chrome.tsx', use: '64dp small bar; back on pushed screens, none on roots; large for summary pages.', surface: 'handheld' },
    { name: 'NavigationBar', file: 'src/pos/mobile/chrome.tsx', use: '80dp bar, three to five destinations, chosen by role (bar-by-role.ts).', surface: 'handheld' },
    { name: 'BottomSheet', file: 'src/pos/mobile/chrome.tsx', use: 'short contextual choices: a tee time’s actions, a sort order. Not forms.', surface: 'handheld' },
    { name: 'DialogTopBar · BottomActionBar', file: 'src/pos/mobile/chrome.tsx', use: 'a full-screen dialog’s ✕, title and confirm; a pushed page’s pinned main action.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Device frame (tablet)', description: 'PosShell: the device’s viewport (1280×800 on the Clover Mini) or the 1366×840 design canvas, 16px corners, overflow hidden. Slide-overs stop at its edges.' },
    { part: 'Order rail', description: '320px (380 on the large display): golfer chip and cog, the order lines, totals, and Pay. Collapsed, a 56px strip with the hamburger, an expand target and the cart count.' },
    { part: 'Stage', description: 'One view at a time: the tee sheet, the register, a court or bay sheet, a restaurant screen, a back-office screen. Each brings its own 56px toolbar.' },
    { part: 'Overlays', description: 'In order: the summary drawer, the reservation slide-over (with its scrim), the customer record, the main nav, cart signout, dialogs, context menus, the sign-in screen, the snackbar.' },
    { part: 'Status and gesture bars (handheld)', description: 'Drawn inside the frame (28dp and 20dp), because Material 3 apps are edge to edge.' },
    { part: 'Top app bar', description: '64dp: back or nothing, a title with an optional subtitle, icon actions on the right. Can carry rows below it (the tee sheet’s date row and chips).' },
    { part: 'Body', description: 'Scrolls; nothing else does. With a FAB it ends in 88px of room so the last row can scroll out from under it.' },
    { part: 'Bottom region', description: 'A pinned action bar on pushed pages, or the 80dp navigation bar on roots. Never both.' },
  ],
  variants: [
    { name: 'Rail expanded', use: 'Whenever an order exists. Adding anything re-expands it: an order you cannot see is one nobody checks before charging it.' },
    { name: 'Rail strip (56px)', use: 'The tee sheet and other sheets with an empty order, so the stage gets the width.', avoid: 'Hiding the rail entirely. A panel you cannot get back is worse than one that is too wide.' },
    { name: 'Slide-over (reservation, court, bay)', use: 'Work on one item while its context stays behind a scrim: 640, 820 or full width.', avoid: 'Forms unrelated to the sheet behind. Use a dialog.' },
    { name: 'Summary drawer', use: 'A read-only summary beside the sheet (day or course): no scrim, Escape closes.' },
    { name: 'Nav sheet', use: 'Going to another destination. Opens over everything, including a reservation.' },
    { name: 'Handheld root screen', use: 'A destination on the navigation bar: no back arrow, nav bar at the bottom.' },
    { name: 'Handheld pushed screen', use: 'Anything opened from a root: back arrow, no nav bar, optional pinned action bar.' },
    { name: 'Handheld full-screen dialog', use: 'A form: ✕, title and one confirming text button (DialogTopBar).', avoid: 'A two-choice question. Use a bottom sheet.' },
    { name: 'Handheld bottom sheet', use: 'Short contextual choices: a tee time’s actions, pay now or later.', avoid: 'Anything with a form field.' },
  ],
  states: [
    { state: 'Empty order', tablet: 'The rail’s top-left button is a hamburger (opens the nav). On sheets the rail tucks into its strip.', handheld: 'The Register destination has no badge.' },
    { state: 'Order in progress', tablet: 'The top-left button becomes a back arrow that clears the order, behind a confirm. The strip’s cart shows a count.', handheld: 'The Register destination shows the line count as a badge, from any screen.' },
    { state: 'Panel open', tablet: 'Everything behind the panel is inert: no clicks, no Tab, not in the accessibility tree. With this reservation’s order on the rail, the rail stays live beside it.', handheld: 'The reservation is a pushed screen; there is nothing behind it to freeze.' },
    { state: 'Nav open', tablet: 'Over everything, including a panel. Escape or ✕ closes it; going somewhere closes it.', handheld: 'There is no nav sheet: the navigation bar is the menu.' },
    { state: 'Signed out', tablet: 'The PIN sign-in covers the whole terminal, dialogs included.', handheld: 'Switch operator in More signs someone else in and changes the bar.' },
  ],
  sizing: [
    { surface: 'Clover Mini 1280×800', size: 'Rail 320 or 56. Toolbars 56. Dialogs keep a 16px margin; tall dialogs cap at 720.', why: 'The default terminal, 40px shorter than the design canvas. Dense and mouse-first.' },
    { surface: 'Large display 1920×1080', size: 'Rail 380. Nav 6 tiles a row (4 on the Mini). Register 7 items a row (5).', why: 'More content, not bigger controls (useTileColumns, useLeftPanelWidth in device-context.tsx).' },
    { surface: 'Quest 360×800', size: `Status ${mobile.statusBarH} · top bar ${mobile.topAppBarH} · nav bar ${mobile.navBarH} · gesture ${mobile.gestureBarH}. About 608px of body between them.`, why: 'Material 3 touch sizes, 48dp targets. Narrow (< 380): row spacing tightens, tap heights never do.' },
    { surface: 'Clover Flex 360×720', size: 'The same bars; about 528px of body.', why: 'The shortest screen Birdie runs on. Short (< 760) is a frame class components can read.' },
  ],
  behavior: [
    'The frame is fixed per device and never reflows. A device only resizes the app of its own form; the design canvases are what renders with no device chosen.',
    'Panels and the nav are siblings inside PosShell, positioned against it, so they stop at the frame’s rounded corners on any window size.',
    'Dialogs portal to the page on purpose. Scoping them into the frame put the whole app inside an aria-hidden subtree while a dialog was open.',
    'A modal layer makes the background inert, not just dim: out of the tab order, the accessibility tree and pointer events.',
    'One control, one job: the rail’s hamburger always opens the nav; tapping the strip expands the rail (Weston, round 5).',
    'On the handheld, screens push and pop on a stack per destination. Switching destinations keeps each stack where it was.',
    'Bottom sheets portal into the phone frame, not the page, so they dim the navigation bar too and never escape the device.',
  ],
  content: [
    'Top app bar titles are the destination or the subject: "Tee Sheet", "Strand, E.". Subtitles carry when and where: "12:36 PM · Championship · Front 9".',
    'Navigation labels are one or two words, the same on both surfaces: Tee Sheet, Register, People, More, Tables, Tabs.',
    'The rail’s actions say what they do to the order: "Clear order" behind a confirm that counts the items.',
  ],
  dos: [
    'Put a new tablet destination on the stage, and leave the rail alone.',
    'Use the chrome’s TopAppBar and NavigationBar on every handheld screen.',
    'Make a modal layer’s background inert, as PosAppBody does.',
    'Read the frame class (wide, compact, narrow, short) to change density, not the device id.',
  ],
  donts: [
    'MUI Drawer or Modal for a panel inside the terminal.',
    'A second control that expands the rail, or a hamburger that does two things.',
    'A navigation bar and a pinned action bar on the same handheld screen.',
    'Scaling a frame up past its real size to fill a window: type sizes and targets stop being true.',
  ],
  a11y: [
    'The rail strip’s controls are named: "Open navigation", "Expand the order rail", "Order · 3 items". The nav sheet is a dialog named "Main navigation"; a dimmed tile is disabled and named "… — not built yet".',
    'The handheld navigation bar is a nav landmark named "Main" with aria-current on the active destination.',
    <>
      Navigation bar text: active <Contrast fg={md3.onSurface} bg={md3.surfaceContainer} label="Tee" />, inactive{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} label="More" />, and the active pill's icon{' '}
      <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} size="non-text" label="⛳" />. All pass.
    </>,
    'BottomSheet is role="dialog" and aria-modal, but it neither moves focus into itself nor closes on Escape. Fine for touch; a gap for an external keyboard.',
    'Targets: 34–38px rail buttons on the tablet (mouse) are deliberate; the handheld bars are 48dp and up.',
  ],
  decisions: [
    { decision: 'A fixed frame per device, not a fluid layout', why: 'Counter terminals and handhelds are known hardware. A fluid layout would be a different design, not the same one scaled.' },
    { decision: 'One persistent order rail on the tablet', why: 'Operators move between "who is on the sheet" and "what are they buying" all day. Losing the order in between would be the costliest thing the design could do.' },
    { decision: 'The hamburger opens the nav; the strip expands the rail', why: 'Weston, round 5: "it can’t expand the nav and do the cart." One control cannot own both.' },
    { decision: 'The main nav is a full-screen sheet of tiles', why: 'Eighteen destinations in a list is a scroll; in a four-column grid it is one screen.' },
    { decision: 'Panels are siblings of the frame, not MUI Drawers', why: 'A Drawer portals to the window and positions against it, and scoping it hides the app from assistive tech. A sibling clips to the frame and stays in the tree.' },
    { decision: 'The handheld bar is the menu, by role', why: 'A server would otherwise live two taps deep all shift. Pro shop and managers keep the golf bar; servers get the restaurant; reads the same role grid as the tablet’s nav.' },
  ],
  tokens: [
    { token: 'shell', value: '1366×840', role: 'The tablet design canvas (no device chosen)' },
    { token: 'grid.leftPanelW', value: '320px', role: 'The order rail (380 on the large display)' },
    { token: 'grid.topbarH', value: '56px', role: 'Every stage toolbar' },
    { token: 'radius.lg', value: '16px', role: 'The frame’s corners' },
    { token: 'mobile.frame', value: '402×797', role: 'The phone design canvas' },
    { token: 'mobile.topAppBarH / navBarH', value: '64 / 80dp', role: 'Top app bar and navigation bar' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'The navigation bar’s active pill' },
    { token: 'mobile.motion', value: '300 / 400ms', role: 'Push and sheet transitions' },
  ],
  engineering: {
    import: `import { PosShell, PosAppBody } from '../PosApp';                          // tablet
import { MobileScreen, TopAppBar, BottomActionBar, BottomSheet } from '../chrome'; // handheld
import { useTabletFrame, useTabletFrameClass, useMobileFrameClass } from '../device-context';`,
    themeOverride: (
      <>
        None for the chrome itself. Sizes come from <code>src/theme/tokens.ts</code> (<code>shell</code>, <code>grid</code>,{' '}
        <code>mobile</code>) and from <code>device-context.tsx</code>, which hands each frame its size and class. The handheld
        wraps itself in <code>mobileTheme</code> (<code>src/theme/mobile-theme.ts</code>); nothing outside{' '}
        <code>src/pos/mobile</code> is affected by it.
      </>
    ),
    notes: [
      <>
        Layer order on the tablet, by z-index: stage toolbars 40, multi-select bar 60, reservation scrim 79 and panel 80, summary
        drawer 84–85, nav sheet 120, context menus 9000. Dialogs portal to <code>document.body</code> above all of it.
      </>,
      <>
        <code>DeviceProvider</code> is absent in tests and most stories, which then render the design canvases. The prototype and
        Storybook’s Device toolbar provide one (<code>src/pos/devices.ts</code>).
      </>,
      <>
        A new back-office view goes in <code>RESTAURANT_VIEWS</code> in <code>PosApp.tsx</code>; a new handheld screen goes in the
        screen registry (<code>src/pos/mobile/screens/registry.ts</code>) and composes <code>MobileScreen</code>.
      </>,
      <>
        The App Chrome stories render pieces inside <code>PosShell</code> with a <code>PosProvider</code>; they mount no modal host,
        so actions that open a dialog do nothing there.
      </>,
    ],
    snippet: `export function GiftCardScreen() {
  const nav = useMobileNav();
  return (
    <MobileScreen
      topBar={<TopAppBar title="Gift card" subtitle="Card •••• 4268" />}
      bottomBar={<BottomActionBar summary="Balance $40.00">Charge $40.00</BottomActionBar>}
    >
      {/* the body scrolls; nothing else does */}
    </MobileScreen>
  );
}`,
  },
  related: [
    { name: 'Tee Sheet', id: 'components-layout-structure-tee-sheet' },
    { name: 'Bottom Navigation', id: 'components-navigation-bottom-navigation' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Backdrop', id: 'components-feedback-status-backdrop' },
    { name: 'Snackbar', id: 'components-feedback-status-snackbar' },
    { name: 'Paper', id: 'components-layout-structure-paper' },
  ],
};

export default doc;
