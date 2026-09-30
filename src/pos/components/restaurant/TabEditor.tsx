import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { grid as gridTokens, md3, playerAccents, radius } from '../../../theme/tokens';
import { SERVERS } from '../../data/staff';
import { money, orderTotals } from '../../logic/cart';
import { bySeat, tabTotal, tableLabel, unsent, type Tab } from '../../logic/restaurant';
import { minGuests } from '../../logic/tab-list';
import { canPayTab, tableOf } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import type { CartItem } from '../../types';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { DishLine } from './DishLine';
import { MenuBrowser } from './MenuBrowser';

/**
 * The tab editor (V1 → V2, Wave 2): one tab, seat by seat, with the menu beside it.
 *
 * ## What v1 did
 *
 * A seat editor under a pipe breadcrumb (`Table Detached 58829 | Order ID 4180595 | Avery
 * Robertson`) that could not rename the tab, change the guest count or reassign the server. Its
 * menu swapped out for an item pane on every add. Each line's ⋮ offered Fire, Move, Split, Edit,
 * Discount and Delete whether or not they applied, and "Fire" sent one plate at a time. Save
 * Changes and Pay sat side by side at the bottom as if equally final.
 *
 * One idea was right, and is kept: **tapping a seat band chooses which seat receives the next
 * item**, rather than collapsing it. Every seat stays open, because a server reading a table needs
 * the whole check at once.
 *
 * ## What this does
 *
 * - **The header is the tab.** Name (editable in place), table and room, guests on a stepper,
 *   server, and *Check requested* as a toggle the whole list can see.
 * - **Seat bands** for every seat, empty ones included, and a **Shared** band for plates the
 *   table splits. The active band says "Adding here", and the menu says where the next item goes.
 * - **The menu stays put** beside the check (`MenuBrowser`); an item with options opens the dish
 *   dialog over it, and the check is still there when it closes.
 * - **Send to kitchen** fires everything unsent as one ticket and says how many dishes will go;
 *   it is disabled when there is nothing to send. What has gone is locked — see `DishLine`.
 * - **Pay** loads the tab onto the register, which takes the payment and closes it. When the
 *   register already has someone else's order, Pay is disabled and says why, instead of the tap
 *   silently doing nothing.
 *
 * There is no Save: every change is dispatched as it is made, so there is nothing to lose.
 */
