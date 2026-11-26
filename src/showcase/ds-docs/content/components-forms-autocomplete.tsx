import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Autocomplete — MUI's type-ahead field with a popup list. Birdie finds people and things by search
 * all day, but never in a popup: it searches into a list on the page, rich enough to tell two
 * people with the same name apart.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI's text field with a <strong>filtered popup list</strong> under it. Birdie does the job (find a customer, a
      golfer, a rate, an order) dozens of times a shift, but <strong>not with a popup</strong>. It searches into a list on
      the page: a search field, then result rows with the name, memberships, contact details and what they owe, so the
      operator can tell two Brennevins apart before picking. This page documents MUI's Autocomplete so nobody reaches for
      it, and describes the search pattern Birdie uses instead.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      No Birdie screen uses MUI's <code>Autocomplete</code>. Use the search-and-list pattern: a search field and{' '}
      <code>ResultRow</code>s on the tablet, <code>SearchBar</code> with filter chips and a sectioned list on the handheld.
    </>
  ),
  mui: ['Autocomplete'],
  useFor: [
    'Nothing in Birdie today.',
    'At most: one short field in a tablet dialog that suggests from a small fixed list and also accepts free text.',
  ],
  dontUseFor: [
    'Finding a customer or golfer: search, then pick from a result list on the page.',
    'Choosing from a list you could show: use Select or chips.',
    'Anything on the handheld: a popup list renders outside the phone frame and is hard to scroll with a thumb.',
    'Tagging several values: use chips. See Multi-Select.',
  ],
  inBirdie: [
    {
      label: 'Instead: Customer Search, tablet',
      caption: (
        <>
          Search on the left, the open record on the right, so the query stays while you compare. Before typing, the list
          shows who owes the course. Each row: the name, membership chips, email and phone, and the balance in red.
        </>
      ),
      shot: 'tablet-customer-search',
      tabletHash: '#/customers?cid=M005',
    },
    {
      label: 'Instead: People, handheld',
      caption: (
        <>
          A 56dp search pill, filter chips under it, and the roster A to Z with sticky letters, the way a phone's contacts
          work. Typing filters the list in place.
        </>
      ),
      shot: 'mobile-people',
      frame: 'handheld',
      handheldRoute: 'mobile-screens-7-·-people--people-list',
    },
    {
      label: 'Instead: whose account, tablet checkout',
      caption: (
        <>
          The house-account and card-on-file tenders start on the order's customer. Search finds someone else; picking them
          collapses the list into a green card with <strong>Change</strong>.
        </>
      ),
      storyId: 'v1-→-v2-migration-11-·-customer-search-tablet--charging-a-house-account',
    },
  ],
  birdie: [
    {
      name: 'ResultRow / ResultList',
      file: 'src/pos/modals/ModalFrame.tsx',
      use: 'search results inside a tablet dialog: a two-line row with an optional badge, in a scrolling bordered list.',
      surface: 'tablet',
    },
    {
      name: 'TenderCustomerPicker',
      file: 'src/pos/modals/TenderCustomerPicker.tsx',
      use: 'choosing a person inside a flow: starts on the likely one, search to change, a chosen card with Change.',
      surface: 'tablet',
    },
    {
      name: 'CustomersView',
      file: 'src/pos/components/operations/CustomersView.tsx',
      use: 'search as a whole screen: list and record side by side.',
      surface: 'tablet',
    },
    {
      name: 'SearchBar + GolferList',
      file: 'src/pos/mobile/screens/people/parts.tsx',
      use: 'search on the handheld: a 56dp pill, filter chips, and an A–Z list. The picker reuses it (GolferPickerScreen).',
      surface: 'handheld',
    },
  ],
  anatomy: [
    { part: 'Search field', description: 'A search icon, a placeholder that says what it matches ("Name, email, phone or customer ID"), and a clear ✕ once there is text.' },
    { part: 'List heading', description: 'What the list is: "Owe the course · 34" before typing, "12 matching "bren"" after.' },
    { part: 'Result row', description: 'The name (never with the membership baked in), chips for memberships and types, contact details, and the number that matters to this task.' },
    { part: 'Empty state', description: 'Says what to try, and offers to add the person: "Add "Sam Quill"".' },
    { part: 'Chosen card (in a flow)', description: 'The picked person in a green card, with Change. The list goes away.' },
  ],
  variants: [
    {
      name: 'Search screen (tablet)',
      use: 'Customer Search, Order Lookup, Gift Cards, Inventory: search is the job.',
      avoid: 'A popup. The results are the screen.',
    },
    {
      name: 'Search in a dialog (tablet)',
      use: 'Finding someone in the middle of a task: a tender, a reservation, a seat. A handful of results (six in a tender).',
      avoid: 'Long result lists. If they need scrolling, the query is too short.',
    },
    {
      name: 'Search and filter (handheld)',
      use: 'People and the golfer picker: a search pill, filter chips, the whole roster under it.',
      avoid: 'A dropdown under the field.',
    },
    {
      name: "MUI's Autocomplete",
      use: 'Not used.',
      avoid: 'Product screens. Its one-line options can\'t show a membership or a balance.',
    },
  ],
  states: [
    { state: 'Empty query', tablet: 'Customer Search shows who was added this session and who owes the course. A dialog shows nothing yet.', handheld: 'The whole roster, A to Z.' },
    { state: 'Typing', tablet: 'Nothing until two characters, then a capped list: 30 on Customer Search, 6 in a tender or the customer record.', handheld: 'People and the golfer picker filter from the first character, with no cap. The customer record\'s search works like the tablet\'s (two characters, 8 results).' },
    { state: 'Results', tablet: '"n matching "query"" and the rows. The open one is tinted green.', handheld: 'The list, still grouped by letter.' },
    { state: 'No matches', tablet: '"Nobody on the roster matches. Check the spelling, try a phone number — or add them." and an Add button.', handheld: '"No one matches. Try a surname or the last four digits of a phone number."' },
    { state: 'Chosen', tablet: 'In a flow, a green card with the person and Change.', handheld: 'Picking pops back to the screen that asked, with a toast.' },
  ],
  sizing: [
    { surface: 'Tablet', size: '48px search pill on Customer Search; 64px result rows at least', why: 'Rows carry two lines and chips, so they are taller than the dense lists around them.' },
    { surface: 'Handheld', size: '56dp search pill; 72dp two-line rows', why: "Material's search bar and two-line list item." },
  ],
  behavior: [
    'Search matches the name, the booking name ("Farnsworth, W."), email, customer ID, and phone once three digits are typed.',
    'The tablet waits for two characters, so a single letter never floods the list. The handheld\'s People list filters from the first, and shows the whole roster before that.',
    'Results are capped on the tablet (30 on Customer Search, 6 in a tender). A cap means "type more", not "there are only 30".',
    'Picking in a flow collapses the search; Change reopens it empty, not with the old query.',
    'No match is not a dead end: Customer Search offers to add the person, with the query already split into the right fields.',
  ],
  content: [
    'The placeholder lists what the search matches: "Name, email, phone or customer ID", "Search name or phone".',
    'Names are names. Memberships and types go in chips beside them, never in the name ("Weston Farnsworth - Couple Premium Membership" was v1).',
    'Say the count and the query: "12 matching "bren"".',
    'Empty states suggest the next try: a spelling, a phone number, the last four digits.',
  ],
  dos: [
    'Show enough in each row to tell people apart: chips, a phone, a balance.',
    'Start on the likely answer (the order\'s customer) and let search change it.',
    'Keep the query on screen while a result is open.',
    'Offer to add the person when nobody matches.',
  ],
  donts: [
    "MUI's Autocomplete in product screens.",
    'A popup list on the handheld.',
    'Search results that hide the thing the task depends on (the balance for a house account).',
    'Clearing the query when a result is opened.',
  ],
  a11y: [
    <>
      The search inputs are named (<code>aria-label="Search customers"</code>, or the placeholder on the handheld) and the
      clear button is <code>aria-label="Clear search"</code>.
    </>,
    <>
      Customer Search rows are buttons with <code>aria-pressed</code> for the open one. The handheld rows are list
      buttons.
    </>,
    <>
      <strong>Gap:</strong> <code>ResultRow</code> is a clickable <code>Stack</code> with no role and no tab stop, so in
      the people-lookup dialogs a keyboard can't reach a result at all. Make it a <code>ButtonBase</code>.
    </>,
    <>
      <strong>Gap:</strong> nothing announces the result count as it changes. A polite live region on the list heading
      would.
    </>,
    <>
      Contrast, computed: a balance is <Contrast fg={md3.error} bg="#ffffff" label="$2,493" />; secondary lines are{' '}
      <Contrast fg={md3.onSurfaceVariant} bg="#ffffff" />.
    </>,
  ],
  decisions: [
    {
      decision: 'A list on the page, not a popup',
      why: 'Results need two lines, chips and a number to be told apart, and the operator compares before picking. A popup closes on the first click away.',
    },
    {
      decision: 'The name is only the name',
      why: (
        <>
          v1 printed "Weston Farnsworth - Couple Premium Membership" and "Weston Senior - Senior", which read as two
          unrelated people. With households sharing phones, picking the wrong one was easy (<code>CustomersView.tsx</code>,
          header comment).
        </>
      ),
    },
    {
      decision: 'Something to see before typing',
      why: 'v1 was an empty screen until you typed. Now Customer Search opens on who owes the course and who was just added.',
    },
    {
      decision: 'Open: the two surfaces search differently',
      why: (
        <>
          The tablet waits for two characters and caps results; the handheld's People list shows everyone and filters
          from the first letter, while its customer-record search behaves like the tablet's. Worth one written rule.
        </>
      ),
    },
  ],
  tokens: [
    { token: 'radius.xl', value: '28px', role: 'Search pill (tablet)' },
    { token: 'md3.primaryContainer', value: '#b7f0cf', role: 'The open or hovered result' },
    { token: 'md3.error', value: '#ba1a1a', role: 'Amounts owed' },
    { token: 'md3.surfaceHigh', value: '#e8ece8', role: 'Handheld search pill' },
  ],
  engineering: {
    import: `import { Field, ResultList, ResultRow } from '../modals/ModalFrame';   // tablet dialogs
import { findCustomers, plainName } from '../logic/customer-search';
import { SearchBar, GolferList } from '../mobile/screens/people/parts'; // handheld`,
    themeOverride: <>None. <code>Autocomplete</code> has no override in either theme.</>,
    notes: [
      <>
        Matching lives in one place: <code>searchRoster()</code> in <code>src/pos/data/roster.ts</code> (behind{' '}
        <code>findCustomers()</code>), and <code>useGolferSearch()</code> on the handheld. Don't filter in a screen.
      </>,
      <>
        Show names with <code>plainName()</code> and memberships with <code>CustomerChipRow</code>{' '}
        (<code>operations/CustomerChips.tsx</code>), so a membership looks the same on every screen.
      </>,
      <>
        A search that finds nobody can start the new-customer form with <code>draftFromQuery()</code>, which puts a typed
        email, phone or name where it belongs.
      </>,
    ],
    snippet: `const [query, setQuery] = useState('');
const results = useMemo(() => findCustomers(query, roster, 6), [query, roster]);

<Field autoFocus value={query} onChange={setQuery} placeholder="Find the customer — name, email, phone" />
{query.trim().length >= 2 && (
  <ResultList maxHeight={240}>
    {results.map((c) => (
      <ResultRow key={c.id} primary={plainName(c)} secondary={note(c)} onClick={() => pick(c.id)} />
    ))}
  </ResultList>
)}`,
  },
  related: [
    { name: 'Text Field', id: 'components-forms-text-field' },
    { name: 'Select', id: 'components-forms-select' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Chip', id: 'components-typography-content-chip' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
  ],
};

export default doc;
