import { useRef, useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { TRANSPORT_META } from '../data/config';
import {
  TRANSPORT_RATES,
  isEligible,
  price as ratePrice,
  usablePunchCards,
  type GreenFeeRate,
} from '../data/rate-catalog';
import { bookingName } from '../data/customers';
import { searchRoster } from '../data/roster';
import { money } from '../logic/cart';
import {
  applyPunchCard,
  clearPunchCard,
  playerFee,
  playerHoles,
  resetPlayerRate,
  setGroupRate,
  setPlayerRate,
  setPlayerTransportRate,
} from '../logic/reservation';
import { seatPrice, seatRate, seatRateGrid, seatRecord } from '../logic/seat-pricing';
import { ModalFrame, OutlineButton } from '../modals/ModalFrame';
import { rateContext } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import type { Booking } from '../types';
import { Icon } from './primitives';
import { Stack } from './Stack';

/**
 * The per-player rate editor, opened in place on the player row (Weston Edits, round 3).
 *
 * Weston's ask, from the call: staff don't want to type a price into a box — "they do want to
 * select what's available, because this is not showing you every rate that you have in the
 * system, it's showing you every rate that you could possibly have for this specific tee time
 * on this specific date." So the grid is narrowed by the slot, the rate the player is *owed* is
 * marked, and every other tile is still one tap away because the counter's job includes putting
 * someone on a rate they don't technically qualify for.
 *
 * It opens **in place** rather than as a second slide-over — his own suggestion ("maybe you
 * click and this expands, instead of taking over a full screen"). The group never leaves the
 * screen, so you can see what the other three are paying while you change one.
 *
 * **Three** rows, in the order money gets decided: the green fee, the ride, and — since a punch
 * card holds prepaid rounds — the option to put the round on one.
 *
 * There was a fourth. A **Discount** row of presets sat between transport and the punch card
 * until Weston cut it on the fourth call: *"the discounts are generally kind of built into the
 * rates… you have a discounted rate, which is like a rate that you set up, but then you can
 * discount on the order level. This would just kind of be weird because we'd introduce a
 * discount to a tee fee here."* Discounting still exists in both places it belongs — a rate
 * that *is* the discount, and the order-level discount in the register — so nothing was lost
 * except a third way to do it that did not match how courses are configured.
 *
 * ## Committing
 *
 * Edits land on the booking as they are tapped, because seeing the other three players reprice
 * while you change one is the point. But Weston went looking for a way to say he was finished —
 * *"I was looking for one… just like a confirm, like a save, just to close it"* — so the editor
 * is framed like a dialog: **✕** top right, **Cancel** and **Save changes** bottom left.
 *
 * Cancel is a real undo, not just a close. `before` holds every player's state as it was when
 * the editor opened, and Cancel puts it back — including a **Save fees to all** that swept the
 * whole group, since that is exactly the tap you would want to take back.
 */
export function RateExpand({
  booking: b,
  seat: i,
  onClose = () => {},
}: {
  booking: Booking;
  seat: number;
  /** Collapses the row. The editor is closed by ✕, Cancel and Save changes alike. */
  onClose?: () => void;
}) {
  const { state, dispatch } = usePos();
  const rates = rateContext(state);
  const ctx = { catalog: state.weston.rateCatalog };
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });

  // The whole party, as it was when this opened — `useRef` so it is captured once on mount and
  // never refreshed by the edits themselves. Every player rather than this seat, because
  // "Save fees to all" reaches the others and Cancel has to be able to reach them back.
  const before = useRef(b.playerStates);
  const cancel = () => {
    patch({ playerStates: before.current });
    onClose();
  };

  const holes = playerHoles(b, i);
  const grid = seatRateGrid(b, holes, ctx);
  const current = seatRate(b, i, ctx);
  const record = seatRecord(b, i);
  const p = seatPrice(b, i, playerFee(b, i, rates), ctx);

  // A course with a lot of rates needs the grid split: what this player qualifies for first,
  // everything else behind a filter. Weston: "there's some that have a lot, so we've got to
  // figure out how we handle all of that as well."
  const eligible = grid.filter((r) => isEligible(r, record));
  const rest = grid.filter((r) => !isEligible(r, record));

  /**
   * Past this many rates the row stops trying to show the catalog and shows a door to it.
   *
   * Weston, round 4: *"I've seen some where they might have like 30 rates, and they're all
   * applicable… it would just be a lot here. I wonder if we just truncate and there's an option
   * to open more up."* Twelve is where the grid stops fitting the panel without becoming the
   * whole panel.
   */
  const heavy = grid.length > 12;
  /** How many eligible tiles stay on the row when the catalog is heavy — two rows of four. */
  const INLINE_CAP = 8;

  const catalogOpen = state.reservationPanel?.rateCatalogOpen ?? false;
  const setCatalogOpen = (open: boolean) => dispatch({ type: 'setRateCatalogOpen', open });

  // On a heavy catalog the row shows the best eight and a door; on a normal one it shows
  // everything, which is the layout Weston already signed off on.
  const inlineEligible = heavy ? eligible.slice(0, INLINE_CAP) : eligible;
  const hiddenCount = grid.length - inlineEligible.length;

  return (
    <Box
      data-rate-expand={i}
      sx={{
        mt: 1,
        p: '10px 12px',
        borderRadius: `${radius.md}px`,
        bgcolor: md3.onPrimary,
        border: `1px solid ${md3.outlineVariant}`,
      }}
    >
      {/*
        A title bar, so the editor reads as something you are inside of and can leave.

        Weston kept looking for the way out: "I was looking for one." The ✕ is where every
        other dismissable thing on this terminal puts it, and the group actions that act on
        *other* players — Reset, Save fees to all — sit up here rather than beside Save
        changes, so the bottom row is only ever about this seat.
      */}
      <Stack
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ mb: 1, pb: 0.75, borderBottom: `1px solid ${md3.outlineVariant}` }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: md3.onSurface, minWidth: 0 }} noWrap>
          Rates · {i === 0 ? b.name : (b.guests?.[i]?.name ?? `Guest ${i + 1}`)}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <ButtonBase
          onClick={() => patch(resetPlayerRate(b, i))}
          sx={{ fontSize: 11.5, color: md3.primary, fontWeight: 700, px: 0.75, py: 0.5, borderRadius: `${radius.sm}px` }}
        >
          Reset
        </ButtonBase>
        {current && (
          <ButtonBase
            onClick={() => patch(setGroupRate(b, current.id))}
            sx={{ fontSize: 11.5, color: md3.primary, fontWeight: 700, px: 0.75, py: 0.5, borderRadius: `${radius.sm}px` }}
            title="Put everyone who hasn’t paid on this rate"
          >
            Save fees to all
          </ButtonBase>
        )}
        <ButtonBase
          onClick={cancel}
          aria-label="Close rates"
          title="Close without keeping these changes"
          sx={{
            width: 28,
            height: 28,
            borderRadius: `${radius.sm}px`,
            color: md3.onSurfaceVariant,
            flexShrink: 0,
          }}
        >
          <Icon name="close" size={16} />
        </ButtonBase>
      </Stack>

      {/* ── Green fee ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
        <Label>Green fee · {holes} holes</Label>
      </Stack>

      {inlineEligible.length > 0 && (
        <>
          {heavy && <SubLabel>Eligible · {eligible.length}</SubLabel>}
          <Tiles>
            {inlineEligible.map((r) => (
              <RateTile
                key={r.id}
                rate={r}
                holes={holes}
                selected={r.id === current?.id}
                eligible
                onClick={() => patch(setPlayerRate(b, i, r.id))}
              />
            ))}
            {/*
              The door to the rest, rather than the rest.

              Weston: "I wonder if we just truncate and there's an option to open more up" —
              Justin: "you know, X amount more, or like 20 more plus, and then it would bring
              up a modal." It sits at the end of the tiles so it is where your eye already is
              when you have run out of them.
            */}
            {heavy && hiddenCount > 0 && (
              <Tile onClick={() => setCatalogOpen(true)}>
                +{hiddenCount} more…
                <Amount>All {grid.length} rates</Amount>
              </Tile>
            )}
          </Tiles>
        </>
      )}

      {/*
        On a heavy catalog every other rate lives in the modal instead — otherwise this row
        would print thirty tiles under a heading that says the grid was truncated.
      */}
      {rest.length > 0 && !heavy && (
        <>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: eligible.length ? 1 : 0 }}>
            <SubLabel>Other rates</SubLabel>
          </Stack>
          {(
            <Tiles>
              {rest.map((r) => (
                <RateTile
                  key={r.id}
                  rate={r}
                  holes={holes}
                  selected={r.id === current?.id}
                  onClick={() => patch(setPlayerRate(b, i, r.id))}
                />
              ))}
            </Tiles>
          )}
        </>
      )}

      {/* ── Transport ── */}
      <Label sx={{ mt: 1.25 }}>Transport</Label>
      <Tiles>
        {TRANSPORT_RATES.map((t) => (
          <Tile
            key={t.id}
            selected={t.id === p.transport.id}
            dim={!isEligible(t, record)}
            onClick={() => patch(setPlayerTransportRate(b, i, t.id))}
            title={isEligible(t, record) ? undefined : 'Not this player’s rate — staff override'}
          >
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Icon name={TRANSPORT_META[t.mode].icon} size={13} />
              {t.name}
            </Stack>
            <Amount>{money(t.price)}</Amount>
          </Tile>
        ))}
      </Tiles>

      {/*
        No Discount row. Weston, round 4: "the discounts are generally kind of built into the
        rates… this would just kind of be weird because we'd introduce a discount to a tee fee
        here." A discounted rate is a rate; an order-level discount is in the register.
      */}

      {/* ── Punch card ── */}
      <PunchRow booking={b} seat={i} />

      {/* ── Totals, then the way out ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${md3.outlineVariant}` }}>
        <Box sx={{ flex: 1 }} />
        <Total label="Green fee" value={p.greenFee} struck={p.discount > 0 || p.usesPunch ? p.gross : undefined} />
        <Total label="Transport" value={p.transportFee} />
        <Total label="Total" value={p.total} strong />
      </Stack>

      {/*
        Cancel then Save changes, bottom left, in that order.

        The summary above them is what Weston wanted to read before committing — "it'll tell
        you, okay, they're getting this green fee, transport, this is the total, so it's like
        that summary. And just, okay, I'm done."
      */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25 }}>
        <ButtonBase
          onClick={cancel}
          sx={{
            height: 40,
            px: 2,
            borderRadius: `${radius.xl}px`,
            border: `1.5px solid ${md3.outlineVariant}`,
            fontSize: 12.5,
            fontWeight: 700,
            color: md3.onSurface,
          }}
        >
          Cancel
        </ButtonBase>
        <ButtonBase
          onClick={onClose}
          sx={{
            height: 40,
            px: 2.5,
            borderRadius: `${radius.xl}px`,
            bgcolor: md3.primary,
            color: md3.onPrimary,
            fontSize: 12.5,
            fontWeight: 800,
          }}
        >
          Save changes
        </ButtonBase>
      </Stack>

      {catalogOpen && (
        <RateCatalogModal
          eligible={eligible}
          rest={rest}
          holes={holes}
          currentId={current?.id}
          onPick={(id) => {
            patch(setPlayerRate(b, i, id));
            setCatalogOpen(false);
          }}
          onClose={() => setCatalogOpen(false)}
        />
      )}
    </Box>
  );
}

