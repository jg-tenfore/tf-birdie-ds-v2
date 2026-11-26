import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Snackbar — Birdie's toast. One per surface, owned by the store, text only.
 */
const doc: DsDoc = {
  summary: (
    <>
      The toast: one short line at the bottom of the screen that says what just happened.{' '}
      <em>"Payment approved · $154.98"</em>, <em>"Cart 14 → {'{'}name{'}'}"</em>, <em>"Tee time voided"</em>. Birdie has{' '}
      <strong>exactly one</strong>, and it belongs to the store: any screen calls <code>toast(message)</code> and the app
      shell shows it. It is text only. It goes away after 2.2 seconds or at the next tap, and it never asks a question.
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      One MUI Snackbar per surface (<code>PosApp</code> on the tablet, <code>MobileApp</code> on the handheld), fed by about
      230 <code>toast()</code> calls in 80 files, plus a few direct <code>dispatch({'{'} type: 'toast' {'}'})</code>. It is the confirmation for almost every action that doesn't change the
      screen.
    </>
  ),
  mui: ['Snackbar'],
  useFor: [
    'Confirming an action whose result is not visible on screen: "Note saved", "Receipt printed · {printer}".',
    'Confirming an action that closed the thing you were in: a dialog or a pushed screen that pops back.',
    'Naming the result in words when the screen change is easy to miss: "Bay 4 booked · daily limit overridden".',
  ],
  dontUseFor: [
    'A form error. Say it next to the field, and keep the button disabled with the reason close by.',
    'Anything the operator must read or act on: use a Callout in place, or a confirm dialog.',
    'Undo. The toast cannot hold a button, and it closes on the next tap. Put Undo in the toolbar (the Bay Sheet does).',
    'Progress. The card reader shows its own stages; a toast is for after.',
  ],
  inBirdie: [
    {
      label: 'Daily limit overridden, Bay Sheet',
      caption: (
        <>
          <strong>Book anyway</strong> closes the panel, and the toast names what changed: <em>"Bay 4 booked · daily limit
          overridden"</em>. The one place the screen alone wouldn't say it.
        </>
      ),
      storyId: 'prototypes-tablet-bay-sheet-buck-bays--the-daily-limit',
      tabletHash: '#/bays',
    },
    {
      label: 'Cart signout, handheld',
      caption: (
        <>
          Picking a key pops back to the reservation with <em>"Cart 3 → {'{'}name{'}'}"</em>. A drill-down that has done its
          one job does not need dismissing; the toast is the receipt.
        </>
      ),
      shot: 'mobile-cart-signout',
      frame: 'handheld',
      handheldRoute: 'weston-edits-16-·-cart-signout-mobile--signing-one-out',
    },
    {
      label: 'Destructive confirm, tablet',
      caption: (
        <>
          After a confirm dialog runs, the toast says what was removed: <em>"Booking deleted"</em>, or for a whole time row{' '}
          <em>"{'{'}time{'}'} cleared · {'{'}n{'}'} removed"</em>. The count is the check that the right thing went.
        </>
      ),
      storyId: 'prototypes-tablet-tee-sheet-operations--destructive-confirm',
    },
  ],
  birdie: [
    {
      name: 'toast()',
      file: 'src/pos/state/PosProvider.tsx',
      use: 'the only way to show one. `const { toast } = usePos(); toast(`${b.name} · marked paid`)`. It sets `state.toast`; the provider clears it after 2.2s.',
      surface: 'both',
    },
    {
      name: 'Tablet toast',
      file: 'src/pos/PosApp.tsx',
      use: 'the Snackbar itself: dark (`md3.scrim`), 13px semibold, bottom centre, inside the device frame. Never render a second one.',
      surface: 'tablet',
    },
    {
      name: 'Handheld toast',
      file: 'src/pos/mobile/MobileApp.tsx',
      use: 'the same state, MUI\'s default dark content, lifted above the navigation bar on root screens.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Container', description: 'A dark rounded rectangle (radius sm, 8px) with elevation e3, centred at the bottom of the device frame.' },
    { part: 'Message', description: 'One line, 13px semibold on the tablet, 14px on the handheld. No icon, no title, no severity colour.' },
    { part: 'Action', description: 'None. The API is `toast(message: string)`; there is nowhere to put a button.' },
  ],
  variants: [
    {
      name: 'Confirmation (the only one)',
      use: 'Everything Birdie toasts today: saved, sent, paid, booked, removed. Past tense, subject first.',
    },
    {
      name: 'With an action (Undo)',
      use: 'Not built. The MUI stories below show it, but Birdie keeps Undo in the screen (the Bay Sheet toolbar\'s Undo move) where it does not vanish.',
      avoid: 'Adding it without lengthening the timer and stopping click-away; a 2.2s Undo that closes on the next tap is a trap.',
    },
    {
      name: 'Severity (success, error)',
      use: 'Not built. Errors that matter are said in place, with a Callout.',
      avoid: 'Red toasts for validation. See "Don\'t".',
    },
  ],
  states: [
    { state: 'Showing', tablet: 'Bottom centre over whatever screen is up, including over the reservation scrim. 2.2s.', handheld: 'Bottom centre; 92px up on a root screen so it clears the 80dp navigation bar, 12px up on a pushed screen.' },
    { state: 'Replaced', tablet: 'A new message replaces the old one at once and restarts the timer. There is never a queue.' },
    { state: 'Dismissed', tablet: 'After 2.2s, or at the next click anywhere (MUI\'s click-away). Hovering does not hold it.', handheld: 'After 2.2s, or at the next tap anywhere.' },
  ],
  behavior: [
    'One at a time, app-wide. The newest message wins; nothing queues.',
    'It sits inside the device frame (`position: absolute`), so in Storybook and the prototype it stays on the device, not the browser window.',
    'Any click outside the toast closes it. An action that both closes a panel and toasts has to toast after the click has finished, or the same click closes it. The Bay Sheet\'s Book anyway defers by one tick for exactly this reason (see For engineers).',
    'It is announced: MUI renders the message with role="alert", so a screen reader reads it without moving focus.',
  ],
  content: [
    'Subject first, then what happened, joined by a middle dot: "{name} · marked paid", "{count} saved · stock set for {n} items".',
    'Past tense. It reports; it does not instruct.',
    'Include the number that proves it: the amount paid, how many were removed, which cart. "Payment approved · $154.98", not "Success".',
    'Keep it under about 40 characters so it stays one line at 360dp.',
    'No exclamation marks, no "Successfully".',
  ],
  dos: [
    'Toast after an action that closes the screen you were on.',
    'Name the thing and the number: "{time} cleared · {n} removed".',
    'Use the arrow for hand-offs: "Cart {n} → {name}".',
    'Call `toast()` from the store\'s context, never render a Snackbar in a screen.',
  ],
  donts: [
    <>
      Validation in a toast. Today a few dialogs do it (<code>"Enter a name"</code> in <code>modals/People.tsx</code>,{' '}
      <code>"End time must be after the start time"</code> in <code>modals/TimeRow.tsx</code>). The message is gone before
      the operator finds the field. Say it at the field.
    </>,
    <>
      "Coming soon" toasts in a shipped build. Six buttons use one as a placeholder (Split evenly, Service charge, Key in…).
      Fine for a prototype; hide the button instead in production.
    </>,
    'A second Snackbar inside a screen or dialog. It would fight the shell\'s for the same spot.',
    'Anything the operator has to act on. It will be gone before they read it.',
  ],
  a11y: [
    'role="alert" (MUI SnackbarContent), so a screen reader announces the message at once, without moving focus.',
    <>
      Contrast, computed: the tablet toast is <Contrast fg="#ffffff" bg={md3.scrim} label="Paid" />.
    </>,
    <>
      <strong>Timing is the gap.</strong> 2.2 seconds, with no pause on hover or focus and dismissal on any click, is short
      for a person reading at a busy counter and fails the spirit of WCAG 2.2.1 (timing adjustable) for anything that
      matters. That is acceptable only because nothing in a toast is the sole record: the screen also changed. Keep it that
      way, or lengthen it.
    </>,
  ],
  decisions: [
    {
      decision: 'One toast, owned by the store',
      why: 'Every screen and dialog dispatches the same action, so position, timing and style cannot drift between screens, and a dialog that closes itself can still confirm.',
    },
    {
      decision: 'Text only, no actions',
      why: 'A counter terminal is shared and busy. A button that disappears in two seconds is easy to miss and easy to hit by accident. Actions that need a second chance get a confirm before, not an Undo after.',
    },
    {
      decision: 'Dark, not green',
      why: 'Green is the paid colour on the tee sheet. A neutral dark toast reports without implying money moved.',
    },
    {
      decision: 'Bottom centre, inside the device',
      why: 'The operator\'s eyes are on the main action (the bottom-right of a dialog, the pinned bar on the handheld). Bottom centre is close without covering it.',
    },
  ],
  tokens: [
    { token: 'md3.scrim', value: '#1a1c1a', role: 'Tablet toast fill' },
    { token: 'radius.sm', value: '8px', role: 'Corner' },
    { token: 'elevation.e3', value: 'shadow', role: 'Lift off the screen' },
    { token: 'mobile.navBarH', value: '80', role: 'Handheld offset on root screens (+12px)' },
  ],
  engineering: {
    import: `import { usePos } from '../state/PosProvider';
const { toast } = usePos();`,
    themeOverride: (
      <>
        None in the theme. The tablet styles its one Snackbar inline in <code>src/pos/PosApp.tsx</code> (
        <code>'& .MuiSnackbarContent-root'</code>); the handheld uses MUI's default content in{' '}
        <code>src/pos/mobile/MobileApp.tsx</code>. Timing lives in <code>PosProvider</code>, not in{' '}
        <code>autoHideDuration</code>.
      </>
    ),
    notes: [
      <>
        The 2.2s timer is a <code>useEffect</code> keyed on <code>state.toast</code>. A <em>different</em> message restarts
        it. The <em>same</em> message sent again while it shows does not, because the string hasn't changed; the comment in{' '}
        <code>PosProvider.tsx</code> says otherwise. If repeated identical toasts matter, key the effect on a counter.
      </>,
      <>
        Click-away: MUI calls <code>onClose(e, 'clickaway')</code> on any click outside, and the shell clears the toast. An
        action fired from a click that also unmounts the thing clicked must toast on the next tick.{' '}
        <code>ResourcePanel.tsx</code>'s Book anyway does <code>window.setTimeout(go, 0)</code> for this; copy that, with
        its comment.
      </>,
      'Because MUI\'s own `autoHideDuration` is unused, MUI\'s pause-on-hover does nothing here.',
      'Tests read toasts by text (`findByText(\'Bay 4 booked · daily limit overridden\')`), so the words are part of the contract.',
    ],
    snippet: `const { dispatch, toast } = usePos();

const remove = () => {
  dispatch({ type: 'deleteBookings', bookingIds: [id] });
  dispatch({ type: 'closeModal' });
  toast('Booking deleted');
};`,
  },
  related: [
    { name: 'Alerts', id: 'components-feedback-status-alerts' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Loading Indicator', id: 'components-feedback-status-loading-indicator' },
    { name: 'Button', id: 'components-actions-button' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
