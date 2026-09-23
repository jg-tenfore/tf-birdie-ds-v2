import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../theme/tokens';
import { availableCarts, cartHolder, CART_FLEET } from '../data/carts';
import { formatTimeLabel } from '../data/courses';
import { returnCart, signOutCart } from '../logic/reservation';
import { ModalFrame, OutlineButton } from '../modals/ModalFrame';
import { dayBookings } from '../state/pos-store';
import { usePos } from '../state/PosProvider';
import { Stack } from './Stack';

/**
 * Handing a cart key to a player.
 *
 * The old prototype puts **Cart signout** on every player row and a key glyph on the booking
 * once a cart is out. It is a small feature with a real constraint behind it: the course owns a
 * fixed number of carts, two players cannot be given cart 14, and the counter needs to see
 * what is already out before reaching for a key.
 *
 * Availability is derived from the day's bookings rather than stored, so a returned cart is
 * just a cleared seat and there is no second list to forget to update. A taken cart is shown
 * rather than hidden, with who has it — "cart 14 is out with the 9:12" is the answer to the
 * question actually being asked.
 */
export function CartSignoutModal() {
  const { state, dispatch } = usePos();
  const m = state.modal;
  if (m?.kind !== 'cartSignout') return null;

  const b = state.bookings.find((x) => x.id === m.bookingId);
  if (!b) return null;

  const day = dayBookings(state);
  const free = new Set(availableCarts(day));
  const held = b.playerStates[m.seat]?.cartKey;
  const name = m.seat === 0 ? b.name : (b.guests?.[m.seat]?.name ?? `Guest ${m.seat + 1}`);
  const close = () => dispatch({ type: 'closeModal' });

  const give = (cart: number) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: signOutCart(b, m.seat, cart) });
    dispatch({ type: 'toast', message: `Cart ${cart} → ${name}` });
    close();
  };

  return (
    <ModalFrame
      title={`Cart signout · ${name}`}
      subtitle={`${free.size} of ${CART_FLEET.length} available`}
      icon="golf_course"
      width={520}
      onClose={close}
      actions={
        <Stack direction="row" gap={8} sx={{ justifyContent: 'space-between', width: '100%' }}>
          {held != null ? (
            <OutlineButton
              onClick={() => {
                dispatch({ type: 'patchBooking', bookingId: b.id, patch: returnCart(b, m.seat) });
                dispatch({ type: 'toast', message: `Cart ${held} returned` });
                close();
              }}
            >
              Return cart {held}
            </OutlineButton>
          ) : (
            <span />
          )}
          <OutlineButton onClick={close}>Cancel</OutlineButton>
        </Stack>
      }
    >
      {/*
        A grid, not a wrapping row.

        This was `<Stack gap={6}>`, and `gap` goes through MUI's spacing scale — so six meant
        **48px**, not six. Thirty-five 46×40 keys floated in an acre of white, which is what
        Weston was looking at when he said "the hell is that? Oh, that grid's nasty."

        Four columns of full-width keys, 8px apart. The keys roughly doubled in area, and a
        counter reaching for one on a tablet gets a 56dp target rather than a 40dp one.
      */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
          gap: '8px',
          // Nine rows of four do not fit a dialog, so the fleet scrolls rather than pushing
          // the hint and the out-list off the bottom.
          maxHeight: 340,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        {CART_FLEET.map((cart) => {
          const holder = free.has(cart) ? null : cartHolder(cart, day);
          const mine = cart === held;
          return (
            <ButtonBase
              key={cart}
              onClick={() => (holder && !mine ? undefined : give(cart))}
              disabled={Boolean(holder) && !mine}
              title={
                mine
                  ? `Signed out to ${name}`
                  : holder
                    ? `Out with ${holder.playerName} · ${formatTimeLabel(holder.timeMin)}`
                    : `Sign out cart ${cart}`
              }
              sx={{
                height: 56,
                borderRadius: `${radius.sm}px`,
                fontSize: 17,
                fontWeight: 800,
                border: `1.5px solid ${mine ? md3.primary : md3.outlineVariant}`,
                bgcolor: mine ? md3.primaryContainer : holder ? md3.surfaceContainer : md3.onPrimary,
                color: mine ? md3.onPrimaryContainer : holder ? md3.outline : md3.onSurface,
                textDecoration: holder && !mine ? 'line-through' : 'none',
              }}
            >
              {cart}
            </ButtonBase>
          );
        })}
      </Box>
      <Typography sx={{ fontSize: 11.5, color: md3.onSurfaceVariant, mt: 1.5 }}>
        A struck-through number is already out. Hover to see who has it.
      </Typography>
      <Box sx={{ mt: 1 }}>
        {[...day]
          .flatMap((x) =>
            x.playerStates.map((p, i) => ({ p, i, x })).filter(({ p }) => p.cartKey != null),
          )
          .slice(0, 4)
          .map(({ p, i, x }) => (
            <Typography key={`${x.id}-${i}`} sx={{ fontSize: 11, color: md3.outline }}>
              Cart {p.cartKey} · {i === 0 ? x.name : (x.guests?.[i]?.name ?? `Guest ${i + 1}`)} ·{' '}
              {formatTimeLabel(x.timeMin)}
            </Typography>
          ))}
      </Box>
    </ModalFrame>
  );
}