/**
 * Putting the round on a punch card.
 *
 * A card holds prepaid rounds, so this settles the green fee and leaves the ride on the bill.
 * It offers the player's own card first and then a search, because the old prototype's "use
 * other customer's punchcards" exists for a reason — a member covering a guest's round is a
 * normal Saturday.
 */
function PunchRow({ booking: b, seat: i }: { booking: Booking; seat: number }) {
  const { dispatch } = usePos();
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const applied = b.playerStates[i]?.punch;
  const own = usablePunchCards(seatRecord(b, i));
  const holders = searching ? searchRoster(query, 4).filter((c) => usablePunchCards(c).length > 0) : [];

  return (
    <>
      <Label sx={{ mt: 1.25 }}>Punch card</Label>
      {applied ? (
        <Tiles>
          <Tile selected onClick={() => patch(clearPunchCard(b, i))}>
            {applied.cardName}
            <Amount>applied · tap to remove</Amount>
          </Tile>
        </Tiles>
      ) : (
        <>
          <Tiles>
            {own.map((card) => (
              <Tile
                key={card.name}
                onClick={() => patch(applyPunchCard(b, i, seatRecord(b, i)!.id, card.name))}
              >
                {card.name}
                <Amount>
                  {card.remaining} of {card.total} left
                </Amount>
              </Tile>
            ))}
            <Tile onClick={() => setSearching(!searching)}>
              {own.length ? 'Another customer’s card' : 'Use a customer’s card'}
            </Tile>
          </Tiles>
          {searching && (
            <Box sx={{ mt: 0.75 }}>
              <InputBase
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a card holder…"
                aria-label="Search a card holder"
                sx={{
                  fontSize: 12,
                  px: '8px',
                  py: '3px',
                  width: '100%',
                  border: `1px solid ${md3.outlineVariant}`,
                  borderRadius: `${radius.sm}px`,
                }}
              />
              <Tiles>
                {holders.map((c) => (
                  <Tile
                    key={c.id}
                    onClick={() => {
                      patch(applyPunchCard(b, i, c.id, usablePunchCards(c)[0].name));
                      setSearching(false);
                    }}
                  >
                    {bookingName(c)}
                    <Amount>{usablePunchCards(c)[0].remaining} left</Amount>
                  </Tile>
                ))}
              </Tiles>
            </Box>
          )}
        </>
      )}
      {applied && (
        <Typography sx={{ fontSize: 10.5, color: md3.onSurfaceVariant, mt: 0.5 }}>
          The punch comes off the card at check-in, not now.
          {applied.customerId !== seatRecord(b, i)?.id && ' Another customer’s card.'}
        </Typography>
      )}
    </>
  );
}

