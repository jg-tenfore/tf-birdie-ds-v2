import type { Preview } from '@storybook/react-vite';
import { AutoDocsPage } from '../src/showcase/ds-docs/AutoDocsPage';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import '@fontsource-variable/roboto';
import { theme } from '../src/theme';
import { WestonDefaultsProvider, westonDefaultsKey } from '../src/pos/state/weston-globals';
import { DEFAULT_WESTON_OPTIONS } from '../src/pos/state/pos-store';
import type { WestonOptions } from '../src/pos/state/pos-store';
import { DEVICES, DEVICE_GROUP_LABELS, formatSize, isDeviceId } from '../src/pos/devices';
import type { DeviceId } from '../src/pos/devices';
import { DeviceProvider } from '../src/pos/device-context';

/**
 * Viewports: the hardware Birdie ships on, from `src/pos/devices.ts`, plus the two design
 * canvases every screen was drawn on.
 *
 * A tablet viewport is the device plus the 8px of dark ground `Screen` draws around the
 * terminal on each side, so the whole frame — its bottom edge included — shows at 1:1 without
 * scrolling. A phone viewport is the device exactly: the phone fills the canvas edge to edge.
 *
 * The canvases keep their old ids (`counterTerminal`, `mobile402`), because story files pin
 * them — the phone stories open in `mobile402`, Weston's tablet stories in `counterTerminal`.
 *
 * The viewport sizes the canvas; the **Device** toolbar (below) sizes the app inside it. Pick
 * the same device in both to see it at exactly its size.
 */
const VIEWPORT_ID: Partial<Record<DeviceId, string>> = {
  'tablet-canvas': 'counterTerminal',
  'phone-canvas': 'mobile402',
};
const SCREEN_GROUND = 8;

const POS_VIEWPORTS = Object.fromEntries(
  DEVICES.map((d) => {
    const ground = d.form === 'tablet' ? SCREEN_GROUND * 2 : 0;
    return [
      VIEWPORT_ID[d.id] ?? d.id,
      {
        name: `${d.label}${d.physical ? ` · ${formatSize(d.viewport)}` : ''}`,
        styles: { width: `${d.viewport.width + ground}px`, height: `${d.viewport.height + ground}px` },
        type: d.form === 'tablet' ? ('tablet' as const) : ('mobile' as const),
      },
    ];
  }),
);

/**
 * The **Device** toolbar: any story on any device. `auto` leaves each story on its own design
 * canvas (1366×840 or 402×797), which is what every story and test renders without it.
 *
 * A device resizes the app of its own form only — a handheld leaves a tablet story on its
 * canvas, and the other way round (see `src/pos/device-context.tsx`). Inside the frame,
 * components lay out by the room they get: the large display shows more register tiles and a
 * wider rail, a 360px handheld tightens the spacing of its rows.
 */