export function TabEditor({ tab }: { tab: Tab }) {
  const { state, dispatch } = usePos();
  // `null` is the shared band.
  const [activeSeat, setActiveSeat] = useState<number | null>(1);
  const seat = activeSeat !== null && activeSeat > tab.guests ? tab.guests : activeSeat;

  const bands = bySeat(tab);
  if (!bands.some((b) => b.seat === null)) bands.push({ seat: null, lines: [] });

  const target = { tabId: tab.id };
  const toSend = unsent(tab.lines).length;
  const totals = orderTotals(tab.lines);
  const payable = canPayTab(state, tab.id);
  const seatWord = seat ? `Seat ${seat}` : 'Shared';

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-tab-editor={tab.id}>
      <TabHeader tab={tab} />

      <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
        {/* ── The check ── */}
        <Stack sx={{ width: 432, flexShrink: 0, bgcolor: '#fff', borderRight: `1px solid ${md3.outlineVariant}` }}>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: '10px 12px' }}>
            {bands.map((b) => (
              <SeatBand
                key={b.seat ?? 'shared'}
                seat={b.seat}
                lines={b.lines}
                active={b.seat === seat}
                onSelect={() => setActiveSeat(b.seat)}
                tabId={tab.id}
              />
            ))}
          </Box>

          <Box sx={{ p: '10px 14px 14px', borderTop: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1px 12px', fontSize: 12.5, color: md3.onSurfaceVariant, mb: 1 }}
            >
              <span>Subtotal</span>
              <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>{money(totals.goods)}</Box>
              <span>Tax</span>
              <Box sx={{ textAlign: 'right', fontWeight: 600, color: md3.onSurface }}>{money(totals.tax)}</Box>
              <Box component="span" sx={{ fontWeight: 800, color: md3.onSurface, fontSize: 14 }}>
                Total
              </Box>
              <Box data-tab-total sx={{ textAlign: 'right', fontWeight: 800, color: md3.onSurface, fontSize: 14 }}>
                {money(tabTotal(tab))}
              </Box>
            </Box>

            <Stack direction="row" gap={1}>
              <ButtonBase
                data-send-to-kitchen={toSend}
                disabled={toSend === 0}
                onClick={() => dispatch({ type: 'sendToKitchen', target })}
                sx={{
                  flex: 1,
                  minHeight: 52,
                  gap: 0.75,
                  borderRadius: '14px',
                  bgcolor: '#b45309',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  '&.Mui-disabled': { bgcolor: md3.surfaceHighest, color: md3.onSurfaceVariant },
                }}
              >
                <Icon name="send" size={18} />
                {toSend ? `Send ${toSend} to kitchen` : 'Nothing to send'}
              </ButtonBase>
              <ButtonBase
                data-pay-tab
                disabled={!payable || tab.lines.length === 0}
                onClick={() => dispatch({ type: 'payTab', tabId: tab.id })}
                sx={{
                  flex: 1,
                  minHeight: 52,
                  borderRadius: '14px',
                  bgcolor: md3.onSurface,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 800,
                  '&.Mui-disabled': { bgcolor: md3.surfaceHighest, color: md3.onSurfaceVariant, opacity: 0.7 },
                }}
              >
                Pay {money(tabTotal(tab))}
              </ButtonBase>
            </Stack>

            {!payable ? (
              <Stack direction="row" alignItems="flex-start" gap={0.75} data-pay-refused sx={{ mt: 1, color: '#92400e' }}>
                <Icon name="warning_amber" size={16} sx={{ mt: '1px' }} />
                <Typography sx={{ fontSize: 12, lineHeight: 1.4, flex: 1 }}>
                  The register has another order on it. Pay or clear that order first, then pay this tab.
                </Typography>
                <ButtonBase
                  onClick={() => dispatch({ type: 'setView', view: 'pos' })}
                  sx={{ minHeight: 44, px: 1.25, borderRadius: `${radius.xl}px`, fontSize: 12, fontWeight: 800, color: md3.onSurface, border: `1.5px solid ${md3.outlineVariant}` }}
                >
                  Go to register
                </ButtonBase>
              </Stack>
            ) : toSend > 0 ? (
              <Typography sx={{ mt: 1, fontSize: 12, color: md3.onSurfaceVariant }}>
                {toSend} {toSend === 1 ? 'dish has' : 'dishes have'} not gone to the kitchen, and will be on the bill.
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {/* ── The menu ── */}
        <MenuBrowser
          target={target}
          seat={seat ?? undefined}
          defaultMenu="nineteenth"
          caption={
            <Stack direction="row" alignItems="center" gap={0.75} data-adding-to={seatWord} sx={{ fontSize: 13, fontWeight: 700 }}>
              <SeatSwatch seat={seat} />
              Adding to {seatWord}
            </Stack>
          }
        />
      </Stack>
    </Stack>
  );
}

const seatColor = (seat: number | null) => (seat ? playerAccents[(seat - 1) % playerAccents.length] : md3.outline);

function SeatSwatch({ seat }: { seat: number | null }) {
  return <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: seatColor(seat), flexShrink: 0 }} />;
}

/**
 * A seat and its plates. The band is a button that makes this the seat receiving items; it never
 * hides the lines under it. An empty seat says so, which is information too.
 */
function SeatBand({
  seat,
  lines,
  active,
  onSelect,
  tabId,
}: {
  seat: number | null;
  lines: CartItem[];
  active: boolean;
  onSelect: () => void;
  tabId: string;
}) {
  const label = seat ? `Seat ${seat}` : 'Shared';
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const color = seatColor(seat);
  return (
    <Box data-seat-band={seat ?? 'shared'} data-active={active || undefined} sx={{ mb: 1 }}>
      <ButtonBase
        aria-pressed={active}
        aria-label={`${label}${active ? ', adding here' : ''}`}
        onClick={onSelect}
        sx={{
          width: '100%',
          minHeight: 48,
          px: 1.5,
          gap: 1,
          justifyContent: 'flex-start',
          borderRadius: `${radius.md}px`,
          border: `2px solid ${active ? color : 'transparent'}`,
          bgcolor: active ? `${color}1f` : md3.surfaceContainer,
          mb: 0.75,
        }}
      >
        <Box sx={{ width: 6, alignSelf: 'stretch', my: 1, borderRadius: 3, bgcolor: color }} />
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant }}>
          {lines.length ? `${lines.length} item${lines.length === 1 ? '' : 's'} · ${money(subtotal)}` : 'Nothing yet'}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {active && (
          <Stack direction="row" alignItems="center" gap={0.375} sx={{ fontSize: 11.5, fontWeight: 800, color }}>
            <Icon name="add_circle" size={15} />
            Adding here
          </Stack>
        )}
      </ButtonBase>
      <Box sx={{ pl: 1 }}>
        {lines.map((l) => (
          <DishLine key={l.dish?.lineId ?? l.name} line={l} target={{ tabId }} />
        ))}
      </Box>
    </Box>
  );
}

