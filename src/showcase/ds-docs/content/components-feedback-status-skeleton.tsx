import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import type { DsDoc } from '../types';

/**
 * Skeleton — placeholders in the shape of content that is loading. Not used: nothing loads in the
 * prototype. Documented for the production build.
 */
const doc: DsDoc = {
  summary: (
    <>
      Grey placeholders in the shape of content that is still loading: a row, a name, a price. Birdie does not use it
      today, because nothing in the prototype loads; every screen is drawn from local state. A production build will
      fetch the day's tee sheet, customer search results and the menu, and those are where Skeletons belong.
    </>
  ),
  status: 'available',
  statusNote: (
    <>
      Themed by MUI defaults and fine to adopt, but no Birdie screen imports it. Adopt it when the first screen loads real
      data, in the shape of that screen's rows.
    </>
  ),
  mui: ['Skeleton'],
  useFor: [
    'A list loading for the first time: tee times for a new day, customer search results, open tabs.',
    'A detail pane loading after a row is picked (the customer record, an order in Order Lookup).',
    'Anything over about 300ms, where a blank area would look broken.',
  ],
  dontUseFor: [
    'A payment in flight: that is the reader\'s own processing stage.',
    'Instant local actions. A skeleton that flashes for 50ms is worse than nothing.',
    'An empty result. When the load finishes with nothing, show the Empty State.',
  ],
  inBirdie: [
    {
      label: 'Where it would go first: the tee sheet',
      caption: (
        <>
          Switching days redraws the grid from local data today. With a server, the booking chips are the thing to stand in
          for: grey blocks at the chip height, inside the real grid, so the times and slots never move.
        </>
      ),
      shot: 'tablet-tee-sheet',
      tabletHash: '#/tee-sheet',
    },
    {
      label: 'And on the handheld: the booking cards',
      caption: (
        <>
          The phone's tee sheet is a list of outlined booking cards. Two grey lines and a grey badge in the card's own
          outline would hold the layout while a day loads.
        </>
      ),
      shot: 'mobile-tee-sheet',
      frame: 'handheld',
      handheldRoute: 'prototypes-mobile-tee-sheet-sheet-views--default',
    },
  ],
  anatomy: [
    { part: 'Shape', description: 'Text lines, a circle (avatar), a rounded rectangle (a card, a badge), in the real size of what replaces it.' },
    { part: 'Pulse', description: 'MUI\'s default pulse animation. Use it; "wave" draws more attention than a counter needs.' },
  ],
  variants: [
    { name: 'Text', use: 'Names and captions in a row.', avoid: 'Numbers the operator will act on; show "—" until known.' },
    { name: 'Rounded', use: 'Booking chips, cards, badges.' },
    { name: 'Circular', use: 'Avatars in player rows.' },
    { name: 'Rectangular', use: 'Rarely; Birdie has no square-cornered content.', avoid: 'Anything that is a pill or card in Birdie.' },
  ],
  states: [
    { state: 'Loading', tablet: 'Skeleton rows inside the real frame (grid, rail, panel). Controls stay live.', handheld: 'Skeleton cards inside the real list, under the real top app bar.' },
    { state: 'Loaded', tablet: 'Replaced in place, no fade.', handheld: 'Same.' },
  ],
  behavior: [
    'Inside the real layout: the toolbar, headers and time gutter render immediately; only the data area is a skeleton.',
    'Match the count roughly (a tee sheet shows a screen of rows, not three).',
    'Delay it ~300ms so fast loads never show it.',
  ],
  dos: ['Shape skeletons like the real rows.', 'Keep the page\'s controls usable while it loads.'],
  donts: ['A spinner where a skeleton fits.', 'Skeletons for money values on a payment screen.'],
  a11y: [
    'MUI\'s Skeleton is an empty span with no role, so a screen reader passes over it. Put aria-busy="true" on the list while it loads, and announce when it is done if the load is slow.',
    'Respect prefers-reduced-motion: turn the pulse off (`animation={false}`).',
  ],
  decisions: [
    {
      decision: 'Documented but unused',
      why: 'The prototype has no network, so there is nothing to wait for. Keeping the page means the first engineer who adds a fetch has a pattern ready, instead of a spinner.',
    },
  ],
  tokens: [
    { token: 'md3.onSurface at 11%', value: md3.onSurface, role: 'MUI\'s fill: `text.primary` at 11% alpha, which the theme sets to Birdie\'s on-surface, so it already sits on the green-grey surfaces' },
    { token: 'radius.xl / radius.md', value: '28px / 12px', role: 'Pills and cards, to match what loads' },
  ],
  engineering: {
    import: `import { Skeleton } from '@mui/material';`,
    themeOverride: <>None. Add a <code>MuiSkeleton</code> override in <code>src/theme/theme.ts</code> when it is first used.</>,
    notes: ['The stories below are generic shapes, kept for reference. Birdie\'s first real skeleton should copy a tee-sheet row or a handheld booking card.'],
    snippet: `{loading
  ? Array.from({ length: 8 }, (_, i) => <Skeleton key={i} variant="rounded" height={46} sx={{ mb: 0.5 }} />)
  : rows.map((r) => <BookingRow key={r.id} booking={r} />)}`,
  },
  related: [
    { name: 'Loading Indicator', id: 'components-feedback-status-loading-indicator' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
    { name: 'Progress Indicators', id: 'components-feedback-status-progress-indicators' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
