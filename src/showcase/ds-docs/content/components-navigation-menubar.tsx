import type { DsDoc } from '../types';

/**
 * Menubar — a desktop pattern (File · Edit · View) with no place on a touch counter. Birdie puts
 * commands on screen in a toolbar, and reaches screens through the main navigation.
 */
const doc: DsDoc = {
  summary: (
    <>
      A desktop-style strip of menu titles (File · Edit · View) that each drop a list of commands. <strong>Birdie doesn't
      have one</strong>, and shouldn't: it hides commands two levels deep behind words that say nothing about the work, on a
      screen people touch. Birdie puts a screen's commands <strong>on the screen</strong>, in a toolbar of pills, keeps rare
      ones in a ⋮ menu, and reaches other screens through the <strong>main navigation</strong>.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Not used. MUI has no Menubar component; the story composes one from an AppBar and Menus, to show what not to build. A
      candidate to remove from the system.
    </>
  ),
  useFor: ['Nothing in Birdie.'],
  dontUseFor: [
    'A screen’s commands: a toolbar (ToolbarButton pills on the tee sheet and resource sheets; OpsToolbar on operations screens).',
    'Rare commands: a ⋮ menu beside the thing they act on.',
    'Moving between screens: the main navigation (tablet) or the navigation bar (handheld).',
  ],
  inBirdie: [
    {
      label: 'Instead: a toolbar, tablet',
      caption: (
        <>
          The tee sheet's toolbar shows its commands as pills: the date and arrows, Today, the Day band, golfers, Calendar |
          List, search, day summary, settings, and a dark <strong>Register</strong>. Nothing is hidden under a title.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet',
    },
    {
      label: 'Instead: a toolbar, operations',
      caption: (
        <>
          Operations screens share one toolbar: the screen's name, what it filters by, its actions on the right. The same
          height and rule as the tee sheet's, so moving between screens doesn't move the content.
        </>
      ),
      shot: 'tablet-order-lookup',
      tabletHash: '#/order-lookup',
    },
    {
      label: 'Instead: the main navigation',
      caption: <>Every destination as a tile, grouped, one tap each. This is where a menubar's "Go" menu would have been.</>,
      shot: 'tablet-main-nav',
      tabletHash: '#/register?nav=1',
    },
  ],
  birdie: [
    {
      name: 'ToolbarButton',
      file: 'src/pos/components/TeeSheetView.tsx',
      use: 'a screen’s commands on the tee sheet, Bay and Court Sheets: pills with an icon, a label or both.',
      surface: 'tablet',
    },
    {
      name: 'OpsToolbar',
      file: 'src/pos/components/operations/OpsToolbar.tsx',
      use: 'the shared top bar of every operations screen: title, filters, actions.',
      surface: 'tablet',
    },
    {
      name: 'TopAppBar',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'the handheld’s equivalent: title, up to two or three icon actions, and a ⋮.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'What a menubar is', description: 'A row of menu titles; each opens a dropdown of commands; keyboard shortcuts beside them.' },
    { part: 'Why it doesn’t fit', description: 'Commands are invisible until a title is opened; titles are abstract (Board, Tickets); dropdowns are made for a mouse and a keyboard.' },
  ],
  variants: [
    { name: 'Menubar', use: 'Not used.', avoid: 'Everywhere.' },
    { name: 'Toolbar (Birdie)', use: 'A screen’s commands, visible, one press each.', avoid: 'More than about eight commands: move the rare ones to ⋮.' },
  ],
  states: [{ state: 'Any', tablet: 'Not used. See Button (ToolbarButton) and Menu.', handheld: 'Not used.' }],
  behavior: [
    'A counter operator presses what they can see. Every command a screen uses often is on the screen.',
    'Rare commands go in a ⋮ next to the thing they act on (a course, an order), not in a global menu.',
    'Hover-to-open menus don’t exist on a touch screen.',
  ],
  dos: ['Put frequent commands in the toolbar.', 'Keep rare ones in a ⋮ menu beside their target.'],
  donts: ['Add a File / Edit / View strip.', 'Hide a frequent command two levels deep.'],
  a11y: [
    'A real menubar needs role="menubar", arrow-key movement between titles and into menus, and Escape. A toolbar of buttons needs none of that: each command is one tab stop with a visible name.',
  ],
  decisions: [
    {
      decision: 'Toolbars, not a menubar',
      why: 'The source prototype’s toolbar buttons (.tb-btn) are pills, and the theme matches them (src/theme/theme.ts → MuiButton). Operations screens share one toolbar so moving between screens doesn’t move the content (OpsToolbar.tsx).',
    },
    {
      decision: 'Keep the page, mark it Avoid',
      why: 'A component list usually includes it. The page says what Birdie does instead.',
    },
  ],
  engineering: {
    import: `import { ToolbarButton } from '../components/TeeSheetView';
import { OpsToolbar } from '../components/operations/OpsToolbar';`,
    notes: [
      'MUI has no Menubar. The story below builds one from AppBar, Button and Menu only to show the pattern.',
    ],
  },
  related: [
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
  ],
};

export default doc;
