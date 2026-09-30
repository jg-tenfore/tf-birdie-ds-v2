import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Orders & Tips (V1 → V2, Wave 2) — the day's payments, tips adjusted after the fact, tip-outs.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function OrdersTipsView() {
  return (
    <Box data-restaurant-view="OrdersTipsView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Orders & Tips — being built</Typography>
    </Box>
  );
}
