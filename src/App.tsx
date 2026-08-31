import { Box } from '@mui/material';
import { md3 } from './theme/tokens';
import { PosApp } from './pos/PosApp';
import { readUrl } from './pos/state/url-state';

/**
 * The hosted prototype.
 *
 * The POS in its device frame, centred on the dark ground the prototype uses so the frame
 * reads as a terminal rather than a web page. Theme and font providers live in `main.tsx`,
 * which keeps this file the same shape as the Storybook decorator — both render `<PosApp />`
 * into the same context.
 *
 * Deep linking is on here and off in Storybook: the address bar tracks the current screen and
 * dialog, and any such link reopens exactly that. `readUrl()` runs once, before the provider
 * mounts, so the app starts on the linked screen rather than flashing the register first.
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
      <PosApp syncUrl initialState={readUrl()} />
    </Box>
  );
}

export default App;
