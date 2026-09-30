import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Quick Order (V1 → V2, Wave 2) — the counter: sells off the menus onto the register's own order.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function QuickOrderView() {
  return (
    <Box data-restaurant-view="QuickOrderView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Quick Order — being built</Typography>
    </Box>
  );
}
