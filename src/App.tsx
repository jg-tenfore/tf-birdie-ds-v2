import { Box } from '@mui/material';
import { md3 } from './theme/tokens';
import { PosApp } from './pos/PosApp';

/**
 * The hosted prototype.
 *
 * Just the POS in its device frame, centred on the dark ground the prototype uses so
 * the frame reads as a terminal rather than a web page. Theme and font providers live
 * in `main.tsx`, which keeps this file the same shape as the Storybook decorator —
 * both render `<PosApp />` into the same context.
 */
function App() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: md3.scrim,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        overflow: 'auto',
      }}
    >
      <PosApp />
    </Box>
  );
}

export default App;
