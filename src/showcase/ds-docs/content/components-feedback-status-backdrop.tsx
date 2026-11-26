import { withCodeSpans } from './_lib/code-spans';
import type { DsDoc } from '../types';

/**
 * Backdrop — the dim layer behind something modal. Birdie never uses it on its own; it comes with
 * Dialog, and four panels draw their own scrim.
 */
const doc: DsDoc = {
  summary: (
    <>
      The dim layer behind something modal. In Birdie it is <strong>never used on its own</strong>: it comes free with
      every dialog (MUI's Dialog draws one), and the slide-over panels and the handheld's bottom sheet draw their own
      scrim. What MUI's demos show, a spinner on a dark screen that blocks everything while something loads, is the use
      Birdie avoids.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      Avoid as a standalone component: no Birdie screen imports it, and a full-screen "please wait" has no place at a
      counter. The dim layer itself is everywhere, through Dialog and four hand-drawn scrims; this page documents those.
    </>
  ),
  mui: ['Backdrop'],
  useFor: [
    'Nothing directly. Let Dialog draw its backdrop, or use the panel and sheet scrims below.',
    'If a new full-screen panel needs one, copy the reservation panel\'s scrim and its rules.',
  ],
  dontUseFor: [
    'A loading or "syncing" screen. Show progress where the work is (the payment reader\'s stages), and keep the counter usable.',
    'Dimming part of the screen to draw attention. Use a Callout.',
    'A second dim under a dialog that already has one.',
  ],
  inBirdie: [
    {
      label: 'Reservation scrim, tablet',
      caption: (
        <>
          70% black over the whole terminal, order rail included, with the background marked <code>inert</code>. Tapping it
          does nothing: the reservation closes from its own buttons, so a stray tap can't discard edits.
        </>
      ),
      shot: 'tablet-reservation',
      tabletHash: '#/tee-sheet?res=p04_m6',
      storyId: 'weston-edits-1-·-reservation-panel-tablet--freezes-the-sheet',
    },
    {
      label: 'Dialog backdrop, tablet',
      caption: (
        <>
          Every ModalFrame sits on MUI's default 50% backdrop. Unlike the reservation scrim, a tap on it closes the dialog.
        </>
      ),
      shot: 'tablet-checkout',
      tabletHash: '#/register?order=walkin&modal=checkout',
    },
    {
      label: 'Bottom sheet scrim, handheld',
      caption: (
        <>
          MD3's 32% scrim under a bottom sheet, confined to the phone frame and covering the navigation bar. A tap on it
          closes the sheet.
        </>
      ),
      storyId: 'prototypes-mobile-tee-sheet-sheet-views--booking-actions-sheet',
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--booking-actions-sheet',
    },
  ],
  birdie: [
    { name: 'Dialog backdrop', file: 'src/pos/modals/ModalFrame.tsx', use: 'automatic under every tablet dialog. Scoped to its pane when a story renders several screens.', surface: 'tablet' },
    { name: 'Reservation scrim', file: 'src/pos/components/ReservationPanel.tsx', use: '70% black, inert background, not a way out. Escape closes the panel.', surface: 'tablet' },
    { name: 'Resource scrim', file: 'src/pos/components/ResourcePanel.tsx', use: '60% black behind a bay or court booking panel.', surface: 'tablet' },
    { name: 'Day summary scrim', file: 'src/pos/components/TeeSheetSidebar.tsx', use: '50% black, and a way out: nothing in the summary is an unsaved edit.', surface: 'tablet' },
    { name: 'BottomSheet scrim', file: 'src/pos/mobile/chrome.tsx', use: '32% black, MD3\'s scrim, inside the phone frame.', surface: 'handheld' },
  ],
  anatomy: [
    { part: 'Scrim', description: 'A black layer at 32–70% opacity over everything behind the modal thing. The panel scrims fade in on the panel\'s own motion (.22s).' },
    { part: 'Inert background (panels)', description: 'The reservation also marks the terminal behind it `inert`, so Tab cannot reach it. A scrim alone only stops the mouse.' },
  ],
  variants: [
    { name: 'Dismissing (Dialog, day summary, bottom sheet)', use: 'Nothing behind it can be lost: a read-only summary, a pick-one sheet.', avoid: 'Anything with typed input or money in progress.' },
    { name: 'Not dismissing (reservation, resource panel)', use: 'A record with edits not yet on the order. Close from the panel\'s own ✕ or actions.', avoid: 'Quick looks, where a tap outside is the natural way out.' },
    { name: 'Busy screen (MUI demo)', use: 'Not used.', avoid: 'Always. The counter keeps working while one thing waits.' },
  ],
  states: [
    { state: 'Opening', tablet: 'Fades in with the panel (`reservationPanel.motion`, .22s).', handheld: 'Fades in over 200ms as the sheet rises.' },
    { state: 'Tapped', tablet: 'Closes a dialog or the day summary. Does nothing on the reservation or a bay/court booking.', handheld: 'Closes the bottom sheet.' },
  ],
  behavior: [
    'One dim at a time. A dialog opened from the reservation portals to the body and brings its own backdrop over the scrim.',
    'The scrim covers the whole device, not part of it: "a half-dimmed screen reads as a rendering fault rather than a choice" (ReservationPanel.tsx).',
    'Whether a tap on the dim closes the thing depends on what would be lost. Say which in the component\'s comment.',
  ],
  dos: [
    'Pair a non-dismissing scrim with `inert` on the background and an Escape handler, as the reservation does.',
    'Keep the dim inside the device frame (`position: absolute`), never over the browser window.',
  ],
  donts: [
    'A spinner on a backdrop. Birdie has no blocking waits; show the stage in place.',
    'Another opacity. There are already four (see Decisions).',
    'Importing MUI Backdrop to build a panel. Copy the reservation\'s scrim, which already handles `inert` and Escape.',
  ],
  a11y: [
    'A scrim is aria-hidden; it is decoration. The modality comes from focus trapping (Dialog) or `inert` on the background (the reservation).',
    'The day summary\'s scrim is a click target with no keyboard equivalent, so its panel needs its own close button. It has one, but like ModalFrame\'s ✕ it is an icon with no accessible name.',
  ],
  decisions: [
    {
      decision: 'No blocking busy screens',
      why: 'A counter terminal serves a queue. Locking the whole screen for one task stops every other job; the payment reader shows its processing stage inside its own dialog instead.',
    },
    {
      decision: 'The reservation scrim does not close the panel',
      why: 'Per-player edits are not on the order until Check in & pay. A stray tap on the dimmed sheet would throw them away. The Panel size review notes record the choice of scrim over squeeze.',
    },
    {
      decision: 'Open: four opacities',
      why: 'Reservation 70%, resource panel 60%, day summary 50%, Dialog 50%, handheld 32%. Choose one tablet scrim token (and keep MD3\'s 32% on the handheld), and put it in tokens.ts.',
    },
  ],
  tokens: [
    { token: 'reservationPanel.motion', value: '.22s cubic-bezier(.2,0,0,1)', role: 'Scrim fade and panel slide (tablet)' },
    { token: '(none yet)', value: 'rgba(0,0,0,.7) / .6 / .5 / .32', role: 'Scrim fills are literals in each component' },
  ],
  engineering: {
    import: `// Don't import Backdrop. Dialog draws its own; panels copy the reservation scrim:
<Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 79, bgcolor: 'rgba(0,0,0,.7)' }} />`,
    themeOverride: <>None. <code>MuiBackdrop</code> is not overridden; the Dialog backdrop is MUI's default.</>,
    notes: [
      <>
        z-order on the tablet: tee-sheet toolbar 40, multi-select bar 60, scrim 79, panel 80, then dialogs (MUI's 1300) on
        top. Read it from <code>ReservationPanel.tsx</code> before adding a layer.
      </>,
      <>
        A scoped dialog (Storybook rendering two screens) sets its backdrop to <code>position: absolute</code> so it dims its
        own pane. See <code>ModalFrame</code> and <code>modal-container.tsx</code>.
      </>,
      'The `inert` attribute is set in PosApp, not in the panel, because it has to cover siblings of the panel.',
    ],
  },
  related: [
    { name: 'Dialog', id: 'components-feedback-status-dialog' },
    { name: 'Loading Indicator', id: 'components-feedback-status-loading-indicator' },
    { name: 'Progress Indicators', id: 'components-feedback-status-progress-indicators' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
