import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` laid over `bg` at `alpha`, as one hex: the colour a tinted fill actually paints, so it can be measured. */
const tint = (fg: string, alpha: number, bg = '#ffffff') => {
  const ch = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [f, b] = [ch(fg), ch(bg)];
  return `#${f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
};

/**
 * Radio Buttons — exactly one from a visible set. Birdie draws the round mark itself in the dish
 * dialog and uses MUI's Radio in handheld lists; on the tablet, short one-of choices are segmented
 * pills with radio semantics.
 */
const doc: DsDoc = {
  summary: (
    <>
      A round mark that means <strong>"exactly one of these"</strong>: a steak's temperature, 9 or 18 holes, walk or
      cart, where a player is in their round. Picking one replaces the last. Birdie uses the idea everywhere but draws it
      three ways: <strong>round marks</strong> in the dish dialog's "Choose one" groups on both surfaces,{' '}
      <strong>MUI's Radio</strong> at the end of handheld list rows, and <strong>segmented pills</strong> for two or three
      short options on the tablet.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Used on both surfaces. MUI's <code>Radio</code> only appears on the handheld (the usage pills below), but the tablet
      has the same job done by Birdie's own components: the dish dialog's "Choose one" groups, the player rows'{' '}
      <code>Seg</code> (9 | 18, Walk · Ride · Push) and <code>PillGroup</code> in dialogs.
    </>
  ),
  mui: ['Radio'],
  useFor: [
    'Exactly one of a few options that should all be seen: temperature, holes, transport.',
    'A required choice before something can be made: a dish can\'t go to the kitchen without its temperature.',
    'A list where the current state is one row of several: round status, pay now or later.',
  ],
  dontUseFor: [
    'Any number of options: use Checkbox.',
    'More than about seven, or a list that changes: use Select.',
    'On / off: use Switch.',
    'Switching views or filters in a toolbar: use Toggle Button or Tabs.',
  ],
  inBirdie: [
    {
      label: 'Temp · Choose one, tablet',
      caption: (
        <>
          The dish dialog's required groups. Round marks in tiles, three to a row; <strong>Required</strong> stays red until
          answered, and the footer says what is missing: "Choose temp and sides".
        </>
      ),
      shot: 'tablet-dish-dialog',
      storyId: 'prototypes-tablet-quick-order-menu-photography--the-dish-dialog',
    },
    {
      label: 'Temp · Choose one, handheld',
      caption: (
        <>
          The same group as a full-width list: five rows, round marks, 52dp each. <strong>Add to Seat 1</strong> stays
          disabled, and the bar above it says "Choose temp".
        </>
      ),
      shot: 'ds-mobile-dish-dialog',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--the-dish-dialog',
    },
    {
      label: 'Round status, handheld',
      caption: (
        <>
          A player's place in the round as a list with a radio at the end of each row. Steps already passed show a green
          check instead of an empty radio.
        </>
      ),
      handheldRoute: 'mobile-screens-3-·-booking-check-in--player-detail',
    },
    {
      label: 'Holes and transport, tablet',
      caption: (
        <>
          Each player row has two segmented controls, <strong>9 | 18</strong> and <strong>Walk · Ride · Push</strong>. One
          segment is always on, and it fills dark. Changing it reprices the seat at once.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
  ],
  birdie: [
    {
      name: 'Dish option (Choose one)',
      file: 'src/pos/modals/DishDialog.tsx',
      use: 'a modifier group whose select is "one". role="radio" in a role="radiogroup", with a drawn round Mark. The handheld twin is in DishScreen.tsx.',
      surface: 'both',
    },
    {
      name: 'Seg',
      file: 'src/pos/components/Touch.tsx',
      use: 'two or three short options inside a row (9 | 18, Walk · Ride · Push). Each segment a full touch target.',
      surface: 'tablet',
    },
    {
      name: 'PillGroup',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'a one-of choice in a tablet dialog ("This time only / A range of times"). Also does many with `multi`.',
      surface: 'tablet',
    },
    {
      name: 'Radio list row',
      file: 'src/pos/mobile/screens/tee/PlayerDetailScreen.tsx',
      use: 'a one-of list on the handheld: ListItemButton with a trailing Radio. Also TransportList and the PickerField sheet.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Mark', description: 'A circle; when on, a dot inside. 20px drawn in the dish dialog, 24px MUI on the handheld. Segmented controls have no mark: the fill is the state.' },
    { part: 'Label', description: 'The option: "Medium rare", "18", "Cart". Short.' },
    { part: 'Trailing detail (optional)', description: 'A price ("+$1.50") or a second line.' },
    { part: 'Group heading', description: 'The group name and "Choose one". "Required" on the right when the choice can\'t be skipped.' },
  ],
  variants: [
    {
      name: 'Option tiles (dish dialog)',
      use: 'Modifier groups: temperature, sides, cheese. Tiles on the tablet, rows on the handheld.',
      avoid: 'Settings. Tiles are for a server ordering in a hurry.',
    },
    {
      name: 'Seg (tablet)',
      use: 'Two or three options inside a row: holes, transport. A word or a number, with an optional icon.',
      avoid: 'Labels longer than a word. Use PillGroup or tiles.',
    },
    {
      name: 'PillGroup, single (tablet)',
      use: 'A one-of choice at the top of a dialog section: "This time only / A range of times", refund reason.',
      avoid: 'More than five options.',
    },
    {
      name: 'Radio list (handheld)',
      use: 'A one-of list with icons or second lines: round status, transport, a PickerField sheet.',
      avoid: 'Two options. Use a segmented button.',
    },
    {
      name: 'Segmented button (handheld)',
      use: 'Two to five short options across the full width: "This time / A range", Guest or Member.',
      avoid: 'Options that need a second line.',
    },
  ],
  states: [
    { state: 'Off', tablet: 'Grey ring (dish tiles), or an outlined pill.', handheld: 'Grey ring, 24px.' },
    { state: 'On', tablet: 'Green ring with a green dot, green edge and wash on the tile; a dark fill on Seg; green outline and tint on PillGroup.', handheld: 'Green ring and dot. The dish row takes a faint green wash.' },
    { state: 'Required, unanswered', tablet: 'A red "Required" chip on the group, and the dialog\'s main button disabled with the reason beside it.', handheld: 'Same chip; the reason sits in the bottom bar.' },
    { state: 'Required, answered', tablet: 'The chip turns green with a check.', handheld: 'Same.' },
    { state: 'Option that can\'t apply', tablet: 'Left out rather than greyed: a seat that can\'t switch to 9 holes is offered 18 only. A seat that is paid dims the whole control and stops taking taps.', handheld: 'The row greys.' },
  ],
  sizing: [
    { surface: 'Tablet', size: 'Dish tiles 48px; Seg 37px tall, 44px wide at least; PillGroup pills at 12px bold', why: 'The player rows and dish tiles are touched, not clicked, so they are near touch size. PillGroup sits in dense dialogs worked with a mouse.' },
    { surface: 'Handheld', size: '52dp dish rows; 56dp list rows; 40dp segmented buttons', why: "Material's sizes, with the row as the target." },
  ],
  behavior: [
    'Picking an option replaces the group\'s previous one.',
    'Tapping the chosen option again clears it, but only in an optional group (no protein on the salad after all). In a required group it stays: a steak with no temperature should not be possible by accident.',
    'A required group blocks the dialog\'s main action until answered, and the footer names what is missing in words.',
    'On the handheld, the row is the target. The radio inside is out of the tab order.',
    'A choice in a list (round status, transport) applies at once. A choice in a dialog applies with the dialog.',
  ],
  content: [
    'Say the rule: "Choose one". With "Required" when it is.',
    'Options are short and parallel: Rare, Medium rare, Medium. No sentences.',
    'Order options the way people think of them (rare to well done), not alphabetically.',
  ],
  dos: [
    'Show every option. A radio group is only useful when the choices are visible.',
    'Use a round mark for one-of and a square for any-of, on both surfaces.',
    'Pre-select only when there is a real default ("This time only", the booking\'s holes). Never pre-select a temperature.',
    'Name the group for screen readers: aria-label on the radiogroup.',
  ],
  donts: [
    'A radio that behaves like a checkbox. v1 did, and staff ended up with rare and well done on one burger.',
    'Radios for on/off.',
    'A single radio on its own.',
    'Long option labels in Seg. It is for a word or a number.',
  ],
  a11y: [
    <>
      Dish groups are <code>role="radiogroup"</code> named after the group, each option <code>role="radio"</code> with{' '}
      <code>aria-checked</code>. Screen readers hear one-of where the eye sees it.
    </>,
    <>
      <code>Seg</code> is a named <code>role="group"</code> of buttons with <code>aria-pressed</code>. The chosen one is
      announced as pressed, but not as one of a set. The base edition's <code>Segmented</code> (
      <code>PlayerRows.tsx</code>) used <code>role="radio"</code>, which says more; worth bringing back.
    </>,
    <>
      <strong>Gap:</strong> those radiogroups are built from buttons, so every option is a tab stop and the arrow keys do
      nothing. A native radio group moves between options with the arrows. Fine for touch; worth fixing for keyboards.
    </>,
    <>
      <strong>Gap:</strong> <code>PillGroup</code> sets no role or state at all. A screen reader hears a row of plain
      buttons and can't tell which is chosen. Add <code>role="radio"</code> and <code>aria-checked</code> (or{' '}
      <code>aria-pressed</code> when <code>multi</code>).
    </>,
    <>
      Contrast, computed: the chosen <code>PillGroup</code> label is{' '}
      <Contrast fg={md3.primary} bg={tint(md3.primary, 0x1f / 255)} label="Aa" /> at 12px bold, under AA. The chosen{' '}
      <code>Seg</code> label passes easily: <Contrast fg="#ffffff" bg={md3.onSurface} label="18" />. The dish
      dialog's ring <Contrast fg={md3.outline} bg="#ffffff" size="non-text" /> and green dot{' '}
      <Contrast fg={md3.primary} bg="#ffffff" size="non-text" /> meet 3:1.
    </>,
  ],
  decisions: [
    {
      decision: 'A group says what it is',
      why: (
        <>
          v1 drew every option as a radio and let them all be on. The fix is a <code>select: 'one' | 'many'</code> on every
          modifier group (<code>data/menu.ts</code>) and one rule for what a tap does (<code>logic/dish-choice.ts</code>),
          shared by both surfaces.
        </>
      ),
    },
    {
      decision: 'Optional one-of groups can be cleared',
      why: 'A native radio can\'t be unchosen. A server who taps a protein by mistake needs to undo it without a "None" option in every group.',
    },
    {
      decision: 'Required groups block, and say so',
      why: 'A dish is complete before it is on the order, so Send never has to refuse one. The footer\'s "Choose temp and sides" replaces a button that fails silently.',
    },
    {
      decision: 'Segmented controls inside the player rows',
      why: (
        <>
          Weston on the player rows: the counter conversation is "Walking or riding? 9 or 18? … it just has to be fast" (
          <code>PlayerRowsV2.tsx</code>). The answers sit in the row, always visible, one tap each; a select would hide
          them.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Chosen ring and dot, chosen edge' },
    { token: 'md3.outline', value: '#707973', role: 'Unchosen ring (dish dialog)' },
    { token: 'md3.onSurface', value: '#191d19', role: 'Chosen fill on Seg' },
    { token: 'md3.error', value: '#ba1a1a', role: '"Required" text and the missing-choice prompt' },
    { token: 'radius.xl', value: '28px', role: 'PillGroup pills' },
  ],
  engineering: {
    import: `import { Radio } from '@mui/material';                        // handheld list rows
import { PillGroup } from '../modals/ModalFrame';               // tablet dialogs
import { Seg } from '../components/Touch';                     // tablet, inside a row`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiRadio</code>: size <code>small</code>, 6px padding. The handheld theme sets size{' '}
        <code>medium</code>.
      </>
    ),
    notes: [
      <>
        One-of logic for dishes lives in <code>chooseOption()</code> (<code>src/pos/logic/dish-choice.ts</code>): replace in
        the group, clear on a second tap unless required. Use it rather than writing the rule again.
      </>,
      <>
        <code>Seg</code> requires a <code>label</code> (its group's accessible name): use the player's name and the
        question, "Foster, A.: holes".
      </>,
      <>
        Missing required groups come from <code>missingRequired()</code> (<code>data/menu.ts</code>) and the sentence from{' '}
        <code>missingPrompt()</code>: "Choose temp and sides".
      </>,
    ],
    snippet: `<Seg
  label={\`\${name}: holes\`}
  value={holes}
  options={[{ value: 9, label: '9' }, { value: 18, label: '18' }]}
  onChange={(h) => patch(setPlayerHoles(booking, i, h))}
/>`,
  },
  related: [
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'Switch', id: 'components-forms-switch' },
    { name: 'Form', id: 'components-forms-form' },
  ],
};

export default doc;
