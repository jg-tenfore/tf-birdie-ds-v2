import { md3, mobile } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Input Tags: free-typed tags (Autocomplete multiple + freeSolo). Birdie's tags are a fixed list of chips instead. */
const doc: DsDoc = {
  summary: (
    <>
      A field where you type labels and each becomes a chip: the live example's "No onions", "Allergy: nuts". Birdie doesn't do
      this. Its tags are a <strong>fixed list</strong> (VIP, Rain check, Accessibility, Birthday, Corporate), shown as pills on the
      tablet and filter chips on the handheld, and a tap turns one on or off. Dish instructions and allergies aren't tags either:
      they are the menu's modifier groups, so the kitchen ticket can flag an allergy in red.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid free-typed tags on the counter. A typed tag fragments ("VIP", "vip", "V.I.P."), brings up the keyboard, and nothing
      can act on it. Use chips from a fixed list (<code>PillGroup multi</code> on the tablet, <code>FilterChip</code> on the
      handheld). If a list ever grows past what fits, pick-only Autocomplete is the next step, not free text.
    </>
  ),
  mui: ['Autocomplete'],
  useFor: [
    'Nothing on the counter today. If a list of labels outgrows a row of chips, use Autocomplete with multiple, pick-only (no freeSolo).',
  ],
  dontUseFor: [
    'Booking tags: use the fixed tag chips (PillGroup multi on the tablet, FilterChip on the handheld).',
    'Dish instructions and allergies: they are modifier groups in the dish dialog, and allergies are flagged on the ticket.',
    'A note: use Textarea.',
    'Customer types: chips, the common few first and the rest behind "All types".',
  ],
  inBirdie: [
    {
      label: 'Booking tags, tablet',
      caption: (
        <>
          The reservation panel's Notes tab: five tag pills (<code>PillGroup multi</code>), a check on each one that's on. A tap
          applies at once; the notes below wait for Save notes.
        </>
      ),
      storyId: 'weston-edits-1-·-reservation-panel-tablet--notes-tab',
    },
    {
      label: 'Booking tags, handheld',
      caption: (
        <>
          The same five tags as MD3 filter chips, at the top of the booking's Notes. "Tags apply immediately; the text fields save
          together."
        </>
      ),
      handheldRoute: 'mobile-screens-3-·-booking-check-in--detail-notes',
    },
    {
      label: 'Allergies, not tags',
      caption: (
        <>
          In the dish dialog an allergy is a red-edged group, and a chosen one fills solid red, "on the line and on the kitchen's
          ticket too". A typed tag could not do that.
        </>
      ),
      shot: 'tablet-dish-dialog',
      storyId: 'prototypes-tablet-quick-order-menu-photography--the-dish-dialog',
    },
  ],
  birdie: [
    { name: 'PillGroup (multi)', file: 'src/pos/modals/ModalFrame.tsx', use: 'tags in a tablet dialog or panel: pills that toggle, a check when on.', surface: 'tablet' },
    { name: 'FilterChip', file: 'src/pos/mobile/screens/tee/parts.tsx', use: 'tags on the handheld: MD3 filter chips.', surface: 'handheld' },
    { name: 'GroupBlock', file: 'src/pos/modals/DishDialog.tsx', use: 'modifier groups, allergies included: one-of or any-of, required or not.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Tag', description: 'A chip with a short label from the fixed list.' },
    { part: 'On state', description: 'Tablet: brand-tinted pill with a check. Handheld: secondary-container chip with a check.' },
    { part: 'Group label', description: '"Tags", as the section title.' },
  ],
  variants: [
    { name: 'Fixed tag chips', use: 'Booking tags today.', avoid: 'Lists longer than a row or two.' },
    { name: 'Pick-only Autocomplete (if needed)', use: 'A list too long for chips, picked by typing a few letters.', avoid: 'Short lists; chips show every choice.' },
    { name: 'Free-typed tags', use: 'Nothing in Birdie.', avoid: 'Always on the counter.' },
  ],
  states: [
    { state: 'Off', tablet: 'Outlined pill, on-surface-variant text.', handheld: 'Outlined chip.' },
    { state: 'On', tablet: 'Brand-tinted pill, brand border and text, a check.', handheld: 'Secondary-container fill and a check.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'PillGroup pills, about 28px.', why: 'Dialog density.' },
    { surface: 'Handheld', size: 'MD3 filter chips, 32dp tall.', why: "MD3's filter chip; the theme sets it (mobile-theme.ts → MuiChip)." },
  ],
  behavior: [
    'A tag applies the moment it is tapped, with no Save. The text notes beside it wait for Save.',
    'Tags are kept in order of tapping on the booking (b.tags).',
    'Nothing reads booking tags yet: no tee sheet chip, no filter, no report shows them. Open decision.',
  ],
  content: ['Tags are short, in sentence case, and nouns: "Rain check", "Corporate".'],
  dos: ['Keep tags to a fixed list one person owns.', 'Show every tag, so the operator chooses instead of remembering.'],
  donts: ['Free-typed tags.', 'Allergies as tags or notes.', 'The tag list defined twice. Today it is: BookingTabs.tsx and BookingDetailScreen.tsx each have ALL_TAGS.'],
  a11y: [
    "Neither surface announces which tags are on. The tablet's PillGroup pills and the handheld's FilterChip (a clickable MUI Chip) are buttons without aria-pressed, and the check that marks a tag on is hidden from assistive tech. Add aria-pressed to both.",
    <>
      Contrast: the tablet's on pill, brand green on its 12% tint, fails at 12px (see Toggle Button); the handheld's on chip{' '}
      <Contrast fg={mobile.onSecondaryContainer} bg={mobile.secondaryContainer} />; an off pill's text{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.
    </>,
  ],
  decisions: [
    {
      decision: 'A fixed list, not free tags',
      why: 'A tag is only useful if something can count or filter it, and only a fixed list can be counted. It also needs no keyboard.',
    },
    {
      decision: 'Allergies are modifiers',
      why: 'v1 had "allergies [as] one more tab of grey options". Now they are a red-edged group, and a chosen one is red on the line and on the ticket (DishDialog.tsx).',
    },
    {
      decision: 'Open: what are tags for?',
      why: 'Tags are recorded on the booking but nothing displays or filters them outside the Notes tab. Decide where they show (the tee sheet chip, a filter, a report) or drop them.',
    },
  ],
  engineering: {
    import: `import { PillGroup } from '../modals/ModalFrame';   // tablet: <PillGroup multi … />
import { FilterChip } from '../screens/tee/parts';    // handheld`,
    themeOverride: <>No Autocomplete override in <code>theme.ts</code>. Chips: <code>MuiChip</code> (see Chip).</>,
    notes: [
      <>
        Move <code>ALL_TAGS</code> into one place (<code>src/pos/data</code>) so the tablet and the handheld can't drift apart.
      </>,
      <>If Autocomplete is ever adopted, theme it first: no override exists, so it renders with MUI's defaults.</>,
    ],
    snippet: `<PillGroup multi label="Tags" value={tags}
  options={ALL_TAGS.map((t) => ({ label: t, value: t }))}
  onChange={(t) => toggleTag(t)} />`,
  },
  related: [
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Autocomplete', id: 'components-forms-autocomplete' },
    { name: 'Multi Select', id: 'components-forms-multi-select' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Textarea', id: 'components-forms-textarea' },
  ],
};

export default doc;
