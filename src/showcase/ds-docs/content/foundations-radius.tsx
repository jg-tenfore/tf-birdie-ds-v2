import { radius } from '../../../theme/tokens';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Radius — the four corner tokens and the circle, and what each shape tells the operator.
 * Reference sheet: src/showcase/foundations/Radius.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-radius',
  summary: (
    <>
      Four corners and a circle, from <code>radius</code> in <code>tokens.ts</code>: <strong>8, 12, 16 and 28px</strong>. The rule
      of thumb: the bigger the thing, the softer its corner, and anything you press that has a label is a full pill. So a status
      tag is nearly square, a tile is 12px, a dialog is 16px, and every button and chip on the counter is round-ended. The
      handheld follows Material Design 3 where it differs: 8dp chips, 4dp text fields, 16dp FABs.
      <ArtNote>Banner: a putting green of round forms.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: <>A foundation for both surfaces. <code>theme.shape.borderRadius</code> is <code>radius.md</code> (12px), so any MUI component that rounds by default rounds to 12.</>,
  useFor: [
    <><code>radius.sm</code> (8): tee-sheet chips, tooltips, toasts, notes, small tags; <code>radius.sm / 2</code> (4) for PayBadge.</>,
    <><code>radius.md</code> (12): inputs, tiles, wells, toggle groups, popovers. The default.</>,
    <><code>radius.lg</code> (16): cards, dialogs, menus. <code>radius.xl</code> (28): pills.</>,
  ],
  dontUseFor: [
    <>Typed values. Use the token: <code>{'`${radius.md}px`'}</code>, not <code>'12px'</code> or <code>borderRadius: 1.5</code>.</>,
    'Squared corners on anything interactive. Birdie has no sharp-cornered control.',
    "A pill on something you don't press, like a status badge. Pills read as touchable.",
  ],
  inBirdie: [
    {
      label: 'The register, tablet',
      caption: (
        <>
          Three shapes on one screen: the pill search field and top-bar buttons (28px), and 12px category and product tiles. The
          "2 left" stock badge inside a tile is a pill too, the exception to the badge rule below.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'A tab, tablet',
      caption: (
        <>
          Pill chips for the menu's categories, pill Void buttons, 12px seat groups and dish tiles, and a round icon button for a
          dish's options.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'The tee sheet, handheld',
      caption: (
        <>
          MD3's shapes: 8dp filter chips (All courses, Front 9), 12dp booking cards, a circle for today in the date strip, and
          the navigation bar's pill.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-global-nav-navigation--interactive',
    },
  ],
  variants: [
    { name: `radius.sm · ${radius.sm}px`, use: 'Small things that sit inside others: tee-sheet chips, tooltips, toasts, notes, tags.', avoid: 'Cards and dialogs.' },
    { name: `radius.sm / 2 · ${radius.sm / 2}px`, use: 'PayBadge and other status tags: nearly square, so they read as labels, not buttons.', avoid: '—' },
    { name: `radius.md · ${radius.md}px`, use: 'The default: inputs, tiles, wells, toggle groups, popovers, search results.', avoid: '—' },
    { name: `radius.lg · ${radius.lg}px`, use: 'Containers: cards (MuiCard), dialogs (MuiDialog), menus (MuiMenu); the handheld FAB.', avoid: 'Small controls; the corner looks bloated.' },
    { name: `radius.xl · ${radius.xl}px`, use: "Pills: every button and chip on the tablet, toolbar and host buttons, search fields. 28px is past half any control's height, so it's always a full pill.", avoid: 'Badges and tags.' },
    { name: 'Circle (50%)', use: 'Avatars, membership dots, icon buttons, the grid\'s add buttons.', avoid: 'Anything with text longer than two initials.' },
  ],
  states: [
    { state: 'Selected', tablet: 'The shape never changes with state; only fill and outline do.', handheld: 'Same.' },
    { state: 'Focus', tablet: 'A focus ring, where one is drawn, follows the corner.', handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Pills for buttons and chips (radius.xl); 12px tiles and inputs; 16px cards', why: 'The prototype drew pills throughout (.tb-btn, .switch-btn, .lv-chip). They read as touchable on a terminal and sit well with round chips and avatars.' },
    { surface: 'Handheld', size: 'Buttons 999 (pill); chips 8dp; text fields 4dp; FAB 16dp; sheets 28dp tops', why: "MD3's shape scale. Chips are rounded rectangles, not pills, so they don't read as buttons." },
  ],
  behavior: [
    'A nested shape is never rounder than its container: a 12px tile holds a 4px badge, a 16px card holds 12px wells.',
    'Images inside a tile are clipped by the tile\'s corner (overflow hidden), not given their own.',
  ],
  dos: [
    'Read corners from radius in tokens.ts, or let the theme round MUI components.',
    'Keep buttons and chips full pills on the tablet.',
    'Use the circle only for things that are round by nature: people, dots, icon buttons.',
  ],
  donts: [
    'Type a corner value. A literal can\'t follow the scale if it changes.',
    'Round a badge into a pill: it starts to look pressable.',
    'Square a tile to fit more. Shrink the gap instead.',
  ],
  a11y: [
    'Shape carries no meaning on its own. A pill says "you can press this", but a disabled pill also says why it can\'t act.',
    'Rounded corners can clip a focus outline drawn inside the box; draw focus rings with an offset outside it.',
  ],
  decisions: [
    { decision: 'Pills everywhere you press', why: 'The source prototype drew pills, and the Button page explains why they stayed: they read as touchable at the counter and match the chips and avatars.' },
    { decision: '12px is the default', why: 'theme.shape is radius.md, so MUI\'s rounded components (Paper, inputs, toggle groups) match the prototype\'s .lv-card and input corners without per-component overrides.' },
    { decision: 'MD3 shapes on the handheld', why: "On a phone, MD3's chip and field shapes are what people expect from the platform. The palette carries the brand across; the shapes follow the device." },
    { decision: 'Open: the stock badge is a pill', why: "StockBadge (\"2 left\", PosView.tsx) uses radius.xl, unlike every other status tag. Square it to radius.sm / 2 so it can't read as a button." },
    { decision: 'Open: literal corners', why: "Some corners are typed (the order rail's Pay button at '14px', '3px' marks on the grid, the handheld's 24–28px search bars and sheet tops). Map them to the tokens or add a token." },
  ],
  tokens: [
    { token: 'radius.sm', value: `${radius.sm}px`, role: 'Chips on the grid, tooltips, toasts, tags; half of it for badges' },
    { token: 'radius.md · theme.shape.borderRadius', value: `${radius.md}px`, role: 'The default: inputs, tiles, wells' },
    { token: 'radius.lg', value: `${radius.lg}px`, role: 'Cards, dialogs, menus, the FAB' },
    { token: 'radius.xl', value: `${radius.xl}px`, role: 'Pills' },
  ],
  engineering: {
    import: `import { radius } from '../../theme/tokens';`,
    themeOverride: (
      <>
        <code>theme.ts</code>: <code>shape.borderRadius = radius.md</code>; <code>MuiButton</code> and <code>MuiChip</code> at{' '}
        <code>radius.xl</code>; <code>MuiCard</code>, <code>MuiDialog</code>, <code>MuiMenu</code> at <code>radius.lg</code>;{' '}
        <code>MuiTooltip</code> at <code>radius.sm</code>. <code>mobile-theme.ts</code>: buttons <code>999</code>, chips{' '}
        <code>radius.sm</code>, outlined inputs <code>4</code>, <code>MuiFab</code> <code>radius.lg</code>.
      </>
    ),
    notes: [
      <>
        In <code>sx</code>, a bare number is multiplied by <code>theme.shape.borderRadius</code> (so <code>borderRadius: 1</code> is
        12px). Pass a string with px from the token to avoid the surprise.
      </>,
    ],
    snippet: `<Box sx={{ borderRadius: \`\${radius.md}px\`, overflow: 'hidden', border: \`1.5px solid \${md3.outlineVariant}\` }}>
  <img src={itemImage(item.n)} alt="" />
</Box>`,
  },
  related: [
    { name: 'Border', id: 'foundations-border' },
    { name: 'Spacing', id: 'foundations-spacing' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Card', id: 'components-layout-structure-card' },
  ],
};

export default doc;
