import { elevation, mobile, reservationPanel } from '../../../theme/tokens';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Effect Styles — elevation (e1–e3), the scrims behind overlays, and motion.
 * Reference sheet: src/showcase/foundations/EffectStyles.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-effect-styles',
  summary: (
    <>
      Birdie is mostly flat: white cards on a pale ground, held together by hairlines. A shadow is a signal. There are{' '}
      <strong>three levels</strong> from Material Design 3: <code>e1</code> for tiles you press, <code>e2</code> for the one raised
      action, <code>e3</code> for anything that floats over the screen. A scrim dims what an overlay pauses, and motion is short and
      decelerating, so a panel arrives without making anyone wait.
      <ArtNote>Banner: long shadows, and stacked cards casting layered shadows.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: <>A foundation. <code>theme.shadows</code> maps levels 1–3 to the tokens, so MUI's <code>elevation</code> prop and Birdie's own components agree.</>,
  useFor: [
    <><code>elevation.e1</code>: resting tiles you press (category buttons, product tiles).</>,
    <><code>elevation.e2</code>: the one raised action at rest (the order rail's Pay).</>,
    <><code>elevation.e3</code>: menus, popovers, dialogs, slide-overs, the day summary, toasts; and hover on e1 and e2.</>,
    'A scrim behind anything that pauses the screen beneath it.',
  ],
  dontUseFor: [
    'Cards, panels and rows. They are flat with a 1.5px outline.',
    'Levels above e3. MUI\'s 4–24 all resolve to e3 in this theme.',
    'Shadow to show selection. Selection is a fill or an outline.',
  ],
  inBirdie: [
    {
      label: 'A reservation over the tee sheet',
      caption: (
        <>
          The slide-over floats at e3 over a 70% black scrim. The sheet behind it is paused, not gone: closing the panel leaves you
          on the same row.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'The register, tablet',
      caption: (
        <>
          Category and product tiles rest at e1, so they read as pressable on a flat screen. A category tile lifts 2px to e3 on
          hover.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'A tab, handheld',
      caption: (
        <>
          The handheld's FAB (Add items) carries the one strong shadow on the screen; the pinned bottom bar and the list are flat.
        </>
      ),
      shot: 'mobile-tab',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
  ],
  variants: [
    { name: 'e1', use: 'Pressable tiles at rest: CategoryButton, product tiles.', avoid: 'Cards and list rows.' },
    { name: 'e2', use: "The single most important resting action: the order rail's Pay button.", avoid: 'More than one thing per screen.' },
    { name: 'e3', use: 'Floating layers: MuiMenu, MuiDialog, popovers, search results, slide-overs, the day summary, toasts; hover on e1/e2.', avoid: 'Anything that sits in the layout.' },
    { name: 'Scrim', use: 'Behind a slide-over, a dialog or a bottom sheet. It says the screen behind is paused.', avoid: 'Popovers and menus, which close on an outside click without one.' },
    { name: 'Motion', use: 'A panel sliding in, a sheet rising, a page pushing in, a toast appearing.', avoid: 'Decoration. Nothing in Birdie animates for its own sake.' },
  ],
  states: [
    { state: 'Rest', tablet: 'Flat, or e1 for tiles and e2 for Pay.', handheld: 'Flat; the FAB carries its own shadow (mobile-theme.ts).' },
    { state: 'Hover', tablet: 'Tiles and Pay lift to e3 (category tiles also move up 2px).', handheld: 'No hover.' },
    { state: 'Pressed', tablet: 'The ripple; the shadow does not drop.', handheld: 'The ripple.' },
    { state: 'Open overlay', tablet: 'The layer at e3 over a scrim (or no scrim for menus and popovers).', handheld: 'Bottom sheets over a 32% scrim; full-screen dialogs replace the screen.' },
  ],
  behavior: [
    'Shadow follows height: the higher the layer, the larger the shadow. A menu over a dialog is still e3, and the menu\'s outline separates it.',
    "A scrim pauses the screen behind it. Behind the reservation panel the terminal is also marked inert (out of the tab order), not just covered, and its scrim is deliberately not a way out: the panel closes from its own buttons (✕, Close, Move, Delete, Check in & pay) or Escape, so a stray tap on the dimmed sheet can't discard edits.",
    <>Motion decelerates in and accelerates out. The reservation panel and the tee sheet narrowing beside it share one curve: <code>{reservationPanel.motion}</code>.</>,
    <>The handheld follows MD3: {mobile.motion.push}ms to push a page, {mobile.motion.sheet}ms for a sheet, {mobile.motion.exit}ms to leave.</>,
  ],
  dos: [
    'Use the elevation tokens, or the theme\'s elevation prop (1–3).',
    'Keep shadows for things that float or that you press.',
    'Put a scrim behind anything modal.',
  ],
  donts: [
    'Stack shadows and outlines and fills on one card. Pick the hairline.',
    'Animate a value change (a total) with motion. Update it in place.',
    'Long or bouncy transitions. The counter is busy.',
  ],
  a11y: [
    'A shadow is never the only cue: floating layers also have an outline (menus: 1.5px hairline) or a scrim.',
    'Motion is short (under half a second). Open: honour prefers-reduced-motion for the panel slide and the handheld\'s page push.',
    'A scrimmed panel is modal: the terminal behind it is inert, and focus belongs to the panel.',
  ],
  decisions: [
    { decision: 'Three levels, from MD3', why: "The prototype's --e1 to --e3 were MD3 levels 1–3. MUI wants 25 shadows, so theme.ts fills 4–24 with e3 rather than invent more." },
    { decision: 'Flat by default', why: "The prototype separates layers with white on surface and a hairline, not shadows everywhere (theme.ts's background comment). It keeps a dense screen calm." },
    { decision: 'Dim, rather than squeeze, behind the reservation', why: 'Squeezing the tee sheet beside an 820px panel compresses the time gutter, slots and course headers. Dimming leaves the sheet\'s widths alone, and a 70% scrim over the whole terminal, order rail included, makes it plain what has focus (ReservationPanel.tsx).' },
    { decision: 'Open: three scrim strengths', why: 'The reservation panel uses 70%, the court and bay panel 60%, the day summary 50%, as literals. Pick one or two (a modal and a non-modal) and make them tokens.' },
    { decision: 'Open: shadow literals', why: 'A few shadows are typed rather than tokens (seat-chip popovers, list-view menus, the handheld FAB). Map them to e2 and e3.' },
  ],
  tokens: [
    { token: 'elevation.e1', value: <code>{elevation.e1}</code>, role: 'Pressable tiles at rest' },
    { token: 'elevation.e2', value: <code>{elevation.e2}</code>, role: 'The one raised action' },
    { token: 'elevation.e3', value: <code>{elevation.e3}</code>, role: 'Floating layers, hover' },
    { token: 'reservationPanel.motion', value: <code>{reservationPanel.motion}</code>, role: 'The slide-over and the sheet beside it' },
    { token: 'mobile.motion', value: `${mobile.motion.push} / ${mobile.motion.sheet} / ${mobile.motion.exit}ms`, role: 'Handheld push, sheet, exit' },
  ],
  engineering: {
    import: `import { elevation, reservationPanel, mobile } from '../../theme/tokens';`,
    themeOverride: (
      <>
        <code>theme.ts → shadows</code>: <code>['none', e1, e2, e3, …e3]</code>. <code>MuiMenu</code> and <code>MuiDialog</code> take{' '}
        <code>e3</code>; <code>MuiButton</code> sets <code>disableElevation</code>. <code>mobile-theme.ts → MuiFab</code> sets the
        handheld FAB's shadow as a literal.
      </>
    ),
    notes: [
      <>
        The device shells' heavy shadow (<code>0 8px 32px rgba(0,0,0,.4)</code> in <code>PosApp.tsx</code> and{' '}
        <code>TeeSheet.tsx</code>) is presentation chrome around the terminal, not part of the product's elevation.
      </>,
      <>Scrims are drawn by the component that owns the overlay (<code>ReservationPanel</code>, <code>ResourcePanel</code>, <code>TeeSheetSidebar</code>, the handheld's sheet in <code>chrome.tsx</code>).</>,
    ],
    snippet: `<Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.7)' }} onClick={close} />
<Box role="dialog" aria-modal sx={{ boxShadow: elevation.e3, transition: \`transform \${reservationPanel.motion}\` }}>
  …
</Box>`,
  },
  related: [
    { name: 'Border', id: 'foundations-border' },
    { name: 'Paper', id: 'components-layout-structure-paper' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Drawer', id: 'components-navigation-drawer' },
    { name: 'Backdrop', id: 'components-feedback-status-backdrop' },
    { name: 'Menu', id: 'components-navigation-menu' },
  ],
};

export default doc;
