import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` drawn at `alpha` over `bg`, as hex: PillGroup tints a selected pill with its accent at 0x1f. */
const over = (fg: string, bg: string, alpha: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0'))
    .join('');

/** Toggle Button: a segmented choice of two to five options. MUI on the handheld; Birdie's own on the tablet. */
const doc: DsDoc = {
  summary: (
    <>
      A row of two to five options where exactly one is chosen, and choosing applies at once: 9 or 18 holes, Walk, Ride or Push,
      this tee time or a range, Calendar or List. The <strong>handheld</strong> uses MUI's <code>ToggleButtonGroup</code> as the
      Material 3 segmented button: full width, 40dp, a check on the selected segment. The <strong>tablet</strong> doesn't use
      MUI's at all. It draws its own segments on <code>ButtonBase</code>, and today it draws them{' '}
      <strong>four different ways</strong>.
    </>
  ),
  statusNote: (
    <>
      MUI's ToggleButton is handheld only (segmented buttons in forms, the 9 | 18 holes toggle). The tablet does the same job with
      its own components: <code>Seg</code> on the reservation panel and League, the menu switch on Tabs and Quick Order,{' '}
      <code>PillGroup</code> in dialogs, and hand-built rows in tee sheet settings, Checkout and the tee sheet toolbar.
    </>
  ),
  mui: ['ToggleButton', 'ToggleButtonGroup'],
  useFor: [
    'One of a few named options that applies at once: holes, transport, Calendar or List.',
    'Switching what a screen shows: the menu (19th Hole Menu or Lunch), the checkout keypad (Amount tendered or Tip).',
    'A short single choice in a form: Guest or Member, this time or a range.',
  ],
  dontUseFor: [
    'On or off: use Switch.',
    'More than five options, or options that change by day: use chips or Select.',
    'Filtering a list (All, Members, Guests…): use filter chips (see Chip).',
    'Actions: use Button. A segment selects; it never does something.',
  ],
  inBirdie: [
    {
      label: 'Holes and transport, tablet',
      caption: (
        <>
          Every player row on the reservation panel: <code>Seg</code> for 9 | 18 and Walk | Ride | Push. The selected segment
          fills dark; a change updates the booking at once, and the rate lines beside it follow.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Holes, handheld',
      caption: (
        <>
          The player row's 9 | 18 is <code>HolesToggle</code>, a compact MUI toggle group, 36dp tall so it fits on the row beside
          the fee and transport.
        </>
      ),
      shot: 'mobile-player-rows',
      frame: 'handheld',
      handheldRoute: 'weston-edits-2-·-player-rows-mobile--player-rows',
    },
    {
      label: 'Menu switch, tablet',
      caption: (
        <>
          19th Hole Menu | Lunch on a tab: a grey track with the chosen menu raised in white. A clock marks a menu that isn't
          running now.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'Applies to, both surfaces',
      caption: (
        <>
          The price override's one choice. The tablet uses <code>PillGroup</code> ("This time only", "A range of times"); the
          handheld uses <code>SegmentedButton</code> ("This time", "A range").
        </>
      ),
      shot: 'ds-mobile-price-override',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--price-override',
      tabletHash: '#/tee-sheet?modal=price&t=0912',
    },
    {
      label: 'Calendar or List, tablet',
      caption: (
        <>
          The tee sheet toolbar: two icon-only segments, 36×32px, the chosen one in pale green. Their only names are title attributes
          (see Accessibility).
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet',
    },
    {
      label: 'Amount tendered or Tip, tablet',
      caption: (
        <>
          Checkout's keypad serves two numbers. Two segments above it say which one you're keying; Exact amount switches back to
          tendered.
        </>
      ),
      shot: 'tablet-checkout',
      tabletHash: '#/register?order=walkin&modal=checkout',
    },
  ],
  birdie: [
    { name: 'Seg', file: 'src/pos/components/Touch.tsx', use: 'a joined segmented toggle at touch height; dark when chosen. The reservation panel and League.', surface: 'tablet' },
    { name: 'PillGroup', file: 'src/pos/modals/ModalFrame.tsx', use: 'separate pills in a dialog, single or multi (multi shows a check). Wraps.', surface: 'tablet' },
    { name: 'Menu switch', file: 'src/pos/components/restaurant/MenuBrowser.tsx', use: 'switching what a whole panel shows: a track with the chosen segment raised.', surface: 'tablet' },
    { name: 'SegmentedButton', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'the MD3 segmented button in handheld forms: full width, a check on the choice.', surface: 'handheld' },
    { name: 'Segmented', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'the same as SegmentedButton, a second copy used by the tee screens. Merge candidate.', surface: 'handheld' },
    { name: 'HolesToggle', file: 'src/pos/mobile/screens/tee/ReservationPlayers.tsx', use: 'a compact 9 | 18 for a dense row, 36dp.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Group', description: 'The row of segments, with a name for assistive tech ("Holes", "Applies to", "Menu").' },
    { part: 'Segment', description: 'A label, an icon and label, or an icon alone (Calendar or List only).' },
    { part: 'Selected treatment', description: 'Handheld: secondary-container fill and a check. Tablet: one of four looks today (see Variants).' },
    { part: 'Outline', description: 'Joined groups share one outline: outline-variant on the tablet, the darker outline colour on the handheld.' },
  ],
  variants: [
    {
      name: 'Joined, dark (Seg)',
      use: 'Dense rows that must read at a glance: holes and transport on every player row.',
      avoid: 'Dialog forms, where the dark fill competes with the dialog\'s main button.',
    },
    {
      name: 'Raised segment (menu switch)',
      use: 'Switching what a whole panel shows.',
      avoid: 'Form values.',
    },
    {
      name: 'Separate pills (PillGroup)',
      use: 'A choice in a dialog, or several (multi). Wraps to a second line.',
      avoid: 'Two options in a tight row: use Seg.',
    },
    {
      name: 'MD3 segmented (handheld)',
      use: 'Every handheld single choice of two to five: full width, a check on the choice.',
      avoid: 'Long labels; at 360dp, three short words is the limit.',
    },
    {
      name: 'Pale green (tee sheet settings, Checkout, Calendar or List)',
      use: 'Nothing new. These predate Seg and fail contrast (see Accessibility).',
      avoid: 'Copying it. Use Seg or PillGroup.',
    },
  ],
  states: [
    { state: 'Unselected', tablet: 'On-surface-variant text on white or transparent.', handheld: 'On-surface text inside an outline-colour border.' },
    { state: 'Selected', tablet: 'Seg: dark fill, white text. PillGroup: accent tint, accent border and text. Menu switch: raised white.', handheld: 'Secondary-container fill, a check before the label.' },
    { state: 'Hover', tablet: "PillGroup, tee sheet settings and Calendar or List wash an unselected segment in surface-container; Seg and the menu switch don't change.", handheld: 'No hover.' },
    { state: 'Disabled segment', tablet: 'Options that aren\'t allowed are left out (a seat that can\'t switch holes shows only its own).', handheld: 'Shown but disabled (SegmentedButton options take disabled).' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Seg 40px including its border, 44px wide minimum per segment. Menu switch 44px. PillGroup pills about 28px. Calendar or List 36×32px.', why: "Seg follows Touch.tsx's 40px floor for touch; the older pale green controls are smaller." },
    { surface: 'Handheld', size: '40dp segments, full width. HolesToggle 36dp, 40–44dp wide.', why: "MD3's segmented button. The holes toggle trades 4dp for room on the player row." },
  ],
  behavior: [
    'Choosing applies at once: holes and transport re-price the seat; the menu switch swaps the menu. No Save.',
    'An exclusive group always has a choice: tapping the chosen segment again does nothing (onChange ignores null).',
    'Multi pills (booking tags, gift card categories) toggle each pill on and off.',
    'Options that are not allowed now are disabled or left out, never refused after a tap.',
  ],
  content: [
    'Labels are short nouns or numbers: "9", "18", "Walk", "Ride", "Lunch".',
    'Use the same words for the same choice on both surfaces where the width allows. Today: "This time only" on the tablet, "This time" on the handheld.',
    'Icon-only segments need a text name (aria-label), not just a tooltip.',
  ],
  dos: [
    'Use SegmentedButton on the handheld and Seg on the tablet for new single choices.',
    'Set aria-pressed on every hand-built segment, and name the group.',
    'Keep it to five options.',
  ],
  donts: [
    'The pale green selected look (primary text on primary-container). It fails contrast.',
    'A fifth tablet style. Pick from Seg, PillGroup or the menu switch.',
    'Toggles that act. A segment chooses; a button does.',
  ],
  a11y: [
    <>
      MUI's ToggleButton sets <code>aria-pressed</code> for you (the handheld). On the tablet, <code>Seg</code>, the menu switch,
      the dish dialog's seats and Settings' gift card categories set it by hand. <strong>PillGroup, tee sheet settings' Segmented,
      Checkout's mode switch and Calendar or List don't</strong>, so the choice is visible but not announced. Calendar or List
      is icon-only with a <code>title</code> and no <code>aria-label</code>.
    </>,
    <>
      Contrast, computed. <strong>The pale green selected look fails:</strong> brand green on primary-container,{' '}
      <Contrast fg={md3.primary} bg={md3.primaryContainer} />, at 11–12px bold, used by the tablet theme's ToggleButton, tee sheet
      settings and Checkout's mode switch, and for Calendar or List's icon. The fix is already in the codebase: Settings' gift card pills use
      on-primary-container, <Contrast fg={md3.onPrimaryContainer} bg={md3.primaryContainer} />.
    </>,
    <>
      The others pass: Seg's selected <Contrast fg="#ffffff" bg={md3.onSurface} />, the handheld's{' '}
      <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} />, the menu switch's unselected{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceHighest} />. PillGroup's selected text on its 12% tint is{' '}
      <Contrast fg={md3.primary} bg={over(md3.primary, '#ffffff', 0x1f / 255)} />, which fails at 12px.
    </>,
    'Targets: Seg and the menu switch meet the tablet\'s 40px touch floor; PillGroup (about 28px) and Calendar or List (32px) don\'t.',
  ],
  decisions: [
    {
      decision: 'MUI on the handheld, Birdie\'s own on the tablet',
      why: "The handheld follows MD3, and MUI's ToggleButtonGroup is its segmented button once themed. The tablet's segments sit in dense rows and toolbars beside its own pills, and are drawn on ButtonBase like them.",
    },
    {
      decision: 'Seg is dark when selected',
      why: 'The same rule as the dialog\'s dark main button (see Button): green means paid or go on these screens, so "chosen" is dark. On a player row beside paid badges, a green segment would read as paid.',
    },
    {
      decision: 'Leave out what is not allowed',
      why: 'A seat that cannot switch holes offers only its own (PlayerRowsV2 filters the options), so a tap is never refused after the fact.',
    },
  ],
  tokens: [
    { token: 'md3.onSurface', value: '#191d19', role: 'Seg: selected fill' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Pale green selected fill (and the theme\'s ToggleButton)' },
    { token: 'md3.onPrimaryContainer', value: '#002112', role: 'The text that passes on primary-container' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'Handheld selected fill' },
    { token: 'md3.surfaceHighest', value: '#e2e6e2', role: "Menu switch's track" },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Tablet outline' },
  ],
  engineering: {
    import: `import { Seg } from '../components/Touch';                        // tablet, joined
