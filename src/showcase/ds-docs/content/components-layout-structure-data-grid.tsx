import type { DsDoc } from '../types';

/**
 * Data Grid — MUI X's spreadsheet-style grid. Documented so nobody reaches for it: Birdie has no
 * screen that needs it, and the only importer of @mui/x-data-grid is this page's story.
 */
const doc: DsDoc = {
  summary: (
    <>
      MUI X's spreadsheet-style grid: column menus, resizing, checkbox selection, pagination and in-cell editing, built for a
      back office at a desk. Birdie <strong>does not use it</strong> on either surface. A counter terminal reads short lists of
      records and acts on one at a time, which Birdie's own tables do at the right density; the handheld has no tables at all.
    </>
  ),
  status: 'avoid',
  statusNote: (
    <>
      No Birdie screen imports it. <code>@mui/x-data-grid</code> is in <code>package.json</code> only for this page's story, so the
      app bundle never includes it. Candidate to remove from the system, and the dependency with it.
    </>
  ),
  mui: ['DataGrid'],
  useFor: [
    'Nothing in Birdie today. If a future admin screen needs a spreadsheet (bulk-editing a rate card, say), it belongs in Buck, the back office, not on the terminal.',
  ],
  dontUseFor: [
    'Back-office tables on the tablet: use DataTable (Inventory, Shift, Time Clock). See Table.',
    'A worklist where each row opens a record: use the row-button table (Tabs). See Table.',
    'Anything on the handheld: use a list (List).',
    'The tee sheet: it is its own component.',
  ],
  birdie: [
    { name: 'DataTable', file: 'src/pos/components/operations/OpsParts.tsx', use: 'read tables: what Inventory, Shift and Time Clock use instead.', surface: 'tablet' },
    { name: 'TabList', file: 'src/pos/components/restaurant/TabList.tsx', use: 'sortable worklists: sorting, grouping and search without a grid.', surface: 'tablet' },
  ],
  anatomy: [
    { part: 'Column headers', description: 'Sort on click, a column menu on hover, resize handles. All mouse affordances with small targets.' },
    { part: 'Checkbox column', description: 'Row selection for bulk actions. Birdie’s one bulk action (multi-select on the tee sheet) is a mode on the sheet, not a column.' },
    { part: 'Cells', description: '52px rows by default (comfortable is taller), virtualised.' },
    { part: 'Footer', description: 'Selected count and pagination. Birdie scrolls; it does not page.' },
  ],
  variants: [
    { name: 'DataGrid (community)', use: 'Desk software with many columns and bulk editing.', avoid: 'Birdie. Use Table’s patterns.' },
    { name: 'DataGridPro / Premium', use: 'Not licensed, not installed.', avoid: 'Everything.' },
  ],
  states: [
    { state: 'Any', tablet: 'Not used. The story shows MUI’s defaults with Birdie’s palette.', handheld: 'Not used.' },
  ],
  behavior: [
    'Pagination, column menus and resizing all assume a mouse and a large window. The counter has neither the time nor the room.',
    'Birdie’s tables scroll and sort; filters sit above them as chips, never inside a column menu.',
  ],
  dos: ['Use Table’s DataTable or the row-button pattern for tablet records.', 'Use a list on the handheld.'],
  donts: [
    'Add the Data Grid to a POS screen.',
    'Copy the story’s data: it is kitchen tickets from the KDS project Birdie was scaffolded from, not a Birdie screen.',
  ],
  a11y: [
    'Not assessed for Birdie: no screen uses it. MUI’s grid implements the ARIA grid pattern, which a new table would have to match if it ever replaced DataTable.',
  ],
  decisions: [
    { decision: 'Avoid the Data Grid', why: 'The terminal reads records and acts on one at a time. A spreadsheet adds menus, selection and paging the counter does not use, at the wrong density.' },
    { decision: 'Open: remove the dependency', why: 'Only this story imports @mui/x-data-grid. Removing the story and the package costs nothing in the product.' },
  ],
  engineering: {
    import: `// Not used in src/pos. For a table, see Table:
import { DataTable, Td } from '../components/operations/OpsParts';`,
    themeOverride: <>None. There is no <code>MuiDataGrid</code> entry in <code>src/theme/theme.ts</code>.</>,
    notes: [
      <>
        The usage scan (<code>scripts/gen-ds-usage.mjs</code>) reads <code>@mui/x-data-grid</code> imports, so this page’s pills
        would change the day a screen imported it.
      </>,
    ],
  },
  related: [
    { name: 'Table', id: 'components-layout-structure-table' },
    { name: 'List', id: 'components-layout-structure-list' },
    { name: 'Paginations', id: 'components-navigation-paginations' },
    { name: 'Checkbox', id: 'components-forms-checkbox' },
  ],
};

export default doc;
