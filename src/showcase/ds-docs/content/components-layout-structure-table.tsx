import { md3 } from '../../../theme/tokens';
import { Contrast } from '../Contrast';
import type { DsDoc } from '../types';

/**
 * Table — rows of records with columns that line up. Birdie has tables on the tablet's back-office
 * and restaurant screens, but none of them uses MUI's Table: two Birdie patterns do the work.
 */
const doc: DsDoc = {
  summary: (
    <>
      Rows of records whose columns line up, so a number can be compared down the page: the day's payments, the shelf, open tabs,
      a shift's history. Birdie has these on the <strong>tablet</strong> only, built two ways: a plain semantic{' '}
      <code>&lt;table&gt;</code> (<code>DataTable</code>) for reading, and a grid of row-sized buttons (<code>TabList</code>)
      when each row opens something. The <strong>handheld</strong> has no tables; the same records are two-line list rows. MUI's{' '}
      <code>Table</code> is themed but not used.
    </>
  ),
  status: 'available',
  statusNote: (
    <>
      MUI Table is themed (<code>MuiTableCell</code>: 12px cells, 11px caps headers) and no Birdie screen imports it. The tablet's
      tables are <code>DataTable</code> (a native <code>&lt;table&gt;</code> drawn with <code>Box</code>) and <code>TabList</code>{' '}
      (a CSS grid). Recommendation: either rebuild <code>DataTable</code> on MUI Table so the theme override has one consumer, or
      drop the override.
    </>
  ),
  mui: ['Table', 'TableBody', 'TableCell', 'TableContainer', 'TableHead', 'TableRow'],
  useFor: [
    'Records compared down a column: sale and tip, price and stock, hours.',
    'Back-office screens on the tablet: Orders & Tips, Inventory, Shift, Time Clock.',
    'A worklist where every row opens its record (Tabs), with sortable headers.',
  ],
  dontUseFor: [
    'The handheld. Use a two-line list row with the figure on the right (List).',
    'Records with one or two fields: use a list or cards.',
    'Search results you pick from to see detail: Order Lookup is a list of cards beside a detail pane, not a table.',
    'The tee sheet. It is its own component.',
  ],
  inBirdie: [
    {
      label: 'Tabs: the sortable table',
      caption: (
        <>
          One row per open tab, 64px tall, the whole row a button. Every header sorts (tap again to reverse); group by server or
          room; search by name, table or server. <strong>Status</strong> is the column a server reads from across the room.
        </>
      ),
      shot: 'ds-tablet-tab-list',
      tabletHash: '#/tabs',
      storyId: 'v1-→-v2-migration-6-·-tabs-tablet--sort-group-and-search',
    },
    {
      label: 'Orders & Tips: the ledger',
      caption: (
        <>
          Every payment of the day in a semantic table with a sticky header. Sale and tip right-aligned; the tip carries its
          percentage, so a missing tip on a $90 lunch shows. <strong>Adjust</strong> on card rows only.
        </>
      ),
      shot: 'tablet-orders-tips',
      tabletHash: '#/orders-tips',
      storyId: 'v1-→-v2-migration-9-·-orders-tips-tablet--the-morning',
    },
    {
      label: 'Inventory: DataTable',
      caption: (
        <>
          The shelf, by category, with LOW and OUT badges in the last column and filters above. Built with{' '}
          <code>DataTable</code>, the back office's shared table, as are Shift and Time Clock.
        </>
      ),
      shot: 'tablet-inventory',
      tabletHash: '#/inventory',
      storyId: 'components-layout-structure-table--in-birdie-data-table',
    },
  ],
  birdie: [
    {
      name: 'DataTable · Td',
      file: 'src/pos/components/operations/OpsParts.tsx',
      use: 'a read-only table: semantic <table>, sticky caps header, 13px cells that wrap rather than clip. Inventory, Shift, Time Clock.',
      surface: 'tablet',
    },
    {
      name: 'TabList',
      file: 'src/pos/components/restaurant/TabList.tsx',
      use: 'a worklist where each row opens a record: CSS grid, 64px ButtonBase rows, sortable headers, sticky group headers.',
      surface: 'tablet',
    },
    {
      name: 'PaymentRow (Orders & Tips)',
      file: 'src/pos/components/restaurant/OrdersTipsView.tsx',
      use: 'the ledger: a native table drawn inline, with an action cell. The pattern DataTable was lifted from.',
      surface: 'tablet',
    },
    {
      name: 'DataTable (customer record)',
      file: 'src/pos/components/CustomerModal.tsx',
      use: 'a compact grid of 12.5px rows inside a dialog section: gift cards, rain checks, rounds. A local copy with the same name.',
      surface: 'tablet',
    },
  ],
  anatomy: [
    { part: 'Toolbar', description: 'Above the table: the title, a one-line summary ("6 open · 1 check requested"), search, filter chips, the primary action.' },
    { part: 'Header row', description: '11–11.5px, 800 weight, caps, tracked; muted. Sticky while the body scrolls. In TabList each header is a sort button with an arrow on the active one.' },
    { part: 'Body rows', description: 'A 1px outline-variant rule between rows. 13px text in DataTable; up to 15px for the key figure in TabList.' },
    { part: 'Numeric columns', description: 'Right-aligned money and counts, so decimals line up.' },
    { part: 'Status cell', description: 'A pill (Check requested, 2 not sent, LOW, OUT) or a quiet word (All sent).' },
    { part: 'Action cell', description: 'One outlined pill per row (Adjust), or none when the row itself is the action.' },
    { part: 'Group header (optional)', description: 'Sticky, with the group’s count and total ("Jordan Ellis · 2 tabs · $227.34").' },
  ],
  variants: [
    {
      name: 'DataTable (read)',
      use: 'Records to read and compare, with at most one action per row.',
      avoid: 'Rows that should open something: a 13px cell is a poor target.',
    },
    {
      name: 'Row-button table (TabList)',
      use: 'A worklist where the next step is always "open it". The row is the target, 64px tall.',
      avoid: 'Rows with several actions: they would nest buttons in a button.',
    },
    {
      name: 'MUI Table',
      use: 'Available and themed. Reach for it when building a new back-office table, if DataTable is moved onto it.',
      avoid: 'Mixing it with DataTable on one screen: two header styles.',
    },
    {
      name: 'Data Grid (MUI X)',
      use: 'Not used; see its page.',
      avoid: 'Everything in Birdie today.',
    },
  ],
  states: [
    { state: 'Default', tablet: 'White body, 1px rules, muted caps header on the surface colour.' },
    { state: 'Sorted', tablet: 'TabList: the active header turns dark and shows ▲ or ▼. DataTable does not sort.' },
    { state: 'Attention', tablet: 'A row that needs someone is tinted: a tab with its check requested is pale amber (#fffbeb) with a dark amber pill.' },
    { state: 'Pressed', tablet: 'TabList rows flash primary-container on press. DataTable rows have no hover; only their action does.' },
    { state: 'Empty', tablet: 'An EmptyState in the body ("No open tabs", "No open tab matches that"). Totals above still show $0.00, never blank.' },
    { state: 'Filtered', tablet: 'A count beside the filters ("15 of 15"); the filter chip that is on is filled.' },
  ],
  sizing: [
    { surface: 'Clover Mini', size: 'DataTable rows about 40px (10px padding, 13px text). TabList rows 64px. Headers 44px when they sort.', why: 'Read with a mouse; tap with a finger where a row is the action. 44px is Birdie’s floor for a thumb on the tablet.' },
    { surface: 'Large display', size: 'Same heights. Columns stretch.', why: 'An open item: the Tabs and Orders & Tips tables spread across about 1,500px and some detail areas sit empty.' },
    { surface: 'Handheld', size: 'No tables.', why: 'The same records are two-line list rows, figure on the right (Orders & Tips on the handheld).' },
  ],
  behavior: [
    'Headers stay put while the body scrolls. Cells wrap rather than clip: v1’s Shift history truncated "End Check" to "End Checl".',
    'TabList: tapping a header sorts by it; tapping it again reverses. Each column has a sensible first direction: the longest-open tab first, the largest party and total first, names A to Z.',
    'Grouping keeps the sort inside each group and gives each group a sticky header with its count and total.',
    'Search narrows rows as you type and matches several fields at once; nothing waits for a Search button.',
    'A row-level action sits in its own last column. If the row itself opens the record, there is no action column.',
  ],
  content: [
    'Headers are nouns in caps on screen, sentence case in code: TIME, ORDER, TAKEN BY, TENDER, SALE, TIP.',
    'Money is "$45.90", right-aligned. A tip carries its percentage beside it: "$8.26 18%".',
    'Times are "11:37 AM"; durations are "50 min" with "since 11:10 AM" under them.',
    'Card tenders read "Card •••• 9981".',
    'Status is a short phrase: Check requested, 2 not sent, Nothing ordered, All sent.',
  ],
  dos: [
    'Right-align every money and count column.',
    'Put the column someone scans from across the room in the strongest treatment (TabList’s Status).',
    'Make the whole row the target when opening it is the only action.',
    'Show $0.00 rather than a blank when a day is quiet.',
  ],
  donts: [
    'Truncate a cell. Wrap it.',
    'Leave a declared column empty: v1’s Orders & Tips table had eight headers and seven columns.',
    'Put a table on the handheld.',
    'Two tables with different header styles on one screen.',
  ],
  a11y: [
    'DataTable and the Orders & Tips ledger are real <table>, <thead>, <th> and <td>: a screen reader announces rows, columns and headers.',
    'TabList is not: it is a CSS grid of buttons with no table roles, and its sort headers use aria-pressed rather than aria-sort. Each row reads as one long button. Give it role="grid" with columnheader and aria-sort, or accept it as a list of buttons and name each row ("Table 10, Farnsworth, check requested, $154.98").',
    <>
      Headers: DataTable <Contrast fg={md3.onSurfaceVariant} bg={md3.surface} label="TIME" />, TabList{' '}
      <Contrast fg={md3.onSurfaceVariant} bg={md3.surfaceContainer} label="TABLE" />. Status pills: Check requested{' '}
      <Contrast fg="#ffffff" bg="#b45309" label="Check" />, not sent <Contrast fg="#92400e" bg="#fef3c7" label="2 not" />, All
      sent <Contrast fg={md3.outline} bg="#ffffff" label="All" />.
    </>,
    <>
      Row rules are decorative (<Contrast fg={md3.outlineVariant} bg="#ffffff" size="non-text" label="—" />), which is fine: the
      columns, not the lines, carry the structure.
    </>,
  ],
  decisions: [
    { decision: 'Two table patterns, not one', why: 'Reading and opening are different jobs. A read table keeps 13px density; a worklist makes the row a 64px target.' },
    { decision: 'Semantic <table> for read tables', why: 'Free row and column announcements, and wrapping cells that line up without a fixed-width grid.' },
    { decision: 'No tables on the handheld', why: 'Columns do not survive 360px. Two lines with the figure on the right keep the one comparison that matters.' },
    { decision: 'MUI Table unused, but themed', why: 'The back office was built in waves and lifted its table from Orders & Tips. Open: move DataTable onto MUI Table, or remove the MuiTableCell override.' },
  ],
  tokens: [
    { token: 'md3.outlineVariant', value: '#c0c9c1', role: 'Row rules and the header’s bottom border' },
    { token: 'md3.onSurfaceVariant', value: '#404943', role: 'Header text' },
    { token: 'md3.surface / surfaceContainer', value: '#f8faf8 / #eef1ee', role: 'Header backgrounds (DataTable / TabList)' },
    { token: 'radius.xl', value: '28px', role: 'Status pills and the Adjust action' },
    { token: 'grid.topbarH', value: '56px', role: 'The toolbar above the table' },
  ],
  engineering: {
    import: `import { DataTable, Td } from '../components/operations/OpsParts'; // read tables
import { TabList } from '../components/restaurant/TabList';          // the row-button pattern, for reference`,
    themeOverride: (
      <>
        <code>src/theme/theme.ts → MuiTableCell</code>: 12px cells, 8×12 padding, outline-variant borders; heads 11px, 800 weight,
        caps, 0.5px tracking. Nothing in <code>src/pos</code> renders a MuiTableCell, so it is unexercised.
      </>
    ),
    notes: [
      <>
        <code>DataTable</code> takes <code>columns</code> (<code>label</code>, <code>align</code>, <code>width</code>) and{' '}
        <code>&lt;tr&gt;</code> children of <code>Td</code>. The header is sticky against the nearest scrolling box, so put the
        table in one.
      </>,
      <>
        <code>TabList</code>’s sort and grouping live in <code>logic/tab-list.ts</code> (unit-tested); the component only draws.
        Follow that split for any new sortable table.
      </>,
      <>
        Two components are named <code>DataTable</code> (OpsParts and a private one in CustomerModal). Rename the private one
        before someone imports the wrong one.
      </>,
    ],
    snippet: `<DataTable columns={[{ label: 'Item' }, { label: 'Category', width: 160 }, { label: 'Price', align: 'right', width: 100 }, { label: 'On the shelf', align: 'right', width: 120 }]}>
  {items.map((it) => (
    <tr key={it.n}>
      <Td sx={{ fontWeight: 700 }}>{it.n}</Td>
      <Td>{it.category}</Td>
      <Td align="right">{money(it.p)}</Td>
      <Td align="right">{stock[it.n]}</Td>
    </tr>
  ))}
</DataTable>`,
  },
  related: [
    { name: 'Data Grid', id: 'components-layout-structure-data-grid' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Card', id: 'components-layout-structure-card' },
    { name: 'Filter Bars', id: 'components-navigation-filter-bars' },
    { name: 'Empty State', id: 'components-feedback-status-empty-state' },
    { name: 'Badge', id: 'components-feedback-status-badge' },
  ],
};

export default doc;
