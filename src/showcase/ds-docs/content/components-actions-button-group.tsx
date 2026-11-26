import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Button Group — a page about a component Birdie deliberately doesn't use. What it explains is the
 * thing people mistake for it: joined rows that are really choices (Toggle Button), and the way
 * Birdie actually groups actions (separate pills with a gap).
 */
const doc: DsDoc = {
  summary: (
    <>
      A row of buttons fused into one control. <strong>Birdie doesn't join action buttons.</strong> Actions sit side by side
      as separate pills with a gap between them, so a thumb at a busy counter can't catch the wrong one. Every joined row you
      see in Birdie (9 | 18 holes, Walk · Ride · Push, the tee sheet's Calendar | List) is a <em>choice</em>, not a set of
      actions, and belongs to Toggle Button.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      MUI's <code>ButtonGroup</code> isn't imported anywhere in <code>src/pos</code>, and the theme has no override for it. A
      candidate to remove from the system. If a split button (an action with a ▾ of variants) is ever needed, decide it here
      first.
    </>
  ),
  mui: ['ButtonGroup'],
  useFor: [
    'Nothing in Birdie today.',
    'The one case it could earn: a split button, such as Print with a ▾ for Print all. Raise it as a design decision before building it.',
  ],
  dontUseFor: [
    'Two to four actions in a footer or toolbar: separate buttons, 6–8px apart.',
    'Choosing one option from a few (9 | 18, Walk · Ride · Push): Toggle Button.',
    'Switching views of one screen (Calendar | List): Toggle Button.',
    'More actions than fit: a ⋮ menu on the tablet, a bottom sheet on the handheld.',
  ],
  inBirdie: [
    {
      label: 'A footer of separate actions, tablet',
      caption: (
        <>
          The reservation panel's footer: <strong>Move</strong> and <strong>Delete</strong> on the left, <strong>Close</strong>{' '}
          and <strong>Check in & pay all</strong> on the right. Four pills, gaps between them, and the destructive one kept
          away from the main one. This is how Birdie groups actions.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Joined rows are choices, handheld',
      caption: (
        <>
          Each player card has a joined <strong>9 | 18</strong>: one question, one answer, the selected half filled. It looks
          like a button group and behaves like a Toggle Button. The <strong>$72.00</strong>, <strong>Walk</strong> and cart
          buttons beside it are separate, because each does something different.
        </>
      ),
      shot: 'mobile-reservation',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--reservation',
    },
    {
      label: 'Two actions sharing a bar, handheld',
      caption: (
        <>
          A tab's pinned bar: <strong>Send 2</strong> and <strong>Pay $123.12</strong> share the width with an 8dp gap. They
          are two buttons, two colours and two outcomes, never one fused control.
        </>
      ),
      shot: 'mobile-tab',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
  ],
  birdie: [
    {
      name: 'FilledButton + OutlineButton',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: "a dialog's actions: separate pills in the footer, the main one on the right.",
      surface: 'tablet',
    },
    {
      name: 'ToolbarButton',
      file: 'src/pos/components/TeeSheetView.tsx',
      use: "a screen toolbar's actions (search, day summary, settings): separate pills, never joined.",
      surface: 'tablet',
    },
    {
      name: 'BottomActionBar',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'pinned actions on a handheld screen: one or two buttons sharing the width, 8dp apart.',
      surface: 'handheld',
    },
    {
      name: 'PillGroup',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'a row of pills inside a dialog that is one choice (a role, a category). A selection: see Toggle Button.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Separate pills', description: 'Each action is its own button with its own outline or fill. No shared border.' },
    { part: 'Gap', description: '6px on the tablet (MUI spacing 0.75), 8dp on the handheld. The gap is the safety margin between two outcomes.' },
    { part: 'Order', description: 'Quiet and destructive actions on the left, the main action last on the right (tablet); main action on the right of a pinned bar (handheld).' },
  ],
  variants: [
    {
      name: 'Separate buttons (Birdie)',
      use: 'Any set of actions: a dialog footer, a toolbar, a pinned bar.',
      avoid: 'Joining them to save space. Shorten the labels or move the rarer ones into a ⋮ menu instead.',
    },
    {
      name: 'Joined choice (Toggle Button)',
      use: 'One question with a few answers: holes, transport, a view.',
      avoid: 'Anything where pressing a segment does something rather than selects something.',
    },
    {
      name: 'MUI ButtonGroup',
      use: 'Not used.',
      avoid: 'Everywhere, until a split button is agreed as a decision.',
    },
  ],
  states: [
    {
      state: 'Default',
      tablet: 'Separate 34px pills, 6px apart. Each has its own hover wash, because the tablet is mouse-first.',
      handheld: '48–56dp buttons, 8dp apart, sharing the width of a pinned bar.',
    },
    {
      state: 'One disabled',
      tablet: 'Only that button greys out, with the reason close by. Its neighbours stay live. A joined group would make the whole bar look off.',
    },
    {
      state: 'Focus',
      tablet: 'Each button is its own tab stop, in reading order.',
    },
  ],
  sizing: [
    { surface: 'Tablet', size: '34px pills, 6px apart', why: 'Mouse at a counter. The gap is small but it is there: two outcomes never share an edge.' },
    { surface: 'Handheld', size: '48–56dp, 8dp apart', why: "A thumb. Touching two segments at once is easy on a joined row and impossible across a gap." },
  ],
  behavior: [
    'Every action is a separate button with its own label, even when two sit together.',
    'Keep the destructive action physically away from the main one (Delete on the left, Check in & pay on the right).',
    'If a row of actions gets too long, move the rare ones into a ⋮ menu. Don’t fuse them.',
  ],
  dos: [
    'Space actions apart, even by 6px.',
    'Use a joined control only for choosing, and document it as a Toggle Button.',
    'Put the main action last, on the right.',
  ],
  donts: [
    'Fuse Pay and Send, or Save and Delete, into one bar.',
    'Use a joined row for things that do different jobs (Print | Email | Void).',
    'Reach for MUI ButtonGroup because a sketch looked tidy.',
  ],
  a11y: [
    'Separate buttons are separate tab stops with their own names, so a screen reader hears each action.',
    <>
      The tee sheet's joined Calendar | List toggle is the closest thing to a button group on the tablet, and it shows why the
      choice belongs to Toggle Button: it needs <code>aria-pressed</code>, which it doesn't have today, and its selected icon
      is <Contrast fg={md3.primary} bg={md3.primaryContainer} size="non-text" /> against its fill, under the 3:1 non-text
      minimum. Both are open items on the Toggle Button page.
    </>,
    'Targets: two adjacent targets with no gap are the commonest mis-tap on a touch counter. The gap is an accessibility rule, not decoration.',
  ],
  decisions: [
    {
      decision: 'No joined action buttons',
      why: 'Material 3 has no joined action buttons either: its segmented button is a selection control. On a counter terminal, adjacent outcomes with no gap are mis-taps waiting to happen.',
    },
    {
      decision: 'Joined rows are choices',
      why: 'Users read a fused row as "pick one". Keeping that meaning for choices only (holes, transport, view) makes it reliable.',
    },
  ],
  engineering: {
    import: `import { FilledButton, OutlineButton } from '../modals/ModalFrame'; // tablet dialogs
import { BottomActionBar } from '../mobile/chrome';                   // handheld pinned bar`,
    themeOverride: (
      <>
        None. <code>src/theme/theme.ts</code> has no <code>MuiButtonGroup</code> entry, so the raw MUI group would render
        with square inner corners against Birdie's pills.
      </>
    ),
    notes: [
      <>
        For a row of actions, use a <code>Stack direction="row" gap={'{0.75}'}</code> of separate buttons on the tablet, and{' '}
        <code>BottomActionBar</code> on the handheld.
      </>,
      <>
        For a joined choice, use <code>ToggleButtonGroup</code> (handheld) or the tablet's <code>PillGroup</code>, and give the
        group an accessible name.
      </>,
    ],
    snippet: `<Stack direction="row" gap={0.75} alignItems="center">
  <OutlineButton onClick={move}>Move</OutlineButton>
  <OutlineButton destructive onClick={confirmDelete}>Delete</OutlineButton>
  <Box sx={{ flex: 1 }} />
  <OutlineButton onClick={close}>Close</OutlineButton>
  <FilledButton onClick={checkInAndPay}>Check in & pay all</FilledButton>
</Stack>`,
  },
  related: [
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Menu', id: 'components-navigation-menu' },
    { name: 'Floating Action Button', id: 'components-actions-floating-action-button' },
  ],
};

export default doc;
