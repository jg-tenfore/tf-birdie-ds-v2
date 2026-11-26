import { pricingOf } from '../../../state/checkout';
import { useState } from 'react';
import { Box, ButtonBase, Fab, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { DEMO_NOW_MIN } from '../../../data/bookings';
import { money } from '../../../logic/cart';
import { formatOpenFor, sortTabRows, tabRows, type TabRow } from '../../../logic/tab-list';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Empty, Pill, ScrollRow } from './parts';
import { KITCHEN, isRootRoute } from './restaurant-helpers';

/**
 * Tabs — every open tab, the one that needs someone first (V1 → V2, handheld).
 *
 * The tablet's list (`TabList`) is a sortable table of seven columns. A phone row has room for two
 * lines, so it keeps what a server scans for and drops the column headers: the table and the tab's
 * name, then guests · server · open for, with the total on the right — and the two states that
 * need somebody, **check requested** and **dishes not sent**, as chips in front of everything else.
 * Rows come in the tablet's *status* order (`sortTabRows`, `attention` in `logic/tab-list.ts`):
 * check asked for, then food not fired, then a table that has ordered nothing, then the rest.
 *
 * **Mine** narrows the list to the signed-in operator's tabs — the question a server is usually
 * asking. **New tab** opens one with or without a table (a bar tab, a league's running tab).
 */
export function TabsScreen({ route }: ScreenProps<'tabs'>) {
  const { state } = usePos();
  const nav = useMobileNav();
  const [mine, setMine] = useState(false);
  const rows = sortTabRows(tabRows(state.tabs, state.floor, DEMO_NOW_MIN, state.staffRoster, pricingOf(state)), 'status', 'desc');
  const shown = mine ? rows.filter((r) => r.tab.serverId === state.operatorId) : rows;
  const myCount = rows.filter((r) => r.tab.serverId === state.operatorId).length;
  const root = isRootRoute(nav, route);

  return (
    <MobileScreen
      topBar={
        <TopAppBar title="Tabs" subtitle={`${rows.length} open`} leading={root ? 'none' : 'back'}>
          <ScrollRow label="Whose tabs" sx={{ pb: 1 }}>
            <Pill label={`All · ${rows.length}`} active={!mine} onClick={() => setMine(false)} />
            <Pill label={`Mine · ${myCount}`} active={mine} onClick={() => setMine(true)} />
          </ScrollRow>
        </TopAppBar>
      }
      fab={
        <Fab variant="extended" color="primary" onClick={() => nav.push({ name: 'openTab' })} aria-label="New tab">
          <Add sx={{ mr: 1 }} />
          New tab
        </Fab>
      }
    >
      {shown.length === 0 ? (
        <Empty
          icon={<CreditCardOutlined sx={{ fontSize: 48 }} />}
          title={mine ? 'No tabs of yours open' : 'No open tabs'}
          body="Seat a table, or open a tab for the bar."
        />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, pb: 12 }}>
          {shown.map((r) => (
            <li key={r.tab.id}>
              <TabListRow row={r} onClick={() => nav.push({ name: 'tab', tabId: r.tab.id })} />
            </li>
          ))}
        </Box>
      )}
    </MobileScreen>
  );
}

function TabListRow({ row, onClick }: { row: TabRow; onClick: () => void }) {
  const { tab } = row;
  return (
    <ButtonBase
      data-tab-row={tab.id}
      onClick={onClick}
      sx={{
        width: '100%',
        minHeight: mobile.listItem.two,
        px: 2,
        py: 1.25,
        gap: 1.5,
        alignItems: 'flex-start',
        textAlign: 'left',
        borderBottom: `1px solid ${md3.outlineVariant}`,
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: `${radius.md}px`,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          bgcolor: tab.checkRequested ? '#ea580c' : tab.tableId ? md3.primaryContainer : mobile.surfaceContainerLow,
          color: tab.checkRequested ? '#fff' : md3.onPrimaryContainer,
          fontWeight: 700,
          fontSize: row.table.length > 3 ? 13 : 16,
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {row.table === 'No table' ? <CreditCardOutlined /> : row.table.replace(/^Table /, '')}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="baseline" gap={1}>
          <Typography variant="body1" noWrap sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
            {tab.name}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, flexShrink: 0 }}>
            {money(row.total)}
          </Typography>
        </Stack>
        <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
          {tab.guests} guest{tab.guests === 1 ? '' : 's'} · {row.server} · {formatOpenFor(row.minutesOpen)}
        </Typography>
        {(tab.checkRequested || row.unsentCount > 0 || row.lineCount === 0) && (
          <Stack direction="row" gap={0.75} sx={{ mt: 0.75, flexWrap: 'wrap' }}>
            {tab.checkRequested && <Flag bg="#ea580c" color="#fff" label="Check requested" />}
            {row.unsentCount > 0 && (
              <Flag bg={KITCHEN.tint} color={KITCHEN.text} border={KITCHEN.edge} label={`${row.unsentCount} not sent`} />
            )}
            {row.lineCount === 0 && <Flag bg={mobile.surfaceContainerLow} color={md3.onSurfaceVariant} label="Nothing ordered" />}
          </Stack>
        )}
      </Box>
    </ButtonBase>
  );
}

function Flag({ label, bg, color, border }: { label: string; bg: string; color: string; border?: string }) {
  return (
    <Box
      component="span"
      sx={{
        px: 1,
        py: '2px',
        borderRadius: `${radius.sm}px`,
        bgcolor: bg,
        color,
        border: border ? `1px solid ${border}` : 'none',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
    </Box>
  );
}
