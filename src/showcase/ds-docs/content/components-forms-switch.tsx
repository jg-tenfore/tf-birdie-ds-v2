import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/** `fg` drawn at `alpha` over `bg`, as hex: MUI draws the off track in black at 38%. */
const over = (fg: string, bg: string, alpha: number) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(alpha * parseInt(fg.slice(i, i + 2), 16) + (1 - alpha) * parseInt(bg.slice(i, i + 2), 16)).toString(16).padStart(2, '0'))
    .join('');

/** Switch: a setting that is on or off and applies the moment it changes. */
const doc: DsDoc = {
  summary: (
    <>
      An on/off setting that takes effect the moment it changes: compact rows on the tee sheet, a table out of service, a tab
      whose check has been asked for. There is no Save. Birdie uses the themed MUI <code>Switch</code> on both surfaces, in a{' '}
      <strong>row</strong>: a label (and usually a line saying what it does) on the left, the switch on the right. The{' '}
      <strong>tablet</strong> draws it small, beside 13px text. The <strong>handheld</strong> makes the whole row the target,
      the MD3 list pattern.
    </>
  ),
  statusNote: (
    <>
      Used on both surfaces, in a handful of places. Tablet: the tee sheet settings (the tune button's panel, and Settings › Tee
      sheet, which shows the same panel), the table chart's Out of service, and Settings › Clover. Handheld: Tee sheet &amp;
      courses, a tab's Check requested, and a player's Paid and No-show.
    </>
  ),
  mui: ['Switch'],
  useFor: [
    'A setting that applies at once and stays: Compact rows, Hide empty rows, Colourblind mode.',
    "A state of one thing that can be flipped back: a table out of service, a tab's check requested.",
    'A course on or off the tee sheet, or locked against new bookings (handheld course settings).',
  ],
  dontUseFor: [
    'Choosing between two named options (9 or 18, Walk or Ride): use Toggle Button.',
    'A choice that waits for Save or Apply: use Checkbox.',
    'Anything that moves money or sends to the kitchen: use a Button, with a confirm where it cannot be undone.',
    "Picking items from a list (tenders, categories): use chips or checkboxes. Settings › Payments shows Buck's tenders as On/Off chips, read-only.",
  ],
  inBirdie: [
    {
      label: 'Tee sheet settings, tablet',
      caption: (
        <>
          Settings › Tee sheet: Density and Behaviour are switch rows, a bold label over a grey line saying what it does. "Live:
          each change applies to the sheet at once." The Grid group in between uses segmented buttons, because those settings
          have more than two values.
        </>
      ),
      shot: 'ds-tablet-tee-sheet-settings',
      tabletHash: '#/settings?section=teesheet',
    },
    {
      label: 'Tee sheet & courses, handheld',
      caption: (
        <>
          The same four settings as MD3 list rows. The whole row is the target, so a thumb can tap the words. The labels differ
          from the tablet's: "Jump to now" here, "Auto-scroll to now" there.
        </>
      ),
      shot: 'ds-mobile-course-settings',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-6-·-operations--course-settings',
    },
    {
      label: 'Out of service, table chart',
      caption: (
        <>
          A switch in a 44px bordered row. When the table has an open tab, the switch is disabled and the reason sits under it in
          red: "It can go out of service once the tab is paid or moved."
        </>
      ),
      storyId: 'v1-→-v2-migration-10-·-table-chart-tablet--the-inspector',
    },
    {
      label: 'Check requested, handheld',
      caption: (
        <>
          In a tab's options sheet. It marks the tab on the floor and in the list. Here only the switch takes the tap, not the
          row.
        </>
      ),
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--tab-options',
    },
    {
      label: 'Paid and No-show, handheld',
      caption: (
        <>
          Player detail: two switch rows. No-show uses the error colour. Each tap updates the player and says so in a toast.
        </>
      ),
      handheldRoute: 'mobile-screens-3-·-booking-check-in--player-detail',
    },
    {
      label: 'Clover, tablet',
      caption: (
        <>
          Three switches for a course still running a Clover device. Rarely used, and marked so. Nothing reads them yet; each
          change shows a toast.
        </>
      ),
      storyId: 'v1-→-v2-migration-18-·-settings-tablet--clover',
    },
  ],
  birdie: [
    {
      name: 'ToggleRow',
      file: 'src/pos/components/TeeSheetSettingsPanel.tsx',
      use: 'a tablet setting row: 13px label, 11px description, small switch on the right.',
      surface: 'tablet',
    },
    {
      name: 'SwitchRow',
      file: 'src/pos/mobile/screens/people/CourseSettingsScreen.tsx',
      use: 'a handheld setting row: the whole ListItemButton toggles; the switch is labelled and out of the tab order.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Label', description: 'What is on or off, as a noun phrase: "Compact rows", "Out of service".' },
    { part: 'Description (optional)', description: 'What it does, in one line: "30px rows, name only — fits a full day on screen".' },
    { part: 'Track', description: 'Brand green at half strength when on; black at 38% when off (MUI default).' },
    { part: 'Thumb', description: 'Brand green when on, white with a shadow when off. Error red for No-show.' },
    { part: 'Reason (when disabled)', description: "Under the row, in red: why it can't change now." },
  ],
  variants: [
    { name: 'Setting row', use: 'Settings that stay: tee sheet density and behaviour, course visibility.', avoid: 'A row with no label beside the switch.' },
    { name: 'State row', use: 'A state of one thing, flipped back and forth: Out of service, Check requested.', avoid: "States with consequences that can't be undone." },
    { name: 'Error colour', use: 'A negative state worth noticing when on: No-show (color="error").', avoid: 'Ordinary settings.' },
  ],
  states: [
    { state: 'Off', tablet: 'White thumb on a grey track.', handheld: 'Same, larger.' },
    { state: 'On', tablet: 'Green thumb on a pale green track. Some settings confirm with a toast ("Compact rows on").', handheld: 'Same; course settings change silently.' },
    { state: 'Hover', tablet: 'A faint halo around the thumb. Only the switch reacts, not the row.', handheld: 'No hover; the row ripples.' },
    { state: 'Focus', tablet: 'Focus-visible halo on the thumb.', handheld: 'The row takes focus; the switch is skipped (tabIndex -1).' },
    { state: 'Disabled', tablet: 'Faded, with the reason under the row (Out of service with an open tab).', handheld: "MUI's disabled style." },
  ],
  sizing: [
    {
      surface: 'Tablet',
      size: 'Small: 40×24px, a 24px target. The row is not a target.',
      why: 'Mouse-first rows of 13px text. But the tablet is a touchscreen too: Weston asked for the reservation panel\'s targets to be "as big as we can, just because we need to plan for those" (Player rows › Touch targets), and 24px is under the 40px floor in Touch.tsx. Open decision.',
    },
    {
      surface: 'Handheld',
      size: 'Medium: 58×38dp. In course settings the whole 56–72dp row is the target.',
      why: 'MD3: a list row with a trailing switch is tapped anywhere on the row. Check requested is the exception: only the 38dp switch.',
    },
  ],
  behavior: [
    'A switch applies at once. There is no Save, and nothing waits for one.',
    'Settings that change what the tee sheet looks like show the change straight away; some confirm with a toast.',
    'When a switch cannot change, it is disabled and the reason is said under it, never silently refused.',
    'Turning a switch back undoes it. If something cannot be undone, it is a button with a confirm instead.',
    'The tablet panel and Settings › Tee sheet are one component (TeeSheetSettingsBody), so the two places cannot disagree.',
  ],
  content: [
    'Label the thing, not the action: "Compact rows", not "Turn on compact rows".',
    'The description says what you will see: "Skip time rows with no bookings on any course".',
    'One name per setting on both surfaces. Today the tablet says "Auto-scroll to now" and the handheld "Jump to now" for the same setting.',
  ],
  dos: [
    'Put the label and the switch in one row, and make the row the target on the handheld.',
    'Give the switch an accessible name (aria-label = the label) when the label is not a <label>.',
    'Disable with a reason when the switch cannot change.',
  ],
  donts: [
    'A switch inside a form that has Save. Use a checkbox.',
    'A switch for two named options. Use a segmented toggle.',
    'Money behind a switch. Payments go through the register.',
  ],
  a11y: [
    <>
      <strong>Known gap: the tablet's tee sheet switches have no name.</strong> <code>ToggleRow</code> puts the label in a{' '}
      <code>Typography</code> beside the switch, with no <code>aria-label</code>, so a screen reader hears "switch, off" four times
      (checked in Settings › Tee sheet). Out of service, Clover and the handheld's SwitchRow pass the label as{' '}
      <code>aria-label</code>; ToggleRow should too.
    </>,
    'MUI renders a native checkbox with role="switch": Space toggles it, and the state is announced as on or off.',
    'Player detail\'s switches sit inside a ListItemButton with tabIndex -1 and no aria-label. The row is the button, but its pressed state is not announced. Add aria-pressed to the row, or label the switch and let it be the control.',
    <>
      Contrast, computed against white: the on thumb <Contrast fg={md3.primary} bg="#ffffff" size="non-text" />. The off track,
      black at 38%, is <Contrast fg={over('#000000', '#ffffff', 0.38)} bg="#ffffff" size="non-text" />, under the 3:1 a control's
      state needs; the off thumb is white on white with only a shadow. MUI's default. MD3's switch outlines the off track in{' '}
      <code>outline</code> (<Contrast fg={md3.outline} bg="#ffffff" size="non-text" />). Open decision.
    </>,
    'Targets: 24px on the tablet is below Birdie\'s own 40px touch floor. Making the whole ToggleRow clickable (a FormControlLabel, or the row as a ButtonBase) fixes target and name together.',
  ],
  decisions: [
    {
      decision: 'Switches apply at once',
      why: 'Settings › Tee sheet says it: "live: each change applies to the sheet at once". Sections with typed values (register name, tips) save as a whole instead, with Save and Discard.',
    },
    {
      decision: 'One settings body, two places',
      why: "The tee sheet's tune button and Settings › Tee sheet render the same TeeSheetSettingsBody, so a setting can't be one value in one place and another in the other.",
    },
    {
      decision: 'The whole row on the handheld',
      why: 'MD3 list rows with a trailing switch toggle from anywhere on the row; a thumb hits words more often than a 38dp switch. SwitchRow takes the switch out of the tab order so the row is one stop.',
    },
    {
      decision: 'Open: Paid as a switch',
      why: "Player detail on the handheld marks a player paid with a switch, which records the state without taking a payment. Everywhere else money goes through the register. Decide whether this is a record-only correction (then say so on the row) or should hand over to checkout.",
    },
    {
      decision: 'Refuse with a reason',
      why: 'A table with an open tab cannot go out of service, because out of service would hide the seated party on the floor (floor-editor.ts). The switch is disabled and the sentence under it says what to do.',
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Thumb and track when on' },
    { token: 'md3.error', value: '#ba1a1a', role: 'No-show (color="error")' },
    { token: 'md3.outline', value: '#707973', role: 'Description text (tablet rows)' },
    { token: 'mobile.listItem', value: '56 / 72dp', role: 'Handheld row height, one or two lines' },
  ],
  engineering: {
    import: `import { Switch } from '@mui/material';`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiSwitch</code>: <code>size: 'small'</code> by default. <code>src/theme/mobile-theme.ts →
        MuiSwitch</code>: <code>size: 'medium'</code>. Colours are MUI's, from <code>palette.primary</code>.
      </>
    ),
    notes: [
      <>
        Name the switch: <code>slotProps={'{{'} input: {'{'} 'aria-label': label {'}'} {'}}'}</code>, as Out of service and Clover
        do.
      </>,
      <>
        On the handheld, copy <code>SwitchRow</code>: the row toggles, the switch gets <code>tabIndex={'{'}-1{'}'}</code> and{' '}
        <code>onClick={'{'}(e) =&gt; e.stopPropagation(){'}'}</code> so a tap on it doesn't toggle twice.
      </>,
      <>Settings live in the store (<code>patchSettings</code>), not in the component, so the tablet and the handheld read the same value.</>,
    ],
    snippet: `<Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
  <Box sx={{ flex: 1 }}>
    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Compact rows</Typography>
    <Typography sx={{ fontSize: 11, color: md3.outline }}>30px rows, name only — fits a full day on screen</Typography>
  </Box>
  <Switch checked={s.compactMode} onChange={(e) => set('compactMode', e.target.checked)}
    slotProps={{ input: { 'aria-label': 'Compact rows' } }} />
</Stack>`,
  },
  related: [
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Checkbox', id: 'components-forms-checkbox' },
    { name: 'Radio Buttons', id: 'components-forms-radio-buttons' },
    { name: 'List', id: 'components-layout-structure-list' },
  ],
};

export default doc;
