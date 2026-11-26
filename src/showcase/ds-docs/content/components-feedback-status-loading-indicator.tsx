import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Loading Indicator — how Birdie shows it is working. One real wait today: the card reader.
 */
const doc: DsDoc = {
  summary: (
    <>
      How Birdie shows that it is working on something. Today there is exactly <strong>one wait</strong> in the product:
      the card reader's processing step, a 900ms pause that stands in for the payment network. The tablet spins an icon
      over the amount; the handheld shows MUI's circular spinner inside the reader's green disc. Both say{' '}
      <em>"Processing…"</em> in words. Everything else in the prototype is local and instant.
    </>
  ),
  statusNote: (
    <>
      In use in one place on each surface, the payment reader. The tablet draws its own spinning icon; the handheld uses MUI{' '}
      <code>CircularProgress</code>. A production build that loads data will need more of this page; see Decisions.
    </>
  ),
  mui: ['CircularProgress'],
  useFor: [
    'A short wait the operator must sit through, in place: the payment processing.',
    'Always with words beside it: "Processing…", "Don\'t remove the card".',
  ],
  dontUseFor: [
    'Loading a list or a screen: use a Skeleton in the shape of what is coming.',
    'A wait that blocks the whole counter: there is no full-screen spinner in Birdie (see Backdrop).',
    'Progress through steps (checked in → teed off → finished): that is the round status chip or rail, not a spinner.',
    'Anything that measures how much is done: use a determinate bar (Progress Indicators).',
  ],
  inBirdie: [
    {
      label: 'Card reader, handheld',
      caption: (
        <>
          A takeover screen: the green disc shows the contactless mark while waiting and a white spinner while processing,
          with <em>"Processing…"</em> and <em>"Don't remove the card"</em> under the amount. Cancel is disabled meanwhile.
        </>
      ),
      shot: 'mobile-card-reader',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-pro-shop-payment--reader-card',
    },
    {
      label: 'Payment reader, tablet',
      caption: (
        <>
          A 420px ModalFrame in three stages. While processing, the icon becomes a spinning <code>sync</code>, the label
          reads <em>"Processing…"</em>, and the footer buttons disappear.
        </>
      ),
      storyId: 'prototypes-tablet-pro-shop-payment--payment-reader-card',
      tabletHash: '#/register?order=walkin&modal=payment&method=card',
    },
  ],
  birdie: [
    {
      name: 'PaymentReader',
      file: 'src/pos/modals/Checkout.tsx',
      use: 'the tablet reader dialog. Stage 2 spins the `sync` icon with a CSS keyframe; it is not an MUI component.',
      surface: 'tablet',
    },
    {
      name: 'PaymentReaderScreen',
      file: 'src/pos/mobile/screens/register/PaymentReaderScreen.tsx',
      use: 'the handheld reader. `CircularProgress size={48}` in white on the green disc while processing.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Spinner', description: 'Indeterminate: a spinning icon (tablet) or MUI\'s circular track (handheld). It says "busy", not how long.' },
    { part: 'Label', description: '"Processing…" in the place the instructions were, so the eye does not move.' },
    { part: 'Context', description: 'The amount stays on screen, large, the whole time.' },
  ],
  states: [
    { state: 'Waiting for the card', tablet: 'Method icon, "Insert, swipe, or tap card to take payment", Cancel and Simulate tap.', handheld: 'Contactless mark in the green disc, Simulate approval and Key in card.' },
    { state: 'Processing', tablet: 'Spinning sync icon, "Processing…", no footer buttons. The ✕ and a backdrop tap still close the dialog.', handheld: 'White spinner, "Processing…", "Don\'t remove the card". Every button disabled, no back.' },
    { state: 'Approved', tablet: 'Green check, "Approved", a success Callout and the receipt; Done.', handheld: 'Replaced by the receipt screen, so there is nothing to go back to.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '40px icon in an 84px disc', why: 'The amount (28px) is the hero; the icon supports it.' },
    { surface: 'Handheld', size: '48px spinner in a large green disc', why: 'Visible at arm\'s length while the customer holds the reader.' },
  ],
  behavior: [
    'Show a spinner only for waits the operator cannot work around. Everything else stays usable.',
    'Never a spinner with no words. The label says what is being waited on.',
    'Disable the ways out while a money action is in flight. The handheld does; the tablet does not yet (see Decisions).',
    'Don\'t flash it. The prototype holds "processing" for 900ms on purpose, so a fast approval still reads as a step.',
  ],
  content: [
    '"Processing…" with a real ellipsis character.',
    'Add the one instruction that matters during the wait: "Don\'t remove the card".',
  ],
  dos: ['Keep the amount on screen during the wait.', 'Pair the spinner with a status word.', 'Lock the exits during a payment.'],
  donts: [
    'A spinner on a button. Payments hand over to the reader screen instead (see Button).',
    'A full-screen dim with a spinner.',
    'Spinners for local, instant actions.',
  ],
  a11y: [
    'The status word is real text, so it is read; the spinning icon is aria-hidden. Consider role="status" on the label so the change from waiting to processing is announced.',
    'Neither spinner respects prefers-reduced-motion. Add a reduced-motion rule that stops the rotation and keeps the word.',
    <>
      Contrast, computed: the tablet label <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" label="Processing" />.
    </>,
  ],
  decisions: [
    {
      decision: 'Stages, not a spinner-then-done',
      why: 'The reader is modelled as explicit stages because each has its own copy and controls (key-in is only offered while waiting). Source: the PaymentReader comment in Checkout.tsx.',
    },
    {
      decision: 'Open: lock the tablet reader while processing',
      why: 'The handheld disables Cancel while processing "so the screen can\'t unmount under the timer". The tablet removes its footer but leaves the ✕, Escape and a backdrop tap live. Pass an `onClose` that ignores closes during stage 2.',
    },
    {
      decision: 'Open: one spinner',
      why: 'The tablet spins a Material Symbols icon with an inline keyframe; the handheld uses MUI CircularProgress. Pick one, and theme it.',
    },
    {
      decision: 'Open: loading for real data',
      why: 'The prototype has no network, so it has no loading states. Production will (the tee sheet for a new day, customer search). Plan Skeletons in the shape of the rows before building those screens.',
    },
  ],
  tokens: [
    { token: 'md3.primary', value: '#17a34a', role: 'Handheld reader disc' },
    { token: 'md3.onPrimary', value: '#ffffff', role: 'Handheld spinner' },
    { token: 'md3.surfaceContainer', value: '#eef1ee', role: 'Tablet icon disc while waiting' },
  ],
  engineering: {
    import: `import { CircularProgress } from '@mui/material';   // handheld reader only`,
    themeOverride: <>None. <code>MuiCircularProgress</code> is not overridden; the handheld sets its size and colour inline.</>,
    notes: [
      'Both readers fake the round-trip with `window.setTimeout(…, 900)`. When a real reader SDK arrives, the stage comes from its events, and the timer goes.',
      'The handheld reader is a `takeover` route (`PRESENTATION` in navigation.tsx): no back arrow, no navigation bar. Approval replaces it with the receipt.',
    ],
    snippet: `{stage === 'processing' ? (
  <CircularProgress size={48} sx={{ color: md3.onPrimary }} />
) : (
  <Contactless sx={{ fontSize: 56 }} />
)}
<Typography variant="h5">{stage === 'processing' ? 'Processing…' : 'Tap, insert or swipe'}</Typography>`,
  },
  related: [
    { name: 'Progress Indicators', id: 'components-feedback-status-progress-indicators' },
    { name: 'Skeleton', id: 'components-feedback-status-skeleton' },
    { name: 'Backdrop', id: 'components-feedback-status-backdrop' },
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
