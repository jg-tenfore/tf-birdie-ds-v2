import { Box, ButtonBase, Typography } from '@mui/material';
import { md3, radius } from '../../../../theme/tokens';
import { availableCarts, cartHolder, CART_FLEET } from '../../../data/carts';
import { formatTimeLabel } from '../../../data/courses';
import { playerName, returnCart, signOutCart } from '../../../logic/reservation';
import { Stack } from '../../../components/Stack';
import { dayBookings } from '../../../state/pos-store';
import { usePos } from '../../../state/PosProvider';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { BookingGone, SectionHeader } from './parts';

/**
 * Handing a cart key to one player, on the phone (Weston Edits, round 3).
 *
 * The old prototype puts **Cart signout** on every player row, and this is arguably more a
 * phone job than a counter one — keys are handed out at the cart barn, where the phone is the
 * device in hand.
 *
 * Availability is derived from the day's bookings rather than stored, so a returned cart is
 * just a cleared seat and there is no second list to forget to update. A taken cart is shown
 * struck through with who has it rather than hidden: "cart 14 is out with the 9:12" is the
 * question actually being asked.
 */
export function CartSignoutScreen({ route }: ScreenProps<'cartSignout'>) {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const b = state.bookings.find((x) => x.id === route.bookingId);

  if (!b) return <BookingGone />;

  const day = dayBookings(state);
  const free = new Set(availableCarts(day));
  const held = b.playerStates[route.seat]?.cartKey;
  const name = playerName(b, route.seat);

  const give = (cart: number) => {
    dispatch({ type: 'patchBooking', bookingId: b.id, patch: signOutCart(b, route.seat, cart) });
    dispatch({ type: 'toast', message: `Cart ${cart} → ${name}` });
    nav.pop();
  };

  return (
    <MobileScreen topBar={<TopAppBar title="Cart signout" />}>
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>
          {free.size} of {CART_FLEET.length} available
          {held != null ? ` · holding cart ${held}` : ''}
        </Typography>

        <SectionHeader sx={{ px: 0 }}>Fleet</SectionHeader>
        <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap' }}>
          {CART_FLEET.map((cart) => {
            const holder = free.has(cart) ? null : cartHolder(cart, day);
            const mine = cart === held;
            return (
              <ButtonBase
                key={cart}
                onClick={() => (holder && !mine ? undefined : give(cart))}
                disabled={Boolean(holder) && !mine}
                aria-label={
                  mine
                    ? `Cart ${cart}, signed out to ${name}`
                    : holder
                      ? `Cart ${cart}, out with ${holder.playerName}`
                      : `Sign out cart ${cart}`
                }
                sx={{
                  // 48 is the phone build's touch floor; a 35-cart grid is no reason to go under it.
                  width: 56,
                  height: 48,
                  borderRadius: `${radius.md}px`,
                  fontSize: 16,
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
        </Stack>

        {held != null && (
          <ButtonBase
            onClick={() => {
              dispatch({ type: 'patchBooking', bookingId: b.id, patch: returnCart(b, route.seat) });
              dispatch({ type: 'toast', message: `Cart ${held} returned` });
              nav.pop();
            }}
            sx={{
              mt: 2,
              width: '100%',
              minHeight: 48,
              borderRadius: `${radius.md}px`,
              border: `1.5px solid ${md3.outlineVariant}`,
              fontSize: 14,
              fontWeight: 700,
              color: md3.onSurfaceVariant,
            }}
          >
            Return cart {held}
          </ButtonBase>
        )}

        <SectionHeader sx={{ px: 0 }}>Out now</SectionHeader>
        {day
          .flatMap((x) => x.playerStates.map((p, i) => ({ p, i, x })).filter(({ p }) => p.cartKey != null))
          .slice(0, 6)
          .map(({ p, i, x }) => (
            <Typography key={`${x.id}-${i}`} sx={{ fontSize: 12.5, color: md3.onSurfaceVariant, py: 0.25 }}>
              Cart {p.cartKey} · {playerName(x, i)} · {formatTimeLabel(x.timeMin)}
            </Typography>
          ))}
      </Box>
    </MobileScreen>
  );
}
