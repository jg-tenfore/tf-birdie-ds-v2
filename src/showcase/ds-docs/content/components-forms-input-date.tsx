import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** Input Date: the browser's own date field, in two tablet forms. Days on the tee sheet use the Date Picker instead. */
const doc: DsDoc = {
  summary: (
    <>
      A form field that takes a date, using the device's own date control (<code>type="date"</code>). Birdie uses it in{' '}
      <strong>two tablet forms</strong>, where any date is a fair answer: an event's date and a restaurant reservation's date.
      Everywhere the date is <em>the operation's day</em> (which tee sheet, which day of orders) Birdie uses its own Date Picker,
      because those calendars show which days have bookings. Times are never typed: they are picked from the course's or the
      dining room's own intervals.
    </>
  ),
  status: 'in-use',
  statusNote: (
    <>
      Two tablet dialogs use it, through <code>Field type="date"</code>: the event form and the reservation dialog. The handheld
      has no date field; it picks days from its calendar sheet and times from a list. <code>type="time"</code> and{' '}
      <code>datetime-local</code>, both in the live example, are not used anywhere.
    </>
  ),
  mui: [],
  useFor: [
    'A date in a form where any day is valid: when an event is, when a party wants a table.',
    'Dates a long way off, where a month grid would take many taps.',
  ],
  dontUseFor: [
    'Moving between the operation\'s days (the tee sheet, reservations, orders): use Date Picker, which marks days with bookings.',
    'A time: tee times and reservation times come from a list on the interval (a select on the tablet, a picker sheet on the handheld).',
    'A date and time together (datetime-local): split it, and pick the time from a list.',
    'Birthdays, for now: the customer forms take them as text (see Decisions).',
  ],
  inBirdie: [
    {
      label: 'A new event, tablet',
      caption: (
        <>
          The event form puts Date beside Expected players and the green fee: a <code>Field type="date"</code> that opens the
          device's date control.
        </>
      ),
      storyId: 'v1-→-v2-migration-15-·-events-tablet--a-new-event',
    },
    {
      label: 'Making a reservation, tablet',
      caption: (
        <>
          One row: Date (a date field), Time (a select of the dining room's times), Party (a stepper). Three controls, three
          kinds of value, none of them typed except the date.
        </>
      ),
      storyId: 'v1-→-v2-migration-8-·-reservations-tablet--making-a-reservation',
    },
    {
      label: 'Not this: the tee sheet\'s day',
      caption: (
        <>
          The handheld's calendar sheet, and the tablet's date popover, mark days with bookings and grey out days outside the
          range. A date field can't. That is the Date Picker.
        </>
      ),
      shot: 'mobile-date-navigation',
      frame: 'handheld',
      handheldRoute: 'weston-edits-9-·-date-navigation-mobile--calendar-sheet',
    },
    {
      label: 'Not this: a tee time',
      caption: (
        <>
          The handheld's time note and price override pick a tee time from a sheet of the day's times (<code>PickerField</code>).
          A typed time could fall between two tee times.
        </>
      ),
      shot: 'ds-mobile-time-note',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--time-note',
    },
  ],
  birdie: [
    { name: 'Field type="date"', file: 'src/pos/modals/EventFormDialog.tsx', use: 'a date in a tablet form: the event form and ReservationDialog.tsx.', surface: 'tablet' },
    { name: 'DatePickerPopover', file: 'src/pos/components/DatePickerPopover.tsx', use: "the operation's day on the tablet: a month grid with booking dots. See Date Picker.", surface: 'tablet' },
    { name: 'CalendarSheet', file: 'src/pos/mobile/screens/tee/DateNavigation.tsx', use: "the operation's day on the handheld, beside the week strip. See Date Picker.", surface: 'handheld' },
    { name: 'PickerField', file: 'src/pos/mobile/screens/people/parts.tsx', use: 'a tee time from a list, in a handheld form.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Label', description: 'Field\'s label above: "Date".' },
    { part: 'Value', description: 'The date in the device\'s format, with its calendar button.' },
    { part: 'Device control', description: 'The browser\'s or the system\'s own date picker, opened from the field.' },
  ],
  variants: [
    { name: 'Date (type="date")', use: 'Event and reservation dates.', avoid: 'The tee sheet\'s day.' },
    { name: 'Time (type="time")', use: 'Nothing in Birdie.', avoid: 'Always: times come from a list.' },
    { name: 'Date and time (datetime-local)', use: 'Nothing in Birdie.', avoid: 'Always.' },
    { name: 'Date as text', use: 'Birthdays on the customer forms, "MM/DD/YYYY". Not validated.', avoid: 'New fields; see the open decision.' },
  ],
  states: [
    { state: 'Default', tablet: "Field's outline with the device's date text and calendar icon.", handheld: 'Not used.' },
    { state: 'Open', tablet: "The device's date control.", handheld: '—' },
    { state: 'Focus', tablet: 'Field\'s outline turns brand green.', handheld: '—' },
  ],
  sizing: [
    { surface: 'Tablet', size: "Field's size: about 46px tall.", why: 'It sits in a row of dialog fields.' },
    { surface: 'Handheld', size: 'Not used.', why: 'Days come from the calendar sheet; there is no date to type.' },
  ],
  behavior: [
    'The value is an ISO date string (YYYY-MM-DD), saved with the dialog.',
    'Nothing limits the range today: an event date can be in the past. The Date Picker limits its days to a year either side of today.',
    'Times are chosen from the interval (the course\'s tee interval, the dining room\'s slots for reservations), so a booking always lands on a real slot.',
  ],
  content: ['Label it "Date". The dialog\'s title says what the date is for.'],
  dos: [
    'Use a date field for a one-off date in a form.',
    'Use the Date Picker to move between the days the operation runs.',
    'Pick times from a list.',
  ],
  donts: [
    'Type a time.',
    'Use a date field where days with bookings matter.',
    'Ask for the same kind of date two ways. Birthdays are text; event dates are a date field.',
  ],
  a11y: [
    'The device\'s date control brings its own keyboard and screen reader support.',
    'The tablet\'s date field inherits Field\'s gap: the label "Date" is not bound to the input (see Text Field).',
    <>Contrast is the field's: the value <Contrast fg={md3.onSurface} bg="#ffffff" />, the label <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.</>,
  ],
  decisions: [
    {
      decision: 'The operation\'s days use a hand-built calendar',
      why: 'The tee sheet\'s picker is "a hand-built month grid rather than MUI X\'s DateCalendar, for one reason: days that have bookings get a dot" (DatePickerPopover.tsx). A date field can\'t show that.',
    },
    {
      decision: 'Times are picked, not typed',
      why: 'A tee time exists only on the course\'s interval, and a reservation only in the dining room\'s slots. A list of real times can\'t produce one that doesn\'t exist.',
    },
    {
      decision: 'Open: birthdays',
      why: 'The customer forms take a birthday as free text ("MM/DD/YYYY", optional) with no check. Either a date field, or a validated text field with the format in the hint. To decide.',
    },
  ],
  engineering: {
    import: `import { Field } from '../modals/ModalFrame';
// <Field label="Date" type="date" value={date} onChange={setDate} />`,
    themeOverride: <>None. The native date input is styled by the device; Field supplies the outline and label.</>,
    notes: [
      <>The value is <code>YYYY-MM-DD</code>. Parse it as a local date, not with <code>new Date(string)</code>, which reads it as UTC.</>,
      <>MUI X Date Pickers are installed (<code>@mui/x-date-pickers</code>) but no Birdie screen imports them.</>,
    ],
    snippet: `<Stack direction="row" gap={1.5} alignItems="flex-end">
  <Field label="Date" type="date" value={date} onChange={setDate} />
  <SelectField label="Time" value={timeMin} onChange={setTimeMin}
    options={times.map((t) => ({ label: formatTimeLabel(t), value: t }))} />
</Stack>`,
  },
  related: [
    { name: 'Date Picker', id: 'components-forms-date-picker' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Input Number', id: 'components-forms-input-number' },
  ],
};

export default doc;
