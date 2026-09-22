import { useState } from 'react';
import { Box, ButtonBase, TextField, Typography } from '@mui/material';
import { md3, radius } from '../../../../theme/tokens';
import { TRANSPORT_META } from '../../../data/config';
import { bookingName } from '../../../data/customers';
import {
  DISCOUNT_PRESETS,
  TRANSPORT_RATES,
  isEligible,
  price as ratePrice,
  usablePunchCards,
  type GreenFeeRate,
} from '../../../data/rate-catalog';
import { searchRoster } from '../../../data/roster';
import { money } from '../../../logic/cart';
import {
  applyPunchCard,
  clearPlayerDiscount,
  clearPunchCard,
  playerFee,
  playerHoles,
  playerName,
  resetPlayerRate,
  setGroupRate,
  setPlayerDiscount,
  setPlayerRate,
  setPlayerTransportRate,
} from '../../../logic/reservation';
import { seatPrice, seatRate, seatRateGrid, seatRecord } from '../../../logic/seat-pricing';
import { Icon } from '../../../components/primitives';
import { Stack } from '../../../components/Stack';
import { rateContext } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import type { Booking } from '../../../types';
import { DialogTopBar, MobileScreen } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingGone, SectionHeader } from './parts';

/**
 * One seat's rate, on the phone (Weston Edits, round 3).
 *
 * The tablet expands the tile grid in place on the player row, which was Weston's own
 * suggestion — "maybe you click and this expands, instead of taking over a full screen". That
 * does not survive the move to 402px: four rows of tiles under an open row pushes the rest of
 * the group off screen entirely, so you lose the group *and* have to scroll. A full-screen
 * dialog gives the tiles the room they need and puts the group one tap away instead of one
 * long scroll away.
 *
 * Same four rows, in the same order money gets decided: the green fee, the ride, a discount,
 * and — since a punch card holds prepaid rounds — the option to put the round on one. ✕
 * discards, Save commits, which is the phone build's pattern for editing one thing.
 */
export function SeatRateScreen({ route }: ScreenProps<'seatRate'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const b = state.bookings.find((x) => x.id === route.bookingId);

  if (!b) return <BookingGone />;

  const i = route.seat;
  const rates = rateContext(state);
  const ctx = { catalog: state.weston.rateCatalog };
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });

  const holes = playerHoles(b, i);
  const grid = seatRateGrid(b, holes, ctx);
  const current = seatRate(b, i, ctx);
  const record = seatRecord(b, i);
  const p = seatPrice(b, i, playerFee(b, i, rates), ctx);
  const name = playerName(b, i);

  const eligible = grid.filter((r) => isEligible(r, record));
  const rest = grid.filter((r) => !isEligible(r, record));

  return (
    <MobileScreen
      topBar={
        <DialogTopBar
          title={
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>
                {name}
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant }}>
                {holes} holes · {money(p.total)}
              </Typography>
            </Box>
          }
          confirmLabel="Save"
          onConfirm={() => nav.pop()}
          onClose={() => nav.pop()}
        />
      }
    >
      <Box sx={{ p: 2, pb: 4 }}>
        <SectionHeader>Green fee · {holes} holes</SectionHeader>
        {eligible.length > 0 && <Hint>What {record ? 'they qualify for' : 'this tee time sells'}</Hint>}
        <Tiles>
          {eligible.map((r) => (
            <RateTile
              key={r.id}
              rate={r}
              holes={holes}
              selected={r.id === current?.id}
              onClick={() => patch(setPlayerRate(b, i, r.id))}
            />
          ))}
        </Tiles>

        {rest.length > 0 && (
          <>
            {/* Shown, not hidden: the counter's job includes putting someone on a rate they do
                not technically qualify for. Dimmed so it is clear which is which. */}
            <Hint>Other rates · staff override</Hint>
            <Tiles>
              {rest.map((r) => (
                <RateTile
                  key={r.id}
                  rate={r}
                  holes={holes}
                  dim
                  selected={r.id === current?.id}
                  onClick={() => patch(setPlayerRate(b, i, r.id))}
                />
              ))}
            </Tiles>
          </>
        )}

        <SectionHeader>Transport</SectionHeader>
        <Tiles>
          {TRANSPORT_RATES.map((t) => (
            <Tile
              key={t.id}
              selected={t.id === p.transport.id}
              dim={!isEligible(t, record)}
              onClick={() => patch(setPlayerTransportRate(b, i, t.id))}
            >
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Icon name={TRANSPORT_META[t.mode].icon} size={14} />
                {t.name}
              </Stack>
              <Amount>{money(t.price)}</Amount>
            </Tile>
          ))}
        </Tiles>

        <SectionHeader>Discount</SectionHeader>
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
        </Tiles>

        <PunchSection booking={b} seat={i} />

        <Stack direction="row" gap={1} sx={{ mt: 2 }}>
          <ButtonBase
            onClick={() => patch(resetPlayerRate(b, i))}
            sx={{ fontSize: 13, fontWeight: 700, color: md3.primary, py: 1 }}
          >
            Reset
          </ButtonBase>
          {current && (
            <ButtonBase
              onClick={() => patch(setGroupRate(b, current.id))}
              sx={{ fontSize: 13, fontWeight: 700, color: md3.primary, py: 1 }}
            >
              Save fees to all
            </ButtonBase>
          )}
        </Stack>

        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: `${radius.md}px`,
            bgcolor: md3.surfaceContainer,
          }}
        >
          <Row label={p.rate?.name ?? 'Green fee'} value={money(p.greenFee)} note={p.reason} />
          <Row label={p.transport.name} value={money(p.transportFee)} />
          <Row label="Total" value={money(p.total)} strong />
        </Box>
      </Box>
    </MobileScreen>
  );
}

