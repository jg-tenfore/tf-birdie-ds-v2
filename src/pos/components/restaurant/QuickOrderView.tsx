import { Box, ButtonBase, Typography } from '@mui/material';
import { grid as gridTokens, md3 } from '../../../theme/tokens';
import { unsent } from '../../logic/restaurant';
import { tabById } from '../../state/restaurant';
import { usePos } from '../../state/PosProvider';
import { Icon } from '../primitives';
import { Stack } from '../Stack';
import { MenuBrowser } from './MenuBrowser';

/**
 * Quick Order (V1 → V2, Wave 2) — the counter: sells off the menus onto the register's own order.
 *
 * ## What v1 did
 *
 * `tf-birdie-ds-v1/app/src/screens/quick-order.tsx`: category tiles over the menu's photography.
 * Tapping a category **replaced the entire browsing surface** — search, menu sets and grid all
 * went — with a tall card naming the category over a list of its products, and the only way back
 * was BACK. The order being built stayed in its panel, but everything around it kept changing, and
 * there was no kitchen step at all: food rung at the counter reached the grill by someone shouting.
 *
 * ## What this does
 *
 * - **The order rail stays on the left**, because it *is* the order: dishes show their modifiers,
 *   allergies and whether they have gone to the kitchen, and its **Pay** is how a counter order is
 *   paid. Nothing here duplicates it.
 * - **The same menu browser as a tab** (`MenuBrowser`), selling onto the register (`'cart'`):
 *   menu, categories and items all stay on screen.
 * - **Send to kitchen** fires what is unsent on the counter order as one ticket, labelled
 *   "Counter", and says how many dishes will go. What has gone is locked on the rail, exactly as
 *   on a tab.
 */
export function QuickOrderView() {
  const { state, dispatch } = usePos();
  const toSend = unsent(state.cart).length;
  // A tab being paid owns the register's order until it is paid or cleared; the reducer refuses
  // counter dishes onto it, so the screen says so rather than letting a tap do nothing.
  const paying = tabById(state, state.payingTabId);

  return (
    <Stack data-restaurant-view="QuickOrderView" sx={{ flex: 1, minWidth: 0, minHeight: 0, bgcolor: md3.surface }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={1.25}
        sx={{ height: gridTokens.topbarH, px: 2, bgcolor: '#fff', borderBottom: `1px solid ${md3.outlineVariant}`, flexShrink: 0 }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Quick Order</Typography>
        <Typography sx={{ fontSize: 12.5, color: md3.onSurfaceVariant }}>Selling onto the order on the left</Typography>
        <Stack sx={{ flex: 1 }} />
        <ButtonBase
          data-send-to-kitchen={toSend}
          disabled={toSend === 0 || Boolean(paying)}
          onClick={() => dispatch({ type: 'sendToKitchen', target: 'cart' })}
          sx={{
            minHeight: 44,
            px: 2,
            gap: 0.75,
            borderRadius: '14px',
            bgcolor: '#b45309',
            color: '#fff',
            fontSize: 13.5,
            fontWeight: 800,
            '&.Mui-disabled': { bgcolor: md3.surfaceHighest, color: md3.onSurfaceVariant },
          }}
        >
          <Icon name="send" size={17} />
          {toSend ? `Send ${toSend} to kitchen` : 'Nothing to send'}
        </ButtonBase>
      </Stack>
      {paying ? (
        <Stack alignItems="center" justifyContent="center" gap={1.25} sx={{ flex: 1, p: 4, textAlign: 'center' }} data-quick-order-busy>
          <Icon name="receipt_long" size={36} color={md3.onSurfaceVariant} />
          <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{paying.name} is on the register, being paid</Typography>
          <Typography sx={{ fontSize: 13.5, color: md3.onSurfaceVariant, maxWidth: 440 }}>
            Finish taking the payment, or clear it from the order on the left, before ringing up the counter. Anything added
            now would be charged to their tab without ever being written onto it.
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <ButtonBase
              onClick={() => dispatch({ type: 'setView', view: 'pos' })}
              sx={{ minHeight: 44, px: 2.25, borderRadius: '14px', border: `1.5px solid ${md3.outlineVariant}`, fontWeight: 700, fontSize: 13.5 }}
            >
              Go to the register
            </ButtonBase>
          </Box>
        </Stack>
      ) : (
        <MenuBrowser target="cart" defaultMenu="counter" />
      )}
    </Stack>
  );
}
