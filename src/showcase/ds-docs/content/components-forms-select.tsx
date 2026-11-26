import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Select — one value from a list too long for pills. Birdie never uses MUI's Select: the tablet uses
 * the browser's own <select>, the handheld a field that opens a bottom sheet.
 */
const doc: DsDoc = {
  summary: (
    <>
      A field that holds <strong>one value from a list too long to show</strong>: which server carries a tab, which tee
      time a block starts at, which printer a register uses. Birdie has the pattern on both surfaces but never uses MUI's{' '}
      <code>Select</code>. The <strong>tablet</strong> uses the browser's own <code>&lt;select&gt;</code>, wrapped as{' '}
      <code>SelectField</code>. The <strong>handheld</strong> uses <code>PickerField</code>: an outlined field that opens a
      bottom sheet of options, each with a radio.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      The pattern is on both surfaces, through Birdie's own components: <code>SelectField</code> in tablet dialogs and Settings, and{' '}
      <code>PickerField</code> in the handheld's full-screen forms. MUI's <code>Select</code> is themed but no screen imports it,
      which is why the usage pills below say "Not on…".
    </>
  ),
  mui: ['Select'],
  useFor: [
    'One choice from a long or changing list: servers, tee times, courses, printers.',
    'A value the operator rarely changes, shown as its current label.',
    'Forms where the space for the field is fixed, such as two fields side by side.',
  ],
  dontUseFor: [
    'Two to five options: show them all. Use Radio Buttons or a segmented control.',
    'Several values at once: use Multi-Select (chips) or Checkbox.',
    'Finding a person in hundreds: use search and a result list. See Autocomplete.',
    'An action menu ("Edit, Move, Delete"): use Menu.',
  ],
  inBirdie: [
    {
      label: 'Server on a tab, tablet',
      caption: (
        <>
          The tab editor's header: <strong>Jordan Ellis ▾</strong> is a native select, a 44px pill next to the guest
          stepper. Change it and the tab moves to that server at once; there is no Save.
        </>
      ),
      shot: 'tablet-tabs',
      tabletHash: '#/tabs?tab=T-1003',
    },
    {
      label: 'Tee time in Block time, handheld',
      caption: (
        <>
          <strong>Tee time · 9:20 AM ⌄</strong> is a <code>PickerField</code>. Tapping it opens a bottom sheet listing every
          tee time of the day, the current one with a filled radio. One tap picks and closes.
        </>
      ),
      shot: 'ds-mobile-block-time',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--block-time',
    },
    {
      label: 'Destination in Move players, tablet',
      caption: (
        <>
          Two <code>SelectField</code>s side by side: <strong>Course</strong> and <strong>Time</strong>. Long, data-driven
          lists in a dialog are where the native select earns its place.
        </>
      ),
      tabletHash: '#/tee-sheet?modal=move&t=0912',
      storyId: 'prototypes-tablet-tee-sheet-operations--move-players',
    },
  ],
  birdie: [
    {
      name: 'SelectField',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'a labelled select in a tablet dialog or settings section. The label is a real <label>.',
      surface: 'tablet',
    },
    {
      name: 'ServerSelect',
      file: 'src/pos/components/restaurant/HostControls.tsx',
      use: 'choosing a server when opening a tab or seating a party. A SelectField fed by the staff roster.',
      surface: 'tablet',
    },
    {
      name: 'WalkInTimePicker',
      file: 'src/pos/components/WalkInTimePicker.tsx',
      use: "a value whose options are computed on open (open tee times that fit the party). A button and MUI's Menu, the current one ticked.",
      surface: 'tablet',
    },
    {
      name: 'PickerField',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'any one-of-many on the handheld. An MD3 outlined field that opens a bottom sheet of radio rows.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Label', description: 'Above the field on the tablet (11px bold); floating in the outline on the handheld.' },
    { part: 'Field', description: 'The current value as text. 1.5px outline, 12px corners on the tablet; 4px corners, 56dp tall on the handheld.' },
    { part: 'Indicator', description: "The browser's arrow on the tablet; an expand chevron on the handheld." },
    { part: 'Options', description: "The operating system's list on the tablet; a bottom sheet of radio rows on the handheld, each with an optional second line." },
  ],
  variants: [
    {
      name: 'SelectField (tablet)',
      use: 'Dialogs and settings: course, time, printer, server. Long or data-driven lists.',
      avoid: 'Lists of two to five. Those are pills.',
    },
    {
      name: 'Inline select (tablet)',
      use: 'A value in a screen header that edits as you go, like the server in the tab editor. 44px, a pill.',
      avoid: 'Anywhere that has a Save button. Mixing the two confuses what is saved.',
    },
    {
      name: 'Menu button (tablet)',
      use: 'Options worked out when opened, with the current one ticked: the walk-in tee time.',
      avoid: 'Static lists. A SelectField is simpler and keyboard-complete.',
    },
    {
      name: 'PickerField (handheld)',
      use: 'Every one-of-many on the handheld: tee time, membership tier, course window.',
      avoid: "MUI's Select menu. It opens a popover, and handheld choices come up from the bottom.",
    },
  ],
  states: [
    { state: 'Default', tablet: '1.5px neutral outline on white, 13px value.', handheld: 'MD3 outlined field, 16px value, floating label.' },
    { state: 'Focus', tablet: 'The outline turns green. No browser focus ring.', handheld: 'Outline and label turn green.' },
    { state: 'Open', tablet: "The operating system's list. Type-ahead and arrow keys come free.", handheld: 'A bottom sheet over a dimmed screen, titled with the field label. Long lists scroll inside it (420px).' },
    { state: 'Disabled', tablet: 'Not used today. If needed, say why next to it.', handheld: 'Not used today.' },
    { state: 'Stale value', tablet: 'The tab editor keeps a server who has left the roster as an extra option, so the tab still shows who.', handheld: '—' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'About 37px in dialogs; 44px for the inline select', why: 'Dialog fields match Field. The tab editor header is worked with a thumb, so it is 44.' },
    { surface: 'Handheld', size: '56dp field, 56dp option rows', why: "MD3's outlined text field and one-line list item." },
  ],
  behavior: [
    'One tap or click opens the list; picking closes it and applies. There is no separate confirm.',
    'Whether the pick saves depends on the screen: at once in the tab editor, on the dialog\'s main action in a form, on Save in a Settings section.',
    "Options come from the store (the staff roster, the course list, the day's times), not from lists typed into the screen.",
    'A value that is no longer an option still shows, rather than silently becoming the first option.',
    'On the handheld the sheet stays inside the device frame. Nothing opens a portalled MUI menu there.',
  ],
  content: [
    'Labels are nouns: Server, Course, Through, Tee time. Sentence case.',
    'Options read the way the screen prints them elsewhere: "9:20 AM", "Championship · Front 9", a full staff name.',
    'A second line (handheld) explains an option when its name doesn\'t: "65 and over" under Senior Member.',
  ],
  dos: [
    'Use SelectField in tablet dialogs. It binds the label and matches Field.',
    'Show the current value, never a placeholder, when there is a value.',
    'Feed options from the store so the list is always current.',
    'Use a bottom sheet on the handheld.',
  ],
  donts: [
    "MUI's Select in product screens. It brings a second look for the same job.",
    'A select for Yes / No. Use a Switch.',
    'A select whose first option is a real value standing in for "not chosen". Make the empty choice explicit.',
    'Hiding three options in a select. Show them.',
  ],
  a11y: [
    <>
      <code>SelectField</code> binds its visible label with <code>useId</code>. Before that fix it "looked labelled but
      announced as an unnamed combobox" (the comment in <code>ModalFrame.tsx</code>). Keep the label a real{' '}
      <code>&lt;label&gt;</code>.
    </>,
    <>
      The tab editor's select has no visible label, so it carries <code>aria-label="Server"</code>.
    </>,
    <>
      <code>PickerField</code> is a read-only text field with <code>aria-haspopup="dialog"</code>. Its options are list
      buttons with a radio inside that is out of the tab order, so the row is what takes focus and a tap.
    </>,
    <>
      Contrast, computed: the label is <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />. <strong>The field outline is a
      gap:</strong> <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />, under the 3:1 a field's edge needs.
      It is the same 1.5px outline every tablet field uses; a darker outline is an open decision for all of them.
    </>,
  ],
  decisions: [
    {
      decision: "The browser's select on the tablet",
      why: '"Used where the option list is long or dynamic" (ModalFrame.tsx). It gives keyboard, type-ahead and the operating system\'s list for free, and it can\'t render outside the screen.',
    },
    {
      decision: 'A bottom sheet on the handheld',
      why: "Anything that opens a menu uses BottomSheet, never a portalled MUI menu, so it stays inside the phone frame (people/parts.tsx). It is also Material's pattern for choices on a phone.",
    },
    {
      decision: 'No Save in the tab editor',
      why: 'The tab editor dispatches every change at once. A server change is one of them: the tab is already theirs.',
    },
    {
      decision: 'Open: the server is chosen three ways',
      why: (
        <>
          A native select in the tab editor header, a <code>SelectField</code> in Open tab and Seat reservation, and a row of
          pills on the handheld (<code>TabScreen</code>, <code>OpenTabScreen</code>). One choice should look the same
          everywhere. Bring to Justin: pick one per surface.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px field outline' },
    { token: 'md3.primary', value: '#17a34a', role: 'Focus outline' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Label' },
    { token: 'radius.md', value: '12px', role: 'Tablet field corners' },
    { token: 'radius.xl', value: '28px', role: 'Inline select pill (tab editor)' },
  ],
  engineering: {
    import: `import { SelectField } from '../modals/ModalFrame';                 // tablet
import { PickerField } from '../mobile/screens/people/parts';      // handheld`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiSelect</code>: default size <code>small</code>, inheriting the 1.5px outline from{' '}
        <code>MuiOutlinedInput</code>. The handheld theme (<code>src/theme/mobile-theme.ts</code>) makes it{' '}
        <code>medium</code> with 48dp menu items. Neither is exercised by a product screen.
      </>
    ),
    notes: [
      <>
        <code>SelectField</code> is generic over the value type (<code>string | number</code>). It matches the option by{' '}
        <code>String(value)</code>, so numbers such as minutes-of-day work without parsing.
      </>,
      <>
        <code>PickerField</code> needs a <code>BottomSheet</code> host, which <code>MobileFrame</code> provides. Outside the
        frame (a bare story) the sheet has nowhere to open.
      </>,
      <>Both take the options as data. Don't put JSX in an option label: the native select can't render it.</>,
    ],
    snippet: `<Stack direction="row" gap={1.5}>
  <SelectField label="Course" value={course} options={courseOptions} onChange={setCourse} />
  <SelectField label="Time" value={timeMin} options={TIMES.map((t) => ({ label: t.label, value: t.totalMin }))} onChange={setTimeMin} />
</Stack>`,
  },
  related: [
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Multi-Select', id: 'components-forms-multi-select' },
    { name: 'Autocomplete', id: 'components-forms-autocomplete' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Form', id: 'components-forms-form' },
  ],
};

export default doc;
