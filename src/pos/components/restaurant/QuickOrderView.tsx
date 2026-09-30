import { ButtonBase, Typography } from '@mui/material';
import { grid as gridTokens, md3 } from '../../../theme/tokens';
import { unsent } from '../../logic/restaurant';
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
          disabled={toSend === 0}
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
      <MenuBrowser target="cart" defaultMenu="counter" />
    </Stack>
  );
}
