import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Dialog — ModalFrame on the tablet; no centred dialogs on the handheld. The reservation
 * slide-over is the third option, and the page says when to use which.
 */
const doc: DsDoc = {
  summary: (
    <>
      A dialog stops the work to finish one focused task: take a payment, add a golfer, confirm a delete. On the{' '}
      <strong>tablet</strong>, every dialog is <code>ModalFrame</code>: a centred card over a dimmed screen, with a fixed
      header, a scrolling body and a footer of buttons. There are about 60 of them. The <strong>handheld</strong> has no
      centred dialogs at all. The same jobs become a full-screen dialog that rises from the bottom, or a bottom sheet for
      a short choice.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      The backbone of the tablet: <code>ModalFrame</code> wraps MUI's Dialog for about 60 dialogs in 31 files. The
      handheld uses none, on purpose (see Decisions).
    </>
  ),
  mui: ['Dialog'],
  useFor: [
    'A task with its own inputs that must finish or be cancelled: Checkout, the payment reader, New customer, Block time.',
    'A destructive confirm that names what is lost: "Clear 9:12 AM? 6 tee times across all courses will be removed."',
    'A choice that needs more room than a menu: Move tab, Seat reservation, Cart signout.',
  ],
  dontUseFor: [
    'Working on a record while the tee sheet stays in view: use the reservation slide-over.',
    'A short pick from a few options: a menu or popover on the tablet, a bottom sheet on the handheld.',
    'Telling the operator something: a Callout in place, or a toast after the fact.',
    'Anything on the handheld: push a full-screen dialog route, or open a BottomSheet.',
  ],
  inBirdie: [
    {
      label: 'Checkout, tablet',
      caption: (
        <>
          ModalFrame at full stretch: icon tile, title and subtitle, ✕. The body holds the order and the keypad; the footer
          keeps secondary actions left and <strong>Cancel</strong> right. The tenders in the body are the main action.
        </>
      ),
      shot: 'tablet-checkout',
      tabletHash: '#/register?order=walkin&modal=checkout',
    },
    {
      label: 'Destructive confirm, tablet',
      caption: (
        <>
          <code>ConfirmDialog</code>: 440px, a red warning icon, the question as the title, the consequence with a count in
          the body, and a red filled button that repeats the verb, <strong>Clear time</strong>.
        </>
      ),
      shot: 'ds-tablet-confirm',
      storyId: 'prototypes-tablet-tee-sheet-operations--destructive-confirm',
    },
    {
      label: 'Not a dialog: the reservation slide-over',
      caption: (
        <>
          A booking opens as an 820px panel from the right over a 70% scrim, not as a dialog. You work on it while the
          sheet stays in place behind, and the ✕ takes you back exactly where you were.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-10-·-panel-size-tablet--eight-twenty',
    },
    {
      label: 'Confirm in a sheet, handheld',
      caption: (
        <>
          Removing a player asks in a bottom sheet, <em>"Remove this player?"</em>, with Cancel and a red Remove side by
          side at thumb height. The story's own note: no centred dialog on the phone.
        </>
      ),
      shot: 'ds-mobile-remove-sheet',
      frame: 'handheld',
      storyId: 'weston-edits-2-·-player-rows-mobile--remove-player',
    },
    {
      label: 'Full-screen dialog, handheld',
      caption: (
        <>
          A new tee time is a <code>dialog</code> route: it rises from the bottom, has ✕ on the left and one confirming
          text action on the right. Fifteen handheld routes enter this way.
        </>
      ),
      handheldRoute: 'prototypes-mobile-tee-sheet-booking-check-in--new-tee-time-with-golfer',
      storyId: 'prototypes-mobile-tee-sheet-booking-check-in--new-tee-time-with-golfer',
    },
    {
      label: 'The centred version, for comparison',
      caption: (
        <>
          The reservation as a centred dialog, kept in Storybook only. It was built so the slide-over could be judged
          against it; the slide-over won.
        </>
      ),
      storyId: 'weston-edits-1-·-reservation-panel-tablet--modal-comparison',
    },
  ],
  birdie: [
    {
      name: 'ModalFrame',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'every tablet dialog. Header (icon, title, subtitle, aside, ✕), scrolling body, footer. Props: width, tall, actions, headerAside, onClose.',
      surface: 'tablet',
    },
    {
      name: 'ConfirmDialog',
      file: 'src/pos/modals/Misc.tsx',
      use: 'destructive confirms on the tablet, opened with `{ kind: \'confirm\', title, body, confirmLabel, onConfirm }`. The action is a string key, so state stays serializable.',
      surface: 'tablet',
    },
    {
      name: 'ModalHost',
      file: 'src/pos/modals/ModalHost.tsx',
      use: 'renders whichever dialog `state.modal` names. One open at a time, enforced by the type.',
      surface: 'tablet',
    },
    {
      name: 'ReservationPanel',
      file: 'src/pos/components/ReservationPanel.tsx',
      use: 'the slide-over, not a dialog. A booking you work on beside (or over) the tee sheet.',
      surface: 'tablet',
    },
    {
      name: 'DialogTopBar',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'the header of a full-screen dialog route: ✕, title, one text action ("Save", "Reserve").',
      surface: 'handheld',
    },
    {
      name: 'BottomSheet',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'short contextual choices and destructive confirms on the handheld. Confined to the phone frame, unlike MUI Drawer.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Backdrop', description: "MUI's default 50% black. Tapping it, or pressing Escape, closes the dialog (see Decisions)." },
    { part: 'Paper', description: 'White, radius lg (16px), elevation e3. Width per dialog, 480 by default; `tall` fixes it at up to 720px high.' },
    { part: 'Icon tile (optional)', description: '34px, radius md, the icon in its colour on a 10% tint of it. Red for destructive confirms.' },
    { part: 'Title and subtitle', description: 'Title 17px/800, the thing or the question ("Clear 9:12 AM?"). Subtitle 12px, the context ("Balance due $54.00").' },
    { part: 'Header aside (optional)', description: 'Status that belongs to the whole dialog, such as the ID.me badge and View ID on the customer record.' },
    { part: 'Close ✕', description: 'Top right, 18px icon on a round hover. Same as Cancel.' },
    { part: 'Body', description: '16px × 20px padding, scrolls on its own. Built from ModalSection, Field, PillGroup, Callout and ResultList.' },
    { part: 'Footer', description: 'Hairline above, buttons right-aligned: OutlineButton(s), then one FilledButton. Secondary tools can sit left behind a flex spacer.' },
  ],
  variants: [
    {
      name: 'Task dialog',
      use: 'A focused job with inputs: New customer, Block time, Open tab. Footer: Cancel + one filled verb.',
      avoid: 'A form that needs the tee sheet beside it. Use the slide-over.',
    },
    {
      name: 'Tall dialog (`tall`)',
      use: 'Tabbed or long content that should not resize as tabs change: Checkout, the customer record.',
      avoid: 'Short forms. A tall empty dialog looks broken.',
    },
    {
      name: 'Confirm (ConfirmDialog)',
      use: 'Irreversible changes to bookings or orders: void, clear, delete, cancel. Red icon, red filled button.',
      avoid: 'Reversible actions. Do them and toast the result.',
    },
    {
      name: 'Stage dialog (payment reader)',
      use: 'A short sequence with one card: prompt → processing → approved. The footer changes per stage.',
      avoid: 'Multi-page wizards. Birdie has none; split the job instead.',
    },
    {
      name: 'Slide-over (not a dialog)',
      use: 'A record you work on: the reservation (820, 640 or full width) and the bay or court booking panel.',
      avoid: 'Quick questions. A slide-over is a place, not a question.',
    },
  ],
  states: [
    {
      state: 'Open',
      tablet: 'Centred, over a 50% dim. Focus moves into the dialog and is trapped there until it closes.',
      handheld: 'No centred dialog. A dialog route rises from the bottom and covers the navigation bar; a bottom sheet rises over a 32% dim.',
    },
    {
      state: 'Closing',
      tablet: '✕, Cancel, Escape, or a tap on the backdrop. Focus returns to what opened it.',
      handheld: '✕ pops the dialog route; a sheet closes on a tap above it or on its own Cancel.',
    },
    {
      state: 'Busy',
      tablet: 'The payment reader swaps its footer for nothing while processing, and its icon spins.',
      handheld: 'Payment is a takeover screen, not a dialog: no ✕, no back gesture, until it is approved or cancelled.',
    },
    {
      state: 'Over the reservation',
      tablet: 'Dialogs opened from the panel (customer record, cart signout, a confirm) portal to the body, so they sit outside the panel\'s inert background and stay live.',
    },
  ],
  sizing: [
    {
      surface: 'Tablet',
      size: '420–780px wide (480 default, 520 most common); up to 720px tall with `tall`',
      why: 'Wide enough for the job, narrow enough that the screen behind still says where you are. On the Clover Mini (800 tall) the margins drop to 16px so Checkout fits without scrolling.',
    },
    {
      surface: 'Handheld',
      size: 'Full screen (dialog routes); bottom sheet up to 85% of the height',
      why: 'A centred dialog on a 360dp phone is a full screen with extra chrome around it. MD3 replaces it with a full-screen dialog.',
    },
  ],
  behavior: [
    'One dialog at a time on the tablet. `state.modal` is a single value; opening another replaces it.',
    'The main action is always bottom right, and always the only filled button.',
    'Dialogs can be deep-linked (`#/register?order=walkin&modal=checkout`) except confirms, cart signout, and the register\'s and restaurant\'s session dialogs, which only make sense straight after the action that raised them.',
    'Closing never rolls back. Most task dialogs commit on their main button; the few that edit a live record (Booking detail) dispatch as you change things, and closing keeps those changes.',
    'On the handheld, dialogs are routes in the navigation stack (`PRESENTATION` in `navigation.tsx`), so back, ✕ and the gesture all agree.',
  ],
  content: [
    'Title: the thing ("Checkout", "Cart signout · {name}") or the question ("Clear 9:12 AM?").',
    'Subtitle: the context that makes the title specific: an amount due, a time and course, a count available.',
    'Confirm body: what will happen, with the count. "6 tee times across all courses will be removed and the slots released."',
    'The confirming button repeats the verb in the title: "Clear time", "Delete booking". Never "OK" or "Yes".',
    'The cancel button is "Cancel" on the tablet. The handheld uses "Cancel" or "Keep order"; pick one (see Decisions).',
  ],
  dos: [
    'Build every tablet dialog on ModalFrame, with FilledButton and OutlineButton in the footer.',
    'Give the confirm the count and the name of what goes.',
    'Pick a width from the common ones (440, 520, 560, 640, 760) before inventing a new one.',
    'On the handheld, add a `dialog` route or a BottomSheet, never an MUI Dialog.',
  ],
  donts: [
    'A dialog over a dialog. ModalHost shows one at a time. What opens from the reservation (customer record, cart signout, a confirm) opens over a panel, not over another dialog.',
    'A dialog for a message. If there is nothing to decide, it is a Callout or a toast.',
    'Two filled buttons in the footer.',
    'MUI\'s DialogTitle / DialogActions. ModalFrame draws its own header and footer.',
  ],
  a11y: [
    'MUI Dialog traps focus while open, closes on Escape and returns focus to the opener.',
    <>
      <strong>Known gaps in ModalFrame.</strong> The ✕ is a <code>ButtonBase</code> with only an icon, and the icon is
      aria-hidden, so the button has no accessible name. The Dialog has no <code>aria-labelledby</code>, so it is announced
      as an unnamed dialog. Both are one-line fixes (an <code>aria-label="Close"</code>, and an id on the title).
    </>,
    'The handheld BottomSheet is role="dialog" with aria-modal, but it has no name and does not move focus or close on Escape. Fine for touch; fix before keyboard use.',
    <>
      Contrast, computed: the title on white is <Contrast fg={md3.onSurface} bg="#ffffff" />, the subtitle{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.
    </>,
    'Footer buttons are 34–38px on the tablet, a mouse target. Dialogs that are worked with a thumb (Cart signout\'s key grid) size their own targets to 56px.',
  ],
  decisions: [
    {
      decision: 'One shell for every tablet dialog',
      why: 'The prototype repeated its dialog styles inline. ModalFrame pins them once (1.5px outlines, 12–13px text, pill options), so 60 dialogs read as one product. Its own comment says as much.',
    },
    {
      decision: 'The reservation is a slide-over, not a dialog',
      why: 'From the Loom review: the order comes after the golf, and staff should not lose the tee sheet while editing a booking. The centred version was built for comparison (Weston "can be convinced either way") and the slide-over shipped. Weston then chose 820px over 640 ("I think I like the 820") and a scrim over squeezing the sheet. Source: the Panel size review notes and ReservationPanel.tsx.',
    },
    {
      decision: 'No centred dialogs on the handheld',
      why: 'MD3 replaces them with full-screen dialogs on phones (navigation.tsx). A 360dp centred card leaves room for nothing but its own chrome, and a route gets back, ✕ and the gesture for free.',
    },
    {
      decision: 'Open: does a backdrop tap close?',
      why: 'ModalFrame closes on any backdrop tap or Escape, for every dialog, including the payment reader while it processes and forms with typed input. The reservation panel decided the opposite: its scrim is "deliberately not a way out" so a stray tap cannot discard edits. Pick one rule. A proposal: forms and payment ignore backdrop taps; read-only and pick-one dialogs keep them.',
    },
    {
      decision: 'Open: fourteen widths',
      why: '61 ModalFrames use 14 different widths from 420 to 780. Settle on four or five (440, 520, 640, 760) and make `width` a size name.',
    },
    {
      decision: 'Open: two handheld confirm layouts',
      why: '"Remove this player?" uses two full-width buttons (Cancel, Remove); "Clear this order?" uses right-aligned text and filled buttons (Keep order, Clear order). One pattern, one cancel word.',
    },
  ],
  tokens: [
    { token: 'radius.lg', value: '16px', role: 'Paper corner (theme MuiDialog)' },
    { token: 'elevation.e3', value: 'shadow', role: 'Paper shadow (theme MuiDialog)' },
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Header and footer hairlines' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Confirm icon and destructive button' },
    { token: 'mobile.motion.sheet', value: '400ms', role: 'Bottom sheet rise (handheld), on the emphasized easing' },
  ],
  engineering: {
    import: `import { Callout, FilledButton, ModalFrame, ModalSection, OutlineButton } from './ModalFrame';  // tablet
import { BottomSheet, DialogTopBar } from '../../chrome';                                   // handheld`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiDialog</code>: paper radius <code>radius.lg</code> and <code>elevation.e3</code>.
        Everything else (header, padding, footer, widths, the compact-terminal margins) is in <code>ModalFrame</code>.
      </>
    ),
    notes: [
      <>
        Open a dialog by dispatching state, not by rendering one: <code>dispatch({'{'} type: 'openModal', … {'}'})</code>{' '}
        for the tablet's <code>Modal</code> union, which <code>ModalHost</code> switches on. New dialogs add a case there
        and, if they should be linkable, a slug in <code>MODAL_SLUGS</code> (<code>url-state.ts</code>).
      </>,
      <>
        <code>useModalContainer()</code> scopes the portal when a story renders more than one screen. Leave it alone in
        product code; it is <code>null</code> (the body) there.
      </>,
      'ModalFrame calls `usePos()` for its default close, so it must render inside PosProvider. Pass `onClose` when the dialog is not driven by `state.modal` (the cart signout and customer record do).',
      'On the handheld, add the route to `PRESENTATION` as `dialog`; the router gives it the rise animation, hides the navigation bar and wires ✕ to `nav.pop()`.',
    ],
    snippet: `<ModalFrame
  width={440}
  title="Clear 9:12 AM?"
  icon="warning"
  iconColor={md3.error}
  actions={
    <>
      <OutlineButton onClick={cancel}>Cancel</OutlineButton>
      <FilledButton destructive onClick={run}>Clear time</FilledButton>
    </>
  }
>
  <Typography sx={{ fontSize: 13 }}>6 tee times across all courses will be removed and the slots released.</Typography>
</ModalFrame>`,
  },
  related: [
    { name: 'Backdrop', id: 'components-feedback-status-backdrop' },
    { name: 'Button', id: 'components-actions-button' },
    { name: 'Alerts', id: 'components-feedback-status-alerts' },
    { name: 'Snackbar', id: 'components-feedback-status-snackbar' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