const DEVICE_GLOBAL_TYPES = {
  device: {
    name: 'Device',
    description: 'Render the story on a device: the frame takes that device\'s size. Auto keeps the story\'s own design canvas.',
    toolbar: {
      icon: 'mobile' as const,
      title: 'Device',
      dynamicTitle: true,
      items: [
        { value: 'auto', title: 'Device: story canvas' },
        ...DEVICES.map((d) => ({
          value: d.id,
          // Singular: "Counter terminals" → "Counter terminal", "Design canvases" → "Design canvas".
          title: `${DEVICE_GROUP_LABELS[d.group].replace(/(canvas)es$|s$/, '$1')} · ${d.shortLabel} ${formatSize(d.viewport)}`,
        })),
      ],
    },
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
    device: 'auto',
    // The Weston switches start where the prototype stands today, so an untouched toolbar
    // shows exactly what the hosted build shows.
    ...WESTON_INITIAL_GLOBALS,
  },
  globalTypes: { ...DEVICE_GLOBAL_TYPES, ...WESTON_GLOBAL_TYPES },
  parameters: {
    // Design System entries render the Design System template; every other page is Storybook's own.
    docs: { page: AutoDocsPage },
    viewport: { options: POS_VIEWPORTS },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    a11y: {
      // 'todo' surfaces violations in the test UI without failing CI.
      test: 'todo',
    },
    // Explicit sidebar order — Storybook sorts alphabetically otherwise.
    //
    // The roots are TF Crane's: Start Here, Prototypes, Design System, Reviews, then Archive.
    // Prototypes are the current Birdie (`CURRENT_EDITION`), area by area in the nav's own
    // order (`src/pos/data/nav.ts`), each opening on its Screen index. Reviews are newest first,
    // each with its Summary first. Titles never use "·", "→" or "∕": they leak into story ids.
    // Every file moved on Nov 26 pins its old id in its meta, so links from before still open.
    options: {
      storySort: {
        order: [
          'Start Here',
          ['Overview', 'Style guide', 'Devices', 'Buck and Birdie', 'Process & roadmap', 'How to review', 'Deep links', '*'],
          'Prototypes',
          [
            'Tablet',
            [
              'Screen index',
              'Global Nav',
              ['Main nav', 'Deep links', '*'],
              'Pro Shop',
              [
                'Register & order',
                'Register golf summary',
                'Order rail',
                'Per-seat cart',
                'Punch cards',
                'Register functions',
                'Tee time selection',
                'Payment',
                '*',
              ],
              'Tee Sheet',
              [
                'Sheet views',
                'Reservation panel',
                'Player rows',
                'Player row detail',
                'ID.me badge',
                'Rate selector',
                'Rate catalog',
                'Financial, notes & activity',
                'Notes & order number',
                'Check in & pay',
                'Next in line',
                'Cart signout',
                'Date navigation',
                'Booking & check-in',
                'Operations',
                'Club layouts',
                '*',
              ],
              'Court Sheet',
              'Bay Sheet',
              'Quick Order',
              'Tabs',
              'Tables',
              'Reservations',
              'Orders & Tips',
              'Table Chart',
              'Customer Search',
              ['Search & house accounts', 'Customer profile', 'People', '*'],
              'Settings',
              'Order Lookup',
              'Time Clock',
              'Gift Cards',
              'Events',
              'Inventory',
              'Shift',
              'Sign-in',
              '*',
            ],
            'Mobile',
            [
              'Screen index',
              'Global Nav',
              'Pro Shop',
              [
                'Register & order',
                'Register golf summary',
                'Per-seat cart',
                'Punch cards',
                'Tee time selection',
                'Payment',
                '*',
              ],
              'Tee Sheet',
              [
                'Sheet views',
                'Reservation panel',
                'Player rows',
                'Player row detail',
                'ID.me badge',
                'Rate selector',
                'Financial, notes & activity',
                'Check in & pay',
                'Next in line',
                'Cart signout',
                'Date navigation',
                'Booking & check-in',
                'Operations',
                '*',
              ],
              'Court Sheet',
              'Bay Sheet',
              'Quick Order',
              'Tabs',
              'Tables',
              'Reservations',
              'Orders & Tips',
              'Table Chart',
              'Customer Search',
              ['Customer profile', 'People', '*'],
              'Settings',
              'Order Lookup',
              'Time Clock',
              'Gift Cards',
              'Events',
              'Inventory',
              'Shift',
              'Sign-in',
              '*',
            ],
            '*',
          ],
          'Design System',
          [
            'Overview',
            'Styles',
            ['Colors', 'Typography', 'Spacing', 'Radius', 'Border', 'Effect Styles', 'Icons', 'Logos', 'Images', '*'],
            'Components',
            [
              'Actions',
              'Navigation',
              'Forms',
              'Feedback & Status',
              'Layout & Structure',
              'Media & Visuals',
              'Typography & Content',
              '*',
            ],
            '*',
          ],
          'Reviews',
          [
            'Oct 2 – Proposal review',
            ['Summary', 'Built into the app', '1. Player rows v2', '8. League view v2', '*'],
            'Oct 1 – Proposals from the Sep 30 call',
            [
              'Summary',
              '1. Compact player rows',
              '2. Status chip instead of the stepper',
              '3. Membership on every player',
              '4. Contact details once',
              '5. Financial order number per player',
              '6. Empty rail collapsed by default',
              '7. Menu by role',
              '8. League and group view',
              '9. Settings Birdie sections',
              '10. Phone tee sheet header',
              '11. Phone reservation pager',
              '12. Course menu bug',
              '*',
            ],
            'Sep 22 – Weston Edits, rounds 1–5',
            ['Summary', 'Bug fixes', ['Tablet', 'Mobile'], 'Panel size', ['Tablet', 'Mobile'], '*'],
            '*',
          ],
          'Archive',
          [
            'About the archive',
            'Original port',
            [
              'Tablet',
              [
                'Register & Order',
                'Tee Sheet',
                ['*', 'Club Layouts'],
                'Booking & Check-in',
                'Tee Time Selection',
                'Payment',
                'Operations',
                'People',
                '*',
              ],
              'Mobile',
              [
                'Navigation',
                'Register & Order',
                'Tee Sheet',
                'Booking & Check-in',
                'Tee Time Selection',
                'Payment',
                'Operations',
                'People',
                '*',
              ],
            ],
            'Tee Sheet Actions',
            ['Action map', 'Create', 'Booking', 'Money', 'Time row', 'Move & select', 'Course', '*'],
            'Account',
            ['Log in', 'Sign up', 'Forgot password', 'Verification'],
            'V1 to V2 migration',
            '*',
          ],
          '*',
        ],
      },
    },
  },
  // Every story renders inside the POS theme plus a date-picker localization
  // context, so MUI and MUI X components are themed and functional everywhere.
  decorators: [
    // The **Device** toolbar. `auto` (or anything unrecognised from an old bookmark) renders
    // no provider at all, so the story is exactly what it was before devices existed. Keyed so
    // a new device remounts the story: its state was built for the frame it was born in.
    (Story, context) => {
      const id = context.globals.device;
      if (!isDeviceId(id)) return <Story />;
      return (
        <DeviceProvider key={id} device={id}>
          <Story />
        </DeviceProvider>
      );
    },
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
