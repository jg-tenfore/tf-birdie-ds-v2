import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Reservations (V1 → V2, Wave 2) — a day of covers, each given a table and seated onto it.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function ReservationsView() {
  return (
    <Box data-restaurant-view="ReservationsView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Reservations — being built</Typography>
    </Box>
  );
}
