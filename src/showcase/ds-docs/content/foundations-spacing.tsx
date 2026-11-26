import { grid, mobile } from '../../../theme/tokens';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

/**
 * Spacing — MUI's 8px unit, the steps each surface leans on, and the fixed geometry that is a
 * token rather than spacing. Reference sheets: src/showcase/foundations/Spacing.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-spacing',
  summary: (
    <>
      Space in Birdie is MUI's <strong>8px unit</strong>, written in theme units (<code>p: 1.5</code>, <code>gap: 0.75</code>).
      The counter terminal is tight, in fine steps between 4 and 18px (most 2px apart, ported from the prototype as drawn), so
      the tee sheet and the order fit on one screen. The handheld keeps to Material Design 3's 8dp grid, with 16dp screen margins and 48dp rows, because a thumb needs
      room. A few measures that layouts depend on, like a tee-sheet row, are tokens of their own.
      <ArtNote>Banner: circles on a measuring grid at exactly equal intervals, the gaps marked like dimensions.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: <>A foundation for both surfaces. The theme leaves <code>spacing</code> at MUI's default, so <code>theme.spacing(1)</code> is 8px everywhere.</>,
  useFor: [
    <>Padding, margins and gaps, in theme units: <code>p: 1.25</code>, <code>gap: 0.75</code>, <code>mx: 2</code>.</>,
    <>Layout measures from <code>grid</code> and <code>mobile</code> in <code>tokens.ts</code>: row heights, the time gutter, bar heights, the touch target.</>,
  ],
  dontUseFor: [
    <>Raw pixel strings for padding (<code>p: '10px 12px'</code>) in new code. They land on the grid but can't be found or changed with it.</>,
    'Setting a control\'s height with padding. Controls get their height from the theme (34px tablet, 48dp handheld).',
    'New odd steps. The register\'s 5px and 7px tile gaps came from the prototype; don\'t add more.',
  ],
  inBirdie: [
    {
      label: 'The register, tablet',
      caption: (
        <>
          7px gutters between tiles, 18px around the grid and 10px inside each category tile, ported from the HTML prototype as
          drawn. Three rows of categories and a row of products fit above the fold at 1280×800.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'The tee sheet, handheld',
      caption: (
        <>
          16dp screen margins and 8dp between chips and cards; a card's padding tightens from 16dp to 10dp on a 360px handheld.
          Everything you tap is at least 48dp tall.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-global-nav-navigation--interactive',
    },
    {
      label: 'A reservation, tablet',
      caption: (
        <>
          The panel's body is padded 14px × 16px. Each player row has 8px × 12px padding, 8px between its controls and 8px to the
          next row, so a player's holes, transport, rate and Add fit on one line.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
  ],
  variants: [
    { name: '0.5 · 4px', use: 'Icon to label; stacked lines; badge padding.', avoid: 'Separating two controls.' },
    { name: '0.75 · 6px', use: 'Tablet: inline groups, icon · value · note (InfoRow).', avoid: 'The handheld.' },
    { name: '1 · 8px', use: 'The default gap between controls in a row, on both surfaces.', avoid: '—' },
    { name: '1.25 · 10px', use: 'Tablet: row and chip padding.', avoid: 'The handheld.' },
    { name: '1.5 · 12px', use: 'Card padding and the gap between cards; tile gutters.', avoid: '—' },
    { name: '2 · 16px', use: 'Panel padding, section gaps; the handheld\'s screen margin and list padding.', avoid: '—' },
    { name: '2.5–3 · 20–24px', use: 'A dialog\'s side padding (20px); handheld headers set in from the edge (24dp).', avoid: 'Tablet lists, where it wastes rows.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '4–18px in fine steps; controls 34px, list rows 38px', why: 'Mouse-first at a counter. Density is what lets the sheet and the order rail sit side by side.' },
    { surface: 'Handheld', size: '8, 12, 16, 24dp; rows 56/72/88dp; targets 48dp', why: 'MD3\'s grid and touch minimums. One-handed, often outdoors.' },
  ],
  behavior: [
    'Space groups things: related items sit closer than unrelated ones (6px inside a row, 12px between rows, 16px between sections).',
    'Density changes per surface, not per screen: a tablet dialog and a tablet panel use the same steps.',
    <>Layout reads the room: on a 360px handheld, rows tighten their gaps first (<code>useMobileFrameClass</code>), before anything truncates.</>,
  ],
  dos: [
    'Write spacing in theme units.',
    'Use the fixed geometry tokens for anything a layout depends on.',
    'Check a screen on the Clover Mini and a 360px handheld before calling spacing done.',
  ],
  donts: [
    'Mix units and pixel strings in one component.',
    'Add padding to a control to make it taller.',
    'Use handheld spacing on the tablet "for breathing room". The tablet\'s density is a decision.',
  ],
  a11y: [
    'Target size comes from height, not padding: 34px on the tablet (a mouse, on purpose), 44px for anything a thumb uses on the tablet (HostButton, TouchButton), 48dp on the handheld.',
    'Gaps between targets matter as much as their size: keep at least 8px between two tappable things on the tablet and 8dp on the handheld, so a press can\'t land on the neighbour.',
  ],
  decisions: [
    { decision: "MUI's default 8px unit", why: 'Both themes share it, so a step means the same distance on both; only which steps each surface uses differs.' },
    { decision: 'Fine steps on the tablet', why: "The prototype was drawn to the pixel (10px 12px paddings, 6px gaps, 7px tile gutters). Keeping its numbers keeps the port diffable against the source and the counter dense." },
    { decision: 'Layout measures are tokens', why: `A tee-sheet row (${grid.rowH}px, ${grid.rowHCompact}px compact), the order rail (${grid.leftPanelW}px) and the handheld bars (${mobile.topAppBarH}/${mobile.navBarH}dp) are read by layout code and tests, so they live in tokens.ts.` },
    { decision: 'Open: pixel strings on the tablet', why: "Many tablet components write padding as strings ('10px 12px', '12px 14px', ModalFrame's '16px 20px'). Convert to units as files are touched, so the scale is searchable." },
  ],
  tokens: [
    { token: 'theme.spacing(1)', value: '8px', role: 'The unit, on both surfaces' },
    { token: 'grid.rowH · rowHCompact', value: `${grid.rowH} · ${grid.rowHCompact}px`, role: 'A tee-sheet time row' },
    { token: 'grid.timeGutterW · topbarH · leftPanelW', value: `${grid.timeGutterW} · ${grid.topbarH} · ${grid.leftPanelW}px`, role: 'The grid\'s time column, the top bar, the order rail' },
    { token: 'mobile.touchTarget', value: `${mobile.touchTarget}dp`, role: 'Handheld minimum target' },
    { token: 'mobile.listItem.one · two · three', value: `${mobile.listItem.one} · ${mobile.listItem.two} · ${mobile.listItem.three}dp`, role: 'MD3 list item heights' },
    { token: 'mobile.topAppBarH · navBarH', value: `${mobile.topAppBarH} · ${mobile.navBarH}dp`, role: 'Handheld bars' },
  ],
  engineering: {
    import: `import { grid, mobile } from '../../theme/tokens';`,
    themeOverride: (
      <>
        Neither theme overrides <code>spacing</code>. Control heights come from component overrides instead:{' '}
        <code>theme.ts</code> sets <code>MuiButton</code> to <code>minHeight: 34</code> and list rows to 38px;{' '}
        <code>mobile-theme.ts</code> raises buttons to 40dp (56dp large), menu items and tabs to 48dp, list items to 56dp.
      </>
    ),
    notes: [
      <>
        Import <code>Stack</code> from <code>src/pos/components/Stack.tsx</code>, not MUI: it accepts <code>gap</code>,{' '}
        <code>alignItems</code> and friends as props and forwards them to <code>sx</code> (MUI v9's Stack dropped system props).
      </>,
      <>
        Room-dependent spacing reads <code>useTabletFrameClass()</code> / <code>useMobileFrameClass()</code> from{' '}
        <code>src/pos/device-context.tsx</code>, never the canvas constants.
      </>,
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1.25, py: 0.75 }}>
  <Icon name="schedule" size={14} />
  <Box component="span">{formatTimeLabel(b.timeMin)}</Box>
</Stack>`,
  },
  related: [
    { name: 'Radius', id: 'foundations-radius' },
    { name: 'Typography', id: 'foundations-typography' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
  ],
};

export default doc;
