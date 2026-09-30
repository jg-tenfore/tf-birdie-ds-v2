import { Box, Typography } from '@mui/material';
import { md3 } from '../../../theme/tokens';
import { usePos } from '../../state/PosProvider';

/**
 * PIN sign-in (V1 → V2, Wave 3), over the whole terminal while nobody is signed in. A placeholder
 * until the PIN pad lands.
 */
export function SignInScreen() {
  const { state } = usePos();
  if (state.signedIn) return null;
  return (
    <Box data-sign-in sx={{ position: 'absolute', inset: 0, zIndex: 1400, bgcolor: md3.scrim, display: 'grid', placeItems: 'center' }}>
      <Typography sx={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Sign in</Typography>
    </Box>
  );
}
