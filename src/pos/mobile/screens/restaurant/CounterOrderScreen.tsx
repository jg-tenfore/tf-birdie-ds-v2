import { pricingOf } from '../../../state/checkout';
import { Box, Button, Typography } from '@mui/material';
import Send from '@mui/icons-material/Send';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';
import { md3 } from '../../../../theme/tokens';
import { money, orderTotals, playerPrice } from '../../../logic/cart';
import type { CartItem } from '../../../types';
import { unsent } from '../../../logic/restaurant';
import { tabById } from '../../../state/restaurant';
import { usePos } from '../../../state/PosProvider';
import { Stack } from '../../../components/Stack';
import { MobileScreen, TopAppBar } from '../../chrome';
import { useMobileNav } from '../../navigation';
import { Callout } from '../register/parts';
import { DishRow, Empty } from './parts';
import { KITCHEN } from './restaurant-helpers';

/**
 * The counter order (V1 → V2, handheld) — what Quick Order has rung, before it is paid.
 *
 * On the tablet this is the order rail beside the menu. On the phone it is one push from Quick
 * Order's *Review order*: every dish with its modifiers, allergies and whether it has gone to the
 * kitchen (`DishRow` — the same sheet as a tab's, without seats), **Send** to fire what is unsent
 * as one ticket labelled *Counter*, and **Charge**, which is the phone's own checkout, tip and
 * reader. Anything else on the register's order — a round, a sleeve of balls — is listed too,
 * because it is one order and one payment.
 */
export function CounterOrderScreen() {
  const { state, dispatch } = usePos();
  const nav = useMobileNav();
  const lines = state.cart.filter((l) => !l.isSubItem);
  const totals = orderTotals(state.cart, pricingOf(state));
  const toSend = unsent(state.cart).length;
  const paying = tabById(state, state.payingTabId);

  return (
    <MobileScreen
      topBar={<TopAppBar title="Counter order" subtitle={`${lines.length} item${lines.length === 1 ? '' : 's'}`} />}
      bottomBar={
        lines.length > 0 && (
          <Box
            sx={{ flexShrink: 0, px: 2, pt: 1.25, pb: 1.5, bgcolor: md3.surfaceContainer, borderTop: `1px solid ${md3.outlineVariant}` }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ color: md3.onSurfaceVariant }}>
                {money(totals.goods)} + {money(totals.tax)} tax
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {money(totals.total)}
              </Typography>
            </Stack>
            <Stack direction="row" gap={1}>
              <Button
                variant="contained"
                size="large"
                data-send-to-kitchen={toSend}
                disabled={toSend === 0 || Boolean(paying)}
                startIcon={<Send />}
                onClick={() => dispatch({ type: 'sendToKitchen', target: 'cart' })}
                sx={{ flex: 1, bgcolor: KITCHEN.solid, '&:hover': { bgcolor: KITCHEN.solid } }}
              >
                {toSend ? `Send ${toSend}` : 'All sent'}
              </Button>
              <Button variant="contained" size="large" data-charge onClick={() => nav.push({ name: 'checkout' })} sx={{ flex: 1.3 }}>
                Charge {money(totals.total)}
              </Button>
            </Stack>
          </Box>
        )
      }
    >
      {paying && (
        <Box sx={{ p: 2 }}>
          <Callout tone="info">This is {paying.name}, loaded to be paid. Its lines are changed on the tab.</Callout>
        </Box>
      )}
      {lines.length === 0 ? (
        <Empty icon={<ShoppingCartOutlined sx={{ fontSize: 48 }} />} title="Nothing rung yet" body="Pick something from the menu." />
      ) : (
        <Box sx={{ borderTop: `1px solid ${md3.outlineVariant}` }}>
          {lines.map((l, i) =>
            l.dish ? (
              <DishRow key={l.dish.lineId} line={l} target="cart" readOnly={Boolean(paying)} showSeat={Boolean(paying)} />
            ) : (
              <Stack
                key={i}
                direction="row"
                justifyContent="space-between"
                gap={2}
                sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${md3.outlineVariant}` }}
              >
                <Typography variant="body1">
                  {l.qty > 1 ? `${l.qty}× ` : ''}
                  {l.name}
                </Typography>
                <Typography variant="body1">{money(lineTotal(l))}</Typography>
              </Stack>
            ),
          )}
        </Box>
      )}
    </MobileScreen>
  );
}

/** A non-dish line's total — a round is priced per player, as at checkout. */
const lineTotal = (l: CartItem): number =>
  l.isCheckIn ? (l.players ?? []).reduce((s, p) => s + playerPrice(l.unitPrice ?? 0, p), 0) : l.price * l.qty;
