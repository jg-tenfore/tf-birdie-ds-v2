import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { withEdition } from '../edition-decorator';
import { md3, radius } from '../../theme/tokens';
import { PosProvider } from '../../pos/state/PosProvider';
import { TabList } from '../../pos/components/restaurant/TabList';
import { DataTable, Td } from '../../pos/components/operations/OpsParts';

const ROWS = [
  ['#41', 'Grill', 'Dine-in', '6m', 'Late'],
  ['#42', 'Fry', 'Pickup', '3m', 'Warning'],
  ['#43', 'Cold', 'Dine-in', '1m', 'Normal'],
  ['#44', 'Beverage', 'Delivery', '0m', 'Normal'],
];

const color = (s: string) =>
  s === 'Late' ? 'error' : s === 'Warning' ? 'warning' : 'default';

const meta = {
  title: 'Design System/Components/Layout & Structure/Table',
  id: 'components-layout-structure-table',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * **In Birdie: the open tabs.** Birdie's sortable table, as the Tabs screen draws it: a CSS grid
 * of 64px row buttons under header buttons that sort (tap again to reverse), with grouping and
 * search above. Not MUI Table. Tap a header to sort; the seeded tabs are the restaurant's.
 */
export const InBirdieOpenTabs: Story = {
  name: 'In Birdie · Open tabs',
  decorators: [withEdition('current-tablet')],
  render: () => (
    <PosProvider>
      <Box
        sx={{
          width: 980,
          maxWidth: '100%',
          height: 520,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: md3.surface,
          borderRadius: `${radius.lg}px`,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,.12)',
        }}
      >
        <TabList />
      </Box>
    </PosProvider>
  ),
};

const SHELF: [string, string, number, number][] = [
  ['Titleist Pro V1 Box', 'Golf balls', 54, 34],
  ['Titleist Pro V1 Sleeve', 'Golf balls', 16, 2],
  ['Callaway Chrome Soft X Box', 'Golf balls', 50, 0],
  ['Golf Glove Mens', 'Accessories', 18, 11],
  ['Logo Polo', 'Apparel', 64, 7],
];

/**
 * **In Birdie: DataTable.** The back office's read table (Inventory, Shift, Time Clock): a real
 * `<table>` drawn with `Box`, a sticky caps header, 13px cells that wrap rather than clip, and
 * money right-aligned. From `src/pos/components/operations/OpsParts.tsx`.
 */
export const InBirdieDataTable: Story = {
  name: 'In Birdie · DataTable',
  render: () => (
    <Box sx={{ width: 720, maxHeight: 320, overflowY: 'auto', bgcolor: '#fff', border: `1px solid ${md3.outlineVariant}`, borderRadius: `${radius.md}px` }}>
      <DataTable
        columns={[
          { label: 'Item' },
          { label: 'Category', width: 150 },
          { label: 'Price', align: 'right', width: 90 },
          { label: 'On the shelf', align: 'right', width: 120 },
        ]}
      >
        {SHELF.map(([name, category, price, qty]) => (
          <tr key={name}>
            <Td sx={{ fontWeight: 700 }}>{name}</Td>
            <Td>{category}</Td>
            <Td align="right">${price.toFixed(2)}</Td>
            <Td align="right" sx={{ fontWeight: 800, color: qty === 0 ? md3.error : md3.onSurface }}>
              {qty}
            </Td>
          </tr>
        ))}
      </DataTable>
    </Box>
  ),
};

/** MUI's Table, themed by `MuiTableCell`. Not used by any Birdie screen. */
export const Table_: Story = {
  name: 'Table',
  render: () => (
    <TableContainer component={Paper} variant="outlined" sx={{ width: 560 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Ticket</TableCell>
            <TableCell>Station</TableCell>
            <TableCell>Dining option</TableCell>
            <TableCell>Elapsed</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r[0]} hover>
              <TableCell>{r[0]}</TableCell>
              <TableCell>{r[1]}</TableCell>
              <TableCell>{r[2]}</TableCell>
              <TableCell>{r[3]}</TableCell>
              <TableCell>
                <Chip label={r[4]} size="small" color={color(r[4]) as 'error' | 'warning' | 'default'} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  ),
};
