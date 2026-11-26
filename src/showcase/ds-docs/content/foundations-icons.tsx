import { ICONS } from '../../../pos/icons';
import { ArtNote } from '../styles-kit';
import type { DsDoc } from '../types';

const REGISTERED = Object.keys(ICONS).length;

/**
 * Icons — the Icon primitive and its ligature registry, the test that guards it, sizes per
 * surface, and labelling. Reference sheets: src/showcase/foundations/Icons.stories.tsx.
 */
const doc: DsDoc = {
  art: 'ds-icons',
  summary: (
    <>
      Birdie draws Google's Material icons. On the counter terminal every icon goes through one primitive,{' '}
      <code>{'<Icon name="how_to_reg" />'}</code>, which looks a Material Symbols name up in a registry of {REGISTERED} glyphs, so
      the ported data files can keep naming icons the way the HTML prototype did. The handheld imports Material icons directly, in
      MD3's style: <strong>outlined at rest, filled when active</strong>. An icon helps someone scan; it never stands in for a label
      on anything that moves money.
      <ArtNote>Banner: an icon construction sheet — keyline grids with a flag, a ball, a tee, a cart and a cup, one stroke weight.</ArtNote>
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      A foundation for both surfaces. The tablet uses only the registry (no direct icon imports outside <code>src/pos/icons.ts</code>);
      the handheld mostly imports <code>@mui/icons-material</code> components, usually the Outlined variants.
    </>
  ),
  useFor: [
    'Scanning: a category tile\'s glyph, transport (walk, ride, push), a lock on a sent dish.',
    'Icon buttons with a clear, common meaning (close, back, more, search), with an aria-label.',
    'Leading icons in buttons when they help recognition, like Send\'s paper plane.',
    'Empty states, at 38px over a one-line label.',
  ],
  dontUseFor: [
    'The only label on a money action (Pay, Refund, Void). Write the word.',
    'Status on its own. A status icon sits next to its word or in a badge.',
    'Decoration in running text.',
    'Glyphs outside the registry on the tablet. Add the name to icons.ts first.',
  ],
  inBirdie: [
    {
      label: 'The register, tablet',
      caption: (
        <>
          Every category tile has a 20px glyph above its label (golf ball, hanger, tag, cup), so staff find categories by shape as
          well as colour. The top bar's Open item and Tee sheet buttons lead with icons.
        </>
      ),
      shot: 'tablet-pro-shop',
      tabletHash: '#/register/GOLF%20BALLS',
    },
    {
      label: 'A reservation, tablet',
      caption: (
        <>
          Icons beside words: Walk, Ride and Push with their glyphs, a flag on Finished, a cart on Add, the ⋯ for more. The words
          stay; the glyphs make the row quicker to scan.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'The tee sheet, handheld',
      caption: (
        <>
          MD3 icons at 24dp: search and filter in the top app bar, and the navigation bar's filled Tee Sheet glyph on its active
          pill beside the outlined Register, People and More.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-global-nav-navigation--interactive',
    },
  ],
  birdie: [
    { name: 'Icon', file: 'src/pos/components/primitives.tsx', use: 'every icon on the tablet: a ligature name, a pixel size, an optional colour. Always aria-hidden.', surface: 'tablet' },
    { name: 'ICONS · iconFor', file: 'src/pos/icons.ts', use: 'the registry: ligature name → @mui/icons-material component, imported one per line so the bundle tree-shakes.', surface: 'both' },
    { name: 'icons.test.ts', file: 'src/pos/icons.test.ts', use: 'fails the build when any name= or icon= in src asks for a glyph the registry lacks, including both halves of a ternary.', surface: 'both' },
    { name: 'EmptyState · InfoRow', file: 'src/pos/components/primitives.tsx', use: 'a 38px icon over a label; a 14px icon before a value.', surface: 'tablet' },
  ],
  variants: [
    { name: 'Filled (tablet default)', use: 'Every registry glyph: Material Icons\' filled style, matching the prototype\'s Material Symbols.', avoid: 'Mixing in outlined glyphs on the tablet.' },
    { name: 'Outlined (handheld rest)', use: 'Handheld icons at rest, and inactive navigation destinations.', avoid: 'The active destination.' },
    { name: 'Filled (handheld active)', use: "The active navigation destination, on its secondaryContainer pill (chrome.tsx's TAB_ICONS on/off pairs).", avoid: '—' },
    { name: 'Rounded', use: 'Handheld warnings only (WarningAmberRounded, in the restaurant screens).', avoid: 'New uses. Pick outlined or filled.' },
  ],
  states: [
    { state: 'Rest', tablet: <>Inherits its text colour, usually <code>onSurfaceVariant</code>.</>, handheld: <>Outlined, <code>onSurfaceVariant</code>.</> },
    { state: 'Active / selected', tablet: <>Takes the selected colour of its control (<code>primary</code> on a selected chip).</>, handheld: <>Filled, <code>onSecondaryContainer</code>, on the active pill.</> },
    { state: 'Disabled', tablet: 'Dims with its control.', handheld: 'Same.' },
    { state: 'Danger', tablet: <><code>error</code> on destructive actions and alerts (Void, an allergy).</>, handheld: 'Same.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '13–14px inline with 11–12px text; 16px default; 18px in buttons; 20px on category tiles; 38px empty states', why: 'Sized in pixels to match the text beside it, which the prototype set per context (Icon takes size, not MUI\'s fontSize scale).' },
    { surface: 'Handheld', size: '24dp in a 48dp target; 16–20dp inline with text', why: "MD3's icon size and touch target. IconButton's 40dp visual sits in a 48dp target." },
  ],
  behavior: [
    'An icon sits before its label, vertically centred, with a 4–8px gap (0.5–1 units).',
    'Icon-only buttons are for universal actions: close, back, more, search, zoom. Everything else gets a word.',
    'A toggle that swaps glyphs (expand_more / expand_less, outlined / filled) must have both glyphs registered; the test reads both halves of the ternary.',
  ],
  content: [
    'Name an icon by what it does in the label next to it, not by its glyph ("Send", not "paper plane").',
    'aria-labels are verbs or nouns a person would say: "Tab options", "Close", "Search customers".',
  ],
  dos: [
    'Use <Icon name="…"> on the tablet, and add the name to ICONS (one import per line) when it isn\'t there.',
    'Give every icon-only button an aria-label.',
    'Match the size to the text beside it.',
    'On the handheld, use the Outlined variant at rest and the filled one when active.',
  ],
  donts: [
    'Import an icon component directly on the tablet.',
    'Use an icon as the only label on a money action.',
    'Barrel-import @mui/icons-material: it pulls in thousands of icons.',
    'Rely on the dot fallback. It exists so a typo doesn\'t crash a screen, not as a placeholder.',
  ],
  a11y: [
    <>
      <code>Icon</code> renders with <code>aria-hidden</code>: the label beside it is the accessible name. An icon-only control gets an{' '}
      <code>aria-label</code> on the button (<code>IconButton aria-label="Back"</code> in the handheld's top app bar).
    </>,
    'Status icons repeat a word (Sent with a lock, Not sent with a dot), so meaning never depends on recognising the glyph.',
    'Icons take their colour from text roles that pass, onSurface and onSurfaceVariant; a green icon on white is 3.3:1, fine for non-text (3:1) but nothing to lean on.',
  ],
  decisions: [
    { decision: 'Ligature names as the vocabulary', why: "The prototype wrote icons as Material Symbols ligatures (<span class=\"ms\">how_to_reg</span>), and those names are embedded in the ported data (settings menus, transport, shifts, context menus). A registry keeps the data diffable instead of rewriting every name (icons.ts)." },
    { decision: 'A dot, not a crash, for an unknown name', why: 'A missing glyph should not take a screen down at the counter. The cost is that a typo renders silently, which is why icons.test.ts exists.' },
    { decision: 'The test reads ternaries', why: <>Round 3 shipped three glyphs as dots, then <code>expand_less</code> shipped unregistered inside a ternary, so every section bar on the customer record drew a dot until clicked. The scan now reads both halves (the test's own header).</> },
    { decision: 'Different styles per surface', why: 'The tablet matches the prototype\'s filled Material Symbols; the handheld follows MD3\'s outlined-at-rest, filled-when-active convention, which people know from their phones.' },
    { decision: 'Open: one vocabulary', why: 'The handheld bypasses the registry and imports components directly, so the two surfaces can drift (a different glyph for the same action). Either route handheld icons through the registry with a style option, or document the pairs.' },
  ],
  tokens: [
    { token: 'ICONS', value: `${REGISTERED} names`, role: 'The tablet\'s whole glyph set (src/pos/icons.ts)' },
    { token: 'Icon size (default)', value: '16px', role: 'IconProps.size; set per context' },
    { token: 'mobile.touchTarget', value: '48dp', role: 'Handheld icon button target' },
  ],
  engineering: {
    import: `import { Icon } from '../components/primitives';          // tablet
import ArrowBack from '@mui/icons-material/ArrowBack';        // handheld, one per line`,
    themeOverride: (
      <>
        <code>theme.ts → MuiIconButton</code>: 34px small / 38px medium circles, <code>onSurfaceVariant</code>, a{' '}
        <code>surfaceHigh</code> hover. <code>mobile-theme.ts → MuiIconButton</code>: 40dp / 48dp, and <code>MuiListItemIcon</code>{' '}
        in <code>onSurfaceVariant</code>.
      </>
    ),
    notes: [
      <>
        Adding a glyph: import it on its own line in <code>src/pos/icons.ts</code> (<code>import Send from '@mui/icons-material/Send'</code>),
        add <code>send: Send</code> to <code>ICONS</code>, and use <code>{'<Icon name="send" />'}</code>. <code>npm run test:unit</code> runs
        the registry test.
      </>,
      <>
        One alias: Material Symbols' <code>person_check</code> has no Material Icons counterpart and maps to <code>HowToReg</code>, the same
        glyph.
      </>,
      <>The test scans every <code>name=</code> and <code>icon=</code> prop in <code>src</code>, so don't use those prop names for anything that isn't an icon (the docs kit's Swatch takes <code>role</code> for that reason).</>,
    ],
    snippet: `<Stack direction="row" alignItems="center" gap={0.75}>
  <Icon name="lock" size={13} color={md3.outline} />
  <span>Sent {formatTimeLabel(line.sentAt)}</span>
</Stack>

<IconButton aria-label="Tab options" onClick={openMenu}>
  <Icon name="more_vert" size={18} />
</IconButton>`,
  },
  related: [
    { name: 'Typography', id: 'foundations-typography' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Floating Action Button', id: 'components-actions-floating-action-button' },
    { name: 'Bottom Navigation', id: 'components-navigation-bottom-navigation' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
  ],
};

export default doc;
