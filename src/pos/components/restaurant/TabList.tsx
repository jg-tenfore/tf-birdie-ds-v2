import { taxRateOf } from '../../state/operations';
import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { grid as gridTokens, md3, radius } from '../../../theme/tokens';
import { DEMO_NOW_MIN } from '../../data/bookings';
import { money } from '../../logic/cart';
import {
  FIRST_DIR,
  formatOpenFor,
  groupTabRows,
  matchesQuery,
  sortTabRows,
  tabRows,
  type SortDir,
  type TabGrouping,
  type TabRow,
  type TabSortKey,
} from '../../logic/tab-list';
import { usePos } from '../../state/PosProvider';
import { EmptyState, Icon } from '../primitives';
import { Stack } from '../Stack';

/**
 * The open tabs (V1 → V2, Wave 2).
 *
 * ## What v1 did
 *
 * A flat list in whatever order the store held it: no sort, no grouping, no status. The name sat
 * at 20px on the left and the server, order number and time were a 12px block at the far right;
 * every row began with the same logo. Nothing said which table had asked for its check, or had
 * food the kitchen had never been sent. "Create a Tab" went to the Pro Shop register.
 *
 * ## What this does
 *
 * One row per tab, one column per thing a server scans for — table, name, guests, server, how
 * long it has been open, what needs doing, the total. Every column header sorts (tap again to
 * reverse); the list groups by server or by room; the search box matches a name, a table or a
 * server. **Status** is the column that matters from across the room: *Check requested*, *N not
 * sent*, *Nothing ordered*, or *All sent*.
 *
 * **New bar tab** opens a tab with no table and one guest, straight into the editor, where it is
 * named. A tab on a table is opened from the floor.
 */

const COLUMNS: { key: TabSortKey; label: string; width: string; align?: 'right' }[] = [
  { key: 'table', label: 'Table', width: '104px' },
  { key: 'name', label: 'Name', width: 'minmax(0,1fr)' },
  { key: 'guests', label: 'Guests', width: '84px' },
  { key: 'server', label: 'Server', width: '150px' },
  { key: 'opened', label: 'Open', width: '132px' },
  { key: 'status', label: 'Status', width: '200px' },
  { key: 'total', label: 'Total', width: '104px', align: 'right' },
];
const TEMPLATE = COLUMNS.map((c) => c.width).join(' ');

const GROUPINGS: { key: TabGrouping; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'server', label: 'Server' },
  { key: 'room', label: 'Room' },
];

export function TabList() {
  const { state, dispatch } = usePos();
  const [sort, setSort] = useState<{ key: TabSortKey; dir: SortDir }>({ key: 'opened', dir: 'asc' });
  const [grouping, setGrouping] = useState<TabGrouping>('none');
  const [query, setQuery] = useState('');

  const all = tabRows(state.tabs, state.floor, DEMO_NOW_MIN, state.staffRoster, taxRateOf(state));
  const shown = sortTabRows(
    all.filter((r) => matchesQuery(r, query)),
    sort.key,
    sort.dir,
  );
  const groups = groupTabRows(shown, grouping);
  const checks = all.filter((r) => r.tab.checkRequested).length;
  const unsentTabs = all.filter((r) => r.unsentCount > 0).length;

  const sortBy = (key: TabSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: FIRST_DIR[key] }));

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-tab-list>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{ height: gridTokens.topbarH, px: 2, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Tabs</Typography>
        <Typography data-tab-summary sx={{ fontSize: 12.5, fontWeight: 600, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
          {all.length} open · {checks} check{checks === 1 ? '' : 's'} requested · {unsentTabs} with food not sent
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack
          direction="row"
          alignItems="center"
          gap={0.75}
          sx={{ px: 1.25, minHeight: 44, width: 240, border: `1.5px solid ${md3.outlineVariant}`, borderRadius: `${radius.xl}px` }}
        >
          <Icon name="search" size={17} color={md3.outline} />
          <InputBase
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, table or server"
            inputProps={{ 'aria-label': 'Search tabs' }}
            sx={{ flex: 1, fontSize: 13 }}
          />
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.5} role="group" aria-label="Group by">
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: md3.onSurfaceVariant, mr: 0.25 }}>Group</Typography>
          {GROUPINGS.map((g) => (
            <Chip key={g.key} on={grouping === g.key} onClick={() => setGrouping(g.key)} data-group-by={g.key}>
              {g.label}
            </Chip>
          ))}
        </Stack>
        <ButtonBase
          data-new-bar-tab
          onClick={() => dispatch({ type: 'openTab', guests: 1 })}
          sx={{
            minHeight: 44,
            px: 2,
            gap: 0.75,
            borderRadius: `${radius.xl}px`,
            bgcolor: md3.onSurface,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="local_bar" size={17} />
          New bar tab
        </ButtonBase>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: TEMPLATE,
          columnGap: 1.5,
          px: 2,
          bgcolor: md3.surfaceContainer,
          borderBottom: `1px solid ${md3.outlineVariant}`,
          flexShrink: 0,
        }}
      >
        {COLUMNS.map((c) => {
          const on = sort.key === c.key;
          return (
            <ButtonBase
              key={c.key}
              data-sort-key={c.key}
              aria-label={`Sort by ${c.label}`}
              aria-pressed={on}
              onClick={() => sortBy(c.key)}
              sx={{
                minHeight: 44,
                gap: 0.25,
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                fontSize: 11.5,
                fontWeight: 800,
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                color: on ? md3.onSurface : md3.onSurfaceVariant,
              }}
            >
              {c.label}
              {on && <Icon name={sort.dir === 'asc' ? 'expand_less' : 'expand_more'} size={16} />}
            </ButtonBase>
          );
        })}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', bgcolor: '#fff' }}>
        {shown.length === 0 ? (
          <EmptyState icon="receipt" label={query ? 'No open tab matches that' : 'No open tabs'} sx={{ py: 8, height: 'auto' }} />
        ) : (
          groups.map((g) => (
            <Box key={g.key} data-tab-group={g.label || undefined}>
              {g.label && (
                <Stack
                  direction="row"
                  alignItems="center"
                  gap={1}
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: md3.surface,
                    borderBottom: `1px solid ${md3.outlineVariant}`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>{g.label}</Typography>
                  <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
                    {g.rows.length} tab{g.rows.length === 1 ? '' : 's'} · {money(g.total)}
                  </Typography>
                </Stack>
              )}
              {g.rows.map((r) => (
                <Row key={r.tab.id} row={r} onOpen={() => dispatch({ type: 'setActiveTab', tabId: r.tab.id })} />
              ))}
            </Box>
          ))
        )}
      </Box>
    </Stack>
  );
}

