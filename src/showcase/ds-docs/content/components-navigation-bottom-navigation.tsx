import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Bottom Navigation — the handheld's backbone, drawn by Birdie's own MD3 NavigationBar rather than
 * MUI's BottomNavigation. Which destinations it shows depends on who is signed in (bar-by-role.ts).
 */
const doc: DsDoc = {
  summary: (
    <>
      The bar along the bottom of the handheld that moves between its top-level destinations. It is the{' '}
      <strong>handheld's main menu</strong>: four or five destinations, the active one in a green pill, a badge where
      something is waiting. Birdie draws it with its own MD3 <code>NavigationBar</code>, not MUI's{' '}
      <code>BottomNavigation</code>. What it shows depends on <strong>who is signed in</strong>: a pro-shop operator gets Tee
      Sheet · Register · People · More, a server gets Tables · Tabs · Quick Order · More. The tablet has no bottom bar; its
      main menu is a full-screen sheet of tiles.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      The backbone of the handheld, on every root screen. Built as <code>NavigationBar</code> on <code>ButtonBase</code> in{' '}
      <code>src/pos/mobile/chrome.tsx</code>; MUI's <code>BottomNavigation</code> isn't imported, which is why the usage
      counts below are zero.
    </>
  ),
  mui: ['BottomNavigation', 'BottomNavigationAction'],
  useFor: [
    'Moving between the handheld’s top-level destinations (three to five).',
    'Showing that something is waiting in another destination: the Register’s count of lines on the open order.',
  ],
  dontUseFor: [
    'The tablet: the main navigation sheet (hamburger on the order rail).',
    'Screens below a root: they cover the bar and show a back arrow.',
    'Sections of one record: Tabs.',
    'More than five destinations: the rest go in More.',
  ],
  inBirdie: [
    {
      label: 'The golf bar, handheld',
      caption: (
        <>
          Tee Sheet · Register · People · More, with Tee Sheet active: a filled icon in a green pill and a bold label. The pro
          shop's bar, a manager's, and every edition's bar before V1 → V2.
        </>
      ),
      shot: 'mobile-tee-sheet',
      handheldRoute: 'mobile-screens-0-·-navigation--interactive',
    },
    {
      label: 'A server’s bar',
      caption: (
        <>
          Signed in as a server, the bar is Tables · Tabs · Quick Order · More: the whole shift is the restaurant, so it is one
          tap from anywhere. Reservations and Orders & Tips are in More.
        </>
      ),
      shot: 'mobile-tables',
      handheldRoute: 'prototypes-mobile-global-nav-menu-by-role--a-servers-bar',
    },
    {
      label: 'A badge on Register',
      caption: (
        <>
          With an order in progress, Register carries a count of its lines, so an unfinished order is visible from the tee
          sheet or People.
        </>
      ),
      handheldRoute: 'mobile-screens-0-·-navigation--order-in-progress',
      storyId: 'mobile-screens-0-·-navigation--order-in-progress',
    },
  ],
  birdie: [
    {
      name: 'NavigationBar',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'once, in MobileApp’s router, shown while the current destination is at its root. Pass tabs (from barFor) and badges.',
      surface: 'handheld',
    },
    {
      name: 'barFor',
      file: 'src/pos/mobile/bar-by-role.ts',
      use: 'which destinations a role’s bar shows, read from the same ROLE_ACCESS grid as the tablet’s menu.',
      surface: 'handheld',
    },
    {
      name: 'MobileNavProvider / useMobileNav',
      file: 'src/pos/mobile/navigation.tsx',
      use: 'the navigator: one back stack per destination, selectTab, push, pop.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Bar', description: '80dp tall, surfaceContainer, full width, under the screen and above the gesture handle. A nav landmark labelled "Main".' },
    { part: 'Destination', description: 'An equal share of the width: the whole column is the target, not just the icon.' },
    { part: 'Active indicator', description: 'A 64 × 32dp pill in secondaryContainer behind the icon. Animates in over 200ms.' },
    { part: 'Icon', description: 'Filled when active, outlined when not. The restaurant’s icons match the tablet menu’s tiles.' },
    { part: 'Label', description: '12px, always shown. Bold when active.' },
    { part: 'Badge (optional)', description: 'A count on the icon, in the error colour: lines on the open order.' },
  ],
  variants: [
    { name: 'Golf bar', use: 'Pro shop and manager, and every edition before V1 → V2: Tee Sheet · Register · People · More.', avoid: '—' },
    { name: 'Server / bartender bar', use: 'Tables · Tabs · Quick Order · More.', avoid: '—' },
    { name: 'Host bar', use: 'Tables · Reservations · More: seating, not ordering.', avoid: '—' },
    {
      name: 'MUI BottomNavigation',
      use: 'Not used.',
      avoid: 'Its shape (no pill indicator, labels that hide) is MD2. NavigationBar is the MD3 bar.',
    },
  ],
  states: [
    {
      state: 'Active',
      tablet: 'Not used on the tablet.',
      handheld: 'Filled icon in a secondaryContainer pill, bold onSurface label, aria-current="page".',
    },
    { state: 'Inactive', tablet: '—', handheld: 'Outlined icon, onSurfaceVariant label.' },
    { state: 'Re-tapped', tablet: '—', handheld: 'Tapping the active destination pops it to its root (MD3’s behaviour).' },
    { state: 'Badged', tablet: '—', handheld: 'A count on the icon. Hidden at zero.' },
    { state: 'Below a root', tablet: '—', handheld: 'Hidden: the pushed screen covers it and shows a back arrow.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Not used', why: 'A 1280px counter has room for a full menu; it opens as a sheet of tiles from the hamburger.' },
    { surface: 'Handheld', size: '80dp bar; each destination a quarter (or fifth) of 360dp', why: 'MD3’s navigation bar. Every target is far above 48dp because the whole column is pressable.' },
  ],
  behavior: [
    'Shows only on the destination roots. Anything pushed covers it, so each level below owns the whole screen.',
    'Each destination keeps its own back stack: leave a half-built order to check the tee sheet, come back, and the order is where you left it.',
    'Re-tapping the active destination returns it to its root.',
    'The bar is the menu, by role (V1 → V2): a role’s bar is the destinations its ROLE_ACCESS allows, up to five, with More last. A manager, who may use everything, keeps the golf bar and finds the restaurant under More › Restaurant.',
    'Weston Edits and the archive always show the golf bar.',
    'If the current destination isn’t on the signed-in operator’s bar (a manager signs out and a host signs in), the app moves to the bar’s first destination. More is on every bar, so switching operator from More never lands mid-task.',
    'While a screen animates out, the bar waits, so the leaving screen’s own bottom bar doesn’t jump.',
  ],
  content: [
    'Labels are the destination’s name, the same words as the tablet menu: Tee Sheet, Register, Tables, Quick Order.',
    'More is always last and always called More.',
  ],
  dos: [
    'Leave the bar to MobileApp; screens never render their own.',
    'Decide the bar with barFor(role), never by hand on a screen.',
    'Badge a destination only when something there needs finishing.',
  ],
  donts: [
    'Put more than five destinations on the bar.',
    'Hide labels on inactive destinations.',
    'Show the bar on a pushed screen or a dialog.',
  ],
  a11y: [
    'The bar is a nav element labelled "Main"; the active destination has aria-current="page". Each destination is a button with a visible label.',
    <>
      Contrast, computed. Active label <Contrast fg={md3.onSurface} bg={md3.surfaceContainer} label="Tee" />, inactive label{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} label="People" />, active icon in its pill{' '}
      <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} size="non-text" />. All pass.
    </>,
    'Active is shown three ways (filled icon, pill, bold label), never by colour alone.',
    'The badge’s number is text inside the button, so it is read run together with the label ("3 Register"). An aria-label such as "Register, 3 lines on the order" would say what it counts.',
  ],
  decisions: [
    {
      decision: 'The bar is the menu, by role (V1 → V2, Nov 26)',
      why: 'Weston approved Menu by role on Oct 2 for the tablet: "you could be like pro shop and not see any of the restaurant", and a bartender "doesn’t need to see the tee sheet". On the handheld the bottom bar is the menu, so it is decided by the same grid.',
    },
    {
      decision: 'A manager keeps the golf bar',
      why: 'From bar-by-role.ts: five tabs for a manager would change the bar under every pro-shop flow and story built so far, for the role that uses the restaurant least. More › Restaurant covers it.',
    },
    {
      decision: 'A server’s restaurant is one tap away',
      why: 'One bar with a Restaurant section in More would leave a server two taps deep for a whole shift.',
    },
    {
      decision: 'Birdie’s own bar, not MUI BottomNavigation',
      why: 'MD3’s bar has a pill indicator, always-visible labels and an 80dp height. Drawing it on ButtonBase got that exactly, with the badge and aria-current.',
    },
  ],
  tokens: [
    { token: 'mobile.navBarH', value: '80dp', role: 'Bar height' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Bar background' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'Active pill' },
    { token: 'mobile.onSecondaryContainer', value: '#0b1f15', role: 'Active icon' },
    { token: 'mobile.motion.easing', value: 'cubic-bezier(0.2, 0, 0, 1)', role: 'Pill fade-in, 200ms' },
  ],
  engineering: {
    import: `import { NavigationBar } from '../chrome';
import { barFor } from '../bar-by-role';`,
    themeOverride: <>None: <code>NavigationBar</code> is styled in place from <code>mobile</code> and <code>md3</code> tokens.</>,
    notes: [
      <>
        <code>barFor(role, restaurant)</code> returns the golf bar unless the edition has the restaurant and the role can't
        see the tee sheet. Its list is the role's <code>ROLE_ACCESS</code> (<code>src/pos/data/nav.ts</code>), capped at four,
        plus More.
      </>,
      <>
        Navigation state is <code>{'{ tab, stacks }'}</code>: one stack per destination. <code>selectTab</code> on the active
        tab pops to root; <code>openIn(tab, route)</code> jumps to another destination and opens a screen there (a booking to
        its order).
      </>,
      <>
        The <code>NavigationBar</code> docstring says <code>barFor</code> lives in <code>navigation.tsx</code>; it is in{' '}
        <code>bar-by-role.ts</code>.
      </>,
    ],
    snippet: `// MobileApp's router: the screens stack above, the bar sits under them on a root.
const orderLines = state.cart.filter((i) => !i.isSubItem).length;
const bar = barFor(staffById(state.operatorId, state.staffRoster)?.role, useV1V2());
…
{nav.atRoot && !exiting && <NavigationBar tabs={bar} badges={{ register: orderLines }} />}`,
  },
  related: [
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
  ],
};

export default doc;