/** Name, table, guests, server, check requested — everything that is the tab rather than its food. */
function TabHeader({ tab }: { tab: Tab }) {
  const { state, dispatch } = usePos();
  const [draft, setDraft] = useState<string | null>(null);
  const at = tableOf(state, tab.tableId);
  const floor = Math.max(1, minGuests(tab));
  const patch = (p: Parameters<typeof patchOf>[1]) => dispatch(patchOf(tab.id, p));

  const commitName = () => {
    if (draft === null) return;
    const name = draft.trim();
    if (name && name !== tab.name) patch({ name });
    setDraft(null);
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.25}
      sx={{ minHeight: gridTokens.topbarH, px: 1.5, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
    >
      <ButtonBase
        aria-label="All tabs"
        onClick={() => dispatch({ type: 'setActiveTab', tabId: null })}
        sx={{ minHeight: 44, px: 1.25, gap: 0.5, borderRadius: `${radius.xl}px`, fontSize: 13, fontWeight: 700, color: md3.onSurfaceVariant }}
      >
        <Icon name="arrow_back" size={18} />
        Tabs
      </ButtonBase>

      <InputBase
        value={draft ?? tab.name}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setDraft(null);
        }}
        inputProps={{ 'aria-label': 'Tab name', 'data-tab-name': true }}
        sx={{
          width: 240,
          minHeight: 44,
          px: 1.25,
          fontSize: 16,
          fontWeight: 800,
          borderRadius: `${radius.md}px`,
          border: `1.5px solid transparent`,
          '&:hover, &.Mui-focused': { borderColor: md3.outlineVariant },
        }}
      />

      <Stack direction="row" alignItems="center" gap={0.5} data-tab-table sx={{ fontSize: 13, color: md3.onSurfaceVariant, whiteSpace: 'nowrap' }}>
        <Icon name="table_restaurant" size={16} />
        {at ? `${tableLabel(at.table)} · ${at.room.name}` : 'No table'}
      </Stack>

      <Box sx={{ flex: 1 }} />

      <Stack direction="row" alignItems="center" gap={0.5} role="group" aria-label="Guests">
        <Step label="One fewer guest" disabled={tab.guests <= floor} onClick={() => patch({ guests: tab.guests - 1 })}>
          −
        </Step>
        <Stack direction="row" alignItems="center" gap={0.5} data-tab-guests={tab.guests} sx={{ minWidth: 76, justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
          <Icon name="people" size={16} color={md3.outline} />
          {tab.guests} guest{tab.guests === 1 ? '' : 's'}
        </Stack>
        <Step label="One more guest" disabled={tab.guests >= 30} onClick={() => patch({ guests: tab.guests + 1 })}>
          +
        </Step>
      </Stack>

      <Box
        component="select"
        aria-label="Server"
        value={tab.serverId}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => patch({ serverId: e.target.value })}
        sx={{
          minHeight: 44,
          px: 1.25,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${md3.outlineVariant}`,
          bgcolor: '#fff',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 600,
          color: md3.onSurface,
        }}
      >
        {/* A tab carried by someone no longer on the server list still shows who. */}
        {!SERVERS.some((s) => s.id === tab.serverId) && <option value={tab.serverId}>{tab.serverId}</option>}
        {SERVERS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Box>

      <ButtonBase
        data-check-requested-toggle
        aria-pressed={Boolean(tab.checkRequested)}
        onClick={() => patch({ checkRequested: !tab.checkRequested })}
        sx={{
          minHeight: 44,
          px: 1.5,
          gap: 0.625,
          borderRadius: `${radius.xl}px`,
          border: `1.5px solid ${tab.checkRequested ? '#b45309' : md3.outlineVariant}`,
          bgcolor: tab.checkRequested ? '#b45309' : '#fff',
          color: tab.checkRequested ? '#fff' : md3.onSurfaceVariant,
          fontSize: 13,
          fontWeight: 700,
          whiteSpace: 'nowrap',
        }}
      >
        <Icon name="receipt" size={16} />
        Check requested
      </ButtonBase>
    </Stack>
  );
}

const patchOf = (tabId: string, patch: Partial<Pick<Tab, 'name' | 'guests' | 'serverId' | 'checkRequested'>>) =>
  ({ type: 'patchTab', tabId, patch }) as const;

function Step({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <ButtonBase
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      sx={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: `1.5px solid ${md3.outlineVariant}`,
        fontSize: 20,
        color: md3.onSurfaceVariant,
        '&.Mui-disabled': { opacity: 0.35 },
      }}
    >
      {children}
    </ButtonBase>
  );
}