/**
 * The round on a punch card.
 *
 * A card holds prepaid rounds, so this settles the green fee and leaves the ride on the bill.
 * The card need not be the player's own — a member covering a guest's round is a normal
 * Saturday, which is why the old prototype had "use other customer's punchcards".
 */
function PunchSection({ booking: b, seat: i }: { booking: Booking; seat: number }) {
  const { dispatch } = usePos();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const patch = (x: Partial<Booking>) => dispatch({ type: 'patchBooking', bookingId: b.id, patch: x });

  const applied = b.playerStates[i]?.punch;
  const own = usablePunchCards(seatRecord(b, i));
  const holders = searching ? searchRoster(query, 4).filter((c) => usablePunchCards(c).length > 0) : [];

  return (
    <>
      <SectionHeader>Punch card</SectionHeader>
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
              <Tile key={card.name} onClick={() => patch(applyPunchCard(b, i, seatRecord(b, i)!.id, card.name))}>
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
            <Box sx={{ mt: 1 }}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a card holder…"
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
      {applied && <Hint>The punch comes off the card at check-in, not now.</Hint>}
    </>
  );
}

// ─── Parts ──────────────────────────────────────────────────────────────────

function RateTile({
  rate,
  holes,
  selected,
  dim,
  onClick,
}: {
  rate: GreenFeeRate;
  holes: 9 | 18;
  selected: boolean;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <Tile selected={selected} dim={dim} onClick={onClick}>
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
}: {
  children: React.ReactNode;
  selected?: boolean;
  dim?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={selected}
      sx={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        px: 1.25,
        // A touch target, not a mouse one: this is the density the phone build uses throughout.
        minHeight: 48,
        minWidth: 108,
        flex: '1 1 46%',
        borderRadius: `${radius.md}px`,
        border: `1.5px solid ${selected ? md3.primary : md3.outlineVariant}`,
        bgcolor: selected ? md3.primaryContainer : md3.onPrimary,
        color: selected ? md3.onPrimaryContainer : md3.onSurface,
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 1.3,
        textAlign: 'left',
        opacity: dim ? 0.55 : 1,
      }}
    >
      {children}
    </ButtonBase>
  );
}

const Tiles = ({ children }: { children: React.ReactNode }) => (
  <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
    {children}
  </Stack>
);

const Amount = ({ children }: { children: React.ReactNode }) => (
  <Box component="span" sx={{ fontSize: 11.5, fontWeight: 600, color: md3.onSurfaceVariant }}>
    {children}
  </Box>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <Typography sx={{ fontSize: 12, color: md3.onSurfaceVariant, mt: 1 }}>{children}</Typography>
);

function Row({ label, value, note, strong }: { label: string; value: string; note?: string | null; strong?: boolean }) {
  return (
    <Stack direction="row" alignItems="baseline" gap={1} sx={{ py: 0.375 }}>
      <Typography sx={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 800 : 500, color: md3.onSurface }}>
        {label}
      </Typography>
      {note && <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: md3.primary }}>{note}</Typography>}
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: strong ? 16 : 13, fontWeight: strong ? 800 : 700 }}>{value}</Typography>
    </Stack>
  );
}
