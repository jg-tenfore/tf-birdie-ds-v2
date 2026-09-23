import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Radio,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MoreVert from '@mui/icons-material/MoreVert';
import Remove from '@mui/icons-material/Remove';
import { md3, memberTypes, mobile, radius } from '../../../../theme/tokens';
import { formatTimeLabel } from '../../../data/courses';
import { idMeGroupOf } from '../../../data/golfers';
import { checkInPlayer } from '../../../logic/bookings';
import { money } from '../../../logic/cart';
import {
  holesFee,
  isEditableSeat,
  patchEachPlayer,
  playerFee,
  playerHoles,
  playerIsAdjusted,
  playerTransport,
  removePlayer,
  resetPlayer,
  resizeParty,
  setGroupTransport,
  setPlayerFee,
  setPlayerHoles,
  setPlayerTransport,
} from '../../../logic/reservation';
import { seatPrice, seatRecord } from '../../../logic/seat-pricing';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import type { Booking, PlayerState, Transport } from '../../../types';
import { BottomSheet } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Callout, IdMeBadge, PlayerAvatar, SectionHeader, StatusBadge } from './parts';
import { TRANSPORTS, transportMeta, useRates, useReservationLimits } from './reservation-helpers';
import { checkedInCount, dayLabel, parseDateStr, playerName, roundStepOf, seatGolfer, seatMemberType } from './tee-helpers';

/**
 * The reservation's Players tab — Weston Edits on the phone.
 *
 * Weston: "the details of the golf first — change the players, the amount of players, the
 * tee fee, or change from 9 to 18 holes per player". So every player row carries those
 * controls directly (holes, fee, transport), and everything that needs more room — the
 * round rail, contact, swapping the customer — is one tap away on Player Detail. The row's
 * top half is the drill-down; its bottom half is the controls, so a tap on a control never
 * doubles as navigation.
 *
 * Paid (and no-show) players are locked: their money has moved, so changing what they
 * "cost" here would be fiction. Refunds live on the Financial tab.
 */

type SheetState =
  | null
  | { kind: 'transport' | 'row' | 'remove'; index: number }
  | { kind: 'group' };

