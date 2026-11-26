import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Stepper — Birdie draws one real stepper (New tee time: Type → Rate → Details) and retired a
 * second (the five-stop round rail) for a status chip on Oct 2. The page says why, and when a
 * stepper is still the right tool.
 */
const doc: DsDoc = {
  summary: (
    <>
      A row of numbered steps that shows where you are in a short sequence. Birdie has <strong>one</strong>: the{' '}
      <strong>New tee time</strong> dialog on the tablet, Type → Rate → Details, because each answer changes the next. It
      had a second, the five-stop <strong>round rail</strong> on every player card (Not arrived → Finished), and replaced it
      with a <strong>status chip</strong> in V1 → V2: a player's progress is a status you change, not a sequence you walk.
      The handheld has no steppers at all.
    </>
  ),
  status: 'in-use',
  statusNote: (
    <>
      On the tablet, as a Birdie-drawn step header in the New tee time dialog (<code>src/pos/modals/Booking.tsx</code>). MUI's{' '}
      <code>Stepper</code> isn't imported. The round rail survives only in older editions and the Booking Detail dialog.
    </>
  ),
  mui: ['Stepper'],
  useFor: [
    'A short, linear sequence in one dialog where each answer narrows the next: walk-in or reservation → a rate → the party.',
    'Three or four steps, each one screenful, with Back available.',
  ],
  dontUseFor: [
    'Status that moves on its own and can be corrected (a player’s round): a status chip that opens a menu.',
    'A long form: sections on one scrolling screen, so every choice is visible at once (the handheld’s League form).',
    'The handheld: each step is its own screen with a back arrow, and the title says where you are.',
    'A count you change by one (players, guests): that’s a count stepper (− n +), on the Input Number page.',
  ],
  inBirdie: [
    {
      label: 'New tee time, tablet',
      caption: (
        <>
          Click an open cell on the tee sheet. The dialog opens on step 1, <strong>Type</strong>: Walk-in or Reservation.
          Picking one moves to <strong>Rate</strong>, then <strong>Details</strong>, where the party size arrives pre-filled
          from the cell you clicked. Done steps turn green with a check.
        </>
      ),
      shot: 'ds-tablet-new-booking-steps',
      tabletHash: '#/tee-sheet?modal=new-booking&course=champ-front&t=1144&slot=0',
      storyId: 'tee-sheet-actions-1-·-create--new-booking',
    },
    {
      label: 'The rail it replaced: a status chip',
      caption: (
        <>
          Each player card in the reservation panel ends its name line with one chip: <strong>Finished ▾</strong>. Tap it to
          check someone in or move them along. It used to be a five-stop rail at the foot of the card, its tallest part.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Before and after, side by side',
      caption: (
        <>
          The Oct 1 proposal: the rail on the left, the chip on the right. Weston on the rail: "it does take up a lot of
          space… we could still show the status and maybe they could click on it and change it." Approved Oct 2.
        </>
      ),
      storyId: 'v1-→-v2-migration-100126-2-·-status-chip-instead-of-the-stepper--proposal',
    },
  ],
  birdie: [
    {
      name: 'NewBooking step header',
      file: 'src/pos/modals/Booking.tsx',
      use: 'the one stepper: three numbered circles joined by a line, inside the New tee time dialog.',
      surface: 'tablet',
    },
    {
      name: 'RoundStatusChip',
      file: 'src/pos/components/SeatChips.tsx',
      use: 'a player’s place in the round, as one chip that opens a menu of the five steps. Use this, not a rail.',
      surface: 'tablet',
    },
    {
      name: 'RoundRail',
      file: 'src/pos/components/BookingTabs.tsx',
      use: 'the retired five-stop rail. Still in the Booking Detail dialog and Weston Edits’ player rows; don’t add it anywhere new.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Step circle', description: '28px. Upcoming: grey with its number. Current: mint fill, green ring and number. Done: solid green with a check.' },
    { part: 'Connector', description: 'A 2px line between circles, green once the step before it is done.' },
    { part: 'Step label', description: 'One word under each circle ("Type", "Rate", "Details"), 10px bold; dark for the current step, grey otherwise.' },
    { part: 'Footer', description: 'Back (from step 2), Cancel, and the final action on the last step only ("Create booking").' },
  ],
  variants: [
    {
      name: 'Linear step header',
      use: 'New tee time: three steps, forward by answering, Back to change an answer.',
      avoid: 'More than four steps, or steps that don’t depend on each other.',
    },
    {
      name: 'Clickable progress rail (retired)',
      use: 'Nothing new. It showed five round stages and let staff jump to any of them.',
      avoid: 'Status. It cost a third of the card’s height to say one word.',
    },
    {
      name: 'Status chip (the replacement)',
      use: 'Where something is in a process it can move through in any order: Checked in, Teed off, Finished.',
      avoid: 'A sequence the operator has to complete in order.',
    },
  ],
  states: [
    {
      state: 'Upcoming',
      tablet: <>Grey circle (surfaceContainer) with the step number, grey label. Not clickable.</>,
      handheld: 'Not used on the handheld.',
    },
    { state: 'Current', tablet: 'Mint circle, green ring and number, dark label. The body below is this step’s question.' },
    { state: 'Done', tablet: 'Solid green circle with a check; the connector after it turns green. Reached again with Back.' },
    { state: 'Last step', tablet: 'The footer shows the final action ("Create booking") beside Cancel. Earlier steps advance by choosing, not by Next.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '28px circles, 10px labels, inside a dialog', why: 'A compact header that leaves the dialog’s height for the question being asked.' },
    { surface: 'Handheld', size: 'Not used', why: 'One step per screen, with a back arrow, is how the handheld does sequences (checkout → tip → reader → receipt).' },
  ],
  behavior: [
    'Steps advance by answering: choosing Walk-in moves to Rate. There is no Next button to press after making a choice.',
    'Back returns one step and keeps the answers given. Cancel abandons the whole booking.',
    'The final action appears only on the last step, and names what it creates.',
    'A player’s round is not a sequence: it can be corrected, skipped forward, or set after the fact. That’s why it became a chip with a menu.',
  ],
  content: [
    'Step labels are one noun each: Type, Rate, Details.',
    'In this codebase "stepper" also means the − n + count control (CountStepper, the restaurant Stepper). Say "step header" for this one, "count stepper" for that one.',
  ],
  dos: [
    'Keep a stepper to three or four steps in one dialog.',
    'Advance on the answer itself, and keep Back.',
    'Use a status chip for progress that can move in any order.',
  ],
  donts: [
    'Use a step rail to show status.',
    'Turn a long form into a wizard; use sections.',
    'Put a stepper on the handheld.',
  ],
  a11y: [
    'The step header is drawn with boxes and has no semantics: nothing tells a screen reader "Step 1 of 3, Type". Add visually hidden text or aria-current="step" on the current step.',
    <>
      Contrast, computed. The current step's number is <Contrast fg={md3.primary} bg={md3.primaryContainer} label="1" />, which{' '}
      <strong>fails</strong> at 12px; the upcoming labels are <Contrast fg={md3.outline} bg="#ffffff" label="Rate" /> at 10px,
      just under AA. The done step's check is <Contrast fg="#ffffff" bg={md3.primary} size="non-text" />, which passes as an
      icon. Darker numbers (onPrimaryContainer) would fix the first.
    </>,
    'The status chip that replaced the rail is a real button with an aria-label ("Foster, A.: Finished. Change") and aria-expanded, and its options are menu items.',
  ],
  decisions: [
    {
      decision: 'New tee time is a stepper',
      why: 'From the code comment: walk-in versus reservation decides whether payment is due now, the rate decides the hole count and price, and only then does the party matter. Each answer narrows the next.',
    },
    {
      decision: 'A status chip instead of the round rail (Oct 1 proposal 2, approved Oct 2)',
      why: 'Weston: "it does take up a lot of space… we could still show the status and maybe they could click on it and change it." The card lost about a third of its height and kept the status.',
    },
    {
      decision: 'No wizards on the handheld',
      why: 'From the League form: "the longest form in the app, so it’s a full-screen dialog with sections rather than a wizard. Every choice is visible at once."',
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Done circle, current ring, connector once done' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Current circle fill' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Upcoming circle fill' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Upcoming ring and connector' },
  ],
  engineering: {
    import: `import { RoundStatusChip } from '../components/SeatChips'; // status, not steps`,
    themeOverride: <>None. There is no <code>MuiStepper</code> entry; the step header is styled in place.</>,
    notes: [
      <>
        If a second stepper is ever needed, lift the step header out of <code>NewBooking</code> into a small component rather
        than drawing it again, and give it the semantics it lacks. MUI's <code>Stepper</code> would also do, themed to match.
      </>,
      <>
        <code>RoundStatusChip</code> takes <code>step</code>, <code>label</code> (the player's name, for the aria-label) and{' '}
        <code>onStep</code>. The steps come from <code>ROUND_STEPS</code> in <code>src/pos/data/config.ts</code>.
      </>,
    ],
    snippet: `{v1v2 && !p.noShow && (
  <RoundStatusChip
    step={p.step}
    label={name}
    onStep={(step) => patch({ playerStates: b.playerStates.map((x, j) => (j === i ? { ...x, step } : x)) })}
  />
)}`,
  },
  related: [
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Input Number', id: 'components-forms-input-number' },
    { name: 'Progress Indicators', id: 'components-feedback-status-progress-indicators' },
  ],
};

export default doc;
