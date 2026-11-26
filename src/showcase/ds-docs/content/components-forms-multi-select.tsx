import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` laid over `bg` at `alpha`, as one hex: the colour a tinted fill actually paints, so it can be measured. */
const tint = (fg: string, alpha: number, bg = '#ffffff') => {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [f, b] = [ch(fg), ch(bg)];
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Multi-Select — MUI's Select with `multiple`: a dropdown that holds several values as chips. Birdie
 * picks several things all the time, but never behind a dropdown. It shows the options as chips.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI's dropdown that holds <strong>several values at once</strong>, shown as chips inside the field. Birdie picks
      several things often (a booking's tags, a customer's types, the courses a block applies to, tee-sheet filters) and{' '}
      <strong>never behind a dropdown</strong>. It lays the options out as chips you can see and tap, each with a check
      when on. This page documents the MUI component so nobody reaches for it, and points to the pattern Birdie uses.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      No Birdie screen uses MUI's multiple <code>Select</code>. For several-of-many, use visible chips:{' '}
      <code>PillGroup multi</code> or toggle chips on the tablet, <code>FilterChip</code> on the handheld. For a dish's
      add-ons, a "Choose any" checkbox group. If a list ever outgrows chips, the next step is a searchable checkbox list,
      not this.
    </>
  ),
  mui: ['Select'],
  useFor: [
    'Nothing in Birdie today. It hides the options behind a click and closes over the answer.',
    'At most: a rarely-changed setting with many short, stable options, in a tablet dialog with no room for chips.',
  ],
  dontUseFor: [
    'Tags, types and filters: use chips that stay visible (PillGroup multi, FilterChip).',
    'Courses for a block: chips on the handheld, checkboxes on the tablet. See Checkbox.',
    'A dish\'s add-ons: a "Choose any" group. See Checkbox.',
    'Moving items between two lists: Birdie has no such job. See Transfer List.',
  ],
  inBirdie: [
    {
      label: 'Instead: course chips, handheld',
      caption: (
        <>
          Block time's <strong>Courses</strong>: one filter chip per course, a check on each that is on. Both are on by
          default; tap one to leave it out. Everything is visible, nothing to open.
        </>
      ),
      shot: 'ds-mobile-block-time',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--block-time',
    },
    {
      label: 'Instead: customer types, tablet',
      caption: (
        <>
          The customer form shows the six common types as toggle chips and puts the rest behind{' '}
          <strong>All types (n)</strong>. v1 showed all eighteen as a four-column grid of checkboxes.
        </>
      ),
      storyId: 'v1-→-v2-migration-11-·-customer-search-tablet--adding-a-customer',
      tabletHash: '#/customers',
    },
    {
      label: 'Instead: tee-sheet filters, handheld',
      caption: (
        <>
          A full-screen dialog of chip rows (courses, party size, specials). Edits go to a draft; <strong>Apply</strong>{' '}
          commits them, ✕ throws them away.
        </>
      ),
      handheldRoute: 'mobile-screens-2-·-tee-sheet--filters',
    },
  ],
  birdie: [
    {
      name: 'PillGroup (multi)',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'several-of in a tablet dialog: a booking\'s tags (VIP, Rain check, Accessibility…). A check appears on each chosen pill.',
      surface: 'tablet',
    },
    {
      name: 'Customer type chips',
      file: 'src/pos/modals/CustomerFormDialog.tsx',
      use: 'a long optional set: the common six, then All types. Toggle buttons with aria-pressed.',
      surface: 'tablet',
    },
    {
      name: 'CourseChips',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'choosing courses on the handheld, several or (with single) one.',
      surface: 'handheld',
    },
    {
      name: 'FilterChip',
      file: 'src/pos/mobile/screens/tee/parts.tsx',
      use: "Material's filter chip: outlined when off, filled with a check when on. A second copy lives in people/parts.tsx.",
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Group label', description: 'What is being chosen: "Tags", "Courses", "Customer types", with a count or "Optional" beside it.' },
    { part: 'Chip', description: 'One option. A pill on the tablet (28px corners), an 8dp-cornered chip on the handheld.' },
    { part: 'Check', description: 'Appears inside a chosen chip, before the label. Colour alone never says "on".' },
    { part: 'More control (optional)', description: '"All types (18)" / "Fewer types" when the full set would be a wall.' },
  ],
  variants: [
    {
      name: 'Chips, all visible',
      use: 'Up to about a dozen short options: tags, courses, party sizes.',
      avoid: 'Options with long names or second lines. Use a checkbox list.',
    },
    {
      name: 'Common few + All',
      use: 'A long set where most people pick from the same handful: customer types.',
      avoid: 'Hiding something already chosen. Chosen chips stay visible when the set is collapsed.',
    },
    {
      name: 'Checkbox list',
      use: 'Rows with detail, picked for an action that follows: players to check in, bookings to move.',
      avoid: 'Short labels that fit as chips.',
    },
    {
      name: "MUI's multiple Select",
      use: 'Not used.',
      avoid: 'Everywhere in the product. It costs a click to see the options and another to close them.',
    },
  ],
  states: [
    { state: 'Off', tablet: 'White pill, 1.5px neutral outline, grey label.', handheld: 'Outlined chip, grey label.' },
    { state: 'On', tablet: 'Green outline and tint, a check before the label (PillGroup); green container with a dark label (type chips).', handheld: 'Secondary-container fill with a dark label and a check.' },
    { state: 'Hover', tablet: 'A slightly stronger tint, or a surface wash when off.', handheld: 'No hover.' },
    { state: 'Count', tablet: '"3 chosen" beside the group label (customer types).', handheld: 'The tee-sheet filters put a count inside the payment-status chips: how many bookings each would show.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'PillGroup pills at 12px bold; type chips 36px tall', why: 'Dialog density, mouse-first, like the fields around them.' },
    { surface: 'Handheld', size: '32dp chips with 8dp gaps', why: "Material's filter chip. The gap brings each to a 48dp touch area." },
  ],
  behavior: [
    'A tap toggles one chip. Nothing else changes.',
    'Where the choice saves depends on the screen: at once for booking tags, on Apply for tee-sheet filters, on Save for a customer.',
    'Collapsing a long set ("Fewer types") never hides a chosen option.',
    'In forms, chips wrap to the next line. In a screen header (the People search) the chip row scrolls sideways inside itself and never widens the page.',
  ],
  content: [
    'Chip labels are nouns, sentence case, a word or two: "Rain check", "Front 9".',
    'Say the count when it matters: "3 chosen", "All types (18)".',
    'Say "Optional" when nothing is required, so an empty group reads as fine.',
  ],
  dos: [
    'Show the options. A choice people can see is a choice they make.',
    'Put a check in every chosen chip.',
    'Use one chip component per surface.',
    'Keep the order stable. Chips must not jump when one is tapped.',
  ],
  donts: [
    "MUI's multiple Select, anywhere in the product.",
    'A wall of eighteen checkboxes. Show the common few.',
    'Colour as the only sign of "on".',
    'Chips for one-of choices. Use Radio Buttons or a segmented control.',
  ],
  a11y: [
    <>
      The customer-type chips and the People filter chips carry <code>aria-pressed</code>, so a screen reader hears "on"
      or "off".
    </>,
    <>
      <strong>Gap:</strong> <code>PillGroup</code> (booking tags) and the tee sheet's <code>FilterChip</code> set no
      pressed state. A screen reader hears a list of buttons and can't tell which are on. Add <code>aria-pressed</code>.
    </>,
    <>
      Contrast, computed: an unchosen tablet pill's outline is{' '}
      <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />, under 3:1. A chosen <code>PillGroup</code>{' '}
      label is <Contrast fg={md3.primary} bg={tint(md3.primary, 0x1f / 255)} label="VIP" /> at 12px bold, under AA. The
      type chips (<Contrast fg={md3.onPrimaryContainer} bg={md3.primaryContainer} />) and the handheld chips (
      <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} />) pass.
    </>,
  ],
  decisions: [
    {
      decision: 'Chips, not a dropdown',
      why: 'At a counter, the cost of a hidden choice is that it is not made. Visible chips cost one tap each and show the answer afterwards.',
    },
    {
      decision: 'The common six, then All types',
      why: (
        <>
          v1 showed all eighteen customer types as a four-column grid of checkboxes. "The common few first; the rest are
          there, one tap away, not a wall of eighteen checkboxes" (<code>CustomerFormDialog.tsx</code>).
        </>
      ),
    },
    {
      decision: 'Open: two FilterChips on the handheld',
      why: (
        <>
          <code>tee/parts.tsx</code> and <code>people/parts.tsx</code> each define a <code>FilterChip</code>. One has{' '}
          <code>aria-pressed</code> and a colour dot, the other a count. Merge them into one before a third appears.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Chosen PillGroup outline, label and check' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Chosen type chip fill' },
    { token: 'mobile.secondaryContainer', value: '#d0e8d9', role: 'Chosen handheld chip fill' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Unchosen outline' },
    { token: 'radius.xl / radius.sm', value: '28px / 8px', role: 'Tablet pill / handheld chip corners' },
  ],
  engineering: {
    import: `import { PillGroup } from '../modals/ModalFrame';                     // tablet
import { CourseChips } from '../mobile/screens/people/parts';         // handheld
import { FilterChip } from '../mobile/screens/tee/parts';             // handheld`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiSelect</code> only sets size <code>small</code>; nothing styles the chips a multiple
        Select would draw. The handheld chips use <code>MuiChip</code> from <code>src/theme/mobile-theme.ts</code> (32dp,
        8dp corners).
      </>
    ),
    notes: [
      <>
        <code>PillGroup</code> reports one tapped value; the caller adds or removes it. Keep the toggle in one line:{' '}
        <code>{'tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]'}</code>.
      </>,
      <>
        <code>CourseChips</code> takes <code>single</code> for one-of; then each tap replaces. Don't use it for one-of
        elsewhere: it looks like a multi-select.
      </>,
    ],
    snippet: `<ModalSection title="Tags">
  <PillGroup
    multi
    value={tags}
    options={ALL_TAGS.map((t) => ({ label: t, value: t }))}
    onChange={(t) => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])}
  />
</ModalSection>`,
  },
  related: [
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Input Tags', id: 'components-forms-input-tags' },
    { name: 'Transfer List', id: 'components-forms-transfer-list' },
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
  ],
};

export default doc;
