import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Tables (V1 → V2, Wave 2) — the live floor — what is free, reserved, seated, waiting on its check.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function TablesView() {
  return (
    <Box data-restaurant-view="TablesView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Tables — being built</Typography>
    </Box>
  );
}