export function ReservationPlayersTab({ booking: b }: { booking: Booking }) {
  const { dispatch, toast } = usePos();
  const { course, is18, max, day } = useReservationLimits(b);
  const [sheet, setSheet] = useState<SheetState>(null);
  const states = b.playerStates ?? [];
  const closed = b.pay === 'no_show' || b.pay === 'refund';
  const patch = (p: Partial<Booking>, msg?: string) => {
    if (!Object.keys(p).length) return;
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: p });
    if (msg) toast(msg);
  };

  // The last seat can be dropped by the stepper only while it's still open — shrinking
  // never silently removes someone who has paid or teed off.
  const last = states[states.length - 1];
  const canShrink = b.players > 1 && isEditableSeat(last) && (last?.step ?? -1) < 0;
  const canGrow = !closed && b.players < max;

  const facts: Array<[string, string]> = [
    ['Date', dayLabel(parseDateStr(b.date), { weekday: 'long', month: 'short', day: 'numeric' })],
    ['Tee time', `${formatTimeLabel(b.timeMin)} · ${course?.name ?? b.course}`],
    ['Confirmation', b.conf],
    ['Booking rate', b.price ? `${money(b.price)} per player · ${b.holes}` : `Member · ${money(0)}`],
    ['Phone', b.phone || '—'],
  ];

  return (
    <Box sx={{ pb: 2 }}>
      {b.note && (
        <Callout tone="warning" icon="sticky_note_2" sx={{ mx: 2, mt: 2 }}>
          {b.note}
        </Callout>
      )}

      <SectionHeader
        action={
          !closed && (
            <Button size="small" startIcon={<Icon name="groups" size={18} />} onClick={() => setSheet({ kind: 'group' })}>
              Everyone
            </Button>
          )
        }
      >
        {checkedInCount(b)}/{b.players} checked in · {states.filter((p) => p.paid).length} paid
      </SectionHeader>

      <Stack gap={1} sx={{ px: 2 }}>
        {states.map((p, i) => (
          <PlayerRow key={i} booking={b} index={i} p={p} is18={is18} locked={closed || !isEditableSeat(p)} onSheet={(kind) => setSheet({ kind, index: i })} />
        ))}
      </Stack>

      {/* Party size: a stepper bounded by what the row can seat together. */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ mx: 2, mt: 1.5, pl: 2, pr: 1, minHeight: mobile.listItem.two, borderRadius: `${radius.md}px`, border: `1px dashed ${md3.outlineVariant}` }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1">Players</Typography>
          <Typography variant="caption" component="div">
            {max > b.players ? `Room for ${max} together at ${formatTimeLabel(b.timeMin)}` : `Row is full at ${formatTimeLabel(b.timeMin)}`}
          </Typography>
        </Box>
        <IconButton
          aria-label="Remove last player"
          disabled={!canShrink}
          onClick={() => patch(resizeParty(b, b.players - 1, course, day), `${b.players - 1} players`)}
          sx={{ border: `1px solid ${md3.outlineVariant}` }}
        >
          <Remove />
        </IconButton>
        <Typography variant="h6" aria-live="polite" sx={{ minWidth: 28, textAlign: 'center' }}>
          {b.players}
        </Typography>
        <IconButton
          aria-label="Add player"
          disabled={!canGrow}
          onClick={() => patch(resizeParty(b, b.players + 1, course, day), `Player ${b.players + 1} added`)}
          sx={{ border: `1px solid ${md3.outlineVariant}` }}
        >
          <Add />
        </IconButton>
      </Stack>

      <SectionHeader sx={{ mt: 1 }}>Reservation</SectionHeader>
      <Box sx={{ px: 2 }}>
        {facts.map(([k, v]) => (
          <Stack key={k} direction="row" justifyContent="space-between" gap={2} sx={{ py: 1, borderBottom: `1px solid ${md3.outlineVariant}` }}>
            <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
              {k}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, textAlign: 'right' }}>
              {v}
            </Typography>
          </Stack>
        ))}
      </Box>

      {/* ── Sheets ── */}

      <BottomSheet
        open={sheet?.kind === 'transport'}
        onClose={() => setSheet(null)}
        title={sheet && 'index' in sheet ? `Transport · ${playerName(b, sheet.index)}` : undefined}
      >
        {sheet && 'index' in sheet && (
          <TransportList
            value={playerTransport(b, sheet.index)}
            onPick={(t) => {
              patch(setPlayerTransport(b, sheet.index, t), `${playerName(b, sheet.index)} · ${transportMeta(t).long}`);
              setSheet(null);
            }}
          />
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.kind === 'row'} onClose={() => setSheet(null)} title={sheet && 'index' in sheet ? playerName(b, sheet.index) : undefined}>
        {sheet && 'index' in sheet && (
          <RowActions
            booking={b}
            index={sheet.index}
            onDone={() => setSheet(null)}
            onRemove={() => setSheet({ kind: 'remove', index: sheet.index })}
          />
        )}
      </BottomSheet>

      {/* Destructive confirmation stays in the sheet — no centred dialog on the phone. */}
      <BottomSheet open={sheet?.kind === 'remove'} onClose={() => setSheet(null)} title="Remove this player?">
        {sheet && 'index' in sheet && (
          <>
            <Typography variant="body2" sx={{ px: 3, color: md3.onSurfaceVariant }}>
              {playerName(b, sheet.index)} comes off {b.name}'s tee time and the seat is released. Everyone after moves up.
            </Typography>
            <Stack direction="row" gap={1} sx={{ px: 3, pt: 3 }}>
              <Button variant="outlined" fullWidth onClick={() => setSheet(null)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                color="error"
                disableElevation
                fullWidth
                onClick={() => {
                  patch(removePlayer(b, sheet.index), `${playerName(b, sheet.index)} removed`);
                  setSheet(null);
                }}
              >
                Remove
              </Button>
            </Stack>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={sheet?.kind === 'group'} onClose={() => setSheet(null)} title="Everyone on this tee time">
        <GroupActions booking={b} is18={is18} onDone={() => setSheet(null)} />
      </BottomSheet>
    </Box>
  );
}

// ─── One player ─────────────────────────────────────────────────────────────

/**
 * One player: who (with ID.me and member tier), where they are in the round, whether
 * they've paid — then the three things Weston wants to change per player: holes, fee,
 * transport. The ⋮ holds the rest (swap customer, reset, remove).
 */
function PlayerRow({
  booking: b,
  index: i,
  p,
  is18,
  locked,
  onSheet,
}: {
  booking: Booking;
  index: number;
  p: PlayerState;
  is18: boolean;
  locked: boolean;
  onSheet: (kind: 'transport' | 'row') => void;
}) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const rates = useRates();
  const name = playerName(b, i);
  const mt = seatMemberType(b, i, roster);
  const golfer = seatGolfer(b, i, roster);
  const idMe = idMeGroupOf(golfer?.id);
  const fee = playerFee(b, i, rates);
  const holes = playerHoles(b, i);
  const t = transportMeta(playerTransport(b, i));
  const adjusted = playerIsAdjusted(b, i);
  const sp = seatPrice(b, i, fee, { catalog: state.weston.rateCatalog, customers: state.customerEdits });
  const record = seatRecord(b, i, state.customerEdits);
  const inOrder = state.selectedBookingId === b.id && (state.orderSeats?.includes(i) ?? false);
  const status = p.noShow ? 'No-show' : roundStepOf(p).label;

  return (
    <Box
      sx={{
        borderRadius: `${radius.md}px`,
        border: `1px solid ${adjusted ? md3.primary : md3.outlineVariant}`,
        bgcolor: mobile.surfaceContainerLow,
        overflow: 'hidden',
      }}
    >
      {/*
        The name opens the **customer record**, as it does on the tablet. Weston asked for this
        directly — "if I click on Michael Thompson… does something else open?" — and the phone
        was pushing Player Detail instead, so the one gesture round 3 is built around behaved
        differently on the two devices. Player Detail is still reachable from the ⋮.
      */}
      <ButtonBase
        onClick={() =>
          nav.push({
            name: 'customerRecord',
            customerId: record?.id ?? null,
            bookingId: b.id,
            seat: i,
          })
        }
        sx={{ width: '100%', justifyContent: 'flex-start', gap: 1.5, pl: 1.5, pr: 1, pt: 1.25, pb: 0.75, textAlign: 'left' }}
      >
        <PlayerAvatar name={name} index={i} dim={p.noShow} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            {mt && <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: memberTypes[mt].color, flexShrink: 0 }} />}
            <Typography variant="body1" noWrap sx={{ fontWeight: 500, minWidth: 0 }}>
              {name}
            </Typography>
            {i === 0 && (
              <Typography variant="caption" sx={{ flexShrink: 0 }}>
                Booker
              </Typography>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.25, minHeight: 22 }}>
            {idMe && <IdMeBadge group={idMe} compact />}
            <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
              {status}
            </Typography>
          </Stack>
        </Box>
        <StatusBadge pay={p.noShow ? 'no_show' : p.paid ? 'paid' : 'open'} />
        <ChevronRightIcon sx={{ color: md3.onSurfaceVariant }} />
      </ButtonBase>

      <Stack direction="row" alignItems="center" gap={1} sx={{ pl: 1.5, pr: 0.5, pb: 1 }}>
        {is18 ? (
          <HolesToggle
            value={holes}
            disabled={locked}
            onChange={(h) => {
              dispatch({ type: 'patchBooking', bookingId: b.id, patch: setPlayerHoles(b, i, h) });
              toast(`${name} · ${h} holes · ${money(holesFee(b, i, h, rates))}`);
            }}
          />
        ) : (
          <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, px: 0.5 }}>
            {holes} holes
          </Typography>
        )}
        <ControlChip
          disabled={locked}
          // The label stays the fee, which is what the chip shows; the rate's *name* is on the
          // meta line right below it, so putting it here too would only make the chip harder to
          // read aloud and harder to find.
          label={`Tee fee ${money(sp.greenFee)}`}
          onClick={() => nav.push({ name: 'seatRate', bookingId: b.id, seat: i })}
          strong={b.playerStates[i]?.fee != null || b.playerStates[i]?.rateId != null}
        >
          {money(sp.greenFee)}
        </ControlChip>
        <ControlChip disabled={locked} label={`Transport ${t.long}`} onClick={() => onSheet('transport')} strong={b.playerStates[i]?.transport != null}>
          <Icon name={t.icon} size={16} />
          {t.label}
        </ControlChip>
        <Box sx={{ flex: 1 }} />
        {/* Weston: "you hit add to cart for each player, and then you hit save." The pinned
            Check in & pay stays; this is for a group splitting the bill. */}
        {!locked && (
          <ControlChip
            label={inOrder ? `${name} is on the order` : `Add ${name} to the order`}
            onClick={() => dispatch({ type: 'addSeatToOrder', bookingId: b.id, seat: i })}
            strong={inOrder}
            pressed={inOrder}
          >
            <Icon name={inOrder ? 'shopping_cart' : 'add_shopping_cart'} size={16} />
          </ControlChip>
        )}
        <IconButton aria-label={`More for ${name}`} onClick={() => onSheet('row')}>
          <MoreVert />
        </IconButton>
      </Stack>
      <Typography
        variant="caption"
        component="div"
        sx={{ px: 1.5, pb: 0.75, mt: -0.25, color: md3.onSurfaceVariant }}
      >
        {[
          sp.rate && `${sp.rate.name} : ${money(sp.greenFee)}`,
          // Why the seat is cheap, not just that it is. A discount says what it was worth
          // before; a punch names the card that settled it.
          sp.usesPunch ? sp.reason : sp.discount > 0 ? `${sp.reason} · was ${money(sp.gross)}` : null,
          `${sp.transport.name} : ${money(sp.transportFee)}`,
          record && `ID ${record.id}`,
          p.cartKey != null && `cart ${p.cartKey}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      {locked && p.paid && (
        <Typography variant="caption" component="div" sx={{ px: 1.5, pb: 1, mt: -0.5 }}>
          Paid — refund on the Financial tab to change this player
        </Typography>
      )}
    </Box>
  );
}

/** A compact 9 | 18 segmented control, 36dp tall — the row's first control. */
export function HolesToggle({ value, onChange, disabled }: { value: 9 | 18; onChange: (h: 9 | 18) => void; disabled?: boolean }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      aria-label="Holes"
      value={value}
      disabled={disabled}
      onChange={(_, v) => v != null && onChange(v as 9 | 18)}
      sx={{
        flexShrink: 0,
        '& .MuiToggleButton-root': {
          height: 36,
          minWidth: 44,
          px: 1.25,
          borderColor: md3.outline,
          color: md3.onSurface,
          fontWeight: 600,
          '&.Mui-selected': { bgcolor: mobile.secondaryContainer, color: mobile.onSecondaryContainer },
          '&.Mui-selected:hover': { bgcolor: mobile.secondaryContainer },
        },
        '& .MuiToggleButton-root:first-of-type': { borderRadius: '18px 0 0 18px' },
        '& .MuiToggleButton-root:last-of-type': { borderRadius: '0 18px 18px 0' },
      }}
    >
      <ToggleButton value={9}>9</ToggleButton>
      <ToggleButton value={18}>18</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** An outlined assist-chip-sized button; `strong` marks a value that differs from the booking. */
function ControlChip({
  children,
  label,
  onClick,
  disabled,
  strong,
  pressed,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  strong?: boolean;
  /**
   * Marks the chip as a toggle that is on. Without it a chip whose only state cue is its fill
   * reads to a screen reader as a plain button — the terminal's equivalent already says so.
   */
  pressed?: boolean;
}) {
  return (
    <ButtonBase
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      sx={{
        height: 36,
        px: 1.25,
        gap: 0.5,
        flexShrink: 0,
        borderRadius: `${radius.sm}px`,
        border: `1px solid ${strong ? md3.primary : md3.outline}`,
        bgcolor: strong ? md3.primaryContainer : 'transparent',
        color: strong ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </ButtonBase>
  );
}

// ─── Sheets ─────────────────────────────────────────────────────────────────

/**
 * Tee fee for one player: type a fee, or pick the default for their holes or a comp. The
 * default is what Reset returns to, so a typed fee is always one tap from undone.
 */
export function FeeSheet({ booking: b, index: i, onClose }: { booking: Booking; index: number; onClose: () => void }) {
  const { dispatch, toast } = usePos();
  const rates = useRates();
  const name = playerName(b, i);
  const holes = playerHoles(b, i);
  const def = holesFee(b, i, holes, rates);
  const [value, setValue] = useState(String(playerFee(b, i, rates)));
  const n = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(n) && n >= 0;
  const save = (fee: number) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: setPlayerFee(b, i, fee, rates) });
    toast(`${name} · tee fee ${money(fee)}`);
    onClose();
  };
  return (
    <BottomSheet open onClose={onClose} title={`Tee fee · ${name}`}>
      <Box sx={{ px: 3 }}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant, mb: 2 }}>
          {holes} holes · default {money(def)}. The register charges this, plus transport and tax.
        </Typography>
        <TextField
          autoFocus
          label="Tee fee"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
          slotProps={{
            htmlInput: { inputMode: 'decimal', 'aria-label': 'Tee fee' },
            input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
          }}
          error={!valid}
          helperText={valid ? ' ' : 'Enter an amount'}
        />
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
          <Button variant="outlined" size="small" onClick={() => setValue(String(def))}>
            Default {money(def)}
          </Button>
          <Button variant="outlined" size="small" onClick={() => setValue('0')}>
            Comp {money(0)}
          </Button>
        </Stack>
      </Box>
      <Stack direction="row" gap={1} sx={{ px: 3, pt: 3 }}>
        <Button variant="outlined" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" disableElevation fullWidth disabled={!valid} onClick={() => save(n)}>
          Save
        </Button>
      </Stack>
    </BottomSheet>
  );
}

/** Walk / cart / push as a radio list — the sheet version of the transport control. */
export function TransportList({ value, onPick }: { value: Transport; onPick: (t: Transport) => void }) {
  return (
    <List disablePadding>
      {TRANSPORTS.map((t) => (
        <ListItemButton key={t.value} onClick={() => onPick(t.value)} sx={{ minHeight: mobile.listItem.one, px: 3 }}>
          <ListItemIcon>
            <Icon name={t.icon} size={24} color={md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary={t.long} />
          <Radio edge="end" checked={value === t.value} tabIndex={-1} />
        </ListItemButton>
      ))}
    </List>
  );
}

/** The ⋮ on a player row: profile, swap/link a customer, reset, remove. */
function RowActions({ booking: b, index: i, onDone, onRemove }: { booking: Booking; index: number; onDone: () => void; onRemove: () => void }) {
  const nav = useMobileNav();
  const { state, dispatch, toast } = usePos();
  const roster = useGolferRoster();
  const golfer = seatGolfer(b, i, roster);
  const p = b.playerStates[i];
  const editable = isEditableSeat(p);
  const items: Array<{ icon: string; label: string; secondary?: string; destructive?: boolean; run: () => void; stay?: boolean }> = [
    {
      icon: 'manage_accounts',
      label: golfer ? 'Customer profile' : 'Link a customer',
      // Weston, round 3: the record is the person's, not the reservation's, so it opens as its
      // own screen rather than as a tab on the booking. An empty seat opens it in assign mode.
      secondary: golfer ? 'Their record' : 'Search or create',
      run: () =>
        nav.push({
          name: 'customerRecord',
          customerId: seatRecord(b, i, state.customerEdits)?.id ?? null,
          bookingId: b.id,
          seat: i,
        }),
    },
    ...(golfer
      ? [{ icon: 'swap_horiz', label: 'Swap customer', secondary: `Replace ${playerName(b, i)}`, run: () => nav.push({ name: 'golferPicker', target: { bookingId: b.id, playerIndex: i } }) }]
      : []),
    {
      icon: 'person',
      label: 'Player detail',
      secondary: 'Their round, holes and status',
      run: () => nav.push({ name: 'playerDetail', bookingId: b.id, playerIndex: i }),
    },
    // Keys are handed out at the cart barn, where the phone is the device in hand.
    ...(editable
      ? [
          {
            icon: 'vpn_key',
            label: p.cartKey != null ? `Cart ${p.cartKey}` : 'Cart signout',
            secondary: p.cartKey != null ? 'Change or return it' : 'Hand over a key',
            run: () => nav.push({ name: 'cartSignout', bookingId: b.id, seat: i }),
          },
        ]
      : []),
    ...(editable && playerIsAdjusted(b, i)
      ? [
          {
            icon: 'restart_alt',
            label: 'Reset to booking',
            secondary: `${b.holes} · ${money(b.price)} · ${transportMeta(b.cart).long}`,
            run: () => {
              dispatch({ type: 'patchBooking', bookingId: b.id, patch: resetPlayer(b, i) });
              toast(`${playerName(b, i)} · reset`);
            },
          },
        ]
      : []),
    ...(i > 0 && editable
      ? [{ icon: 'person_off', label: 'Remove from tee time', destructive: true, stay: true, run: onRemove }]
      : []),
  ];
  return (
    <List disablePadding>
      {items.map((it) => (
        <ListItemButton
          key={it.label}
          onClick={() => {
            if (!it.stay) onDone();
            it.run();
          }}
          sx={{ px: 3, color: it.destructive ? md3.error : md3.onSurface }}
        >
          <ListItemIcon>
            <Icon name={it.icon} size={24} color={it.destructive ? md3.error : md3.onSurfaceVariant} />
          </ListItemIcon>
          <ListItemText primary={it.label} secondary={it.secondary} />
        </ListItemButton>
      ))}
      {i === 0 && (
        <Typography variant="caption" component="div" sx={{ px: 3, pt: 1 }}>
          The booker can be swapped but not removed — delete the booking instead.
        </Typography>
      )}
    </List>
  );
}

/**
 * Group quick actions: the same edit for every player still open. Paid players are skipped
 * (and said so), which is why these aren't just `setAllPlayers`.
 */
function GroupActions({ booking: b, is18, onDone }: { booking: Booking; is18: boolean; onDone: () => void }) {
  const { dispatch, toast } = usePos();
  const states = b.playerStates ?? [];
  const open = states.filter(isEditableSeat).length;
  const locked = states.length - open;
  const run = (patch: Partial<Booking>, msg: string) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch });
    toast(msg);
    onDone();
  };
  const transport = (t: Transport) =>
    // Nobody paid: move the booking's own transport. Otherwise override the open seats only.
    locked === 0 ? setGroupTransport(b, t) : patchEachPlayer(b, (x, i) => setPlayerTransport(x, i, t), isEditableSeat);

  const items: Array<{ icon: string; label: string; run: () => void; hidden?: boolean }> = [
    { icon: 'directions_car', label: 'Everyone rides', run: () => run(transport('cart'), 'Everyone rides') },
    { icon: 'directions_walk', label: 'Everyone walks', run: () => run(transport('walking'), 'Everyone walks') },
    { icon: 'electric_scooter', label: 'Everyone push cart', run: () => run(transport('push'), 'Everyone on push carts') },
    { icon: 'golf_course', label: 'Everyone plays 18', hidden: !is18, run: () => run(patchEachPlayer(b, (x, i) => setPlayerHoles(x, i, 18), isEditableSeat), 'Everyone plays 18') },
    { icon: 'golf_course', label: 'Everyone plays 9', hidden: !is18, run: () => run(patchEachPlayer(b, (x, i) => setPlayerHoles(x, i, 9), isEditableSeat), 'Everyone plays 9') },
    {
      icon: 'how_to_reg',
      label: 'Check in everyone',
      hidden: checkedInCount(b) === b.players,
      run: () => run({ playerStates: states.map(checkInPlayer) }, 'All checked in'),
    },
    {
      icon: 'restart_alt',
      label: 'Reset everyone to the booking',
      hidden: !states.some((_, i) => playerIsAdjusted(b, i)),
      run: () => run(patchEachPlayer(b, resetPlayer, isEditableSeat), 'Reset to the booking'),
    },
  ];
  return (
    <>
      {locked > 0 && (
        <Typography variant="body2" sx={{ px: 3, pb: 1, color: md3.onSurfaceVariant }}>
          Applies to the {open} open player{open === 1 ? '' : 's'} — {locked} paid or no-show {locked === 1 ? 'stays' : 'stay'} as is.
        </Typography>
      )}
      <List disablePadding>
        {items
          .filter((it) => !it.hidden)
          .map((it) => (
            <ListItemButton key={it.label} onClick={it.run} sx={{ px: 3, minHeight: mobile.listItem.one }}>
              <ListItemIcon>
                <Icon name={it.icon} size={24} color={md3.onSurfaceVariant} />
              </ListItemIcon>
              <ListItemText primary={it.label} />
            </ListItemButton>
          ))}
      </List>
    </>
  );
}
