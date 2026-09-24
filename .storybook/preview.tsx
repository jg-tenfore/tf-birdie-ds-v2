import type { Preview } from '@storybook/react-vite';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource-variable/roboto';
import { theme } from '../src/theme';
import { WestonDefaultsProvider, westonDefaultsKey } from '../src/pos/state/weston-globals';
import { DEFAULT_WESTON_OPTIONS } from '../src/pos/state/pos-store';
import type { WestonOptions } from '../src/pos/state/pos-store';

/**
 * Birdie POS is a fixed-size counter terminal, not a responsive app: the prototype's
 * shell is 1366×840 and never reflows. Stories therefore default to that frame, and
 * the viewport control offers the neighbouring hardware sizes rather than phones.
 */
const POS_VIEWPORTS = {
  // Mobile Screens only — each of those story files selects it; nothing else defaults to it.
  mobile402: {
    name: 'Mobile · 402×797',
    styles: { width: '402px', height: '797px' },
    type: 'mobile' as const,
  },
  // The 1366×840 frame plus the 8px of dark ground `Screen` draws around it, so the whole
  // terminal — its bottom edge included — is visible without scrolling.
  counterTerminal: {
    name: 'Counter terminal · 1366×840',
    styles: { width: '1382px', height: '856px' },
    type: 'desktop' as const,
  },
  tabletLandscape: {
    name: 'Tablet · Landscape',
    styles: { width: '1280px', height: '800px' },
    type: 'tablet' as const,
  },
  ipadLandscape: {
    name: 'iPad · Landscape',
    styles: { width: '1024px', height: '768px' },
    type: 'tablet' as const,
  },
};

/**
 * The four switches Weston asked to compare rather than decide, as toolbar dropdowns.
 *
 * Each of them already has a story that shows the alternatives side by side — "10 · Panel
 * Size" puts 640, 820 and cover on one page — but a comparison story only ever compares them
 * on the booking *it* chose. Weston's worry about the narrow panel was about a busy Saturday;
 * his question about the rate grid was about the club with 26 rates. The toolbar is how a
 * reviewer carries a variant across to the screen the question was actually about, including
 * the screens that have nothing to do with panels.
 *
 * One list rather than four: the global's id, the `WestonOptions` field it drives and its
 * dropdown are declared together, so the toolbar and the reader of the toolbar cannot drift
 * apart, and the starting value is read from `DEFAULT_WESTON_OPTIONS` rather than restated —
 * an untouched toolbar therefore shows exactly what the hosted prototype shows.
 *
 * See `src/pos/state/weston-globals.tsx` for how a choice reaches state, and for why a story
 * that pins a switch keeps beating the toolbar.
 */
const WESTON_SWITCHES = [
  {
    global: 'westonPanelWidth',
    option: 'panelWidth',
    name: 'Panel width',
    description:
      'Weston, round 3: "I think it\'s more important to have this bigger than to show more of the tee sheet." How wide the reservation slide-over runs.',
    icon: 'sidebaralt',
    title: 'Panel width',
    items: [
      { value: 'standard', title: 'Panel 640 · ships' },
      { value: 'wide', title: 'Panel 820 · room for rates' },
      { value: 'cover', title: 'Panel covers the sheet' },
    ],
  },
  {
    global: 'westonRowDensity',
    option: 'rowDensity',
    name: 'Row density',
    description:
      'Whether a player row gives the rate and the transport their own lines, or packs them into V1\'s one-liner so more of the party fits without scrolling.',
    icon: 'listunordered',
    title: 'Row density',
    items: [
      { value: 'comfortable', title: 'Rows comfortable' },
      { value: 'dense', title: 'Rows dense' },
    ],
  },
  {
    global: 'westonTransportStyle',
    option: 'transportStyle',
    name: 'Transport',
    description:
      'Transport as the walk / ride / push toggle on the row, or as the named transport rate it actually bills — the trade Weston could "be convinced either way" on.',
    icon: 'switchalt',
    title: 'Transport',
    items: [
      { value: 'toggle', title: 'Transport toggle' },
      { value: 'named', title: 'Transport named rate' },
    ],
  },
  {
    global: 'westonRateCatalog',
    option: 'rateCatalog',
    name: 'Rate catalog',
    description:
      'Swaps the demo course for the 26-rate one, to see whether the tile grid still holds at a club that prices every band separately. Story-only — no prototype ships it.',
    icon: 'grid',
    title: 'Rates',
    items: [
      { value: 'standard', title: 'Rates standard' },
      { value: 'heavy', title: 'Rates heavy · 26' },
    ],
  },
] as const satisfies readonly {
  global: string;
  option: keyof WestonOptions;
  name: string;
  description: string;
  icon: string;
  title: string;
  items: readonly { value: string; title: string }[];
}[];

/** The dropdowns themselves. `items` is copied because Storybook's type wants a mutable array. */
const WESTON_GLOBAL_TYPES = Object.fromEntries(
  WESTON_SWITCHES.map((s) => [
    s.global,
    {
      name: s.name,
      description: s.description,
      toolbar: { icon: s.icon, title: s.title, dynamicTitle: true, items: [...s.items] },
    },
  ]),
);

/** Where each dropdown starts: the value the prototype ships with. */
const WESTON_INITIAL_GLOBALS = Object.fromEntries(
  WESTON_SWITCHES.map((s) => [s.global, DEFAULT_WESTON_OPTIONS[s.option]]),
);

