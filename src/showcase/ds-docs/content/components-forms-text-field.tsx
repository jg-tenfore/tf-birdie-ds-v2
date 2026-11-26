import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` drawn at `alpha` over `bg`, as hex: MUI draws placeholders at 42% of the text colour. */
const over = (fg: string, bg: string, alpha: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0'))
    .join('');

/**
 * Text Field: the field an operator types into. The tablet uses Birdie's own `Field`; the
 * handheld uses MUI's TextField at MD3 size.
 */
const doc: DsDoc = {
  summary: (
    <>
      The box an operator types into: a name, a phone number, a search, a price. Birdie has{' '}
      <strong>two text fields, one per surface</strong>. The <strong>tablet</strong> uses Birdie's own <code>Field</code>: a small
      bold label above a 1.5px outline, about 46px tall, made for dialogs at a dense counter. The <strong>handheld</strong> uses
      MUI's <code>TextField</code> at Material 3 touch size: 56dp, a floating label, 16px text. Typing is the slow path on a
      touchscreen, so Birdie asks for it only when no list, chip or stepper can do the job.
    </>
  ),
  statusNote: (
    <>
      Core. The tablet builds its fields on MUI's <code>InputBase</code>: <code>Field</code> in almost every dialog, a search
      pill on every list screen, and the tab name edited in place. MUI's <code>TextField</code> is handheld only. No tablet
      screen imports it.
    </>
  ),
  mui: ['TextField', 'InputBase'],
  useFor: [
    'Free text with no list to pick from: a name, a phone number, an email, a tab name.',
    'Search: customers, items, orders, gift cards. The list filters as you type.',
    'A one-off amount: a price override, a custom tip, an open item. These get a $ prefix (see Input Group).',
    "Renaming the thing a screen is about, in place: the tab name in the tab editor's header.",
  ],
  dontUseFor: [
    'Several lines of text: use Textarea (Field multiline).',
    'A count that changes by one: use Input Number (a stepper).',
    'Cash tendered or a drawer count: use Input Payment (the cents keypad).',
    'A choice from a known list: use Select, Toggle Button or chips. Times come from a list, not the keyboard.',
    'A PIN: use Pin Input (the keypad).',
  ],
  inBirdie: [
    {
      label: 'Price override, tablet',
      caption: (
        <>
          A dialog of <code>Field</code>s: a label above each box, a <strong>$</strong> prefix on the four prices, and the section's
          hint that a blank price keeps the published rate. Blank never means free.
        </>
      ),
      shot: 'ds-tablet-price-override',
      tabletHash: '#/tee-sheet?modal=price&t=0912',
    },
    {
      label: 'Search, tablet',
      caption: (
        <>
          Inventory's <strong>Find an item</strong>: a 40px pill at the end of the filter row, with a search icon in front. The
          table filters on every keystroke. There is nothing to submit.
        </>
      ),
      shot: 'tablet-inventory',
      tabletHash: '#/inventory',
    },
    {
      label: 'Search, handheld',
      caption: (
        <>
          People's <code>SearchBar</code>: a 56dp pill on surface-container-high, the MD3 search bar. Filter chips sit under it,
          and a clear button appears once there is text.
        </>
      ),
      shot: 'mobile-people',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-7-·-people--people-list',
    },
    {
      label: 'The tab name, edited in place',
      caption: (
        <>
          "Table 10 · Farnsworth" in the tab editor's header is a field with no outline until you hover or focus it. Enter or
          leaving the field saves the name. Escape puts the old one back.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'New customer, handheld',
      caption: (
        <>
          Outlined <code>TextField</code>s in a full-screen dialog: floating labels, a 16px value, and the right keyboard for each
          field (<code>inputMode</code> tel and email).
        </>
      ),
      handheldRoute: 'mobile-screens-7-·-people--new-customer',
    },
    {
      label: 'New customer, tablet',
      caption: (
        <>
          The customer form puts its rule first: a last name, and a phone number or an email. Each half ticks off as it is met,
          and Save says what is still missing.
        </>
      ),
      storyId: 'v1-→-v2-migration-11-·-customer-search-tablet--adding-a-customer',
    },
  ],
  birdie: [
    {
      name: 'Field',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'any labelled field in a tablet dialog: label above, optional $ prefix, hint below, multiline for notes.',
      surface: 'tablet',
    },
    {
      name: 'SearchBox',
      file: 'src/pos/components/operations/OrderLookupView.tsx',
      use: "a search pill: search icon, the field, a clear button once there's text. Each list screen draws its own; this one is the model to copy.",
      surface: 'tablet',
    },
    {
      name: 'Tab name (in place)',
      file: 'src/pos/components/restaurant/TabEditor.tsx',
      use: 'renaming what the screen is about without a dialog: borderless until hover or focus, Enter saves, Escape reverts.',
      surface: 'tablet',
    },
    {
      name: 'SearchBar',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'the MD3 search bar: a 56dp pill with a clear button.',
      surface: 'handheld',
    },
    {
      name: 'PickerField',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'looks like a field, opens a bottom sheet of options. For tee times and tiers, never typed.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Label', description: 'Tablet: 11px bold, on-surface-variant, above the box. Handheld: the MD3 floating label, inside the outline until there is a value or focus.' },
    { part: 'Container', description: '1.5px outline-variant outline on white. Radius md (12px) on the tablet, 4px on the handheld. Surface-container fill when disabled.' },
    { part: 'Prefix (optional)', description: 'A $ before money. Field takes a prefix; the handheld uses a start adornment. See Input Group.' },
    { part: 'Value', description: '13px on the tablet, 16px on the handheld, in on-surface.' },
    { part: 'Placeholder', description: 'An example of the expected value: "Last, First", "(555) 555-0100". Never the label again.' },
    { part: 'Hint (optional)', description: 'Under the box. 10.5px in outline grey on the tablet, MUI helper text (12px) on the handheld.' },
  ],
  variants: [
    {
      name: 'Labelled field',
      use: 'Forms in dialogs: customer details, price overrides, event setup. Field on the tablet, TextField on the handheld.',
      avoid: 'A placeholder standing in for the label.',
    },
    {
      name: 'Search pill',
      use: 'Filtering a list on screen. A pill (radius xl), a search icon in front, a clear button once there is text, an aria-label naming what it searches.',
      avoid: 'Data you mean to save.',
    },
    {
      name: 'In-place edit',
      use: 'Renaming the thing the screen is about. No outline until hover or focus; Enter or blur saves; Escape reverts.',
      avoid: 'Anything with money, validation or more than one field. Use a dialog.',
    },
    {
      name: 'Picker field (handheld)',
      use: 'A choice from a long list that should look like a form field: a tee time, a membership tier. Read-only; tapping opens a bottom sheet.',
      avoid: 'Free text. And short lists: use a segmented button.',
    },
    {
      name: 'Disabled',
      use: 'A field that cannot be edited right now, for a reason said nearby.',
      avoid: "Values another system owns. Settings shows Buck's values as read-only rows, not disabled fields.",
    },
  ],
  states: [
    {
      state: 'Default',
      tablet: 'Outline-variant outline on white, 13px placeholder.',
      handheld: 'The same outline colour (inherited from the tablet theme), label resting inside the box.',
    },
    {
      state: 'Focus',
      tablet: (
        <>
          Field's outline turns brand green. Search pills differ by screen: some turn green, the register's search turns white with a
          green glow, Inventory's and Tabs' don't change at all.
        </>
      ),
      handheld: 'The outline turns brand green at 1.5px (the tablet theme\'s focus width, inherited); the label floats up and turns green.',
    },
    { state: 'Filled', tablet: 'The value in on-surface. The league search keeps a green outline while it holds a query.', handheld: 'The label stays floated.' },
    {
      state: 'Error',
      tablet: (
        <>
          Field has no error style. Problems are said in the hint or at the Save button. The table chart inspector's name field is
          the one exception: a red outline and <code>aria-invalid</code>.
        </>
      ),
      handheld: 'TextField error and helper text, as on the tee fee sheet ("Enter an amount").',
    },
    { state: 'Disabled', tablet: 'Surface-container fill, muted text, with the reason said nearby.', handheld: "MUI's disabled style." },
  ],
  sizing: [
    {
      surface: 'Tablet',
      size: 'Field about 46px tall, 13px text. Search pills about 40–46px (the league\'s large search, 56px). The tab name 44px at 16px bold.',
      why: 'Dialogs on a 1280×800 counter screen hold many fields. 13px matches the dialog body text; fields in the body of a screen worked by hand sit at 44px.',
    },
    {
      surface: 'Handheld',
      size: '56dp tall, 16px text, full width by default. SearchBar 56dp.',
      why: "MD3's outlined text field, sized for a thumb on a 360dp screen.",
    },
  ],
  behavior: [
    'Fields in a dialog save with the dialog: Save or Cancel, never on each keystroke. A Settings section saves as a whole, with Save and Discard, because "a half-typed setting is not a setting anyone meant" (SettingsView).',
    'Search filters as you type. There is no Search button. Linking a customer to a seat waits for two characters and says so.',
    'An in-place edit saves on Enter or when the field loses focus. Escape restores the old value, and an empty name is ignored.',
    'Fields filter what they accept as it is typed (digits for a count, digits and a point for money) instead of complaining after Save.',
    'A dialog that exists to type puts the cursor in its first field (Open item, New customer, the customer search).',
    "Rules go first and Save says what is missing. A form doesn't wait for a failed Save to turn fields red.",
    'The handheld asks for the right keyboard: inputMode tel, email or decimal.',
  ],
  content: [
    'Labels are nouns in sentence case, without colons: "Last name", "Green fee".',
    'Placeholders show an example of the format: "Last, First", "(555) 555-0100", "name@example.com".',
    'Hints say what happens, not what to type: "Leave blank to keep the published rate", "Printed on receipts and shift reports".',
    'Mark optional fields ("Tab name (optional)", or an Optional hint). Required fields say nothing; the form\'s rule says it once.',
    'Search placeholders list what you can search by: "Name, email, phone or customer ID".',
  ],
  dos: [
    'Use Field on the tablet and the themed TextField on the handheld.',
    'Give every input a name a screen reader can say: a bound label, or an aria-label.',
    'Filter input as it is typed, and set inputMode on the handheld.',
    'Say what is missing at the Save button.',
  ],
  donts: [
    'A placeholder as the only label on a form field.',
    'A text field where a stepper, chips or a picker would do. On a touchscreen the keyboard covers half the dialog.',
    'Typed times. Tee times and reservation times come from a list.',
    'A new search pill drawn from scratch. Copy SearchBox until there is a shared one.',
  ],
  a11y: [
    <>
      <strong>Known gap: Field's label is not bound to its input.</strong> The label is a <code>Typography</code>, not a{' '}
      <code>&lt;label&gt;</code>, and the input gets no <code>aria-label</code>. A screen reader names the field by its placeholder
      or not at all: in the In Birdie story, "Green fee" is announced as an unnamed textbox. <code>SelectField</code> in the same
      file was fixed the same way it needs (<code>useId</code> and a real <code>&lt;label htmlFor&gt;</code>). Open decision.
    </>,
    'Search pills put an aria-label on the input ("Search orders", "Search gift cards"). The register\'s item search and the tee sheet list\'s search have only a placeholder.',
    "The handheld's TextField binds its label and its helper text (aria-describedby) through MUI.",
    <>
      Contrast, computed: the tablet label <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />, the value{' '}
      <Contrast fg={md3.onSurface} bg="#ffffff" />, and the hint <Contrast fg={md3.outline} bg="#ffffff" />, which is exactly at
      the line, so keep hints on white (on surface-container it is <Contrast fg={md3.outline} bg={md3.surfaceContainer} />).
      MUI draws placeholders at 42% of the text colour, <Contrast fg={over(md3.onSurface, '#ffffff', 0.42)} bg="#ffffff" />. That is
      fine for an example, not for a placeholder doing a label's job.
    </>,
    <>
      <strong>The outline is under 3:1.</strong> A field's boundary is outline-variant on white,{' '}
      <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />; WCAG asks 3:1 for the edge of a control. The MD3 spec draws
      text-field outlines in <code>outline</code>, <Contrast fg={md3.outline} bg="#ffffff" size="non-text" />, the colour the
      tablet theme already uses on hover. The focus outline passes: <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />.
    </>,
  ],
  decisions: [
    {
      decision: "Birdie's own Field on the tablet, not MUI's TextField",
      why: "The source prototype's dialog field is a small bold label above the box (.mc-label, 11px, 700) and a box whose border turns brand green on focus (.mc-input). Field reproduces that on InputBase, in sentence case. The outlined TextField would bring a floating label and its own spacing into dialogs designed without them.",
    },
    {
      decision: 'MD3 TextField on the handheld',
      why: 'The handheld follows MD3\'s touch spec throughout (mobile-theme.ts): 16px body text and 48dp targets. The outlined field is its standard.',
    },
    {
      decision: 'Validation at the action, not red fields',
      why: 'The customer form puts its rule first and Save says what is still missing (CustomerFormDialog). v1 badged three fields only after Save, and its rule was a secret.',
    },
    {
      decision: 'Search filters live',
      why: "Lists on the counter are short enough to filter on each keystroke, and a Search button is one more target to find.",
    },
    {
      decision: 'Typing is the last resort',
      why: 'A field on a touchscreen brings up the keyboard. Counts use steppers, choices use chips, times use pickers, money at the drawer uses a keypad (HostControls.tsx, CashAmountPad.tsx).',
    },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'The 1.5px outline at rest' },
    { token: 'md3.outline', value: '#707973', role: 'Hint text; the outline on hover (MUI fields)' },
    { token: 'md3.primary', value: '#17a34a', role: 'The outline on focus' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Tablet label' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Disabled fill; the Orders search pill' },
    { token: 'radius.md', value: '12px', role: 'Field corners' },
    { token: 'radius.xl', value: '28px', role: 'Search pills' },
  ],
  engineering: {
    import: `import { Field } from '../modals/ModalFrame';            // tablet: a labelled field
