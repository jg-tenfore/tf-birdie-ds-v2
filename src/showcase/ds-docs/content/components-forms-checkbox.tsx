import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Checkbox — pick any number from a visible set. In Birdie it is the square mark that means "a tap
 * toggles this one and leaves the others alone", most importantly in a dish's "Choose any" groups.
 */
const doc: DsDoc = {
  summary: (
    <>
      A square mark that means <strong>"any of these, as many as you like"</strong>: the courses a block applies to, the
      players being checked in, a dish's add-ons. A tap toggles one item and leaves the others alone. Birdie uses it on
      both surfaces in two forms: <strong>MUI's Checkbox</strong> in lists (tee-sheet operations on the tablet, check-in
      and move lists on the handheld), and <strong>a drawn square</strong> in the dish dialog's "Choose any" groups, where
      it sits beside a drawn circle for "Choose one" so the two can't be confused.
    </>
  ),
  statusNote: (
    <>
      Used on both surfaces. MUI's <code>Checkbox</code> in the tablet's tee-sheet operations and the handheld's
      check-in and move lists; Birdie's own checkbox options in the dish dialog on both.
    </>
  ),
  mui: ['Checkbox'],
  useFor: [
    'Choosing any number from a short, visible list: courses, players, booking lines.',
    'A dish\'s "Choose any" group: add-ons, enhancements, allergies.',
    'Rows that are picked for an action that follows: check in these three, move these two.',
  ],
  dontUseFor: [
    'Exactly one of several: use Radio Buttons.',
    'A setting that takes effect at once: use Switch.',
    'Filters and tags that read as labels: use chips. See Multi-Select.',
    'Agreeing to terms. Nothing at the counter asks for it.',
  ],
  inBirdie: [
    {
      label: 'Courses in Block time, tablet',
      caption: (
        <>
          Under <strong>Courses</strong>, one MUI checkbox per visible course, both ticked by default. The block is applied
          to the ticked ones only. The same dialog uses pills for "This time only / A range of times".
        </>
      ),
      shot: 'ds-tablet-block-time',
      tabletHash: '#/tee-sheet?modal=block&t=0912',
    },
    {
      label: 'Choose any, handheld dish',
      caption: (
        <>
          <strong>Enhancements · Choose any</strong>: square marks, each with its price. Above it, <strong>Temp · Choose
          one</strong> uses round marks. Shape says what a tap will do before anyone taps.
        </>
      ),
      shot: 'ds-mobile-dish-dialog',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--the-dish-dialog',
    },
    {
      label: 'Who is here?, handheld check-in',
      caption: (
        <>
          A two-line list, a checkbox at the end of each row, and <strong>Select all</strong> in the section header. The
          whole row is the target; players who can't be checked in are disabled.
        </>
      ),
      handheldRoute: 'mobile-screens-3-·-booking-check-in--check-in',
    },
  ],
  birdie: [
    {
      name: 'Dish option (Choose any)',
      file: 'src/pos/modals/DishDialog.tsx',
      use: 'a modifier group whose select is "many". A ButtonBase with role="checkbox" and a drawn square Mark. The handheld twin is in DishScreen.tsx.',
      surface: 'both',
    },
    {
      name: 'Checkbox list row',
      file: 'src/pos/mobile/screens/tee/BookingActionScreen.tsx',
      use: 'picking rows for an action on the handheld: ListItemButton with a trailing Checkbox. Also MovePlayersScreen.tsx.',
      surface: 'handheld',
    },
    {
      name: 'Course checkboxes',
      file: 'src/pos/modals/TimeRow.tsx',
      use: 'the tablet tee-sheet operations (Block time, Move players): a bare MUI Checkbox beside the name.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Box', description: 'A square with rounded corners. MUI\'s icon in lists; a 20px drawn square with 5px corners in the dish dialog.' },
    { part: 'Tick', description: 'White on a green fill when on. On an allergy, the whole option fills red and the tick turns red on white.' },
    { part: 'Label', description: 'The thing chosen, not a sentence: "Oscar style", "Championship · Front 9".' },
    { part: 'Trailing detail (optional)', description: 'A price ("+$14.00"), a course and slot, a payment badge.' },
    { part: 'Group heading', description: '"Choose any" under the group name, so the rule is said before the first tap.' },
  ],
  variants: [
    {
      name: 'List checkbox (MUI)',
      use: 'Rows in a list or dialog where a later button acts on the ticked ones: check in, move, block.',
      avoid: 'A single checkbox that does something by itself. That is a Switch.',
    },
    {
      name: 'Option tile (dish dialog)',
      use: 'A "Choose any" modifier group. Tiles in a grid on the tablet, full-width rows on the handheld.',
      avoid: 'Anything outside a choice-of-options group. It is drawn to pair with its radio twin.',
    },
    {
      name: 'Alert group',
      use: 'Allergies: a red-edged group, and a chosen allergy fills solid red, as it does on the ticket.',
      avoid: 'Anything that is not a safety warning. Red means the kitchen must not miss it.',
    },
    {
      name: 'Select all',
      use: 'A text button in the section header when the list is the whole job ("Who is here?").',
      avoid: 'Lists of two. Tap both.',
    },
  ],
  states: [
    { state: 'Off', tablet: 'Dark grey outline (onSurfaceVariant). Dish tiles: grey outline, white tile.', handheld: 'Same, at 24px.' },
    { state: 'On', tablet: 'Green fill, white tick. Dish tiles also get a green edge and a faint green wash, and the label goes bold.', handheld: 'Same; the row takes the wash.' },
    { state: 'On, allergy', tablet: 'The tile fills solid red with white text.', handheld: 'The row fills solid red.' },
    { state: 'Disabled', tablet: 'Not used in tablet lists today.', handheld: 'The whole row greys: a player who has no-showed or has nothing to refund.' },
    { state: 'Indeterminate', tablet: 'Not used. Select all is a button, not a parent checkbox.', handheld: 'Not used.' },
    { state: 'Focus', tablet: "MUI's focus ripple on the box; the dish tile's ButtonBase focus ring.", handheld: 'The row takes focus, not the box.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '30px target (small, 6px padding); dish tiles 48px tall', why: 'Mouse-first lists stay dense. Dish tiles are larger: the whole tile, name and price, is the target.' },
    { surface: 'Handheld', size: '72dp list rows; 52dp dish rows; 24px box', why: "The row is the target, so the box can stay Material's standard size." },
  ],
  behavior: [
    'A tap toggles one item. Nothing else in the group changes.',
    'Ticking does not act. A button after the list does, and it says how many: "Move 2", "Check in 3".',
    "A required \"Choose any\" group counts as answered once one option is on; the dialog's add button waits until then and says why.",
    'Allergy choices travel with the dish: red on the line and on the kitchen ticket, not only in the dialog.',
    'On the handheld, the whole row toggles. The checkbox inside is out of the tab order and only shows the state.',
  ],
  content: [
    'Say the rule above the options: "Choose any". Never make people infer it from the marks alone.',
    'Labels are nouns, sentence case: "Blue cheese crust", not "ADD BLUE CHEESE CRUST".',
    'Prices on add-ons are signed and in the money format: "+$6.00".',
  ],
  dos: [
    'Use the square for any-of and the circle for one-of, on both surfaces.',
    'Put the count on the action that follows: "Move 2".',
    'Make the label clickable too. A 30px box alone is a small target.',
    'Show what is off-limits as disabled, with the reason in the row ("No-show").',
  ],
  donts: [
    'Checkboxes that act immediately. If ticking changes something, it is a Switch.',
    'A checkbox styled as a radio, or the reverse. That is the v1 bug this page exists to prevent.',
    'Red for anything that is not an allergy or a destructive warning.',
    'A wall of checkboxes. Over a dozen options, show the common few and a "more" control.',
  ],
  a11y: [
    <>
      Dish options carry <code>role="checkbox"</code> and <code>aria-checked</code> inside a <code>role="group"</code>{' '}
      named after the modifier group, so a screen reader hears "checkbox" exactly where the eye sees a square.
    </>,
    <>
      <strong>Gap, tablet:</strong> the course checkboxes in <code>TimeRow.tsx</code> sit beside their name as a separate{' '}
      <code>Typography</code>. The checkbox has no accessible name, and clicking the course name does nothing. Wrap them
      in <code>FormControlLabel</code>.
    </>,
    <>
      <strong>Gap, handheld:</strong> the list rows put a checkbox input inside a button (<code>ListItemButton</code>).
      The row works, but nested interactive controls are flagged by audit tools. A <code>role="checkbox"</code> row
      would be cleaner.
    </>,
    <>
      Contrast, computed: the unchecked box is <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" size="non-text" />, the
      dish tile's drawn box <Contrast fg={md3.outline} bg="#ffffff" size="non-text" />, and the green fill{' '}
      <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />. All meet the 3:1 a control needs.
    </>,
  ],
  decisions: [
    {
      decision: 'Square means any, circle means one',
      why: (
        <>
          v1 drew every dish option as a radio and toggled it like a checkbox, so a burger could be rare and well done at
          once. Its own comment called the mismatch "the reason staff tap an option twice" (<code>logic/dish-choice.ts</code>
          ).
        </>
      ),
    },
    { decision: 'Marks drawn, not borrowed', why: 'The dish dialog draws its square and circle rather than using two similar icons, "so the two cannot be confused" (DishDialog.tsx).' },
    { decision: 'The row is the target on the handheld', why: "A thumb finds a 72dp row, not a 24px box. Material's list-with-control pattern." },
    {
      decision: 'Open: courses are checkboxes on the tablet and chips on the handheld',
      why: (
        <>
          Block time picks courses with checkboxes on the tablet (<code>TimeRow.tsx</code>) and with filter chips on the
          handheld (<code>CourseChips</code>). Same job, two controls. Bring to Justin: chips on both, or checkboxes on
          both.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Checked fill, selected edge' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Unchecked box (MUI)' },
    { token: 'md3.outline', value: '#707973', role: 'Unchecked drawn box (dish dialog)' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Allergy group edge and chosen fill' },
    { token: 'radius.md', value: '12px', role: 'Dish option tiles' },
  ],
  engineering: {
    import: `import { Checkbox, FormControlLabel } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiCheckbox</code>: default size <code>small</code>, 6px padding, for a 30px target. The
        handheld theme (<code>src/theme/mobile-theme.ts</code>) sets size <code>medium</code>.
      </>
    ),
    notes: [
      <>
        Dish choices go through <code>chooseOption()</code> in <code>src/pos/logic/dish-choice.ts</code>. For a{' '}
        <code>many</code> group it toggles one option and leaves the rest. Don't reimplement it in a screen.
      </>,
      <>
        Tests read state from data attributes (<code>data-option</code>, <code>data-modifier-group</code>,{' '}
        <code>data-select</code>) and roles. Keep both when restyling.
      </>,
      <>The list pattern on the handheld sets <code>tabIndex={'{-1}'}</code> on the checkbox so the row is the only stop.</>,
    ],
    snippet: `// A labelled checkbox, the way TimeRow's course list should read
<FormControlLabel
  control={<Checkbox checked={on} onChange={(e) => toggle(course.id, e.target.checked)} />}
  label={course.name}
/>`,
  },
  related: [
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'Multi-Select', id: 'components-forms-multi-select' },
    { name: 'Switch', id: 'components-forms-switch' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Form', id: 'components-forms-form' },
  ],
};

export default doc;
