import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Button — the reference page. Every other Design System page follows this one's depth and tone:
 * describe Birdie, not MUI; say where it lives in the product; give the reasons.
 */
const doc: DsDoc = {
  summary: (
    <>
      The control that does something: take a payment, check a party in, send food to the kitchen. Birdie has{' '}
      <strong>one button language on two surfaces</strong>. Every button is a pill, its label is a verb, and each screen has
      one filled button for its most important action. The <strong>tablet</strong> draws its buttons with Birdie's own
      components, which are sized for a mouse at a dense counter. The <strong>handheld</strong> uses the themed MUI Button at
      touch size.
    </>
  ),
  statusNote: (
    <>
      Used everywhere. On the tablet, mostly through Birdie's own button components (<code>FilledButton</code>,{' '}
      <code>OutlineButton</code>, <code>ToolbarButton</code>, <code>HostButton</code>). On the handheld, as the MUI Button.
    </>
  ),
  mui: ['Button'],
  useFor: [
    'An action: Pay, Check in & pay, Send to kitchen, Save, Book.',
    'The one most important action on a screen or dialog (filled).',
    'Secondary actions beside it (outlined), and quiet ones (text).',
  ],
  dontUseFor: [
    'Going somewhere: use a link or a list row.',
    'Choosing between options: use Toggle Button or Chip.',
    'Switching a setting on or off: use Switch.',
    'An icon with no label: use an icon button, with an aria-label.',
  ],
  inBirdie: [
    {
      label: 'Check in & pay, tablet',
      caption: (
        <>
          The reservation panel's footer: <strong>Check in</strong> outlined beside a filled <strong>Check in & pay</strong>{' '}
          that states the amount. The amount in the label is the confirmation.
        </>
      ),
      shot: 'tablet-check-in-pay',
      tabletHash: '#/tee-sheet?res=p04_m6',
    },
    {
      label: 'Send and Pay, handheld',
      caption: (
        <>
          A tab's pinned bottom bar: two large buttons that share the width. Send is amber, the kitchen's colour. Pay is
          green and shows the total.
        </>
      ),
      shot: 'mobile-tab',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tabs-tabs-on-the-handheld--a-tab-by-seat',
    },
    {
      label: 'Toolbar pills, tablet',
      caption: (
        <>
          The tee sheet toolbar's <code>ToolbarButton</code>s: outlined pills for Today and the date arrows, icon-only for
          search, and a filled <strong>Register</strong> to switch views.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet',
    },
  ],
  birdie: [
    { name: 'FilledButton', file: 'src/pos/modals/ModalFrame.tsx', use: "a dialog's main action. Dark by default, red when destructive.", surface: 'tablet' },
    { name: 'OutlineButton', file: 'src/pos/modals/ModalFrame.tsx', use: "a dialog's secondary actions (Cancel, Back).", surface: 'tablet' },
    { name: 'ToolbarButton', file: 'src/pos/components/TeeSheetView.tsx', use: 'pills in a screen toolbar, with an icon, a label or both.', surface: 'tablet' },
    { name: 'HostButton', file: 'src/pos/components/restaurant/HostControls.tsx', use: 'actions in the body of a restaurant screen, at 44px for a thumb.', surface: 'tablet' },
    { name: 'TouchButton', file: 'src/pos/components/Touch.tsx', use: 'a pill at touch height inside the tablet (the reservation panel).', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Container', description: 'A pill (radius xl). Filled, outlined (1.5px), or none for text buttons.' },
    { part: 'Leading icon (optional)', description: "18–20px, before the label. Use one only when it helps scanning, such as Send's paper plane." },
    { part: 'Label', description: 'A verb, in sentence case. It can carry the amount ("Pay $123.12") or a count ("Send 2").' },
    { part: 'Focus ring', description: "MUI's focus-visible ring in the brand colour, shown for keyboard focus only." },
  ],
  variants: [
    {
      name: 'Filled (contained)',
      use: 'The one action the screen exists for: Pay, Check in & pay, Book, Save. One per screen or dialog.',
      avoid: 'Two filled buttons side by side. If both matter equally, the screen is asking two questions.',
    },
    {
      name: 'Filled, destructive',
      use: 'Irreversible money or record changes: Refund, Void, Delete. Always behind a confirm.',
      avoid: 'Reversible changes such as Remove from order. Use outlined.',
    },
    { name: 'Outlined', use: 'Secondary actions beside the filled one: Check in (without pay), Cancel, Move, Split.', avoid: 'The main action.' },
    { name: 'Text', use: 'Low-stakes, inline actions: Clear, Show all, Edit next to a value.', avoid: 'Anything with money attached.' },
    { name: 'Tonal (Birdie)', use: 'Navigation-like actions that are not the main job, like Table view in the tab editor.', avoid: 'Primary actions.' },
  ],
  states: [
    { state: 'Default', tablet: 'Pill at 34–40px. A filled button is dark (onSurface) or brand green.', handheld: 'Pill at 48–56px, full width in pinned bars.' },
    { state: 'Hover', tablet: 'A darker fill, or a surface wash on outlined buttons. The tablet is mouse-first, so hover matters.', handheld: 'No hover. The ripple confirms the press.' },
    { state: 'Focus', tablet: 'Focus-visible ring. Tab order follows reading order.', handheld: 'Same, for external keyboards.' },
    { state: 'Disabled', tablet: 'Greyed, with the reason said nearby ("Another order is on the register…"). Never disabled without a reason.', handheld: 'Same. The reason sits above the bar.' },
    { state: 'Busy', tablet: 'Payments hand over to the card reader screen, not a spinner in the button.', handheld: 'The reader takes over the screen.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '34px (small, the default), 38px medium, 44px for HostButton and TouchButton', why: 'Mouse at a counter, 12–14px type. Density keeps the tee sheet and the order rail in view together.' },
    { surface: 'Handheld', size: '48dp minimum, 56dp in pinned bottom bars', why: "A thumb, often one-handed, sometimes outdoors. Material's 48dp floor." },
  ],
  behavior: [
    'One filled button per screen or dialog. Its position is fixed: the right of a dialog footer on the tablet, the bottom bar on the handheld.',
    'Money actions say the amount, and the amount updates live as the order changes.',
    "Destructive actions confirm first, and the confirm names what's lost (\"Void Filet Mignon 8 oz?\").",
    "A button that can't act explains why, close by. It never fails silently.",
    'Buttons dispatch straight to the store. There is no Save step on screens that edit as you go, such as the tab editor.',
  ],
  content: [
    'Verbs first: "Check in & pay", not "Payment". Sentence case, not title case or all caps.',
    'Amounts in the label use the money format: "$154.98", with two decimals and no currency code.',
    'Counts go after the verb: "Send 2". When the count is zero, change the words: "Nothing to send", not "Send 0".',
    'Keep it to three words, plus the amount.',
  ],
  dos: [
    'Put the amount in the payment button so the operator confirms the number by pressing it.',
    'Keep the filled button in the same place on every screen of a flow.',
    "Say why a button is disabled, next to it.",
    "Use the destructive style only when the action can't be undone.",
  ],
  donts: [
    'Two filled buttons in one footer.',
    'All-caps labels. The theme turns off text-transform; keep it off.',
    'Icon-only buttons for money actions.',
    'Brand green for Cancel. Green means go.',
  ],
  a11y: [
    'Native <button> semantics, through MUI ButtonBase. Enter and Space activate it.',
    'Icon-only buttons need an aria-label ("Tab options"). Visible labels need nothing extra.',
    <>
      Contrast, computed: a dark FilledButton's label is <Contrast fg="#ffffff" bg={md3.onSurface} />, and an outlined label is{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />. <strong>White on Birdie green is a known gap:</strong>{' '}
      <Contrast fg="#ffffff" bg={md3.primary} label="Pay" /> at the 13–14px bold of a button label, which is under AA (4.5:1) for
      text that size. It passes only as large text (<Contrast fg="#ffffff" bg={md3.primary} size="large" />), from 18.7px bold.
      Keep green buttons to 14px bold and up, and track the fix (a deeper green fill, or a larger label) as an open decision.
    </>,
    'Targets: 34px on the tablet (mouse) is deliberate. Anything a thumb uses is at least 44px (HostButton, TouchButton), and 48dp on the handheld.',
  ],
  decisions: [
    { decision: 'Pills everywhere', why: 'The source prototype drew pills. They read as touchable on a terminal and sit well beside the round chips and avatars.' },
    { decision: 'The tablet has its own button components', why: 'Dialog footers, toolbars and floor panels each need a different density. Small components with one job (FilledButton, ToolbarButton, HostButton) stop every screen re-deciding padding.' },
    { decision: 'Dark, not green, for the main dialog action', why: 'Green is the pay colour on the tee sheet. A dark FilledButton keeps "do it" separate from "it\'s paid". The green Pay button is the exception that proves the rule.' },
    { decision: 'Amounts in the label', why: 'At a busy counter the number on the button is the last check before money moves: the operator confirms it by pressing it.' },
  ],
  tokens: [
    { token: 'radius.xl', value: '28px', role: 'Pill shape: past half the height, so any button is a full pill' },
    { token: 'md3.primary', value: '#17a34a', role: 'Green filled buttons, focus ring' },
    { token: 'md3.onSurface', value: '#191d19', role: 'FilledButton fill, the dark main action' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: '1.5px outline' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Destructive fill' },
  ],
  engineering: {
    import: `import { Button } from '@mui/material';                          // handheld
import { FilledButton, OutlineButton } from '../modals/ModalFrame'; // tablet dialogs
import { ToolbarButton } from '../components/TeeSheetView';         // tablet toolbars`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiButton</code>: <code>disableElevation</code>, default size <code>small</code>, pill radius,
        600 weight, 1.5px neutral outline for <code>outlined</code>. The handheld theme (<code>src/theme/mobile-theme.ts</code>)
        raises the sizes to touch.
      </>
    ),
    notes: [
      <>
        On the tablet, reach for the Birdie component that matches the place (a dialog footer, a toolbar, a floor panel) before
        the raw MUI Button. They encode the density.
      </>,
      <>
        Tests find buttons by role and name (<code>getByRole('button', {'{'} name: 'Pay $154.98' {'}'})</code>), so the label is
        part of the contract. Change it and you change the tests.
      </>,
      <>
        Busy and disabled states come from the store (<code>canPayTab</code>, <code>registerBusy</code>), not local state, so
        every screen gives the same answer.
      </>,
    ],
    snippet: `<Stack direction="row" gap={1} justifyContent="flex-end">
  <OutlineButton onClick={close}>Cancel</OutlineButton>
  <FilledButton onClick={pay} disabled={!payable}>
    Pay {money(total)}
  </FilledButton>
</Stack>`,
  },
  related: [
    { name: 'Button Group', id: 'components-actions-button-group' },
    { name: 'Floating Action Button', id: 'components-actions-floating-action-button' },
    { name: 'Toggle Button', id: 'components-forms-toggle-button' },
    { name: 'Link', id: 'components-navigation-link' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

export default doc;
