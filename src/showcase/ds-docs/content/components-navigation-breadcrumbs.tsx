import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Breadcrumbs — Birdie is two levels deep at most, so clickable trails don't fit. What it does have:
 * written paths into Buck (plain text, `buckPath`), and a one-step "Back to …" bar.
 */
const doc: DsDoc = {
  summary: (
    <>
      A trail of links showing where you are in a hierarchy (Settings › Stations › Grill 1). <strong>Birdie doesn't use
      clickable breadcrumbs:</strong> nothing in it is more than two levels deep. The tablet goes from the main navigation
      straight to a screen; the handheld goes down with a back arrow. What Birdie does have are two cousins: written{' '}
      <strong>paths into Buck</strong> ("Buck › Course Settings › Taxes & Fees"), which tell the operator where a setting is
      changed, and a one-step <strong>"Back to …" bar</strong> after a jump.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      MUI's <code>Breadcrumbs</code> isn't imported in <code>src/pos</code>. A candidate to remove from the system. Keep the
      written Buck paths (plain text) and the Back to … bar (one step); don't build a clickable trail.
    </>
  ),
  mui: ['Breadcrumbs'],
  useFor: [
    'Nothing clickable in Birdie today.',
    'Written as text: where a read-only setting is changed in Buck, built by buckPath().',
  ],
  dontUseFor: [
    'Going back on the handheld: the top app bar’s back arrow pops the stack.',
    'Returning after a jump on the tablet (order number → Order Lookup): the "Back to the reservation" bar.',
    'Showing which settings section is open: the section list on the left already highlights it.',
  ],
  inBirdie: [
    {
      label: 'Written paths into Buck, tablet',
      caption: (
        <>
          Settings › Taxes & Fees is read-only on the counter. The callout says where to change it ("Buck › Course Settings ›
          Taxes & Fees") and each group repeats its own path on the right. Plain text, not links: Birdie can't open Buck.
        </>
      ),
      shot: 'tablet-settings-buck',
      tabletHash: '#/settings?section=taxes',
    },
    {
      label: 'One step back, not a trail',
      caption: (
        <>
          Tap a paid reservation's order number and Order Lookup opens with a green{' '}
          <strong>Back to the reservation · &lt;name&gt;</strong> bar across the top. It's the only breadcrumb a counter needs:
          the one place you just were. (Weston Edits does the same on the order rail, after opening the register.)
        </>
      ),
      storyId: 'v1-→-v2-migration-12-·-order-lookup-tablet--from-a-reservation-and-back',
    },
    {
      label: 'The handheld goes down with a back arrow',
      caption: (
        <>
          A reservation on the phone: a back arrow, the booking's name and time. Each level owns the whole screen, so the
          title already says where you are.
        </>
      ),
      shot: 'mobile-reservation',
      handheldRoute: 'weston-edits-1-·-reservation-panel-mobile--reservation',
    },
  ],
  birdie: [
    {
      name: 'buckPath',
      file: 'src/pos/data/buck-club.ts',
      use: 'a written path to a Buck setting: "Buck › Course Settings › <section> › <group>". Text only.',
      surface: 'tablet',
    },
    {
      name: 'BackToReservation',
      file: 'src/pos/components/operations/OrderLookupView.tsx',
      use: 'one step back after an order number opened Order Lookup and closed the reservation you were reading.',
      surface: 'tablet',
    },
    {
      name: 'ReturnToReservation',
      file: 'src/pos/components/LeftPanel.tsx',
      use: 'the same step back, on the order rail, when the order number opened the register (Weston Edits).',
      surface: 'tablet',
    },
    {
      name: 'TopAppBar (leading="back")',
      file: 'src/pos/mobile/chrome.tsx',
      use: 'going up a level on the handheld.',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Path (Buck)', description: 'Segments joined by " › ", starting with "Buck". 11.5–12.5px, quiet colour, never underlined.' },
    { part: 'Back bar (tablet)', description: 'Full width across the top of the screen (Order Lookup) or the order rail: arrow, "Back to the reservation · <name>", primary container fill.' },
    { part: 'Back arrow (handheld)', description: 'The leading icon of the top app bar, 48dp target, labelled "Back".' },
  ],
  variants: [
    {
      name: 'Written path',
      use: 'Pointing at a setting in another app (Buck) that Birdie can’t open.',
      avoid: 'Paths within Birdie. The screen title says where you are.',
    },
    {
      name: '"Back to …" bar',
      use: 'After a jump that closed what the operator was reading.',
      avoid: 'Ordinary navigation from the main menu: there is nothing to go back to.',
    },
    { name: 'Clickable breadcrumb trail', use: 'Not used.', avoid: 'Everywhere. Two levels don’t need a trail.' },
  ],
  states: [
    { state: 'Written path', tablet: 'Static text. Nothing to press.', handheld: 'Not used.' },
    {
      state: 'Back bar',
      tablet: 'Shown only while there is somewhere to return to (state.returnToBooking). Gone once used.',
      handheld: 'The back arrow is always there below the root; at a root it is replaced by the navigation bar.',
    },
  ],
  behavior: [
    'Birdie is flat on purpose: main navigation → screen on the tablet, root → push on the handheld.',
    'A Back to … bar ends the trip where it started: the tee sheet, with the reservation open again.',
    'Buck paths are copy, not navigation. They answer "where do I change this?" for a manager at the counter.',
  ],
  content: [
    'Buck paths use " › " with spaces, the section names exactly as Buck shows them, and start with "Buck".',
    'Back bars say where they go and name what the operator was looking at: "Back to the reservation · Reed, M.", not "Back".',
  ],
  dos: ['Write Buck paths with buckPath(), so every screen spells them the same way.', 'Name the destination in a Back bar.'],
  donts: ['Make a Buck path look like a link.', 'Add a clickable trail above a Birdie screen.'],
  a11y: [
    <>
      The written paths are quiet on purpose, but the group asides are{' '}
      <Contrast fg={md3.outline} bg={md3.surface} label="Buck ›" /> at 11.5px on the settings page, under AA for text that
      size. The callout's path is fine. Move the asides to <code>md3.onSurfaceVariant</code> (
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surface} />) or accept them as decorative repeats of the callout.
    </>,
    'The Back bar is a button with an aria-label that names the booking ("Back to the reservation for Reed, M.").',
    'If a clickable trail is ever added, wrap it in nav with aria-label="Breadcrumb" and mark the current page with aria-current.',
  ],
  decisions: [
    {
      decision: 'No clickable breadcrumbs',
      why: 'The deepest path in Birdie is two levels. A trail would cost a row on a 800px-tall terminal to say what the title already says.',
    },
    {
      decision: 'Buck paths are text',
      why: 'Birdie reads Buck’s settings but can’t open Buck. A path that looked tappable and did nothing would teach people to distrust the screen.',
    },
  ],
  engineering: {
    import: `import { buckPath } from '../../data/buck-club';`,
    notes: [
      <>
        <code>buckPath(section, group?)</code> joins <code>['Buck', 'Course Settings', section, group]</code> with{' '}
        <code>' › '</code>. Settings uses it in the read-only callout and in each group's heading aside.
      </>,
      <>
        Both back bars read <code>state.returnToBooking</code>, set when an order number is followed out of a reservation
        (<code>openOrderLookup</code> with <code>fromBookingId</code>) and cleared when the bar is used (
        <code>clearReturnToBooking</code>).
      </>,
    ],
    snippet: `<Callout tone="info" icon="lock">
  Read-only here. Change it in {buckPath('Taxes & Fees')}; this terminal picks it up on its next sync.
</Callout>`,
  },
  related: [
    { name: 'Link', id: 'components-navigation-link' },
    { name: 'Tabs', id: 'components-navigation-tabs' },
    { name: 'App Chrome', id: 'components-layout-structure-app-chrome' },
  ],
};

export default doc;
