import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Floating Action Button — handheld only, always extended, always passed through MobileScreen's
 * `fab` slot. The page also records the one inconsistency: two FAB styles on three screens.
 */
const doc: DsDoc = {
  summary: (
    <>
      A floating button for the one thing a handheld list screen exists to start: <strong>New customer</strong> on People,{' '}
      <strong>New tab</strong> on Tabs, <strong>Add items</strong> on a tab. In Birdie a FAB is <strong>handheld only</strong>{' '}
      and <strong>always extended</strong>, an icon and a label, never a bare +. The tablet has none: its main actions live in
      fixed toolbars and dialog footers, where they can't cover the tee sheet.
    </>
  ),
  statusNote: (
    <>
      On three handheld screens (People, Tabs, a tab), all extended. Two styles are in use today, tonal and solid green; the
      tonal one is the recommendation (see Variants and Accessibility).
    </>
  ),
  mui: ['Fab'],
  useFor: [
    'The one create action on a handheld list: New customer, New tab.',
    'Adding to the thing on screen when the bottom bar is taken by money: Add items, above Send and Pay.',
  ],
  dontUseFor: [
    'The tablet: a ToolbarButton in the screen toolbar, or the dialog footer.',
    'Money or anything irreversible (Pay, Charge, Void): the pinned bottom bar, where the amount fits in the label.',
    'A second action on the same screen. One FAB per screen, or none.',
    'A fan of actions (speed dial): a bottom sheet.',
  ],
  inBirdie: [
    {
      label: 'New customer, People',
      caption: (
        <>
          The tonal FAB: primary container fill, dark green label, 56dp tall. Creating a person is a form you can abandon, so
          it opens a full-screen dialog rather than a page.
        </>
      ),
      shot: 'mobile-people',
      handheldRoute: 'mobile-screens-7-·-people--people-list',
    },
    {
      label: 'Add items, over a pinned bar',
      caption: (
        <>
          On a tab, <strong>Add items</strong> floats above <strong>Send 2</strong> and <strong>Pay</strong>.{' '}
          <code>MobileScreen</code> lifts it 80dp when a bottom bar is pinned, so the two never overlap, and ends the list with
          88dp of room so the total can scroll out from under it.
        </>
      ),
      shot: 'mobile-tab',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
    {
      label: 'New tab, open tabs',
      caption: (
        <>
          The list of open tabs, with <strong>New tab</strong> bottom-right: a tab with or without a table (a bar tab, a
          league's running tab). Solid green, 48dp, the second style in use.
        </>
      ),
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--open-tabs',
      storyId: 'prototypes-mobile-tabs-tabs-on-the-handheld--open-tabs',
    },
  ],
  birdie: [
    {
      name: 'MobileScreen (fab slot)',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'always. Pass the FAB as fab={…}: the screen places it 16dp from the edges, lifts it above a bottom bar, and adds the 88dp of scroll room.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Container', description: "A rounded square, 16px radius (radius.lg) from the handheld theme: MD3's FAB shape, not a circle. Shadow from the MuiFab override." },
    { part: 'Icon', description: '24dp, leading: Add for adding to something, PersonAddOutlined for a person.' },
    { part: 'Label', description: 'Verb and noun, sentence case: "New customer", "New tab", "Add items". 14px, weight 500.' },
    { part: 'Clearance', description: 'An 88dp spacer at the end of the scrolling body (56 tall + 16 off the edge + 16 clear), added by MobileScreen.' },
  ],
  variants: [
    {
      name: 'Extended, tonal',
      use: 'The recommended default. primaryContainer fill, onPrimaryContainer label. People uses it.',
      avoid: 'Nothing; it is the safe choice.',
    },
    {
      name: 'Extended, solid green',
      use: 'In use on Tabs and on a tab (color="primary").',
      avoid: 'White on green fails text contrast at 14px. Move these to tonal (an open decision).',
    },
    {
      name: 'Circular (icon only)',
      use: 'Not used.',
      avoid: 'Everywhere. An unlabelled + on a POS makes the operator guess what it creates.',
    },
  ],
  states: [
    {
      state: 'Default',
      tablet: 'Not used on the tablet.',
      handheld: 'Bottom-right, 16dp from the edges. 80dp higher when a bottom bar is pinned.',
    },
    { state: 'Pressed', tablet: '—', handheld: 'Ripple. No hover on touch.' },
    {
      state: 'Scrolling',
      tablet: '—',
      handheld: "Stays put. The list scrolls under it and ends with 88dp of room, so the last row (a name, a tab's total) can clear it.",
    },
    {
      state: 'Unavailable',
      tablet: '—',
      handheld: "Leave the FAB out rather than disabling it, and say why in the screen's empty state.",
    },
    { state: 'Focus', tablet: '—', handheld: 'Focus-visible ring, for an external keyboard.' },
  ],
  sizing: [
    {
      surface: 'Tablet',
      size: 'Not used',
      why: "The tablet's main actions sit in a fixed toolbar or a dialog footer. A floating button would cover the tee sheet grid or the order rail.",
    },
    {
      surface: 'Handheld',
      size: '56dp on People; 48dp (MUI’s extended default) on Tabs and a tab',
      why: 'Both clear the 48dp minimum. 56dp is MD3’s FAB height and the one to standardise on.',
    },
  ],
  behavior: [
    'One FAB per screen, for the screen’s create or add action.',
    'It opens something: a full-screen dialog for a form you can abandon (New customer, New tab), or a push for a list to pick from (the menu, from Add items).',
    'Always through MobileScreen’s fab slot, never positioned by hand, so the clearance and the lift above a bottom bar are always right.',
    'Never for paying, sending or voiding. Those live in the pinned bottom bar, where the amount fits in the label.',
  ],
  content: [
    'Verb and noun: "New customer", "Add items". Not "Add" alone, and not "+ Customer".',
    'Sentence case, no ellipsis, no count.',
  ],
  dos: [
    'Use the extended FAB, with a label.',
    'Pass it through MobileScreen’s fab slot.',
    'Use the tonal style for new FABs.',
    'Keep the screen’s money actions in the bottom bar, below the FAB.',
  ],
  donts: [
    'Put a FAB on the tablet.',
    'Use an icon-only FAB.',
    'Put Pay, Charge or Send in a FAB.',
    'Stack two FABs, or fan one out (Speed Dial).',
  ],
  a11y: [
    <>
      Contrast, computed. The tonal FAB's label is <Contrast fg={md3.onPrimaryContainer} bg={md3.primaryContainer} label="New" />.{' '}
      <strong>The solid green FAB fails:</strong> <Contrast fg="#ffffff" bg={md3.primary} label="New tab" /> at 14px, weight 500,
      under AA (4.5:1) for text that size. New tab and Add items use it today; moving them to tonal fixes it.
    </>,
    'The label is the accessible name. Tabs and a tab also set an aria-label that repeats it ("New tab"); it adds nothing and can drift, so let the visible label do the job.',
    '56dp (People) and 48dp (Tabs) both meet the 48dp target.',
    'The 88dp spacer is aria-hidden, so it adds no noise for a screen reader.',
  ],
  decisions: [
    {
      decision: 'Handheld only',
      why: "The tablet is mouse-first and dense, with a toolbar on every screen. A floating button there would sit on the tee sheet's grid or the order rail. On a phone the bottom-right corner is where a thumb rests.",
    },
    {
      decision: 'Always extended',
      why: 'A counter has many kinds of "new". The label removes the guess, and the extra width is free on a 360dp list.',
    },
    {
      decision: 'The screen owns the clearance',
      why: "MobileScreen adds 88dp of room at the end of any list with a FAB, so the last row is never stuck behind it. It's in one place so no screen has to remember.",
    },
  ],
  tokens: [
    { token: 'radius.lg', value: '16px', role: 'FAB shape (MuiFab override, handheld theme)' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'Tonal FAB fill' },
    { token: 'md3.onPrimaryContainer', value: '#002112', role: 'Tonal FAB label and icon' },
    { token: 'md3.primary', value: '#17a34a', role: 'Solid FAB fill (in use, not recommended)' },
  ],
  engineering: {
    import: `import { Fab } from '@mui/material';
import { MobileScreen } from '../../chrome';`,
    themeOverride: (
      <>
        <code>src/theme/mobile-theme.ts → MuiFab</code>: 16px radius (MD3's rounded square) and a deeper shadow. The tablet theme
        (<code>src/theme/theme.ts</code>) has no FAB override, because the tablet has no FABs.
      </>
    ),
    notes: [
      <>
        <code>MobileScreen</code> positions the FAB at <code>right: 16, bottom: 16 + (bottomBar ? 80 : 0)</code> and appends an{' '}
        <code>aria-hidden</code> 88px box to the body. Don't add your own bottom padding for it. The Tabs list adds{' '}
        <code>pb: 12</code> to its own list as well, which doubles the room; it can go.
      </>,
      <>
        The 80 is a literal in <code>MobileScreen</code>: the height of a two-button bottom bar, which is why a tab's bar is kept
        to two buttons and nothing else (see the comment in <code>TabScreen.tsx</code>). A taller bar would need the lift to
        follow it.
      </>,
      <>
        The tonal style is set in <code>sx</code> on People today (<code>bgcolor: md3.primaryContainer</code>). If it becomes the
        default, move it into the <code>MuiFab</code> override so screens stop repeating it.
      </>,
    ],
    snippet: `<MobileScreen
  topBar={<TopAppBar title="People" leading="none" />}
  fab={
    <Fab
      variant="extended"
      onClick={() => nav.push({ name: 'newCustomer' })}
      sx={{ bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer, height: 56, gap: 1.5 }}
    >
      <PersonAddOutlined />
      New customer
    </Fab>
  }
>
  <GolferList … />
</MobileScreen>`,
  },
  related: [
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Speed Dial', id: 'components-actions-speed-dial' },
    { name: 'Bottom Navigation', id: 'components-navigation-bottom-navigation' },
    { name: 'List', id: 'components-layout-structure-list' },
  ],
};

export default doc;
