import { elevation, md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Paper — MUI's base surface. Birdie uses it directly once (the register's search results) and
 * indirectly under every MUI Dialog, Menu and Popover. Its own surfaces are Boxes with the same
 * three ingredients: white, a 1.5px hairline, and one of three shadows.
 */
const doc: DsDoc = {
  summary: (
    <>
      The surface things sit on: a white sheet with a corner radius and, when it floats, a shadow. MUI builds its Dialog, Menu,
      Popover and Card on <code>Paper</code>, so Birdie uses it under every dialog and menu without naming it. Directly, it appears
      once: the <strong>register's search results</strong>. Birdie's own surfaces (the reservation panel, the summary drawer, the
      course menus, the nav sheet) are <code>Box</code>es drawn with the same three ingredients: white, a 1.5px outline-variant
      hairline, and one of three shadows. There is no 0–24 elevation scale in Birdie; there are three levels.
    </>
  ),
  statusNote: (
    <>
      Imported in one tablet file (<code>PosView.tsx</code>, the search popper) and present inside every MUI Dialog, Menu and
      Snackbar. Themed: rounded Paper takes the 12px radius. The handheld does not import it.
    </>
  ),
  mui: ['Paper'],
  useFor: [
    'A floating surface under a Popper or Popover: search results, a picker.',
    'The surface MUI components bring with them (Dialog, Menu). Style them through the theme, not by wrapping them in more Paper.',
  ],
  dontUseFor: [
    'A slide-over or drawer inside the terminal: build a Box sibling of PosShell (see App Chrome).',
    'Cards: Birdie’s cards are ButtonBase with an outline (see Card).',
    'Grouping inside a screen: use a recessed surface-container panel or section headings, not a raised sheet.',
    'Any elevation above 3. Birdie has three shadows.',
  ],
  inBirdie: [
    {
      label: 'Register search results',
      caption: (
        <>
          Type in the register’s search and the top eight matches drop down on Paper: 12px corners, a 1.5px hairline, the e3 shadow,
          rows split by a surface-container line. The one direct use of Paper in Birdie.
        </>
      ),
      storyId: 'v1-→-v2-migration-16-·-inventory-tablet--search-flags-low-stock',
      tabletHash: '#/register',
    },
    {
      label: 'Paper under a dialog',
      caption: (
        <>
          Every tablet dialog is MUI’s Dialog, so its body is Paper: 16px corners and the e3 shadow from the theme. The customer record
          here sits on it, over the reservation.
        </>
      ),
      shot: 'tablet-customer-record',
      tabletHash: '#/tee-sheet?res=p04_m6&cust=607469&cust-seat=0',
    },
    {
      label: 'The same surface, without Paper',
      caption: (
        <>
          The reservation slide-over is a Box: white, a 1px left hairline and the e3 shadow. Built outside MUI’s Modal so it clips to
          the terminal and stays in the accessibility tree.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
  ],
  birdie: [
    { name: 'ModalFrame', file: 'src/pos/modals/ModalFrame.tsx', use: 'every dialog, on MUI Dialog’s Paper (16px radius, e3).', surface: 'tablet' },
    { name: 'MenuPopover', file: 'src/pos/components/TeeSheetGrid.tsx', use: 'a floating two-line menu as a Box: 12px radius, 1.5px hairline, e3.', surface: 'tablet' },
    { name: 'ReservationPanel · TeeSheetSidebar', file: 'src/pos/components/ReservationPanel.tsx', use: 'slide-overs as Boxes with the e3 shadow, positioned in PosShell.', surface: 'tablet' },
    { name: 'Well', file: 'src/pos/components/primitives.tsx', use: 'a recessed surface-container panel (12px radius). Defined, not used by any screen today.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Fill', description: 'White (#fff) for anything that floats; the surface colour (#f8faf8) is the ground under it.' },
    { part: 'Corners', description: '12px for popovers and menus (MuiPaper rounded), 16px for dialogs and MUI menus (radius.lg).' },
    { part: 'Hairline', description: '1.5px outline-variant on floating menus and search results, so the edge holds on a white page.' },
    { part: 'Shadow', description: 'e1, e2 or e3 (MD3 levels 1–3). e3 for everything that floats over content.' },
  ],
  variants: [
    { name: 'Flat (no shadow)', use: 'The ground and anything that sits in the layout: toolbars, rails, rows.' },
    { name: 'e1', use: 'A slight lift for small controls on a surface (rare).' },
    { name: 'e2', use: 'Hover lift on the tee sheet’s list cards.' },
    { name: 'e3', use: 'Floats over content: dialogs, menus, search results, the reservation and summary slide-overs, the snackbar.' },
    { name: 'Outlined Paper', use: 'Not used; outlined surfaces in Birdie are Boxes or Cards.', avoid: 'Elevations 4–24 from the story’s scale: not Birdie.' },
  ],
  states: [{ state: 'Default', tablet: 'Static. A surface has no hover or focus of its own; what is on it does.', handheld: 'The handheld does not import Paper; dialogs and sheets are its own chrome.' }],
  sizing: [
    { surface: 'Tablet', size: 'Dialogs 480px wide by default, 16px from the edge on the Clover Mini, at most 720 tall.', why: 'ModalFrame’s defaults for a 1280×800 terminal.' },
    { surface: 'Handheld', size: 'Bottom sheets 28px top corners, up to 85% of the frame.', why: 'Material 3 modal bottom sheet, drawn in chrome.tsx rather than on Paper.' },
  ],
  behavior: [
    'A surface floats only when it is over content and temporary. Anything in the layout is flat.',
    'Shadows come from three tokens. A shadow string typed inline is a token missed.',
  ],
  dos: [
    'Use elevation.e3 for anything that floats.',
    'Add the 1.5px hairline to white surfaces over white.',
    'Style MUI’s own Paper (Dialog, Menu) through the theme.',
  ],
  donts: [
    'Elevation numbers from MUI’s 0–24 scale.',
    'Paper inside Paper.',
    'A shadow on a card at rest.',
  ],
  a11y: [
    'Paper has no role of its own. The component on it (a dialog, a menu, a listbox of results) supplies the semantics.',
    <>
      Text on Paper is on white: body text <Contrast fg={md3.onSurface} bg="#ffffff" label="Aa" />, secondary{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" label="Aa" />.
    </>,
    'The register’s search results are clickable Stacks, not options: no listbox role, and arrow keys do not move through them. A gap if search is used from a keyboard.',
  ],
  decisions: [
    { decision: 'Three elevations, not twenty-four', why: 'The source prototype defines --e1 to --e3 (MD3 levels 1–3). Three are enough to say "lifted", "floating" and nothing in between.' },
    { decision: 'Birdie’s own floating surfaces are Boxes', why: 'MUI’s Modal-based surfaces portal to the window and hide the app from assistive tech when scoped. A Box in PosShell clips to the terminal and stays in the tree.' },
  ],
  tokens: [
    { token: 'elevation.e1', value: elevation.e1.split('),')[0] + ')…', role: 'Level 1' },
    { token: 'elevation.e2', value: elevation.e2.split('),')[0] + ')…', role: 'Level 2: hover lift' },
    { token: 'elevation.e3', value: elevation.e3.split('),')[0] + ')…', role: 'Level 3: anything that floats' },
    { token: 'radius.md / radius.lg', value: '12 / 16px', role: 'Rounded Paper / dialogs and menus' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The 1.5px hairline on floating surfaces' },
  ],
  engineering: {
    import: `import { Paper, Popper } from '@mui/material';
import { elevation, radius, md3 } from '../../theme/tokens';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiPaper</code>: <code>rounded</code> takes <code>radius.md</code> (12px).{' '}
        <code>MuiDialog</code>’s paper takes <code>radius.lg</code> and <code>elevation.e3</code>; <code>MuiMenu</code>’s paper adds
        the 1.5px hairline.
      </>
    ),
    notes: [
      <>
        Several components type their shadow inline rather than reading the token (the tee sheet’s menus, the list card’s hover,
        PosShell’s own 0 8px 32px). Same values, mostly; reading <code>elevation</code> keeps them so.
      </>,
      <>
        <code>Well</code> in <code>primitives.tsx</code> is defined and unused. Use it or remove it.
      </>,
    ],
    snippet: `<Popper open={results.length > 0} anchorEl={anchor} placement="bottom-start" sx={{ zIndex: 100, width: anchor?.clientWidth }}>
  <Paper sx={{ mt: '3px', border: \`1.5px solid \${md3.outlineVariant}\`, borderRadius: \`\${radius.md}px\`, boxShadow: elevation.e3, overflow: 'hidden' }}>
    {results.map((item) => <ResultRow key={item.n} item={item} />)}
  </Paper>
</Popper>`,
  },
  related: [
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Effect Styles', id: 'foundations-effect-styles' },
    { name: 'Radius', id: 'foundations-radius' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
  ],
};

export default doc;
