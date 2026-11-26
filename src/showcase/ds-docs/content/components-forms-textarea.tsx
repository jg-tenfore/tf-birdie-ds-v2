import { md3, noteColors } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` drawn at `alpha` over `bg`, as hex: MUI draws placeholders at 42% of the text colour. */
const over = (fg: string, bg: string, alpha: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0'))
    .join('');

/** Textarea: the multi-line note. Field multiline on the tablet, TextField multiline on the handheld. */
const doc: DsDoc = {
  summary: (
    <>
      A field for a sentence or two: a note on a tee time, a booking, a dish or a customer. Notes are how the counter talks to
      the next person: the starter, the kitchen, whoever opens the drawer tomorrow. The <strong>tablet</strong> uses{' '}
      <code>Field multiline</code>, three lines to start and growing with the text. The <strong>handheld</strong> uses MUI's{' '}
      <code>TextField multiline</code> at touch size. A note always says where it will show up, because a note nobody sees is
      wasted typing.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Used on both surfaces, through <code>Field multiline</code> on the tablet (time notes, group notes, kitchen notes, customer
      notes, event notes, close-shift and payout notes) and <code>TextField multiline</code> on the handheld (time notes, blocks,
      group notes, new customers, the kitchen note). It has no MUI component of its own, so the usage scan can't count it.
    </>
  ),
  mui: [],
  useFor: [
    'A note on a tee time: "Lightning hold — resume when cleared", shown on the row in its colour.',
    'A group note on a booking, shown on the tee sheet chip and on the order.',
    'A note for the kitchen on a dish, printed on the ticket.',
    'Explaining money: why the drawer is off at close, what an "Other" payout was for.',
  ],
  dontUseFor: [
    'One line: a name, a label, a player note. Use Text Field.',
    'Allergies and dish choices. They are modifier groups, so the kitchen ticket can flag them in red.',
    'Labels the system acts on, like booking tags. Use chips from a fixed list (see Input Tags).',
    'Anything a report needs to count. Free text cannot be counted.',
  ],
  inBirdie: [
    {
      label: 'Time note, tablet',
      caption: (
        <>
          The note, then its colour, then a preview of the row as the tee sheet will draw it. Save note stays off until there is
          text.
        </>
      ),
      shot: 'ds-tablet-time-note',
      tabletHash: '#/tee-sheet?modal=note&t=0912',
    },
    {
      label: 'Time note, handheld',
      caption: (
        <>
          The same note as a full-screen dialog: the tee time from a picker, the note with the keyboard already up, the colour, and
          the preview. Save in the top bar stays off until there is text.
        </>
      ),
      shot: 'ds-mobile-time-note',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--time-note',
    },
    {
      label: 'Group and player notes, tablet',
      caption: (
        <>
          The reservation panel's Notes tab: tags that apply at once, a group note ("Shown on the tee sheet chip and the cart
          card"), and one line per player. The text saves with Save notes.
        </>
      ),
      storyId: 'weston-edits-1-·-reservation-panel-tablet--notes-tab',
    },
    {
      label: 'Booking notes, handheld',
      caption: (
        <>
          Tags apply immediately; the group note and the player notes save together with one button, "like the terminal's tab"
          (BookingDetailScreen).
        </>
      ),
      handheldRoute: 'mobile-screens-3-·-booking-check-in--detail-notes',
    },
    {
      label: 'A note for the kitchen',
      caption: (
        <>
          The dish dialog ends with <strong>Note for the kitchen</strong>, under the modifier groups. Allergies are not typed
          here: they are a red-edged group above it.
        </>
      ),
      storyId: 'prototypes-tablet-quick-order-menu-photography--the-dish-dialog',
    },
    {
      label: 'Close shift',
      caption: (
        <>
          The note's hint changes from Optional to <strong>Recommended</strong> when the count is off, and a large variance asks
          for a recount "and say what happened in the note".
        </>
      ),
      storyId: 'v1-→-v2-migration-17-·-shift-tablet--closing-records-the-variance',
    },
  ],
  birdie: [
    {
      name: 'Field multiline',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'every note in a tablet dialog. Three rows to start; it grows with the text.',
      surface: 'tablet',
    },
    {
      name: 'TextField multiline',
      file: 'src/pos/mobile/screens/people/TimeNoteScreen.tsx',
      use: "the handheld's note: minRows 2–3, the root's padding cleared (see the engineering notes).",
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Label or section title', description: 'Tablet: the dialog section ("Note") or the Field label. Handheld: the form section title, or a floating label.' },
    { part: 'Container', description: 'The text field container: 1.5px outline-variant outline, white, radius md on the tablet and 4px on the handheld.' },
    { part: 'Placeholder', description: 'A real example of a good note, in the voice of the counter: "Gluten-free bread, sauce on the side…".' },
    { part: 'Hint', description: 'Where the note will show up: "Shown on the tee sheet chip and the cart card".' },
    { part: 'Preview (time notes)', description: 'The row as the tee sheet will draw it, in the note colour, updating as you type.' },
  ],
  variants: [
    { name: 'Note in a dialog', use: 'Most notes: one Field multiline in its own dialog section, saved with the dialog.', avoid: 'A save of its own inside a dialog that already has Save.' },
    { name: 'Note with a colour', use: 'Time notes: the colour marks the row on the tee sheet (yellow, blue, green, purple, red), with a preview.', avoid: 'Colour as the only meaning. The text says what happened.' },
    { name: 'Required note', use: 'Money that needs a reason: an "Other" cash payout refuses to save without one.', avoid: 'Making routine notes required.' },
    { name: 'Recommended note', use: 'A close shift that is off: the hint says Recommended, and a large variance asks for one.', avoid: 'Blocking the close. Recommend, then let them close.' },
  ],
  states: [
    { state: 'Empty', tablet: 'Three rows tall with a placeholder example. Save is off when the note is the point of the dialog.', handheld: 'Two or three rows (minRows), placeholder showing.' },
    { state: 'Focus', tablet: 'Outline turns brand green.', handheld: 'Outline turns brand green; the keyboard is up.' },
    { state: 'Typing', tablet: 'Grows a row at a time. The dialog body scrolls, not the field.', handheld: 'Grows with the text inside the scrolling form.' },
    { state: 'Saved', tablet: 'A toast ("Note saved", "Notes saved") and the note appears where the hint said.', handheld: 'Same, with the screen closing.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Three rows to start at 13px, the full width of the dialog section.', why: 'Room for a sentence without scrolling, at the dialog body size.' },
    { surface: 'Handheld', size: 'Two or three rows at 16px, full width.', why: 'MD3 body text; enough above the keyboard to see what you typed.' },
  ],
  behavior: [
    'Notes save with their dialog (Save note, Save notes). Nothing saves on each keystroke.',
    'A time note is trimmed on save and cannot be saved empty; an existing one is removed with its own Remove button, not by clearing it.',
    'Where a note can be left out, its section says so: Optional, or Recommended when the money is off.',
    'A note goes where the hint says: the tee sheet row, the tee sheet chip, the order line, the kitchen ticket.',
    'The handheld opens the time note with the keyboard up (autoFocus): the note is the reason for the screen.',
  ],
  content: [
    'Placeholders are real notes, short and specific: "Lightning hold — resume when cleared", "Shotgun start, lunch after, who to call".',
    'Hints say where the note will appear, not that it is a note.',
    'Kitchen notes are instructions, not allergies. Allergies have their own group.',
  ],
  dos: [
    "Say where the note will show up, in the hint or with a preview.",
    'Give the note its own dialog section, under the choices it explains.',
    'Disable Save while the note is empty when the note is the whole point.',
  ],
  donts: [
    'Use a note for something the system should act on: tags, allergies, prices.',
    'Ask for a note on routine actions. Ask when money is off or "Other" needs explaining.',
    'Rely on the placeholder as the label. The section title or the Field label names it.',
  ],
  a11y: [
    <>
      <strong>Known gap, from Field.</strong> The tablet's notes are named by their placeholder, because Field's label is not bound
      to the input (see Text Field). The time note's only name is its placeholder, "Lightning hold — resume when cleared". The
      handheld's notes set <code>aria-label="Note"</code> or a floating label.
    </>,
    'Multiline fields take Enter as a new line. Saving is the dialog button, never Enter.',
    <>
      Contrast: typed text <Contrast fg={md3.onSurface} bg="#ffffff" />. The placeholder, at MUI's 42%, is{' '}
      <Contrast fg={over(md3.onSurface, '#ffffff', 0.42)} bg="#ffffff" />: readable as an example, too faint to be the only name of
      the field. The yellow note's text on its row: <Contrast fg={noteColors.yellow.text} bg={noteColors.yellow.bg} />.
    </>,
  ],
  decisions: [
    {
      decision: 'Allergies are not free text',
      why: 'The dish dialog makes allergies a red-edged modifier group, and a chosen one fills solid red "on the line and on the kitchen\'s ticket too" (DishDialog). Typed into a note, an allergy is one more line of grey.',
    },
    {
      decision: 'Every note says where it goes',
      why: 'The group note\'s hint names the tee sheet chip and the cart card; the time note shows a preview of its row. An operator writes for the person who will read it.',
    },
    {
      decision: 'Notes save together, tags at once',
      why: 'On the handheld\'s booking notes, "tags apply immediately; the text fields save together, like the terminal\'s tab" (BookingDetailScreen). A tap is a decision; half a sentence is not.',
    },
    {
      decision: 'A note is asked for when money is off',
      why: 'Close shift recommends one when the count differs and asks for one on a large variance; an "Other" payout refuses to save without one (register-extras.ts). The note is the record of why.',
    },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Outline at rest' },
    { token: 'md3.primary', value: '#17a34a', role: 'Outline on focus' },
    { token: 'noteColors.*', value: 'yellow, blue, green, purple, red', role: 'Time note colours: row fill, border, text, dot' },
    { token: 'radius.md', value: '12px', role: 'Tablet corners' },
  ],
  engineering: {
    import: `import { Field } from '../modals/ModalFrame';   // tablet: <Field multiline … />
