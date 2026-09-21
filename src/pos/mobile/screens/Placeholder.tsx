import { Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';
import { MobileScreen, TopAppBar } from '../chrome';
import { PRESENTATION } from '../navigation';
import type { MobileRoute } from '../navigation';

/** Stand-in for a route whose screen isn't drawn yet, so the map always renders end to end. */
export function Placeholder({ route }: { route: MobileRoute }) {
  const root = PRESENTATION[route.name] === 'root';
  return (
    <MobileScreen topBar={<TopAppBar title={route.name} leading={root ? 'none' : 'back'} />}>
      <Typography sx={{ p: 2, color: md3.onSurfaceVariant }}>Not drafted yet.</Typography>
    </MobileScreen>
  );
}
