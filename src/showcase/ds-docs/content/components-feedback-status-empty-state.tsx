import { withCodeSpans } from './_lib/code-spans';
import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Empty State — what a list, panel or sheet says when there is nothing in it. Birdie's own
 * components on both surfaces; there is no MUI equivalent.
 */
const doc: DsDoc = {
  summary: (
    <>
      What a list, panel or sheet shows when there is nothing in it: <em>"No items added yet"</em>,{' '}
      <em>"No open tabs"</em>, <em>"Every bay is switched off"</em>. It tells the operator the screen works and is simply
      empty, and, at its best, what to do next. Birdie draws its own on both surfaces: a small icon-over-label on the
      tablet (<code>EmptyState</code>) and a fuller title, body and action on the handheld (<code>Empty</code>).
    </>
  ),
  status: 'core',
  statusNote: (
    <>
      Used on both surfaces: <code>EmptyState</code> in 11 tablet files, <code>Empty</code> in 4 handheld files, and a few
      richer one-offs (the Bay Sheet with every bay off, Orders & Tips on a quiet day). No MUI component is involved.
    </>
  ),
  useFor: [
    'Nothing yet: an empty order, no open tabs, no drawer open.',
    'Nothing matches: a search or filter with no results.',
    'Nothing selected: the detail side of a list, before a row is picked ("Pick an order to see what was in it").',
    'Everything hidden by the operator\'s own choice: every bay switched off, with the one way back.',
  ],
  dontUseFor: [
    'Loading. Nothing in the prototype loads; if it does later, show a Skeleton, not "No results".',
    'Errors. A failure is a Callout with what to do, not an empty list.',
    'A zero that is a real answer. Orders & Tips shows $0.00 totals and says it is a quiet day, rather than hiding the band.',
  ],
  inBirdie: [
    {
      label: 'Every bay switched off, Bay Sheet',
      caption: (
        <>
          The fullest empty state on the tablet: an icon, <em>"Every bay is switched off"</em>, one line of guidance, and the
          only way back as a green <strong>Show all bays</strong>. It says what happened and undoes it in one tap.
        </>
      ),
      shot: 'ds-bay-sheet-all-off',
      tabletHash: '#/bays?hide=bay-1,bay-2,bay-3,bay-4,bay-5,lesson,nicklaus,palmer,east-porch,west-porch',
      storyId: 'prototypes-tablet-bay-sheet-switching-bays-off--every-bay-off',
    },
    {
      label: 'The empty order rail',
      caption: (
        <>
          <em>"No items added yet"</em> on the order rail. In the Weston edition the empty state is also the button that
          collapses the rail: an empty order is the only time the rail is pure cost (Weston's ask on the fifth call).
        </>
      ),
      storyId: 'weston-edits-13-·-order-rail-tablet--empty-and-so-collapsible',
    },
    {
      label: 'A quiet day, Orders & Tips',
      caption: (
        <>
          <em>"No payments on this day"</em> under totals that still read $0.00, with a line saying nothing is missing. The
          empty state reassures that the zeros are real.
        </>
      ),
      storyId: 'v1-→-v2-migration-9-·-orders-tips-tablet--an-empty-day',
    },
  ],
  birdie: [
    {
      name: 'EmptyState',
      file: 'src/pos/components/primitives.tsx',
      use: 'tablet lists and detail panes. A 38px icon over a 13px label, centred in whatever height it is given. Pass `sx={{ height: \'auto\', py: 8 }}` inside a scrolling list.',
      surface: 'tablet',
    },
    {
      name: 'Empty',
      file: 'src/pos/mobile/screens/restaurant/parts.tsx',
      use: 'handheld lists: a 48px icon, a title, an optional body and an optional action. The pattern to copy on either surface.',
      surface: 'handheld',
    },
    {
      name: 'AllSwitchedOff',
      file: 'src/pos/components/ResourceSheetView.tsx',
      use: 'the Bay and Court sheets with every column off. Private to the file; the model for a tablet empty state with an action.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Icon', description: 'The subject of the list, in outline grey: shopping_cart, receipt, event, search_off. 38px on the tablet, 40–48px on the handheld.' },
    { part: 'Title', description: 'What is empty, in plain words: "No open tabs". On the tablet\'s EmptyState this is the only text.' },
    { part: 'Body (optional)', description: 'What to do next: "Seat a table, or open a tab for the bar." The handheld has it; the tablet mostly does not.' },
    { part: 'Action (optional)', description: 'The one way forward, when there is exactly one: Show all bays.' },
  ],
  variants: [
    { name: 'Nothing yet', use: 'The list is empty because nothing has happened: "No items added yet", "No drawer is open".', avoid: 'Blaming the operator. It is a start state, not a mistake.' },
    { name: 'Nothing matches', use: 'A search or filter returned nothing: "No tee times match these filters", "Nothing matches — try another filter".', avoid: 'Hiding the filters. Keep them in view so the way out is obvious.' },
    { name: 'Nothing selected', use: 'The detail pane of a master–detail screen: "Pick an order to see what was in it".', avoid: 'Long instructions. One line.' },
    { name: 'Hidden by choice', use: 'Every column switched off: say so and offer the reset.', avoid: 'A generic "No data". The operator did this; tell them how to undo it.' },
  ],
  states: [
    { state: 'Empty', tablet: 'Centred in the list or pane, outline grey. Usually no action.', handheld: 'Near the top of the list (64dp down), centred, with a title and usually a body.' },
    { state: 'Becomes full', tablet: 'Replaced in place by the first row. No animation.', handheld: 'Same.' },
  ],
  behavior: [
    'Show it only once the list is known to be empty. With live data, a loading list is a Skeleton first.',
    'Keep the screen\'s controls (filters, search, New tab) visible above it; they are usually the way out.',
    'When there is exactly one fix, make it a button in the empty state (Show all bays). When there are several, name them in the body.',
  ],
  content: [
    'Title: "No {things}" or "Nothing {verb}s", sentence case. "No open tabs", "Nothing ordered yet".',
    'Body: the next step, as an instruction. "Seat a table, or open a tab for the bar."',
    'Say what the operator controls: "Every bay is switched off", not "No bays available".',
    'Pick one punctuation rule. Today the tablet mixes "No reservations for this date." (full stop) with "No items added yet" (none). Proposal: no full stop on a one-line title; full stops in the body.',
  ],
  dos: [
    'Name the thing that is empty, in the screen\'s own word (tabs, tee times, bays).',
    'Add the next step in a body line, as the handheld does.',
    'Give the one-tap fix when the emptiness is the operator\'s own filter.',
  ],
  donts: [
    'A big illustration. This is a work tool; the icon is enough.',
    'An empty state for zeros that are the answer (a quiet day\'s $0.00).',
    'Different words for the same emptiness on each surface. The tablet says "No open tabs"; the handheld adds "Seat a table, or open a tab for the bar." Bring the tablet up to the handheld.',
  ],
  a11y: [
    'The icon is aria-hidden (Birdie\'s `Icon` sets it); the label carries the meaning.',
    <>
      <strong>The tablet label is a hair under AA.</strong> <code>EmptyState</code> draws its 13px label in{' '}
      <code>md3.outline</code>: <Contrast fg={md3.outline} bg="#ffffff" label="No items" /> on white (it rounds to 4.5 but
      falls just short) and <Contrast fg={md3.outline} bg={md3.surface} label="No items" /> on the surface grey. The
      handheld title uses <code>md3.onSurface</code>, <Contrast fg={md3.onSurface} bg={md3.surface} />. Move the tablet
      label to <code>md3.onSurfaceVariant</code>: <Contrast fg={md3.onSurfaceVariant} bg={md3.surface} />.
    </>,
    'When the order rail\'s empty state is the collapse button, its accessible name is "Collapse the order rail", not the visible "No items added yet". Screen reader users hear the action; sighted users see the state. Consider showing the action too.',
  ],
  decisions: [
    {
      decision: 'Small and quiet on the tablet',
      why: 'The tablet\'s empty states sit inside dense panels beside live data (the order rail next to the tee sheet). A large empty state would pull the eye from the screen that is full.',
    },
    {
      decision: 'The empty order rail collapses the rail',
      why: 'Weston, fifth call: an empty order is the only time the rail is pure cost, so the thing saying it is empty is the thing that gets it out of the way (LeftPanel.tsx comment).',
    },
    {
      decision: 'Open: one empty state component',
      why: 'The tablet\'s EmptyState has no body or action, so two tablet screens hand-draw a fuller one (the Bay Sheet, Orders & Tips). The handheld\'s Empty, which has both, lives in restaurant parts. Give EmptyState optional `body` and `action`, and move Empty to a shared handheld file.',
    },
  ],
  tokens: [
    { token: 'md3.outline', value: '#707973', role: 'Tablet icon and label (see the contrast note)' },
    { token: 'md3.onSurface', value: '#191d19', role: 'Handheld title' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Handheld body' },
  ],
  engineering: {
    import: `import { EmptyState } from '../components/primitives';           // tablet
import { Empty } from './parts';                                  // handheld, restaurant screens`,
    themeOverride: <>None. Both are plain <code>Stack</code> + <code>Typography</code> compositions.</>,
    notes: [
      '`EmptyState` fills `height: 100%` by default so it centres in a pane. Inside a scrolling list, pass `sx={{ height: \'auto\', py: 8 }}` (TabList, Inventory do).',
      'It takes an icon name (Material Symbols ligature, via `Icon`), not a component.',
      'Tests often find empty states by a data hook (`data-resource-all-off`, `data-no-payments`). Add one to any new empty state a story asserts on.',
    ],
    snippet: `{rows.length === 0 ? (
  <EmptyState
    icon="receipt"
    label={query ? 'No open tab matches that' : 'No open tabs'}
    sx={{ py: 8, height: 'auto' }}
  />
) : (
  rows.map((r) => <TabRow key={r.tab.id} row={r} />)
)}`,
  },
  related: [
    { name: 'Skeleton', id: 'components-feedback-status-skeleton' },
    { name: 'Loading Indicator', id: 'components-feedback-status-loading-indicator' },
    { name: 'Alerts', id: 'components-feedback-status-alerts' },
  ],
};

const content: DsDoc = withCodeSpans(doc);
export default content;