import { TextField } from '@mui/material';               // handheld, under mobileTheme
import { SearchBar } from '../screens/people/parts';     // handheld search`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts</code>: <code>MuiTextField</code> (small), <code>MuiInputBase</code> (13px),{' '}
        <code>MuiOutlinedInput</code> (radius md, white, 1.5px outline-variant, outline on hover, 9px input padding),{' '}
        <code>MuiInputLabel</code> 13px, <code>MuiFormHelperText</code> 11px. No tablet screen renders a TextField, so on the
        tablet these show only in Storybook. <code>src/theme/mobile-theme.ts</code>: <code>MuiTextField</code> (medium, outlined,
        full width), <code>MuiOutlinedInput</code> (radius 4, 16px, 16px input padding), label 16px, helper text 12px. The handheld
        theme is built on the tablet's (<code>createTheme(theme, …)</code>), so it keeps the 1.5px outline-variant outline.
      </>
    ),
    notes: [
      <>
        <code>Field</code> takes <code>label</code>, <code>value</code>, <code>onChange(string)</code>, <code>placeholder</code>,{' '}
        <code>type</code>, <code>autoFocus</code>, <code>hint</code>, <code>prefix</code>, <code>disabled</code> and{' '}
        <code>multiline</code>. It has no error state, no suffix and no id. Binding its label is the change{' '}
        <code>SelectField</code> already made.
      </>,
      <>
        Building on <code>InputBase</code> directly (search, in-place edits)? Pass <code>aria-label</code>; InputBase forwards it to
        the <code>&lt;input&gt;</code>.
      </>,
      <>
        Tests find handheld fields by role and name (<code>getByRole('textbox', {'{'} name: 'Search orders' {'}'})</code>). Tablet{' '}
        <code>Field</code>s can only be found by placeholder until the label is bound, which is why the stories use{' '}
        <code>getByPlaceholderText</code>.
      </>,
      <>For money and counts, see Input Number: the handheld types text with <code>inputMode="decimal"</code>; most tablet money fields use <code>type="number"</code>.</>,
    ],
    snippet: `<Stack direction="row" gap={1.25}>
  <Field autoFocus label="First name" value={first} onChange={setFirst} />
  <Field label="Last name" value={last} onChange={setLast} />
</Stack>
<Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="(555) 234-1234" />`,
  },
  related: [
    { name: 'Textarea', id: 'components-forms-textarea' },
    { name: 'Input Group', id: 'components-forms-input-group' },
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Autocomplete', id: 'components-forms-autocomplete' },
    { name: 'Pin Input', id: 'components-forms-pin-input' },
  ],
};

export default doc;