import { PillGroup } from '../modals/ModalFrame';                   // tablet, in dialogs
import { SegmentedButton } from '../screens/people/parts';        // handheld`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiToggleButtonGroup</code> (small, radius md) and <code>MuiToggleButton</code> (1.5px
        outline-variant, 12px/700, selected: primary-container, primary text and border). No tablet screen renders it, so this
        shows only in Storybook. <code>src/theme/mobile-theme.ts → MuiToggleButton</code>: 40dp, 14px/500. The handheld's segmented
        components set their own selected colours (secondary-container) over the merged theme.
      </>
    ),
    notes: [
      <>
        <code>SegmentedButton</code> (people/parts.tsx) and <code>Segmented</code> (tee/parts.tsx) are the same component twice.
        Keep one.
      </>,
      <>
        Hand-built segments need <code>aria-pressed</code> and a group: <code>role="group"</code> with <code>aria-label</code>, as{' '}
        <code>Seg</code> does.
      </>,
      <>Exclusive groups: ignore a null change (<code>(_, v) =&gt; v != null &amp;&amp; onChange(v)</code>) so a group never empties.</>,
    ],
    snippet: `<Seg
  label={\`\${name}: holes\`}
  value={holes}
  options={[{ value: 9, label: '9' }, { value: 18, label: '18' }]}
  onChange={setHoles}
/>

// handheld
<SegmentedButton ariaLabel="Applies to" value={mode} onChange={setMode}
  options={[{ label: 'This time', value: 'single' }, { label: 'A range', value: 'range' }]} />`,
  },
  related: [
    { name: 'Switch', id: 'components-forms-switch' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Button Group', id: 'components-actions-button-group' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
  ],
};

export default doc;