import { TextField } from '@mui/material';      // handheld: <TextField multiline … />`,
    themeOverride: (
      <>
        No override of its own; it is the text field's (see Text Field). On the handheld, <code>mobile-theme.ts</code> pads the
        input 16px, and MUI's multiline root pads it again. Every handheld note clears the root's padding with{' '}
        <code>sx={'{{'} '& .MuiOutlinedInput-root': {'{'} p: 0 {'}'} {'}}'}</code> (TimeNoteScreen, BlockTimeScreen, NewCustomerScreen;
        BookingDetailScreen clears <code>.MuiInputBase-multiline</code>).
      </>
    ),
    notes: [
      <>
        <strong>One handheld note misses it:</strong> the dish screen's Note for the kitchen (<code>DishScreen.tsx</code>) has no{' '}
        <code>sx</code>, so its text sits inside both paddings (16.5px + 16px), measured in the dish dialog story. Candidate fix:
        move the zero padding into <code>mobile-theme.ts</code> (<code>MuiOutlinedInput.styleOverrides.multiline</code>) and delete
        the four copies.
      </>,
      <>
        <code>Field multiline</code> sets <code>minRows={'{'}3{'}'}</code> and no <code>maxRows</code>. It grows; the dialog body
        scrolls.
      </>,
      <>Trim on save (<code>text.trim()</code>) and disable Save on an empty note, as TimeRow and TimeNoteScreen do.</>,
    ],
    snippet: `<ModalSection title="Note">
  <Field autoFocus multiline value={text} onChange={setText}
    placeholder="Lightning hold — resume when cleared" />
</ModalSection>

// handheld
<TextField multiline minRows={3} value={text} onChange={(e) => setText(e.target.value)}
  sx={{ '& .MuiOutlinedInput-root': { p: 0 } }}
  slotProps={{ htmlInput: { 'aria-label': 'Note' } }} />`,
  },
  related: [
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Input Tags', id: 'components-forms-input-tags' },
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

export default doc;
