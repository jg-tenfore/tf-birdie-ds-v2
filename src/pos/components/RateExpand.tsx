import { useState } from 'react';
import { Box, ButtonBase, InputBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { TRANSPORT_META } from '../data/config';
import {
  DISCOUNT_PRESETS,
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
  clearPlayerDiscount,
  clearPunchCard,
  playerFee,
  playerHoles,
  resetPlayerRate,
  setGroupRate,
  setPlayerDiscount,
  setPlayerRate,
  setPlayerTransportRate,
} from '../logic/reservation';
import { seatPrice, seatRate, seatRateGrid, seatRecord } from '../logic/seat-pricing';
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
 * Four rows, in the order money gets decided: the green fee, the ride, a discount, and — since
 * a punch card holds prepaid rounds — the option to put the round on one.
 */
export function RateExpand({ booking: b, seat: i }: { booking: Booking; seat: number }) {
  const { state, dispatch } = usePos();
  const rates = rateContext(state);
  const ctx = { catalog: state.weston.rateCatalog };
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });

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
  const heavy = grid.length > 12;
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(!heavy);
  const match = (r: GreenFeeRate) => r.name.toLowerCase().includes(filter.trim().toLowerCase());

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
      {/* ── Green fee ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
        <Label>Green fee · {holes} holes</Label>
        <Box sx={{ flex: 1 }} />
        {heavy && (
          <InputBase
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter rates…"
            aria-label="Filter rates"
            sx={{
              fontSize: 12,
              px: '8px',
              py: '2px',
              width: 130,
              border: `1px solid ${md3.outlineVariant}`,
              borderRadius: `${radius.sm}px`,
            }}
          />
        )}
      </Stack>

      {eligible.length > 0 && (
        <>
          {heavy && <SubLabel>Eligible · {eligible.length}</SubLabel>}
          <Tiles>
            {eligible.filter(match).map((r) => (
              <RateTile
                key={r.id}
                rate={r}
                holes={holes}
                selected={r.id === current?.id}
                eligible
                onClick={() => patch(setPlayerRate(b, i, r.id))}
              />
            ))}
          </Tiles>
        </>
      )}

      {rest.length > 0 && (
        <>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: eligible.length ? 1 : 0 }}>
            <SubLabel>{heavy ? `All rates · ${rest.length}` : 'Other rates'}</SubLabel>
            {heavy && (
              <ButtonBase
                onClick={() => setShowAll(!showAll)}
                sx={{ fontSize: 11, color: md3.primary, fontWeight: 700, px: 0.5 }}
              >
                {showAll ? 'Hide' : 'Show'}
              </ButtonBase>
            )}
          </Stack>
          {showAll && (
            <Tiles>
              {rest.filter(match).map((r) => (
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

      {/* ── Discounts ── */}
      <Label sx={{ mt: 1.25 }}>Discount</Label>
      <Tiles>
        {DISCOUNT_PRESETS.filter((d) => d.kind !== 'amount').map((d) => (
          <Tile
            key={d.id}
            selected={b.playerStates[i]?.discountId === d.id}
            onClick={() =>
              b.playerStates[i]?.discountId === d.id
                ? patch(clearPlayerDiscount(b, i))
                : patch(setPlayerDiscount(b, i, d.id))
            }
          >
            {d.label}
          </Tile>
        ))}
        <ManualDiscount booking={b} seat={i} />
      </Tiles>

      {/* ── Punch card ── */}
      <PunchRow booking={b} seat={i} />

      {/* ── Totals & group actions ── */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${md3.outlineVariant}` }}>
        <ButtonBase
          onClick={() => patch(resetPlayerRate(b, i))}
          sx={{ fontSize: 11.5, color: md3.primary, fontWeight: 700 }}
        >
          Reset
        </ButtonBase>
        {current && (
          <ButtonBase
            onClick={() => patch(setGroupRate(b, current.id))}
            sx={{ fontSize: 11.5, color: md3.primary, fontWeight: 700 }}
            title="Put everyone who hasn’t paid on this rate"
          >
            Save fees to all
          </ButtonBase>
        )}
        <Box sx={{ flex: 1 }} />
        <Total label="Green fee" value={p.greenFee} struck={p.discount > 0 || p.usesPunch ? p.gross : undefined} />
        <Total label="Transport" value={p.transportFee} />
        <Total label="Total" value={p.total} strong />
      </Stack>
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

function ManualDiscount({ booking: b, seat: i }: { booking: Booking; seat: number }) {
  const { dispatch } = usePos();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });

  if (!open) return <Tile onClick={() => setOpen(true)}>Amount…</Tile>;
  return (
    <InputBase
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))}
      onBlur={() => {
        const n = Number(value);
        if (n > 0) patch(setPlayerDiscount(b, i, 'disc-manual', n));
        setOpen(false);
      }}
      placeholder="$0.00"
      aria-label="Discount amount"
      sx={{
        fontSize: 12,
        px: '8px',
        py: '3px',
        width: 80,
        border: `1.5px solid ${md3.primary}`,
        borderRadius: `${radius.sm}px`,
      }}
    />
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
