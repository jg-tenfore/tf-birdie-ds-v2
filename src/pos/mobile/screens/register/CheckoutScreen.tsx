import type { ReactNode } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import CallSplit from '@mui/icons-material/CallSplit';
import CardGiftcardOutlined from '@mui/icons-material/CardGiftcardOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import CreditCard from '@mui/icons-material/CreditCard';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { md3, memberTypes, mobile, radius } from '../../../../theme/tokens';
import { findMemberByName, findMemberByPhone } from '../../../data/golfers';
import * as cartLogic from '../../../logic/cart';
import { selectedBooking } from '../../../state/pos-store';
import { useGolferRoster, usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Subheader, TotalsBlock, orderLines, orderMoney, seatName, useCompletePayment } from './parts';

/**
 * Checkout — pushed from the order's Charge button; back returns to the order to change it.
 *
 * On the terminal this is a receipt beside a keypad. On a phone the one decision here is
 * *how* the customer pays, so the screen leads with the amount and a list of tenders; each
 * tender is a single tap that moves forward. The keypad work splits out to where it's
 * needed — tip for cards, tendered amount for cash — instead of one pad with two modes.
 *
 *   Card        → Tip → Reader (takeover) → Receipt (takeover)
 *   Cash        → Reader, in its cash-tendered form → Receipt
 *   Gift cert   → Reader → Receipt
 *   Member      → straight to the receipt (charged to the house account, nothing to tap)
 */
export function CheckoutScreen() {
  const { state, toast } = usePos();
  const nav = useMobileNav();
  const complete = useCompletePayment();
  const booking = selectedBooking(state);
  const roster = useGolferRoster();
  const { total } = orderMoney(state.cart);

  // A house account needs a member on the order: the looked-up golfer, or the booking's.
  const member =
    (state.selectedGolfer?.memberType ? state.selectedGolfer : null) ??
    (booking ? (findMemberByPhone(booking.phone, roster) ?? findMemberByName(booking.name, roster)) : undefined) ??
    null;

  const reader = (method: string) => nav.push({ name: 'paymentReader', method, amount: total });

  return (
    <MobileScreen
      topBar={
        <TopAppBar
          title="Checkout"
          subtitle={booking ? `${booking.name} · ${booking.conf}` : state.flowMode === 'reserve' ? 'Reservation · pay now' : 'Walk-in order'}
        />
      }
    >
      <Box sx={{ px: 2, pt: 1, pb: 2, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
          Amount due
        </Typography>
        <Typography sx={{ fontSize: 45, lineHeight: 1.15, fontWeight: 400 }}>{cartLogic.money(total)}</Typography>
      </Box>

      <Subheader>Payment method</Subheader>
      <Box sx={{ mx: 2, borderRadius: `${radius.lg}px`, bgcolor: mobile.surfaceContainerLow, overflow: 'hidden' }}>
        <Method icon={<CreditCard />} primary="Card" secondary="Tap, insert or swipe · add a tip" onClick={() => nav.push({ name: 'tip', method: 'card' })} />
        <Method icon={<PaymentsOutlined />} primary="Cash" secondary="Amount tendered and change due" onClick={() => reader('cash')} />
        <Method icon={<CardGiftcardOutlined />} primary="Gift certificate" secondary="Scan or key in the number" onClick={() => reader('giftcert')} />
        <Method
          icon={<AccountBalanceWalletOutlined />}
          primary="Member charge"
          secondary={
            member?.memberType
              ? `House account · ${member.name} · ${memberTypes[member.memberType].label}`
              : booking?.status === 'member'
                ? `House account · ${booking.name}`
                : 'Needs a member on the order'
          }
          disabled={!member && booking?.status !== 'member'}
          onClick={() => {
            complete('member charge', total);
            nav.push({ name: 'paymentComplete' });
          }}
        />
        <Method icon={<CallSplit />} primary="Split payment" secondary="Evenly or by player" onClick={() => toast('Split payment — coming soon')} last />
      </Box>

      <Subheader sx={{ mt: 1 }}>Order summary</Subheader>
      <Box sx={{ px: 2 }}>
        {orderLines(state.cart).map((item, i) => {
          const lineTotal = item.isCheckIn
            ? (item.players ?? []).reduce((s, p) => s + cartLogic.playerPrice(item.unitPrice ?? 0, p), 0)
            : item.price * item.qty;
          return (
            <Box key={i} sx={{ py: 0.75 }}>
              <Stack direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {item.isCheckIn ? (item.is18HBack ? `${item.name} · back nine` : item.name) : `${item.qty}× ${item.name}`}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {cartLogic.money(lineTotal)}
                </Typography>
              </Stack>
              {item.isCheckIn &&
                !item.is18HBack &&
                (item.players ?? []).map((p, pi) => (
                  <Stack key={pi} direction="row" justifyContent="space-between" sx={{ pl: 2 }}>
                    <Typography variant="caption">
                      {seatName(p, pi)}
                      {p.modifierTags.length ? ` · ${p.modifierTags.map((t) => t.tag).join(', ')}` : ''}
                    </Typography>
                    <Typography variant="caption">
                      {cartLogic.money(cartLogic.playerPrice(item.unitPrice ?? 0, p))}
                    </Typography>
                  </Stack>
                ))}
            </Box>
          );
        })}
      </Box>
      <TotalsBlock cart={state.cart} />
      <Box sx={{ height: 16 }} />
    </MobileScreen>
  );
}

function Method({
  icon,
  primary,
  secondary,
  onClick,
  disabled,
  last,
}: {
  icon: ReactNode;
  primary: string;
  secondary: string;
  onClick: () => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 2,
        px: 2,
        minHeight: mobile.listItem.two,
        borderBottom: last ? 'none' : `1px solid ${md3.outlineVariant}`,
        opacity: disabled ? 0.45 : 1,
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: md3.primaryContainer,
          color: md3.onPrimaryContainer,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1">{primary}</Typography>
        <Typography variant="body2" noWrap sx={{ color: md3.onSurfaceVariant }}>
          {secondary}
        </Typography>
      </Box>
      <ChevronRight sx={{ color: md3.onSurfaceVariant }} />
    </ButtonBase>
  );
}
