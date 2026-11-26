import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Form — how Birdie puts fields together, asks for what it needs, and saves. Not one component but
 * a pattern: a dialog on the tablet, a full-screen dialog on the handheld, and the same rules on both.
 */
const doc: DsDoc = {
  summary: (
    <>
      How Birdie asks for information: a new customer, a block on the tee sheet, a league, a tab, a register's settings.
      A form is <strong>a dialog on the tablet</strong> (<code>ModalFrame</code>: title, sections, actions bottom right)
      and <strong>a full-screen dialog on the handheld</strong> (<code>DialogTopBar</code>: ✕, title, and Save top right).
      The rules are the same on both: <strong>say what is needed before anyone types</strong>, keep the main action
      disabled until it is met and <strong>say in words what is missing</strong>, and show what an action will overwrite
      before it is done.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Every create and edit flow on both surfaces. There is no <code>&lt;form&gt;</code> component: forms are built from{' '}
      <code>ModalFrame</code>'s parts on the tablet and from the handheld's <code>FormSection</code> family.
    </>
  ),
  useFor: [
    'Creating or editing a record: a customer, a staff member, an event, a league.',
    'An operation with settings and a consequence: block time, move players, a price override.',
    'A group of settings that should be saved together, or not at all.',
  ],
  dontUseFor: [
    'One value: edit it in place (a seat\'s fee, a tab\'s guest count).',
    'A quick choice with no typing: use a menu on the tablet, a bottom sheet on the handheld.',
    'A confirmation: use a dialog with the consequence and two buttons.',
    'Taking money: that is checkout, not a form.',
  ],
  inBirdie: [
    {
      label: 'Block time, tablet',
      caption: (
        <>
          A <code>ModalFrame</code> with labelled sections: Label, When (pills), Courses (checkboxes), Note. Cancel and a
          dark <strong>Block time</strong> bottom right. If the block would remove bookings, a red callout names them
          first.
        </>
      ),
      shot: 'ds-tablet-block-time',
      tabletHash: '#/tee-sheet?modal=block&t=0912',
    },
    {
      label: 'Block time, handheld',
      caption: (
        <>
          The same form as a full-screen dialog: ✕ and <strong>Save</strong> at the top, a note on what blocking does,
          green section titles, a segmented "This time / A range", a picker for the tee time, and course chips.
        </>
      ),
      shot: 'ds-mobile-block-time',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--block-time',
    },
    {
      label: 'New customer, tablet',
      caption: (
        <>
          The rule comes first: "To save, a customer needs a last name and a phone number or an email". Each half ticks as
          it is met, and the footer says what is still missing next to a disabled <strong>Add customer</strong>.
        </>
      ),
      storyId: 'v1-→-v2-migration-11-·-customer-search-tablet--adding-a-customer',
    },
    {
      label: 'Settings sections, tablet',
      caption: (
        <>
          Each editable section saves as a whole: <strong>Save</strong> and <strong>Discard</strong> under it, and who
          saved it last. A half-typed setting is not a setting anyone meant.
        </>
      ),
      shot: 'tablet-settings',
      tabletHash: '#/settings',
      storyId: 'v1-→-v2-migration-18-·-settings-tablet--discard-puts-it-back',
    },
  ],
  birdie: [
    { name: 'ModalFrame', file: 'src/pos/modals/ModalFrame.tsx', use: 'the shell of every tablet form: icon, title, subtitle, scrolling body, footer actions.', surface: 'tablet' },
    { name: 'ModalSection', file: 'src/pos/modals/ModalFrame.tsx', use: 'a labelled group of fields, with an optional hint ("3 chosen", "Optional").', surface: 'tablet' },
    { name: 'Field', file: 'src/pos/modals/ModalFrame.tsx', use: 'text and number inputs, with a label, prefix ("$") and hint.', surface: 'tablet' },
    { name: 'Callout', file: 'src/pos/modals/ModalFrame.tsx', use: 'what an action will do or destroy, in info, warning, danger or success.', surface: 'tablet' },
    { name: 'DialogTopBar', file: 'src/pos/mobile/chrome.tsx', use: 'the header of a handheld form: ✕, title, one confirming text button.', surface: 'handheld' },
    { name: 'FormSection / FieldRow', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a titled group of fields, and two fields side by side.', surface: 'handheld' },
    { name: 'Notice', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'the handheld Callout: what this will do, or overwrite.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Header', description: 'Tablet: an icon tile, the title, a subtitle with the context ("9:12 AM · Thu, May 21"), ✕. Handheld: ✕, the title, Save.' },
    { part: 'The rule (when there is one)', description: 'What saving needs, stated before the first field, ticking off as it is met.' },
    { part: 'Sections', description: 'Small labels that group fields: LABEL, WHEN, COURSES on the tablet; green section titles on the handheld.' },
    { part: 'Fields', description: 'Text fields, selects, pills, chips and checkboxes, each from its own page.' },
    { part: 'Consequence', description: 'A Callout or Notice: "3 existing bookings fall inside this block and will be removed: …".' },
    { part: 'Actions', description: 'Tablet: the missing-requirement sentence on the left, Cancel and the main action on the right. Handheld: Save in the header.' },
  ],
  variants: [
    {
      name: 'Tablet dialog',
      use: 'Every tablet form. 480px wide by default; 640–660px for the customer form and the dish dialog; tall dialogs scroll their body.',
      avoid: 'Full-screen forms on the tablet. The screen behind is the context.',
    },
    {
      name: 'Handheld full-screen dialog',
      use: 'Every handheld form that can be abandoned: ✕ discards, Save commits.',
      avoid: 'Short choices. Those are bottom sheets.',
    },
    {
      name: 'Bottom sheet (handheld)',
      use: 'A choice or one value: a sort order, pay now or later, a seat\'s fee.',
      avoid: 'Anything with more than one field to type.',
    },
    {
      name: 'Section save (tablet Settings)',
      use: 'Groups of settings: Save and Discard under the section, with who saved last.',
      avoid: 'Settings that are view preferences, like the tee sheet\'s density. Those apply live.',
    },
    {
      name: 'Edit as you go',
      use: 'Screens where each change is its own small action: the tab editor, the tee sheet settings panel.',
      avoid: 'Anything where a half-finished state would be wrong.',
    },
  ],
  states: [
    { state: 'Incomplete', tablet: 'The main action is disabled, and a sentence beside it says what is missing ("Add a phone number or an email").', handheld: 'Save is disabled. Not every form says why: New customer waits silently for a first or last name.' },
    { state: 'Field problem', tablet: 'A grey hint under the field ("A phone number is ten digits.").', handheld: 'MUI\'s red error state and helper text ("Enter an amount").' },
    { state: 'Consequence', tablet: 'A red Callout before applying, naming what will be lost.', handheld: 'A Notice in the form.' },
    { state: 'Focus', tablet: 'The field outline turns green.', handheld: 'The outline and floating label turn green.' },
    { state: 'Saved', tablet: 'The dialog closes and a toast says what happened ("Updated: Filet Mignon").', handheld: 'The dialog pops, a toast, and the screen below shows the result.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '480px dialogs; 16–20px padding; 11px bold labels, 13px fields', why: 'A dialog over a busy screen at a counter. Dense, mouse-first, the context visible around it.' },
    { surface: 'Handheld', size: 'Full screen; 16dp side padding; 56dp fields, 16px text', why: "Material's full-screen dialog and outlined text fields, for a thumb." },
  ],
  behavior: [
    'The rule is stated before the fields when there is one. v1 made people fail Save to learn it.',
    'The main action is disabled until the form is complete, and the reason is said in words next to it. A button never fails silently.',
    'Anything destructive shows its damage first: the bookings a block removes, the line a void takes off.',
    'The first field to type in takes focus when the form opens.',
    'Forms opened from a search that found nobody start filled with what was typed.',
    'In a form, Cancel or ✕ throws the draft away. Nothing is saved until the main action.',
  ],
  content: [
    'Titles say the task: "Block this time", "New customer", "Edit Sam Quill".',
    'Labels are nouns, sentence case: "First name", "Phone". On the tablet, section labels are small caps.',
    'Hints say why or how, in a sentence: "Shows on the chip in place of a golfer name".',
    'The missing-requirement sentence starts with a verb: "Add a phone number or an email", "Choose temp and sides".',
    'The main action says what will happen: "Add customer", "Block time", "Save & add".',
  ],
  dos: [
    'State the rule up front, and tick it off.',
    'Disable the main action with a reason, not without one.',
    'Show the consequence before the action.',
    'Use the same shell on each surface: ModalFrame on the tablet, DialogTopBar on the handheld.',
  ],
  donts: [
    'Errors that only appear after Save.',
    'Two primary actions in a footer.',
    'Forms in a bottom sheet on the handheld.',
    'Asking for what the system already knows: start on the order\'s customer, the row\'s time, the visible courses.',
  ],
  a11y: [
    <>
      <code>SelectField</code> binds its label with <code>useId</code>. <strong>Gap:</strong> <code>Field</code> does
      not: its label is a <code>Typography</code> and the input has no id, so a screen reader names it by the placeholder
      or not at all. Measured in Block time: both text inputs have no label. Give <code>Field</code> the same{' '}
      <code>useId</code> fix.
    </>,
    <>
      <strong>Gap:</strong> <code>Field</code> has no error state. Its hint is grey, with no <code>aria-invalid</code>, so
      "A phone number is ten digits." reads like help, not a problem. The handheld uses MUI's <code>error</code> and{' '}
      <code>helperText</code>, which do both.
    </>,
    'The missing-requirement sentence sits next to the disabled button, so it is read in order. It is not a tooltip.',
    <>
      Contrast, computed: tablet labels are <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" /> and hints{' '}
      <Contrast fg={md3.outline} bg="#ffffff" />. The missing-requirement sentence is{' '}
      <Contrast fg={md3.error} bg="#ffffff" />. <strong>Gaps:</strong> the field outline is{' '}
      <Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" />, and the handheld's green section titles are{' '}
      <Contrast fg={md3.primary} bg={md3.surface} label="When" /> at 14px, both under AA.
    </>,
  ],
  decisions: [
    {
      decision: 'The rule before the fields',
      why: (
        <>
          v1's new-customer form kept its rule secret: "a last name is required, and so is a phone number or an email. The
          device said so only after Save" (<code>CustomerFormDialog.tsx</code>).
        </>
      ),
    },
    {
      decision: 'Show the damage first',
      why: 'Every tee-sheet operation can silently destroy real bookings, so each one shows the conflict before it applies (TimeRow.tsx, header comment).',
    },
    {
      decision: 'Settings save by section',
      why: '"A half-typed setting is not a setting anyone meant" (SettingsView.tsx). The tee sheet\'s own display settings are the exception: they are view preferences, and apply live.',
    },
    {
      decision: 'Full-screen forms on the handheld',
      why: 'It is a form that can be abandoned, and Material replaces centred dialogs with this on phones (NewCustomerScreen.tsx).',
    },
    {
      decision: 'Open: two field heights side by side',
      why: (
        <>
          In tablet dialogs a <code>Field</code> is about 46px tall and a <code>SelectField</code> 37px, measured in Block
          time and Move players. The two share rows in the golfer and reservation dialogs (<code>People.tsx</code>,{' '}
          <code>ReservationDialog.tsx</code>). Bring to Justin: one height for every tablet field.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px field outline, dialog dividers' },
    { token: 'md3.primary', value: '#17a34a', role: 'Focus outline; handheld section titles' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Field labels' },
    { token: 'md3.outline', value: '#707973', role: 'Hints, section labels' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Missing-requirement sentence, danger Callout' },
    { token: 'radius.lg / radius.md', value: '16px / 12px', role: 'Dialog corners / field corners' },
  ],
  engineering: {
    import: `import { Callout, Field, FilledButton, ModalFrame, ModalSection, OutlineButton, SelectField } from '../modals/ModalFrame';
import { DialogTopBar, MobileScreen } from '../mobile/chrome';
import { FieldRow, FormSection, PickerField } from '../mobile/screens/people/parts';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiDialog</code> (16px corners, e3 shadow), <code>MuiOutlinedInput</code> (1.5px
        outline), <code>MuiTextField</code> size small. The handheld theme makes <code>MuiTextField</code> medium, outlined
        and full width with 16px text.
      </>
    ),
    notes: [
      <>
        Keep the rule in a pure function and test it: <code>customerDraftStatus()</code> and{' '}
        <code>customerDraftProblem()</code> in <code>src/pos/logic/customer-search.ts</code> drive both the ticks and the
        footer sentence.
      </>,
      <>
        Close a tablet form with <code>dispatch({"{ type: 'closeModal' }"})</code> (<code>ModalFrame</code>'s default); a
        handheld form with <code>nav.pop()</code>. Don't hide them with local state.
      </>,
      <>Toast after a save, saying what changed: "Updated: Filet Mignon", "Sam Quill created".</>,
    ],
    snippet: `<ModalFrame
  title="New customer"
  icon="person_add"
  actions={
    <>
      {problem && <Typography sx={{ mr: 'auto', fontSize: 12 }}>{problem}</Typography>}
      <OutlineButton onClick={close}>Cancel</OutlineButton>
      <FilledButton disabled={Boolean(problem)} onClick={save}>Add customer</FilledButton>
    </>
  }
>
  <ModalSection title="Contact">
    <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
  </ModalSection>
</ModalFrame>`,
  },
  related: [
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

export default doc;