/**
 * Read the four globals back out as a `WestonOptions` patch.
 *
 * Storybook keeps globals as loose strings and will happily hand back one that came from a
 * bookmarked URL or from local storage — including a value that was renamed out of the
 * dropdown since. Each is therefore checked against the items it claims to come from, and a
 * value that no longer matches is dropped rather than seeded, so the switch falls through to
 * the prototype's own default instead of putting state somewhere no component understands.
 */
function westonGlobals(globals: Record<string, unknown>): Partial<WestonOptions> {
  const patch: Record<string, string> = {};
  for (const s of WESTON_SWITCHES) {
    const value = globals[s.global];
    if (typeof value === 'string' && s.items.some((i) => i.value === value)) {
      patch[s.option] = value;
    }
  }
  return patch as Partial<WestonOptions>;
}

const preview: Preview = {
  // Every story gets a Docs page.
  tags: ['autodocs'],
  initialGlobals: {
    viewport: { value: 'counterTerminal', isRotated: false },
    // The Weston switches start where the prototype stands today, so an untouched toolbar
    // shows exactly what the hosted build shows.
    ...WESTON_INITIAL_GLOBALS,
  },
  globalTypes: WESTON_GLOBAL_TYPES,
  parameters: {
    viewport: { options: POS_VIEWPORTS },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: {
      // 'todo' surfaces violations in the test UI without failing CI.
      test: 'todo',
    },
    // Explicit sidebar order — Storybook sorts alphabetically otherwise.
    options: {
      storySort: {
        order: [
          'Getting Started',
          ['Introduction', 'Deep Links'],
          'Foundations',
          ['Colors', 'Typography', 'Spacing', 'Radius', 'Border', 'Effect Styles', 'Icons', 'Logos', 'Images'],
          'Components',
          [
            'Actions',
            'Navigation',
            'Forms',
            'Feedback & Status',
            'Layout & Structure',
            'Media & Visuals',
            'Typography & Content',
          ],
          'App Chrome',
          'Account',
          ['Log in', 'Sign up', 'Forgot password', 'Verification'],
          'POS Screens',
          [
            '1 · Register & Order',
            ['Empty Register', 'Category & Items', 'Walk-in Order', 'Loaded Tee Time', 'Per-player Modifiers', 'Order Settings'],
            '2 · Tee Sheet',
            ['Calendar Grid', 'Compact & Bands', 'Blocks & Events', 'List View', 'Filters', 'Day Summary'],
            '3 · Booking & Check-in',
            ['Booking Detail', 'Players & Status', 'Financial', 'Group Notes', 'Activity', 'New Tee Time'],
            '4 · Tee Time Selection',
            ['Tee Picker', 'Eighteen Holes', 'Reserve Confirmation'],
            '5 · Payment',
            ['Checkout', 'Tip & Change', 'Payment Reader'],
            '6 · Operations',
            ['Block Time', 'Time Note', 'Price Override', 'League & Outing', 'Move Players', 'Rate Card', 'Multi-select'],
            '7 · People',
            ['Member Lookup', 'Golfer Search', 'Guest Detail', 'New Customer', 'Action Panel'],
          ],
          'Mobile Screens',
          [
            '0 · Navigation',
            '1 · Register & Order',
            '2 · Tee Sheet',
            '3 · Booking & Check-in',
            '4 · Tee Time Selection',
            '5 · Payment',
            '6 · Operations',
            '7 · People',
          ],
          'Weston Edits',
          [
            'Overview',
            '1 · Reservation Panel', ['Tablet', 'Mobile'],
            '2 · Player Rows', ['Tablet', 'Mobile'],
            '3 · ID.me Badge', ['Tablet', 'Mobile'],
            '4 · Customer Profile', ['Tablet', 'Mobile'],
            '5 · Financial, Notes & Activity', ['Tablet', 'Mobile'],
            '6 · Check In & Pay', ['Tablet', 'Mobile'],
            '7 · Register Golf Summary', ['Tablet', 'Mobile'],
            '8 · Bug Fixes', ['Tablet', 'Mobile'],
            '9 · Date Navigation', ['Tablet', 'Mobile'],
            '10 · Panel Size', ['Tablet', 'Mobile'],
            '11 · Rate Selector', ['Tablet', 'Mobile'],
            '12 · Player Row Detail', ['Tablet', 'Mobile'],
            '13 · Order Rail', ['Tablet'],
            '14 · Per-seat Cart', ['Tablet', 'Mobile'],
            '15 · Next In Line', ['Tablet', 'Mobile'],
            '16 · Cart Signout', ['Tablet', 'Mobile'],
            '17 · Punch Cards', ['Tablet', 'Mobile'],
            '18 · Rate Catalog',
            '19 · Deep Links', ['Tablet'],
          ],
          '*',
        ],
      },
    },
  },
  // Every story renders inside the POS theme plus a date-picker localization
  // context, so MUI and MUI X components are themed and functional everywhere.
  decorators: [
    // Carries the toolbar's variant choices down to `PosProvider`, which folds them into the
    // state it builds. The `key` is what makes the toolbar feel connected: Storybook re-renders
    // a story when a global changes but does not remount it, and these are initial-state
    // variants, so without a fresh mount the panel would keep the width it was born with.
    // Stories that pin a switch themselves are unaffected — see `seedWestonDefaults`.
    (Story, context) => {
      const weston = westonGlobals(context.globals);
      return (
        <WestonDefaultsProvider key={westonDefaultsKey(weston)} value={weston}>
          <Story />
        </WestonDefaultsProvider>
      );
    },
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Story />
        </LocalizationProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;
