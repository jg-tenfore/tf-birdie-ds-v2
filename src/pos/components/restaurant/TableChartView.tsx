import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Table Chart (V1 → V2, Wave 2) — the floor-plan editor; what it saves is what Tables shows.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function TableChartView() {
  return (
    <Box data-restaurant-view="TableChartView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Table Chart — being built</Typography>
    </Box>
  );
}
