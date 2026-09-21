import { useState } from 'react';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import EventAvailable from '@mui/icons-material/EventAvailable';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import SyncAlt from '@mui/icons-material/SyncAlt';
import { md3, mobile, radius } from '../../../../theme/tokens';
import * as cartLogic from '../../../logic/cart';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { BottomActionBar, MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import type { ScreenProps } from '../types';
import { Callout, SeatAvatar, Subheader, TotalsBlock, orderMoney, reservationFor, seatName, seatSummary } from './parts';

/**
 * Confirm a reservation — pushed from the order's Reserve buttons; back returns to the
 * order with nothing written.
 *
 * A pushed page rather than a full-screen dialog because it's a *review* step on the way
 * forward, not an edit you might abandon: everything on it was decided on the order. The
 * pay-now / pay-later choice is a segmented button at the top so the operator can flip it
 * without going back.
 *
 * Pay later writes the booking as an open balance and returns to the register root.
 * Pay now carries on into checkout; the booking is written as paid only when the reader
 * approves, so a declined card never leaves a paid-looking reservation on the sheet.
 */
export function ReserveConfirmScreen({ route }: ScreenProps<'reserveConfirm'>) {
  const { state, dispatch, toast } = usePos();
  const nav = useMobileNav();
  const [payMode, setPayMode] = useState(route.payMode);
  const checkIn = state.cart.find((i) => i.isCheckIn && i.teeTime && !i.is18HBack);
  const back9 = state.cart.find((i) => i.is18HBack);
  const { total } = orderMoney(state.cart);

  if (!checkIn?.teeTime) {
    return (
      <MobileScreen topBar={<TopAppBar title="Confirm reservation" />}>
        <Box sx={{ p: 2 }}>
          <Callout tone="warning">Choose a tee time on the order before reserving.</Callout>
        </Box>
      </MobileScreen>
    );
  }

  const t = checkIn.teeTime;
  const players = checkIn.players ?? [];
  const unit = checkIn.unitPrice ?? 0;
  const dateLabel = state.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const confirm = () => {
    if (payMode === 'now') return nav.push({ name: 'checkout' });
    const { booking, error } = reservationFor(state, false);
    if (!booking) return toast(error ?? 'Could not reserve');
    dispatch({ type: 'addBookings', bookings: [booking] });
    dispatch({ type: 'clearOrder' });
    toast(`Reserved · ${booking.conf} · ${t.label} ${t.courseName}`);
    nav.popToRoot();
  };

  return (
    <MobileScreen
      topBar={<TopAppBar title="Confirm reservation" subtitle={`${t.label} · ${t.courseName}`} />}
      bottomBar={
        <BottomActionBar>
          <Button variant="contained" size="large" fullWidth startIcon={<EventAvailable />} onClick={confirm}>
            {payMode === 'now' ? `Reserve & charge ${cartLogic.money(total)}` : 'Reserve · pay at counter'}
          </Button>
        </BottomActionBar>
      }
    >
      <Box sx={{ px: 2, pt: 1 }}>
        <Box sx={{ p: 2, borderRadius: `${radius.lg}px`, bgcolor: md3.primaryContainer, color: md3.onPrimaryContainer }}>
          <Typography variant="overline" component="div" sx={{ color: 'inherit', opacity: 0.8 }}>
            {dateLabel} · {players.length} player{players.length === 1 ? '' : 's'}
          </Typography>
          <Typography variant="h4" sx={{ color: 'inherit', mt: 0.5 }}>
            {t.label}
          </Typography>
          <Typography variant="body1" sx={{ color: 'inherit' }}>
            {t.courseName} · {checkIn.name}
          </Typography>
          {back9?.teeTime && (
            <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 1 }}>
              <SyncAlt fontSize="small" />
              <Typography variant="body2" sx={{ color: 'inherit' }}>
                Back nine {back9.teeTime.label} · {back9.teeTime.courseName}
              </Typography>
            </Stack>
          )}
        </Box>
      </Box>

      <Subheader sx={{ mt: 1 }}>Payment</Subheader>
      <Stack
        direction="row"
        role="radiogroup"
        aria-label="When to pay"
        sx={{ mx: 2, height: 48, borderRadius: `${radius.xl}px`, border: `1px solid ${md3.outline}`, overflow: 'hidden' }}
      >
        {(['later', 'now'] as const).map((m, i) => (
          <ButtonBase
            key={m}
            role="radio"
            aria-checked={payMode === m}
            onClick={() => setPayMode(m)}
            sx={{
              flex: 1,
              fontSize: 14,
              fontWeight: 500,
              borderLeft: i ? `1px solid ${md3.outline}` : 'none',
              bgcolor: payMode === m ? mobile.secondaryContainer : 'transparent',
              color: payMode === m ? mobile.onSecondaryContainer : md3.onSurface,
            }}
          >
            {m === 'later' ? 'Pay at counter' : 'Pay now'}
          </ButtonBase>
        ))}
      </Stack>

      <Subheader sx={{ mt: 1 }}>Players</Subheader>
      {players.map((p, i) => {
        const name = seatName(p, i);
        return (
          <Stack key={i} direction="row" alignItems="center" gap={2} sx={{ px: 2, minHeight: mobile.listItem.two }}>
            <SeatAvatar name={name} index={i} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body1" noWrap>
                {name}
              </Typography>
              <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
                {seatSummary(unit, p)}
              </Typography>
            </Box>
            <Typography variant="subtitle2">{cartLogic.money(cartLogic.playerPrice(unit, p))}</Typography>
          </Stack>
        );
      })}

      {state.cart.some((i) => !i.isCheckIn && !i.isSubItem) && (
        <>
          <Subheader>Items</Subheader>
          {state.cart
            .filter((i) => !i.isCheckIn && !i.isSubItem)
            .map((i) => (
              <Stack key={i.name} direction="row" justifyContent="space-between" sx={{ px: 2, py: 0.5 }}>
                <Typography variant="body2">
                  {i.qty}× {i.name}
                </Typography>
                <Typography variant="body2">{cartLogic.money(i.price * i.qty)}</Typography>
              </Stack>
            ))}
        </>
      )}

      <TotalsBlock cart={state.cart} />

      <Box sx={{ px: 2, pb: 2 }}>
        {payMode === 'later' ? (
          <Callout tone="warning" icon={<InfoOutlined fontSize="small" />}>
            The tee sheet will show this as an open balance until it's settled at the counter.
          </Callout>
        ) : (
          <Callout tone="info" icon={<InfoOutlined fontSize="small" />}>
            Next: take payment. The reservation is written as paid once the payment is approved.
          </Callout>
        )}
      </Box>
    </MobileScreen>
  );
}
