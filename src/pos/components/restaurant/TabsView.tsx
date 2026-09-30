import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';

/**
 * Tabs (V1 → V2, Wave 2) — every open tab, and the seat-by-seat editor a tab opens into.
 *
 * A placeholder so routing, deep links and the nav can be wired before the screen exists. It is
 * replaced wholesale by the screen itself; nothing else imports from this file but `PosApp`.
 */
export function TabsView() {
  return (
    <Box data-restaurant-view="TabsView" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: md3.surface }}>
      <Typography sx={{ color: md3.onSurfaceVariant }}>Tabs — being built</Typography>
    </Box>
  );
}
