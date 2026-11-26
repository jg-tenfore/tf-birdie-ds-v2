import { useEffect, useState } from 'react';
import { Box, Button, Fab, IconButton, Switch, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import MoreVert from '@mui/icons-material/MoreVert';
import ReceiptOutlined from '@mui/icons-material/ReceiptOutlined';
import RestaurantMenuOutlined from '@mui/icons-material/RestaurantMenuOutlined';
import Send from '@mui/icons-material/Send';
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import { md3, mobile, radius } from '../../../../theme/tokens';
import { serversOf, staffById } from '../../../data/staff';
import { money, orderTotals } from '../../../logic/cart';
import { bySeat, tabTotal, tableLabel, unsent } from '../../../logic/restaurant';
import { minGuests } from '../../../logic/tab-list';
import { taxRateOf } from '../../../state/operations';
import { canPayTab, tabById, tableOf } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import type { CartItem } from '../../../types';
import { Stack } from '../../../components/Stack';
import { BottomSheet, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout } from '../register/parts';
import { DishRow, Empty, Pill, Stepper } from './parts';
import { KITCHEN, nextEmptySeat, seatColor, seatLabel } from './restaurant-helpers';

/**
 * One tab, seat by seat (V1 → V2, handheld) — the tablet's `TabEditor`, as a page.
 *
 * The tablet keeps the check and the menu side by side. On a phone they take turns: this page is
 * the check, and **Add items** pushes the menu (`MenuScreen`) open on a seat, with the seat
 * switcher on it so a server can take a whole table's order without coming back between plates.
 *
 * - **Seat bands** for every seat, empty ones included, and **Shared** for plates the table
 *   splits (`bySeat`). Each band's **Add** opens the menu on that seat.
 * - **Every line is a button** opening its sheet: Edit and Remove before it is sent, Void after,
 *   Move / Split / Discount either way (`DishRow`). What has gone to the kitchen is locked — the
 *   store refuses to edit it, and the sheet never offers to.
 * - **Send** fires everything unsent as one ticket and says how many. **Pay** loads the tab onto
 *   the register (`payTab`) and pushes the phone's own checkout, tip and reader; paying closes the
 *   tab and frees the table. When the register already holds someone else's order, Pay is
 *   refused and the page says why rather than doing nothing.
 * - **⋮** holds what is the tab rather than its food: guests, server, check requested, move.
 *
 * Backing out of checkout without paying puts the tab back as it was: the register's copy of its
 * lines is cleared, as the tablet's Clear does, and the tab itself was never touched.
 */
export function TabScreen({ route }: ScreenProps<'tab'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const [options, setOptions] = useState(false);
  const tab = tabById(state, route.tabId);
  const onTop = nav.current === route;
  const paying = state.payingTabId === route.tabId;

  // Came back from checkout without paying: unload the register's copy of this tab.
  useEffect(() => {
    if (onTop && paying) dispatch({ type: 'clearOrder' });
  }, [onTop, paying, dispatch]);

  if (!tab) {
    return (
      <MobileScreen topBar={<TopAppBar title="Tab" />}>
        <Empty icon={<ReceiptOutlined sx={{ fontSize: 48 }} />} title="This tab is closed" body="It has been paid, or is no longer open." />
      </MobileScreen>
    );
  }

  const at = tableOf(state, tab.tableId);
  // "Table 5 · Dining Room", or just the room when the tab is already named for its table.
  const where = at ? (tab.name.startsWith(tableLabel(at.table)) ? at.room.name : `${tableLabel(at.table)} · ${at.room.name}`) : 'No table';
  const server = staffById(tab.serverId, state.staffRoster);
  const bands = bySeat(tab);
  if (!bands.some((b) => b.seat === null)) bands.push({ seat: null, lines: [] });
  const taxRate = taxRateOf(state);
  const totals = orderTotals(tab.lines, taxRate);
  const total = tabTotal(tab, taxRate);
  const toSend = unsent(tab.lines).length;
  const payable = canPayTab(state, tab.id);
  const target = { tabId: tab.id };

  const pay = () => {
    dispatch({ type: 'payTab', tabId: tab.id });
    nav.push({ name: 'checkout' });
  };

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title={tab.name}
          subtitle={`${where} · ${tab.guests} guest${tab.guests === 1 ? '' : 's'} · ${server?.short ?? 'Unassigned'}`}
          actions={
            <IconButton aria-label="Tab options" onClick={() => setOptions(true)}>
              <MoreVert />
            </IconButton>
          }
        />
      }
      fab={
        <Fab
          variant="extended"
          color="primary"
          aria-label="Add items"
          onClick={() => nav.push({ name: 'menu', tabId: tab.id, seat: nextEmptySeat(tab) })}
        >
          <Add sx={{ mr: 1 }} />
          Add items
        </Fab>
      }
      bottomBar={
        // Two buttons and nothing else, so the bar is the height MobileScreen lifts the FAB above.
        <Stack
          direction="row"
          gap={1}
          sx={{ flexShrink: 0, px: 2, py: 1.5, bgcolor: md3.surfaceContainer, borderTop: `1px solid ${md3.outlineVariant}` }}
        >
          <Button
            variant="contained"
            size="large"
            data-send-to-kitchen={toSend}
            disabled={toSend === 0}
            startIcon={<Send />}
            onClick={() => dispatch({ type: 'sendToKitchen', target })}
            sx={{ flex: 1, bgcolor: KITCHEN.solid, '&:hover': { bgcolor: KITCHEN.solid } }}
          >
            {toSend ? `Send ${toSend}` : 'All sent'}
          </Button>
          <Button
            variant="contained"
            size="large"
            data-pay-tab
            disabled={!payable || tab.lines.length === 0}
            onClick={pay}
            sx={{ flex: 1.3 }}
          >
            Pay {money(total)}
          </Button>
        </Stack>
      }
    >
      {!payable && (
        <Box sx={{ px: 2, pt: 1 }} data-pay-refused>
          <Callout tone="warning" icon={<WarningAmberRounded fontSize="small" />}>
            The register has another order on it. Pay or clear that order first, then pay this tab.
          </Callout>
        </Box>
      )}
      {tab.checkRequested && (
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          data-check-requested
          sx={{ mx: 2, mt: 1, px: 1.5, py: 1, borderRadius: `${radius.md}px`, bgcolor: '#ea580c', color: '#fff' }}
        >
          <ReceiptOutlined fontSize="small" />
          <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
            Check requested
          </Typography>
        </Stack>
      )}
      {tab.lines.length === 0 && (
        <Empty
          icon={<RestaurantMenuOutlined sx={{ fontSize: 48 }} />}
          title="Nothing ordered yet"
          body={`${tab.guests} seat${tab.guests === 1 ? '' : 's'} ready. Add items seat by seat, or as shared plates.`}
        />
      )}
      {tab.lines.length > 0 && (
        <Box sx={{ pb: 11 }}>
          {bands.map((b) => (
            <SeatBand key={b.seat ?? 'shared'} seat={b.seat} lines={b.lines} tabId={tab.id} />
          ))}
          {/* The check's foot: what Pay will charge, and what the kitchen doesn't have yet. */}
          <Box sx={{ px: 2, pt: 2 }} data-tab-totals>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2">{money(totals.goods)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2">Tax</Typography>
              <Typography variant="body2">{money(totals.tax)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Total
              </Typography>
              <Typography variant="subtitle1" data-tab-total sx={{ fontWeight: 700 }}>
                {money(total)}
              </Typography>
            </Stack>
            {toSend > 0 && (
              <Typography variant="body2" sx={{ mt: 1, color: KITCHEN.text }}>
                {toSend} {toSend === 1 ? 'dish hasn’t' : 'dishes haven’t'} gone to the kitchen, and will be on the bill.
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <TabOptions open={options} onClose={() => setOptions(false)} tabId={tab.id} />
    </MobileScreen>
  );
}

/** A seat and its plates, and Add — which opens the menu on this seat. */
function SeatBand({ seat, lines, tabId }: { seat: number | null; lines: CartItem[]; tabId: string }) {
  const nav = useMobileNav();
  const color = seatColor(seat);
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  return (
    <Box data-seat-band={seat ?? 'shared'}>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 6, height: 28, borderRadius: 3, bgcolor: color }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2">{seatLabel(seat)}</Typography>
          <Typography variant="caption">
            {lines.length ? `${lines.length} item${lines.length === 1 ? '' : 's'} · ${money(subtotal)}` : 'Nothing yet'}
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<Add />}
          aria-label={`Add to ${seatLabel(seat)}`}
          onClick={() => nav.push({ name: 'menu', tabId, seat })}
          sx={{ minHeight: 40 }}
        >
          Add
        </Button>
      </Stack>
      <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}` }}>
        {lines.map((l) => (
          <DishRow key={l.dish?.lineId ?? l.name} line={l} target={{ tabId }} />
        ))}
      </Box>
    </Box>
  );
}

/** Guests, server, check requested, move — the tab, not its food. */
function TabOptions({ open, onClose, tabId }: { open: boolean; onClose: () => void; tabId: string }) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const tab = tabById(state, tabId);
  if (!tab) return null;
  const patch = (p: { guests?: number; serverId?: string; checkRequested?: boolean }) => dispatch({ type: 'patchTab', tabId, patch: p });
  const servers = serversOf(state.staffRoster);

  return (
    <BottomSheet open={open} onClose={onClose} title={tab.name}>
      <Box sx={{ px: 3, pb: 1 }} data-tab-options>
        <Typography variant="subtitle2" sx={{ color: md3.primary, mb: 1 }}>
          Guests
        </Typography>
        <Stepper
          label="Guests"
          value={tab.guests}
          min={Math.max(1, minGuests(tab))}
          onChange={(guests) => patch({ guests })}
          unit={(n) => `${n} guest${n === 1 ? '' : 's'}`}
        />

        <Typography variant="subtitle2" sx={{ color: md3.primary, mt: 2.5, mb: 1 }}>
          Server
        </Typography>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          {servers.map((s) => (
            <Pill key={s.id} label={s.short} active={s.id === tab.serverId} onClick={() => patch({ serverId: s.id })} />
          ))}
        </Stack>

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2, minHeight: mobile.listItem.one }}>
          <Typography variant="body1">Check requested</Typography>
          <Switch
            checked={Boolean(tab.checkRequested)}
            onChange={() => patch({ checkRequested: !tab.checkRequested })}
            slotProps={{ input: { 'aria-label': 'Check requested' } }}
          />
        </Stack>

        <Button
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<SwapHorizOutlined />}
          sx={{ mt: 1 }}
          onClick={() => {
            onClose();
            nav.push({ name: 'moveTab', tabId });
          }}
        >
          {tab.tableId ? 'Move to another table' : 'Put on a table'}
        </Button>
      </Box>
    </BottomSheet>
  );
}