/**
 * Every rate the course has for this slot, when the row cannot hold them.
 *
 * Weston's thirty-rate course, round 4: *"I've seen some where they might have like 30 rates
 * and they're all applicable, just like different scenarios. It would just be a lot here."*
 * Rather than making the player row scroll, the row keeps the eight the golfer actually
 * qualifies for and sends the rest here.
 *
 * Search is the reason this is a dialog and not a taller grid: past a dozen rates a counter
 * stops scanning and starts looking for a name they already know.
 */
function RateCatalogModal({
  eligible,
  rest,
  holes,
  currentId,
  onPick,
  onClose,
}: {
  eligible: GreenFeeRate[];
  rest: GreenFeeRate[];
  holes: 9 | 18;
  currentId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const match = (r: GreenFeeRate) => r.name.toLowerCase().includes(q.trim().toLowerCase());
  const hits = eligible.filter(match);
  const others = rest.filter(match);

  return (
    <ModalFrame
      title="All rates"
      subtitle={`${eligible.length + rest.length} for this tee time · ${holes} holes`}
      icon="sell"
      width={620}
      onClose={onClose}
      actions={<OutlineButton onClick={onClose}>Cancel</OutlineButton>}
    >
      <InputBase
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search rates…"
        aria-label="Search rates"
        sx={{
          fontSize: 13,
          px: '10px',
          py: '6px',
          width: '100%',
          mb: 1.5,
          border: `1.5px solid ${md3.outlineVariant}`,
          borderRadius: `${radius.sm}px`,
        }}
      />
      <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
        {hits.length > 0 && (
          <>
            <SubLabel>Eligible · {hits.length}</SubLabel>
            <Tiles>
              {hits.map((r) => (
                <RateTile
                  key={r.id}
                  rate={r}
                  holes={holes}
                  selected={r.id === currentId}
                  eligible
                  onClick={() => onPick(r.id)}
                />
              ))}
            </Tiles>
          </>
        )}
        {others.length > 0 && (
          <>
            <SubLabel>Other rates · {others.length}</SubLabel>
            <Tiles>
              {others.map((r) => (
                <RateTile
                  key={r.id}
                  rate={r}
                  holes={holes}
                  selected={r.id === currentId}
                  onClick={() => onPick(r.id)}
                />
              ))}
            </Tiles>
          </>
        )}
        {hits.length === 0 && others.length === 0 && (
          <Typography sx={{ fontSize: 13, color: md3.onSurfaceVariant, py: 2 }}>
            No rate matches “{q}”.
          </Typography>
        )}
      </Box>
    </ModalFrame>
  );
}

// ─── Tiles ──────────────────────────────────────────────────────────────────

/**
 * A rate, as a tile.
 *
 * Weston on why tiles rather than a dropdown: "they're quick, you can just click them. You're
 * not opening a dropdown, scrolling to find it, and then finding it with your finger." The
 * price is on the tile because the price is the thing being chosen.
 */
function RateTile({
  rate,
  holes,
  selected,
  eligible,
  onClick,
}: {
  rate: GreenFeeRate;
  holes: 9 | 18;
  selected: boolean;
  eligible?: boolean;
  onClick: () => void;
}) {
  return (
    <Tile
      selected={selected}
      dim={!eligible}
      onClick={onClick}
      title={eligible ? undefined : 'Not this player’s rate — staff override'}
    >
      {rate.name}
      <Amount>
        {money(ratePrice(rate, holes))}
        {rate.percentOff ? ` · ${rate.percentOff}% off` : ''}
      </Amount>
    </Tile>
  );
}

function Tile({
  children,
  selected,
  dim,
  onClick,
  title,
}: {
  children: React.ReactNode;
  selected?: boolean;
  dim?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      sx={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        px: '9px',
        py: '5px',
        minWidth: 92,
        borderRadius: `${radius.sm}px`,
        border: `1.5px solid ${selected ? md3.primary : md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : md3.onPrimary,
        color: selected ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 11.5,
        fontWeight: 700,
        lineHeight: 1.25,
        textAlign: 'left',
        opacity: dim ? 0.55 : 1,
      }}
    >
      {children}
    </ButtonBase>
  );
}

const Tiles = ({ children }: { children: React.ReactNode }) => (
  <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', mt: 0.5 }}>
    {children}
  </Stack>
);

const Amount = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ fontSize: 10.5, fontWeight: 600, color: md3.onSurfaceVariant }}>
    {children}
  </Box>
);

/**
 * Uppercased by CSS, not by `String()`.
 *
 * `String(children)` looked equivalent for a plain string, but JSX hands an *array* for
 * anything interpolated — `<Label>Green fee · {holes} holes</Label>` became
 * "GREEN FEE · ,9, HOLES" on screen. Letting the browser do the casing also leaves the text
 * selectable and searchable as written.
 */
const Label = ({ children, sx }: { children: React.ReactNode; sx?: object }) => (
  <Typography
    sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: md3.outline, textTransform: 'uppercase', ...sx }}
  >
    {children}
  </Typography>
);

const SubLabel = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 10, fontWeight: 700, color: md3.onSurfaceVariant, mt: 0.5 }}>
    {children}
  </Typography>
);

function Total({
  label,
  value,
  struck,
  strong,
}: {
  label: string;
  value: number;
  struck?: number;
  strong?: boolean;
}) {
  return (
    <Box sx={{ textAlign: 'right', minWidth: 62 }}>
      <Typography sx={{ fontSize: 9.5, color: md3.outline, fontWeight: 700 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography sx={{ fontSize: strong ? 14 : 12.5, fontWeight: strong ? 800 : 700 }}>
        {struck != null && struck !== value && (
          <Box component="span" sx={{ textDecoration: 'line-through', color: md3.outline, mr: 0.5, fontWeight: 600 }}>
            {money(struck)}
          </Box>
        )}
        {money(value)}
      </Typography>
    </Box>
  );
}
