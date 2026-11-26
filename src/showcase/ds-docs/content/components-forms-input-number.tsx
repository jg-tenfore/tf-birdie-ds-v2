import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Input Number: counts are stepped, amounts are typed. Steppers on both surfaces; number fields where a value is keyed. */
const doc: DsDoc = {
  summary: (
    <>
      How Birdie takes a number. The rule is simple: <strong>a count is stepped, an amount is typed</strong>. Guests on a tab, a
      party size, a dish's quantity move by one, so they get a stepper: − / the count / +, 44px on the tablet and 48dp on the
      handheld. A price, a tip or a handicap is keyed into a field. Cash at the drawer is neither: it has its own keypad (see
      Input Payment).
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Used on both surfaces, built from <code>ButtonBase</code> (tablet steppers), <code>IconButton</code> (the handheld
      stepper) and the text fields. MUI has no number component of its own here, so the usage scan can't count it. The tablet
      has <strong>seven</strong> stepper implementations; that is an open decision below.
    </>
  ),
  mui: [],
  useFor: [
    'A count that changes by one or two: guests on a tab, a party size, a quantity, players in a tee time.',
    'An amount someone reads off something and types: a price override, a custom tip, a handicap, a tip percentage.',
    'A count that is sometimes small and sometimes large: inventory counts take both (step or type).',
  ],
  dontUseFor: [
    'Cash tendered, a drawer count or a payout: use Input Payment (the cents keypad).',
    'A number that is really a choice from a few: 9 or 18 holes is a Toggle Button.',
    'A time: tee times and reservation times come from a list.',
    'A PIN: use Pin Input.',
  ],
  inBirdie: [
    {
      label: 'Guests on a tab, tablet',
      caption: (
        <>
          The tab editor's header: − <strong>8 guests</strong> +, 44px round buttons. The − stops at the highest seat that
          has a dish on it, and + at 30.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'Players in a tee time, tablet',
      caption: (
        <>
          The reservation panel's "− 3 + of 3". These buttons are 28px, which the code itself calls "under this app's own touch
          minimum" (ResourcePanel.tsx). Open decision.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Prices, tablet',
      caption: (
        <>
          The price override's four fees: <code>Field</code>s with a $ prefix. Blank keeps the published rate; it never means
          free.
        </>
      ),
      shot: 'ds-tablet-price-override',
      tabletHash: '#/tee-sheet?modal=price&t=0912',
    },
    {
      label: 'Guests, handheld',
      caption: <>New tab: the handheld <code>Stepper</code>, 48dp outlined buttons around "2 guests".</>,
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--new-tab',
    },
    {
      label: 'Counting stock, tablet',
      caption: (
        <>
          Each line: − / a field / + and a ✓ for "matches". "A shelf of twelve is typed, a shelf of two is tapped", and an empty
          field means not counted, never zero.
        </>
      ),
      storyId: 'v1-→-v2-migration-16-·-inventory-tablet--a-saved-count-sets-stock',
    },
    {
      label: 'Party size, reservations',
      caption: <>The reservation dialog's <code>CountStepper</code>: a label above, "4 guests" between 44px buttons, up to 20.</>,
      storyId: 'v1-→-v2-migration-8-·-reservations-tablet--making-a-reservation',
    },
  ],
  birdie: [
    { name: 'CountStepper', file: 'src/pos/components/restaurant/HostControls.tsx', use: 'a labelled count in a dialog: 44px buttons, a unit ("guests"), min and max. The one to reuse.', surface: 'tablet' },
    { name: 'Step', file: 'src/pos/components/restaurant/TabEditor.tsx', use: "guests in the tab editor's header: 44px circles.", surface: 'tablet' },
    { name: 'CountStepper (players)', file: 'src/pos/components/PlayerRows.tsx', use: "players in a tee time on the reservation panel: 28px circles, \"of 4\".", surface: 'tablet' },
    { name: 'Counter', file: 'src/pos/components/operations/InventoryView.tsx', use: 'step or type, plus "matches": 40px buttons around a field.', surface: 'tablet' },
    { name: 'Stepper', file: 'src/pos/mobile/screens/restaurant/parts.tsx', use: "the handheld's count: 48dp outlined icon buttons, a group label.", surface: 'handheld' },
    { name: 'MoneyField', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a typed amount on the handheld: $ prefix, decimal keyboard, blank = not set.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Label (optional)', description: 'Above the stepper in a dialog ("Party"), or a group name for assistive tech ("Guests").' },
    { part: 'Decrease (−)', description: 'Named for what it does: "Fewer guests", "Remove the last player". Disabled at the minimum.' },
    { part: 'Value', description: 'The count with its unit: "4 guests", "1 guest". Bold, centred, a fixed width so the buttons don\'t move.' },
    { part: 'Increase (+)', description: '"More guests", "One more". Disabled at the maximum.' },
    { part: 'Limit (optional)', description: '"of 4" after the value when there is a ceiling worth seeing (players per tee time).' },
  ],
  variants: [
    { name: 'Stepper', use: 'Counts that change by one: guests, party, quantity, players.', avoid: 'Values that jump by tens. Typing is faster.' },
    { name: 'Stepper with a field', use: 'Counts that can be small or large: inventory. Step for two, type for twelve.', avoid: 'Ordinary counts; one control is enough.' },
    { name: 'Number field', use: 'Amounts read and keyed: prices, a custom tip, a handicap, tip percentages.', avoid: 'Cash at the drawer (keypad) and counts (stepper).' },
    { name: 'Select of numbers', use: 'Open item quantity, 1–20, picked from a list.', avoid: 'New screens; a stepper does the same in one tap.' },
  ],
  states: [
    { state: 'Default', tablet: 'Outline-variant buttons, on-surface-variant glyphs, a bold value.', handheld: 'Outlined 48dp icon buttons, title-medium value.' },
    { state: 'At a limit', tablet: 'The button fades (35–40% opacity) and stops responding.', handheld: "MUI's disabled icon button." },
    { state: 'Blank field', tablet: 'Means "keep the published rate", "not set" or "not counted", never 0.', handheld: 'Same; MoneyField\'s blank is "not set".' },
    { state: 'Out of range', tablet: 'Steppers can\'t get there. Fields strip what isn\'t a digit as it is typed.', handheld: 'The tee fee sheet shows "Enter an amount" and disables Save.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '44px buttons (CountStepper, Step, the dish quantity). 40px in Inventory and Refund. 28px on the reservation panel\'s player count.', why: 'Steppers are pressed by hand at the counter, so they take the 44px thumb size. The 28px one predates that rule.' },
    { surface: 'Handheld', size: '48dp buttons, the value 88dp wide between them.', why: "MD3's 48dp target." },
  ],
  behavior: [
    'Steppers clamp: − and + are disabled at the minimum and maximum, so the count is always valid.',
    'The value carries its unit and its singular: "1 guest", "2 guests".',
    'A count edits the store at once (guests on a tab, players on a booking). In a dialog it waits for the dialog\'s Save.',
    'Typed amounts strip anything that isn\'t a digit or a point as they are typed.',
    'A blank amount is not zero. Price overrides keep the published rate; inventory says "Not counted".',
    'A number that is far off asks twice: a tip over half the sale, a drawer variance of $20 or more.',
  ],
  content: [
    'Label with the thing being counted, and put the unit in the value: "Party" / "4 guests".',
    'Name the buttons for what they do: "Fewer guests", "One more", not "minus".',
    'Money is shown as $0.00 once it leaves the field.',
  ],
  dos: [
    'Use a stepper for counts and CountStepper (tablet) or Stepper (handheld) to build it.',
    'Disable at the limits instead of refusing after the tap.',
    'Use inputMode="decimal" or "numeric" and strip other characters, rather than type="number".',
  ],
  donts: [
    'A number field for a party size. A keyboard covers half the dialog for one tap\'s worth of change.',
    'Treat a blank field as zero.',
    'Another stepper drawn from scratch.',
  ],
  a11y: [
    'Every − and + has an accessible name ("Fewer guests", "Add a player", "Guests: one more"). Keep them specific to what is counted.',
    'Group the stepper and name it (role="group", aria-label="Guests"), as the tab editor and the handheld Stepper do. CountStepper\'s visible label is not tied to its buttons; their names carry the unit instead.',
    'The value is plain text. A screen reader user hears it by reading on; it is not announced when it changes. A live region on the value would fix that.',
    <>
      Contrast: the value <Contrast fg={md3.onSurface} bg="#ffffff" />, the − and + glyphs{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" size="non-text" />. A disabled button is faded on purpose and exempt.
    </>,
    'Targets: 44px on the tablet and 48dp on the handheld, except the reservation panel\'s 28px player count.',
  ],
  decisions: [
    {
      decision: 'Counts are stepped, not typed',
      why: '"A party size is changed by one far more often than it is typed, and a number field on a tablet summons a keyboard over half the dialog" (HostControls.tsx).',
    },
    {
      decision: 'Inventory takes both',
      why: '"A shelf of twelve is typed, a shelf of two is tapped — and empty means \'not counted\', never zero" (InventoryView.tsx).',
    },
    {
      decision: 'Blank keeps the default',
      why: 'The club prices a round and its transport separately, and "a blank field keeps the published rate rather than meaning \'free\'" (PriceOverrideScreen.tsx).',
    },
    {
      decision: 'Big numbers ask twice',
      why: 'A tip over half the sale is accepted only after a second confirm, "because it is far more often an $80 typed for $8.00" (AdjustTipDialog.tsx).',
    },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Stepper button outline' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: '− and + glyphs' },
    { token: 'radius.md', value: '12px', role: 'CountStepper buttons (Step and the dish quantity are circles)' },
    { token: 'mobile.touchTarget', value: '48', role: 'Handheld stepper buttons' },
  ],
  engineering: {
    import: `import { CountStepper } from '../components/restaurant/HostControls'; // tablet
import { Stepper } from '../screens/restaurant/parts';                  // handheld
import { MoneyField } from '../screens/people/parts';                   // handheld amount`,
    themeOverride: (
      <>
        None: steppers are <code>ButtonBase</code> (tablet) and <code>IconButton</code> (handheld, 48dp from{' '}
        <code>mobile-theme.ts → MuiIconButton</code>). Typed amounts use the text field's theme.
      </>
    ),
    notes: [
      <>
        <strong>Seven tablet steppers.</strong> <code>CountStepper</code> (HostControls), <code>Step</code> (TabEditor),{' '}
        <code>Round</code> (DishDialog), <code>CountStepper</code> (PlayerRows, 28px), <code>Stepper</code> (ResourcePanel),{' '}
        <code>Stepper</code> (TableChartInspector), <code>Step</code> (RefundOrderDialog): circles and rounded squares, 28 to 44px.
        Inventory's <code>Counter</code> adds a field. One tablet stepper with a size prop would replace them.
      </>,
      <>
        The tablet's money <code>Field</code>s mostly use <code>type="number"</code> (TimeRow, RegisterDialogs, Misc, Settings
        tips, Customers), which shows the browser's spin arrows and changes the value on a mouse wheel. The handheld and some tablet
        dialogs (events, Adjust tip) type text with a filter instead. Prefer the filter.
      </>,
      <>Store amounts as text while editing (so "1" on its way to "18" survives) and parse on save, as Settings' tip presets do.</>,
    ],
    snippet: `<CountStepper label="Party" unit="guests" value={party} onChange={setParty} max={20} />

// a typed amount
<Field label="Green fee" prefix="$" value={fee}
  onChange={(v) => setFee(v.replace(/[^\\d.]/g, ''))} placeholder="Published" />`,
  },
  related: [
    { name: 'Input Payment', id: 'components-forms-input-payment' },
    { name: 'Input Group', id: 'components-forms-input-group' },
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Slider', id: 'components-forms-slider' },
    { name: 'Button Group', id: 'components-actions-button-group' },
  ],
};

export default doc;