function Row({ row, onOpen }: { row: TabRow; onOpen: () => void }) {
  const { tab } = row;
  return (
    <ButtonBase
      data-tab-row={tab.id}
      onClick={onOpen}
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: TEMPLATE,
        columnGap: 1.5,
        alignItems: 'center',
        px: 2,
        minHeight: 64,
        textAlign: 'left',
        borderBottom: `1px solid ${md3.outlineVariant}`,
        bgcolor: tab.checkRequested ? '#fffbeb' : '#fff',
        '&:active': { bgcolor: md3.primaryContainer },
      }}
    >
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: row.table === 'No table' ? md3.outline : md3.onSurface }}>
        {row.table}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 14.5, fontWeight: 700 }}>
          {tab.name}
        </Typography>
        <Typography noWrap sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
          {tab.id} · {row.room}
        </Typography>
      </Box>
      <Stack direction="row" alignItems="center" gap={0.5} sx={{ fontSize: 14, fontWeight: 700 }}>
        <Icon name="people" size={16} color={md3.outline} />
        {tab.guests}
      </Stack>
      <Typography noWrap sx={{ fontSize: 13, color: md3.onSurface }}>
        {row.server}
      </Typography>
      <Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{formatOpenFor(row.minutesOpen)}</Typography>
        <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>since {tab.openedAt}</Typography>
      </Box>
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {tab.checkRequested && (
          <Status data-check-requested icon="receipt" bg="#b45309" color="#fff">
            Check requested
          </Status>
        )}
        {row.unsentCount > 0 && (
          <Status data-unsent={row.unsentCount} icon="send" bg="#fef3c7" color="#92400e">
            {row.unsentCount} not sent
          </Status>
        )}
        {row.lineCount === 0 && (
          <Status data-nothing-ordered icon="no_meals" bg={md3.surfaceContainer} color={md3.onSurfaceVariant}>
            Nothing ordered
          </Status>
        )}
        {row.lineCount > 0 && row.unsentCount === 0 && !tab.checkRequested && (
          <Status data-all-sent icon="check" bg="transparent" color={md3.outline}>
            All sent
          </Status>
        )}
      </Stack>
      <Typography data-tab-row-total sx={{ fontSize: 15, fontWeight: 800, textAlign: 'right' }}>{money(row.total)}</Typography>
    </ButtonBase>
  );
}

function Status({
  icon,
  bg,
  color,
  children,
  ...data
}: {
  icon: string;
  bg: string;
  color: string;
  children: React.ReactNode;
} & Record<`data-${string}`, unknown>) {
  return (
    <Stack
      {...data}
      direction="row"
      alignItems="center"
      gap={0.375}
      sx={{ px: 1, py: '3px', borderRadius: `${radius.xl}px`, bgcolor: bg, color, fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}
    >
      <Icon name={icon} size={13} />
      {children}
    </Stack>
  );
}

function Chip({
  on,
  onClick,
  children,
  ...data
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & Record<`data-${string}`, unknown>) {
  return (
    <ButtonBase
      {...data}
      aria-pressed={on}
      onClick={onClick}
      sx={{
        minHeight: 44,
        px: 1.5,
        borderRadius: `${radius.xl}px`,
        border: `1.5px solid ${on ? md3.primary : md3.outlineVariant}`,
        bgcolor: on ? md3.primaryContainer : 'transparent',
        color: on ? md3.onPrimaryContainer : md3.onSurfaceVariant,
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {children}
    </ButtonBase>
  );
}
