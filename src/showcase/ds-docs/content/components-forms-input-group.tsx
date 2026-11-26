import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Input Group: a field with something attached — a $ before, a search icon, a clear button or a chevron after. */
const doc: DsDoc = {
  summary: (
    <>
      A text field with something attached to it: a <strong>$</strong> before a price, a search icon before a query, a clear button
      or a dropdown chevron after. The attachment says what kind of value goes in, so the label doesn't have to. On the{' '}
      <strong>handheld</strong> it is MUI's <code>InputAdornment</code> inside a TextField. On the <strong>tablet</strong> it is
      built into Birdie's own fields: <code>Field</code>'s <code>prefix</code>, and the icon and clear button in each search pill.
    </>
  ),
  statusNote: (
    <>
      MUI's InputAdornment is handheld only: <code>MoneyField</code>, the custom tip and the tee fee sheet. The tablet does the same
      without it, through <code>Field prefix="$"</code> on its money fields and the hand-built search pills.
    </>
  ),
  mui: ['InputAdornment'],
  useFor: [
    'Money: a $ before every price, fee or custom tip.',
    'Search: a magnifier before the query, and a clear (×) once there is text.',
    'A field that opens a list (handheld PickerField): a chevron after a read-only value.',
  ],
  dontUseFor: [
    'Buttons that act on the field (Copy, Apply). Put them beside or below it, as the tee fee sheet puts Default and Comp.',
    'Units after the number on the tablet: Field has no suffix, so the unit goes in the label ("Tip 1 %").',
    'Decoration. An icon earns its place only if it says what goes in.',
  ],
  inBirdie: [
    {
      label: 'Prices, tablet',
      caption: (
        <>
          The price override: <code>Field</code> with <code>prefix="$"</code>, four times. The prefix is text inside the outline,
          before the value, in on-surface-variant.
        </>
      ),
      shot: 'ds-tablet-price-override',
      tabletHash: '#/tee-sheet?modal=price&t=0912',
    },
    {
      label: 'Prices, handheld',
      caption: (
        <>
          The same four prices as <code>MoneyField</code>s: a $ start adornment, a decimal keyboard, the label kept floated so it
          never sits on the $, and "Published" as the placeholder for a blank.
        </>
      ),
      shot: 'ds-mobile-price-override',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--price-override',
    },
    {
      label: 'Search, tablet',
      caption: (
        <>
          Order Lookup's search in the top bar: a grey pill, a magnifier, and a placeholder that lists what it searches by,
          down to "card last 4". A clear button appears once you type.
        </>
      ),
      shot: 'tablet-order-lookup',
      tabletHash: '#/order-lookup',
    },
    {
      label: 'Tee fee, handheld',
      caption: (
        <>
          A bottom sheet with one $ field. "Enter an amount" shows under it while it is blank, and two buttons below set the
          usual values: Default and Comp.
        </>
      ),
      handheldRoute: 'weston-edits-2-·-player-rows-mobile--tee-fee-sheet',
    },
    {
      label: 'A seat\'s fee, tablet',
      caption: (
        <>
          On a player row: a $ inside an 84px box. The booker here is on a typed-in $25, so the outline turns amber and a reset
          back to the rate appears beside the box, not inside it.
        </>
      ),
      storyId: 'weston-edits-2-·-player-rows-tablet--adjusted-fees',
    },
  ],
  birdie: [
    { name: 'Field (prefix)', file: 'src/pos/modals/ModalFrame.tsx', use: "a money field in a tablet dialog: prefix=\"$\".", surface: 'tablet' },
    { name: 'FeeField', file: 'src/pos/components/PlayerRows.tsx', use: 'a seat\'s fee on the reservation panel: $ in a 28px box, saves on Enter or blur, reset beside it.', surface: 'tablet' },
    { name: 'SearchBox', file: 'src/pos/components/operations/OrderLookupView.tsx', use: 'a search pill: magnifier, field, clear. The model for tablet search.', surface: 'tablet' },
    { name: 'MoneyField', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a handheld money field: $ adornment, decimal keyboard, blank = not set.', surface: 'handheld' },
    { name: 'SearchBar', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'the MD3 search bar: magnifier, field, clear, 56dp pill.', surface: 'handheld' },
    { name: 'PickerField', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a read-only field with a chevron that opens a bottom sheet.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Leading', description: 'A $ (text) or a search icon. Always at the start, in on-surface-variant or outline grey.' },
    { part: 'Field', description: 'The value. Its label sits above (tablet) or stays floated (handheld) so it never collides with the leading part.' },
    { part: 'Trailing (optional)', description: 'A clear button once there is text, or a chevron on a picker. Nothing else goes inside the outline.' },
    { part: 'Beside or below (optional)', description: 'Quick values and resets: Default and Comp under the tee fee, a reset ↺ beside a changed seat fee.' },
  ],
  variants: [
    { name: 'Money prefix', use: 'Every price, fee and custom tip.', avoid: 'Counts and percentages.' },
    { name: 'Search', use: 'A list filtered live. Magnifier in front, clear (×) behind once there is text.', avoid: 'A search that waits for Enter.' },
    { name: 'Picker (handheld)', use: 'A long list that should sit in a form like a field: tee time, tier. Chevron behind.', avoid: 'Short lists: a segmented button shows them all.' },
    { name: 'Field with quick values', use: 'An amount with a usual answer: Default and Comp under the tee fee.', avoid: 'Buttons inside the outline.' },
  ],
  states: [
    { state: 'Empty', tablet: 'Prefix and placeholder show. Search: magnifier only.', handheld: 'Label floated, $ and placeholder ("Published").' },
    { state: 'Typing', tablet: 'Search pills grow a clear button.', handheld: 'SearchBar grows a clear button.' },
    { state: 'Changed from default', tablet: 'FeeField: amber outline (reservationPanel.adjusted) and a reset button with a tooltip ("Reset to $54.00").', handheld: '—' },
    { state: 'Invalid', tablet: 'Fields strip what isn\'t a digit or a point as it is typed.', handheld: 'The tee fee: red outline, "Enter an amount", Save off.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Field about 46px. Search pills 40–46px. FeeField 28px tall, 84px wide.', why: 'Field and the pills are dialog and toolbar size. FeeField fits inside a player row beside the holes and transport toggles.' },
    { surface: 'Handheld', size: '56dp fields; SearchBar a 56dp pill.', why: 'MD3 text field and search bar.' },
  ],
  behavior: [
    'The clear button appears only when there is something to clear, and empties the field in one tap.',
    'Money fields accept digits and a point; anything else is dropped as it is typed.',
    'A blank money field is not zero. It means "keep the published rate" or "not set".',
    'FeeField saves on Enter or when it loses focus, and shows the value with two decimals after.',
  ],
  content: [
    'The prefix is the unit, not a word: "$", never "USD".',
    'Search placeholders list what you can search by: "Holder, card number or UPC".',
    'Name the clear button: "Clear search".',
  ],
  dos: [
    'Put $ before every money field, on both surfaces.',
    'Keep actions outside the outline, beside or below.',
    'Keep the handheld label floated when there is a start adornment (shrink).',
  ],
  donts: [
    'A unit after the number on the tablet without saying it in the label.',
    'An icon that does nothing but decorate.',
    'A clear button on an empty field.',
  ],
  a11y: [
    'The $ is visible text, not part of the field\'s name; the label already says "fee" or "price". Search icons are hidden from assistive tech (aria-hidden).',
    'Clear buttons are named ("Clear search", "Clear the search"). FeeField\'s reset is named by its tooltip.',
    'On the tablet the field inherits Field\'s gap: the label above is not bound to the input (see Text Field).',
    <>
      Contrast: the $ prefix <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />, the search icon{' '}
      <Contrast fg={md3.outline} bg="#ffffff" size="non-text" />; on Order Lookup's grey pill,{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} size="non-text" />.
    </>,
  ],
  decisions: [
    {
      decision: 'A prefix, not an icon, for money',
      why: 'A $ is read as part of the amount. The tablet\'s Field prints it as text before the value; the handheld uses a text adornment, not the AttachMoney icon the live example shows.',
    },
    {
      decision: 'Quick values outside the field',
      why: 'Default and Comp under the tee fee, the reset beside a changed seat fee: targets of their own, not icons crammed into a 28px box.',
    },
    {
      decision: 'The label stays up on the handheld',
      why: 'MoneyField sets shrink on its label, so "Green fee" never sits on top of the $ while the field is empty.',
    },
  ],
  tokens: [
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'The $ prefix' },
    { token: 'md3.outline', value: '#707973', role: 'Search icon' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Order Lookup search fill' },
    { token: 'reservationPanel.adjusted', value: '#fffbeb / #fde68a / #92400e', role: 'A seat fee changed from its rate' },
    { token: 'radius.xl', value: '28px', role: 'Search pills' },
  ],
  engineering: {
    import: `import { Field } from '../modals/ModalFrame';                  // tablet: prefix="$"
import { MoneyField, SearchBar } from '../screens/people/parts'; // handheld
import { InputAdornment } from '@mui/material';                  // handheld, hand-built`,
    themeOverride: <>None of its own: the text field's theme (see Text Field).</>,
    notes: [
      <>
        Field takes <code>prefix</code> only. A <code>suffix</code> for units after the number (%, min, players) would let Settings
        say "18 %" instead of "Tip 1 %".
      </>,
      <>
        On the handheld, put the adornment in <code>slotProps.input.startAdornment</code>, the keyboard in{' '}
        <code>slotProps.htmlInput.inputMode</code>, and keep <code>slotProps.inputLabel.shrink</code>, as <code>MoneyField</code>{' '}
        does.
      </>,
      <>The tablet has a search pill per screen (Order Lookup, Gift Cards, Customers, Inventory, Tabs, League, the register). A shared one would settle their heights, fills and focus styles.</>,
    ],
    snippet: `<Field label="Green fee" prefix="$" value={fee}
  onChange={(v) => setFee(v.replace(/[^\\d.]/g, ''))} />

// handheld
<MoneyField label="Green fee" value={fee} onChange={setFee} placeholder="Published" />`,
  },
  related: [
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Input Payment', id: 'components-forms-input-payment' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
  ],
};

export default doc;
